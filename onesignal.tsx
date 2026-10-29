"use client";

import { useEffect, useState } from "react";

/**
 * OneSignal — Web Push (equivalente web do react-native-onesignal).
 * App ID fixo no layout.tsx (f06a705d-ebd0-4390-9a11-207fe769b81d); o SDK é carregado no <head>.
 * No Android (Chrome / PWA instalada) o opt-in abre o prompt nativo de permissão.
 */

type OneSignalSDK = {
  init: (opts: { appId: string; allowLocalhostAsSecureOrigin?: boolean; serviceWorkerPath?: string; notifyButton?: { enable: boolean } }) => Promise<void>;
  login: (externalId: string) => Promise<void>;
  logout: () => Promise<void>;
  User: { pushSubscription: { optIn: () => Promise<void>; optOut: () => Promise<void>; optedIn?: boolean; id?: string | null; addEventListener: (ev: "change", cb: (e: { current: { optedIn?: boolean; id?: string | null } }) => void) => void } };
  Notifications: { permission: boolean; requestPermission: () => Promise<boolean> };
};

declare global {
  interface Window {
    OneSignalDeferred?: ((sdk: OneSignalSDK) => void | Promise<void>)[];
    OneSignal?: OneSignalSDK;
  }
}

function withOneSignal(cb: (sdk: OneSignalSDK) => void | Promise<void>) {
  window.OneSignalDeferred = window.OneSignalDeferred ?? [];
  window.OneSignalDeferred.push(cb);
}

/** Botão "Notificações no Navegador": chama OneSignal.Notifications.requestPermission() (abre o pop-up do navegador). */
export function BrowserNotificationsButton({ appId }: { appId: string }) {
  const [state, setState] = useState<"idle" | "loading" | "granted" | "denied" | "unsupported" | "unconfigured">(appId ? "idle" : "unconfigured");
  const [subId, setSubId] = useState<string | null>(null);

  useEffect(() => {
    if (!appId) return;
    if (typeof Notification === "undefined" || !("serviceWorker" in navigator)) { setState("unsupported"); return; }
    if (Notification.permission === "denied") setState("denied");
    withOneSignal((OneSignal) => {
      if (OneSignal.User.pushSubscription.optedIn) { setState("granted"); setSubId(OneSignal.User.pushSubscription.id ?? null); }
      OneSignal.User.pushSubscription.addEventListener("change", (e) => {
        setState(e.current.optedIn ? "granted" : Notification.permission === "denied" ? "denied" : "idle");
        setSubId(e.current.id ?? null);
      });
    });
  }, [appId]);

  /** Chamado SOMENTE no onClick do botão (gesto do usuário) — nunca no carregamento da tela. */
  const handleClick = async () => {
    // 1) Permissão já bloqueada anteriormente? Avisa e não trava em "Aguardando…"
    if (typeof Notification !== "undefined" && Notification.permission === "denied") {
      alert("As notificações estão bloqueadas para este site. Toque no cadeado 🔒 na barra de endereço → Notificações → Permitir, e tente novamente.");
      setState("denied");
      return;
    }
    setState("loading");
    // 2) Se o SDK não responder em 8s (bloqueador de anúncios, rede), destrava o botão
    const timeout = setTimeout(() => {
      setState("idle");
      alert("O OneSignal não respondeu. Confira se o domínio do site está cadastrado como Site URL no painel do OneSignal e tente de novo.");
    }, 8000);
    const sdk = window.OneSignal;
    try {
      if (!sdk) throw new Error("SDK do OneSignal ainda não carregou.");
      // 3) Pop-up nativo de permissão — exatamente dentro do clique
      const granted = await sdk.Notifications.requestPermission();
      clearTimeout(timeout);
      if (granted) {
        await sdk.User.pushSubscription.optIn();
        setState("granted");
      } else {
        setState("denied");
        alert("Permissão de notificação negada. Você pode liberar depois no cadeado 🔒 da barra de endereço.");
      }
    } catch (error) {
      clearTimeout(timeout);
      const denied = typeof Notification !== "undefined" && Notification.permission === "denied";
      setState(denied ? "denied" : "idle");
      alert(denied ? "Você bloqueou as notificações anteriormente. Libere no cadeado 🔒 da barra de endereço e tente novamente." : `Não foi possível ativar: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  if (state === "unconfigured") {
    return <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-[0.66rem] text-amber-700 dark:text-amber-300">OneSignal não configurado.</p>;
  }
  if (state === "unsupported") return <p className="text-[0.66rem] muted">Este navegador não suporta Web Push.</p>;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" onClick={handleClick} disabled={state === "loading" || state === "granted"} aria-busy={state === "loading"} className={`btn !px-3 !py-1.5 !text-[0.7rem] ${state === "granted" ? "btn-ghost" : "btn-primary"}`}>
        {state === "loading" ? "Aguardando permissão…" : state === "granted" ? "✓ Notificações no Navegador ativadas" : state === "denied" ? "Bloqueado — toque para ver como liberar" : "🔔 Notificações no Navegador"}
      </button>
      {subId ? <span className="text-[0.58rem] muted">subscription {subId.slice(0, 8)}…</span> : null}
    </div>
  );
}
