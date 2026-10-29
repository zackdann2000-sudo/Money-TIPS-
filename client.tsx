"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";
import { loginAction, signupAction, type FormState } from "@/app/actions";

type LiveNotification = { id: number; title: string; body: string; type: string; matchId: number | null; teamId: number | null };
type LivePayload = {
  notifications: LiveNotification[];
  favoriteTeams: { id: number; name: string }[];
  liveCount: number;
  stamp: number;
  loggedIn: boolean;
  unread: number;
  sound: boolean;
  lastId: number;
};

let audioCtx: AudioContext | null = null;
function getAudio() {
  if (typeof window === "undefined") return null;
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return null;
    audioCtx ??= new Ctx();
    if (audioCtx.state === "suspended") void audioCtx.resume();
    return audioCtx;
  } catch {
    return null;
  }
}

/** Toca um som curto de alerta (sem arquivos externos). Gol = 3 notas; demais = 2 notas. */
export function playAlertSound(type = "goal") {
  const ctx = getAudio();
  if (!ctx) return;
  const notes = type === "goal" || type === "penalty" ? [660, 880, 1320] : type === "end" ? [880, 660] : [740, 988];
  const now = ctx.currentTime;
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, now + i * 0.16);
    gain.gain.exponentialRampToValueAtTime(0.35, now + i * 0.16 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.16 + 0.15);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now + i * 0.16);
    osc.stop(now + i * 0.16 + 0.16);
  });
  if ("vibrate" in navigator) navigator.vibrate?.(type === "goal" ? [120, 60, 120] : 80);
}

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const action = mode === "login" ? loginAction : signupAction;
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, {});
  const formRef = useRef<HTMLFormElement>(null);

  function fill(email: string, password: string) {
    const form = formRef.current;
    if (!form) return;
    (form.elements.namedItem("email") as HTMLInputElement).value = email;
    (form.elements.namedItem("password") as HTMLInputElement).value = password;
  }

  return (
    <form ref={formRef} action={formAction} className="space-y-3">
      {mode === "signup" ? (
        <>
          <div>
            <label className="label" htmlFor="name">Nome completo</label>
            <input id="name" name="name" className="input" placeholder="Como quer ser chamado" required autoComplete="name" />
          </div>
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-[0.7rem] font-semibold text-emerald-700 dark:text-emerald-300">
            🎁 Cadastre-se com uma conta <b>@gmail.com</b> e ganhe <b>1 dia grátis</b> de acesso completo. Outros e-mails: 6 horas de teste.
          </div>
        </>
      ) : null}
      <div>
        <label className="label" htmlFor="email">E-mail</label>
        <input id="email" name="email" type="email" className="input" placeholder="seuemail@gmail.com" required autoComplete="email" />
      </div>
      <div>
        <label className="label" htmlFor="password">Senha</label>
        <input id="password" name="password" type="password" className="input" placeholder="Mínimo 6 caracteres" required autoComplete={mode === "login" ? "current-password" : "new-password"} />
      </div>
      {mode === "signup" ? (
        <label className="flex items-start gap-2 text-[0.7rem] muted">
          <input type="checkbox" name="terms" className="mt-0.5 h-4 w-4 accent-emerald-500" />
          Aceito os termos de uso, a política de privacidade e o recebimento de alertas de jogos.
        </label>
      ) : null}
      {state.error ? <p className="rounded-lg bg-rose-500/10 px-3 py-2 text-[0.72rem] font-semibold text-rose-500">{state.error}</p> : null}
      <button type="submit" disabled={pending} className="btn btn-primary w-full disabled:opacity-60">
        {pending ? "Processando..." : mode === "login" ? "Entrar no GreenScore" : "Criar minha conta grátis"}
      </button>
      {mode === "login" ? (
        <div className="flex gap-1.5">
          <button type="button" onClick={() => fill("demo@gmail.com", "demo123")} className="btn btn-ghost flex-1 !py-1.5 !text-[0.65rem]">
            Demo VIP
          </button>
          <button type="button" onClick={() => fill("admin@greenscore.app", "admin123")} className="btn btn-ghost flex-1 !py-1.5 !text-[0.65rem]">
            Demo Admin
          </button>
          <button type="button" onClick={() => fill("marina@gmail.com", "demo123")} className="btn btn-ghost flex-1 !py-1.5 !text-[0.65rem]">
            Expirado
          </button>
        </div>
      ) : null}
    </form>
  );
}

export function LivePoller({ enabled = true }: { enabled?: boolean }) {
  const router = useRouter();
  const [toasts, setToasts] = useState<LiveNotification[]>([]);
  const [favoriteMatch, setFavoriteMatch] = useState<string | null>(null);
  const lastId = useRef<number>(0);
  const soundOn = useRef(true);

  // Desbloqueia o áudio no primeiro toque (exigência dos navegadores)
  useEffect(() => {
    const unlock = () => {
      getAudio();
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    async function tick() {
      try {
        const response = await fetch(`/api/live?since=${lastId.current}`, { cache: "no-store" });
        if (!response.ok) return;
        const data: LivePayload = await response.json();
        if (cancelled) return;
        soundOn.current = data.sound;
        if (!data.loggedIn) {
          setFavoriteMatch(null);
          return;
        }
        const fresh = lastId.current > 0 ? data.notifications : [];
        lastId.current = Math.max(lastId.current, data.lastId || 0, ...data.notifications.map((n) => n.id));
        if (fresh.length > 0) {
          setToasts((current) => [...fresh, ...current].slice(0, 3));
          if (soundOn.current) playAlertSound(fresh[fresh.length - 1].type);
          if (typeof Notification !== "undefined" && Notification.permission === "granted") {
            for (const n of fresh.slice(0, 3)) {
              try {
                new Notification(n.title, { body: n.body, icon: "/icon.svg", tag: `gs-${n.id}` });
              } catch {
                /* navegador sem suporte */
              }
            }
          }
          router.refresh();
          setTimeout(() => setToasts((current) => current.filter((t) => !fresh.some((f) => f.id === t.id))), 8000);
        }
        setFavoriteMatch(
          data.favoriteTeams.length > 0
            ? `${data.favoriteTeams.map((t) => t.name).join(" e ")} em campo agora · ${data.liveCount} jogo(s) ao vivo`
            : null,
        );
      } catch {
        /* offline */
      }
    }
    tick();
    const interval = setInterval(tick, 20000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [enabled, router]);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-28 z-50 flex flex-col items-center gap-2 px-3 lg:left-[260px] lg:right-4 lg:top-4 lg:items-end">
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto w-full max-w-sm animate-toast rounded-xl border border-emerald-500/40 bg-[var(--surface-2)] px-3 py-2.5 shadow-2xl">
          <div className="flex items-start gap-2">
            <span className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--brand-soft)] text-sm">🔔</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[0.78rem] font-bold">{toast.title}</p>
              <p className="line-clamp-2 text-[0.68rem] muted">{toast.body}</p>
              {toast.matchId ? (
                <Link href={`/jogos/${toast.matchId}`} className="mt-1 inline-block text-[0.65rem] font-bold text-[var(--brand)]">
                  Ver partida →
                </Link>
              ) : null}
            </div>
            <button type="button" onClick={() => setToasts((c) => c.filter((t) => t.id !== toast.id))} className="text-[0.7rem] muted" aria-label="Fechar">✕</button>
          </div>
        </div>
      ))}
      {favoriteMatch ? (
        <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-[var(--brand)]/40 bg-[var(--surface-2)] px-3 py-1.5 text-[0.68rem] font-bold shadow-lg">
          <span className="live-dot" />
          <span className="max-w-[240px] truncate">{favoriteMatch}</span>
        </div>
      ) : null}
    </div>
  );
}

export function AlertSoundTools() {
  const [permission, setPermission] = useState<string>("default");
  useEffect(() => {
    if (typeof Notification !== "undefined") setPermission(Notification.permission);
  }, []);
  return (
    <div className="flex flex-wrap gap-1.5">
      <button type="button" onClick={() => playAlertSound("goal")} className="btn btn-ghost !px-2.5 !py-1.5 !text-[0.68rem]">
        🔊 Testar som de gol
      </button>
      <button type="button" onClick={() => playAlertSound("corner")} className="btn btn-ghost !px-2.5 !py-1.5 !text-[0.68rem]">
        🔔 Testar som padrão
      </button>
      {typeof window !== "undefined" && "Notification" in window ? (
        <button
          type="button"
          onClick={async () => {
            try {
              const result = await Notification.requestPermission();
              setPermission(result);
              if (result === "granted") new Notification("GreenScore", { body: "Notificações do navegador ativadas ✓", icon: "/icon.svg" });
            } catch {
              /* noop */
            }
          }}
          className={`btn !px-2.5 !py-1.5 !text-[0.68rem] ${permission === "granted" ? "btn-ghost" : "btn-primary"}`}
        >
          {permission === "granted" ? "✓ Notificações do navegador ativas" : permission === "denied" ? "Notificações bloqueadas no navegador" : "📱 Ativar notificações do navegador"}
        </button>
      ) : null}
    </div>
  );
}

export function LiveRefresher({ intervalMs = 30000 }: { intervalMs?: number }) {
  const router = useRouter();
  const [seconds, setSeconds] = useState(intervalMs / 1000);
  useEffect(() => {
    const tick = setInterval(() => {
      setSeconds((current) => {
        if (current <= 1) {
          router.refresh();
          return intervalMs / 1000;
        }
        return current - 1;
      });
    }, 1000);
    return () => clearInterval(tick);
  }, [router, intervalMs]);
  return (
    <button
      type="button"
      onClick={() => {
        router.refresh();
        setSeconds(intervalMs / 1000);
      }}
      className="chip !border-emerald-500/40 !bg-emerald-500/10 !text-emerald-600 dark:!text-emerald-400"
      title="Atualização automática"
    >
      <span className="live-dot" /> auto {seconds}s
    </button>
  );
}

export type LineupPlayer = { name: string; number: number; pos: string; rating: string; status?: string };

export function LineupBoard({
  sides,
}: {
  sides: { name: string; short: string; color: string; colorAlt: string; formation: string; confidence?: number; source?: string; players: LineupPlayer[] }[];
}) {
  const [active, setActive] = useState(0);
  const side = sides[active] ?? sides[0];
  if (!side) return null;
  return (
    <div className="card overflow-hidden">
      <div className="flex gap-1 border-b p-1.5 hairline">
        {sides.map((item, index) => (
          <button
            key={item.name}
            type="button"
            onClick={() => setActive(index)}
            className={`flex-1 rounded-lg px-2 py-1.5 text-[0.72rem] font-bold transition ${
              index === active ? "bg-[var(--brand-soft)] text-[var(--brand)]" : "muted"
            }`}
          >
            {item.short} · {item.formation}
          </button>
        ))}
      </div>
      <div className="flex items-center justify-between px-3 py-2 text-[0.65rem] muted">
        <span>Escalação prevista · {side.formation}</span>
        <span className="font-bold text-[var(--brand)]">{side.confidence ?? 75}% confiança</span>
      </div>
      <div className="pitch relative m-2 rounded-xl bg-gradient-to-b from-emerald-900 to-emerald-950 px-3 py-5">
        <div className="mx-auto flex max-w-[300px] flex-col gap-6">
          {[0, 1, 2, 3].map((line) => {
            const groups = [side.players.slice(0, 1), side.players.slice(1, 5), side.players.slice(5, 8), side.players.slice(8, 11)];
            return (
              <div key={line} className="flex items-start justify-around gap-1">
                {groups[line].map((player) => (
                  <div key={`${player.number}-${player.name}`} className="flex w-[46px] flex-col items-center gap-0.5 text-center">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white/25 bg-white/15 text-[0.6rem] font-black text-white backdrop-blur">
                      {player.number}
                    </span>
                    <span className="w-full truncate text-[0.52rem] font-bold leading-tight text-white">{player.name.split(" ").slice(-1)[0]}</span>
                    <span className="text-[0.45rem] font-semibold uppercase text-emerald-300">{player.pos}</span>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
      <div className="divide-y hairline">
        {side.players.map((player) => (
          <div key={`${player.number}-${player.name}-row`} className="flex items-center gap-2 px-3 py-1.5">
            <span className="w-5 text-center text-[0.65rem] font-black muted">{player.number}</span>
            <span className="flex-1 truncate text-[0.75rem] font-semibold">{player.name}</span>
            <span className="chip !py-0 !text-[0.55rem]">{player.pos}</span>
            {player.status === "Dúvida" ? <span className="chip !border-amber-500/40 !text-amber-500 !py-0 !text-[0.5rem]">dúvida</span> : null}
            <span className="w-7 text-right text-[0.68rem] font-extrabold text-emerald-500">{player.rating}</span>
          </div>
        ))}
      </div>
      <p className="border-t px-3 py-2 text-[0.58rem] muted hairline">{side.source ?? "Modelo estatístico GreenScore"}</p>
    </div>
  );
}

export function ApiKeyInput({ name, defaultValue }: { name: string; defaultValue?: string }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input
        name={name}
        type={visible ? "text" : "password"}
        defaultValue={defaultValue ?? ""}
        placeholder="Cole a chave da API"
        className="input pr-14 font-mono !text-[0.72rem]"
        autoComplete="off"
      />
      <button type="button" onClick={() => setVisible((v) => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 text-[0.62rem] font-bold text-[var(--brand)]">
        {visible ? "ocultar" : "mostrar"}
      </button>
    </div>
  );
}

type PresetOption = { id: string; label: string; baseUrl: string; authHint: string; docs: string };

export function ProviderSelect({
  presets,
  defaultProvider = "football-data",
  defaultBaseUrl,
}: {
  presets: PresetOption[];
  defaultProvider?: string;
  defaultBaseUrl?: string;
}) {
  const initial = presets.find((p) => p.id === defaultProvider) ?? presets[0];
  const [provider, setProvider] = useState(initial.id);
  const [baseUrl, setBaseUrl] = useState(defaultBaseUrl ?? initial.baseUrl);
  const current = presets.find((p) => p.id === provider) ?? initial;
  return (
    <div className="space-y-2">
      <div>
        <label className="label">Provedor</label>
        <select
          name="provider"
          value={provider}
          onChange={(event) => {
            const next = presets.find((p) => p.id === event.target.value);
            setProvider(event.target.value);
            if (next) setBaseUrl(next.baseUrl);
          }}
          className="input"
        >
          {presets.map((p) => (
            <option key={p.id} value={p.id}>{p.label}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="label">Base URL da API</label>
        <input name="baseUrl" value={baseUrl} onChange={(event) => setBaseUrl(event.target.value)} className="input font-mono !text-[0.72rem]" placeholder="https://..." />
        <p className="mt-1 text-[0.6rem] muted">
          Autenticação: {current.authHint}.{" "}
          {current.docs ? (
            <a href={current.docs} target="_blank" rel="noreferrer" className="font-bold text-[var(--brand)]">📖 Documentação / obter chave →</a>
          ) : null}
        </p>
      </div>
    </div>
  );
}

export function Collapse({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="card overflow-hidden">
      <button type="button" onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between px-3 py-2.5 text-left">
        <span className="text-[0.8rem] font-bold">{title}</span>
        <span className="text-sm muted">{open ? "−" : "+"}</span>
      </button>
      {open ? <div className="border-t px-3 py-3 hairline">{children}</div> : null}
    </div>
  );
}

export function CopyButton({ value, label = "Copiar" }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1600);
        } catch {
          /* noop */
        }
      }}
      className="chip"
    >
      {copied ? "copiado ✓" : label}
    </button>
  );
}
