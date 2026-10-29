"use client";

import { useCallback, useEffect, useState } from "react";

/* ====================================================================== */
/*  Registro do Service Worker + inscrição no Push Manager (padrão VAPID) */
/* ====================================================================== */

/** Chave PÚBLICA VAPID (fixa no front-end — é pública por definição). Deve ser igual à de src/lib/vapid-keys.ts. */
export const VAPID_PUBLIC_KEY_FRONT = "BKhuZ7nBFVRlc05eRSMpZylx3OVimtudepf-5qLEHVIM83frLg50lyTz8qnHuMLA01BIw8DBAza5pONrM8sSh7M";

function Buffer_toBase64Url(buf: ArrayBuffer) {
  let bin = "";
  new Uint8Array(buf).forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export async function registrarServiceWorker() {
  if (!("serviceWorker" in navigator)) throw new Error("Este navegador não suporta Service Worker.");
  const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  await navigator.serviceWorker.ready;
  return reg;
}

/** Fluxo completo: registra o SW → pede permissão → inscreve no Push Manager → envia a subscription ao backend. */
export async function ativarPush(publicKey: string = VAPID_PUBLIC_KEY_FRONT) {
  if (!("PushManager" in window)) throw new Error("Este navegador não suporta Web Push.");
  const reg = await registrarServiceWorker();
  const permission = await Notification.requestPermission();
  if (permission !== "granted") throw new Error(permission === "denied" ? "Permissão negada. Libere as notificações no cadeado da barra de endereço." : "Permissão não concedida.");
  // Chave VAPID pública fixa no front-end
  const applicationServerKey = "BKhuZ7nBFVRlc05eRSMpZylx3OVimtudepf-5qLEHVIM83frLg50lyTz8qnHuMLA01BIw8DBAza5pONrM8sSh7M";
  const existing = await reg.pushManager.getSubscription();
  // Se já existe inscrição com OUTRA chave (par antigo), descarta para reinscrever com a atual
  if (existing && existing.options.applicationServerKey && Buffer_toBase64Url(existing.options.applicationServerKey) !== applicationServerKey) await existing.unsubscribe();
  const current = existing && existing.options.applicationServerKey && Buffer_toBase64Url(existing.options.applicationServerKey) === applicationServerKey ? existing : null;
  const subscription = current ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(publicKey || applicationServerKey) }));
  const res = await fetch("/api/push/subscribe", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ subscription: subscription.toJSON(), userAgent: navigator.userAgent }) });
  if (!res.ok) throw new Error(((await res.json()) as { error?: string }).error ?? "Falha ao salvar a inscrição.");
  return subscription;
}

export async function desativarPush() {
  const reg = await navigator.serviceWorker.getRegistration("/");
  const sub = await reg?.pushManager.getSubscription();
  if (sub) {
    await fetch("/api/push/subscribe", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ endpoint: sub.endpoint }) });
    await sub.unsubscribe();
  }
}

/* --------------------------------- UI --------------------------------- */
export function WebPushPanel({ loggedIn }: { loggedIn: boolean }) {
  const [state, setState] = useState<"loading" | "unsupported" | "unconfigured" | "off" | "on" | "denied" | "working">("loading");
  const [publicKey, setPublicKey] = useState("");
  const [devices, setDevices] = useState<{ id: number; userAgent: string; endpointHost: string; lastUsedAt: string | null }[]>([]);
  const [msg, setMsg] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/push/subscribe", { cache: "no-store" });
      const body = (await res.json()) as { enabled: boolean; publicKey: string; subscriptions: typeof devices };
      setPublicKey(body.publicKey || VAPID_PUBLIC_KEY_FRONT);
      setDevices(body.subscriptions);
      if (!body.enabled && !VAPID_PUBLIC_KEY_FRONT) return setState("unconfigured");
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) return setState("unsupported");
      if (Notification.permission === "denied") return setState("denied");
      const reg = await navigator.serviceWorker.getRegistration("/");
      const sub = await reg?.pushManager.getSubscription();
      setState(sub ? "on" : "off");
    } catch {
      setState("off");
    }
  }, []);
  useEffect(() => { refresh(); }, [refresh]);

  const on = async () => {
    setState("working"); setMsg(null);
    try { await ativarPush(publicKey); setMsg("✓ Push ativado neste dispositivo."); } catch (e) { setMsg(e instanceof Error ? e.message : "Falha ao ativar."); }
    refresh();
  };
  const off = async () => { setState("working"); await desativarPush(); setMsg("Push desativado neste dispositivo."); refresh(); };
  const test = async () => {
    setMsg("Enviando teste…");
    const r = await fetch("/api/push/subscribe", { method: "PUT" });
    const b = (await r.json()) as { enviadas?: number; removidas?: number; erro?: string; error?: string };
    setMsg(b.error ?? b.erro ?? `Teste enviado para ${b.enviadas ?? 0} dispositivo(s)${b.removidas ? ` · ${b.removidas} inscrição(ões) expirada(s) removida(s)` : ""}. Minimize o site para ver a notificação chegar.`);
  };

  if (!loggedIn) return <p className="text-[0.66rem] muted">Entre na sua conta para ativar o push neste dispositivo.</p>;
  if (state === "unsupported") return <p className="text-[0.66rem] muted">Este navegador não suporta Web Push. No iPhone, adicione o site à tela inicial (Safari → Compartilhar → Tela de Início) e abra por lá.</p>;
  if (state === "unconfigured") return <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-[0.66rem] text-amber-700 dark:text-amber-300">Servidor sem chaves VAPID (NEXT_PUBLIC_VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY).</p>;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1.5">
        {state === "on" ? (
          <>
            <span className="chip !border-emerald-500/40 !bg-emerald-500/10 !text-emerald-500">✓ Push ativo neste dispositivo</span>
            <button type="button" onClick={test} className="btn btn-primary !px-3 !py-1.5 !text-[0.68rem]">Enviar teste</button>
            <button type="button" onClick={off} className="btn btn-ghost !px-3 !py-1.5 !text-[0.68rem]">Desativar</button>
          </>
        ) : state === "denied" ? (
          <span className="chip !border-rose-500/40 !text-rose-500">Permissão negada — libere no cadeado da barra de endereço</span>
        ) : (
          <button type="button" onClick={on} disabled={state === "working" || state === "loading"} className="btn btn-primary !px-3 !py-1.5 !text-[0.7rem] disabled:opacity-60">{state === "working" ? "Ativando…" : "📲 Ativar push neste dispositivo"}</button>
        )}
      </div>
      {devices.length ? <p className="text-[0.58rem] muted">{devices.length} dispositivo(s) inscrito(s): {devices.map((d) => d.endpointHost.replace(/^.*?\.(?=[^.]+\.[^.]+$)/, "")).join(", ")}</p> : null}
      {msg ? <p className="text-[0.62rem] text-[var(--brand)]">{msg}</p> : null}
    </div>
  );
}
