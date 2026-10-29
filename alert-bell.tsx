"use client";

import { useCallback, useEffect, useState } from "react";
import type { AlertFlags } from "@/db/schema";

/* ====================================================================== */
/*  Sino de alertas (estilo Flashscore) — modal com toggles por evento      */
/*  Salva em POST /api/preferences { teamId, matchId?, alerts }             */
/* ====================================================================== */

const DEFAULTS: AlertFlags = { goals: true, redCards: true, lineups: true, matchStart: false, matchEnd: true, substitutions: false, yellowCards: false, corners: false, pressure: true };

const OPTIONS: { key: keyof AlertFlags; label: string; icon: string; hint: string }[] = [
  { key: "goals", label: "Gols", icon: "⚽", hint: "Inclui pênaltis convertidos" },
  { key: "redCards", label: "Cartões vermelhos", icon: "🟥", hint: "Expulsões" },
  { key: "lineups", label: "Escalações", icon: "📋", hint: "Quando a escalação oficial sair" },
  { key: "matchStart", label: "Início de jogo", icon: "▶️", hint: "Bola rolando" },
  { key: "matchEnd", label: "Fim de jogo", icon: "⏱️", hint: "Resultado final" },
  { key: "substitutions", label: "Substituições", icon: "🔄", hint: "Pode gerar vários avisos por jogo" },
  { key: "yellowCards", label: "Cartões amarelos", icon: "🟨", hint: "" },
  { key: "corners", label: "Escanteios", icon: "🚩", hint: "Cada escanteio (muitos avisos)" },
  { key: "pressure", label: "Lances principais", icon: "🔥", hint: "Agrupa escanteios, chutes e faltas em um só aviso a cada 5 min" },
];

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" role="switch" aria-checked={on} onClick={() => onChange(!on)} className={`relative h-6 w-11 shrink-0 rounded-full transition ${on ? "bg-emerald-500" : "bg-zinc-600"}`}>
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${on ? "left-[22px]" : "left-0.5"}`} />
    </button>
  );
}

export function AlertBell({ teamId, teamName, matchId, loggedIn, compact = false, className = "" }: { teamId: number; teamName: string; matchId?: number; loggedIn: boolean; compact?: boolean; className?: string }) {
  const [open, setOpen] = useState(false);
  const [alerts, setAlerts] = useState<AlertFlags>(DEFAULTS);
  const [hasPref, setHasPref] = useState(false);
  const [scope, setScope] = useState<"team" | "match">(matchId ? "match" : "team");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!loggedIn) return;
    const q = `teamId=${teamId}${scope === "match" && matchId ? `&matchId=${matchId}` : ""}`;
    const res = await fetch(`/api/preferences?${q}`, { cache: "no-store" });
    if (!res.ok) return;
    const body = (await res.json()) as { preference: { alerts: AlertFlags; muted: boolean } | null };
    setHasPref(Boolean(body.preference));
    setAlerts(body.preference ? { ...DEFAULTS, ...body.preference.alerts } : DEFAULTS);
  }, [teamId, matchId, scope, loggedIn]);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    setSaving(true); setMsg(null);
    try {
      const res = await fetch("/api/preferences", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ teamId, matchId: scope === "match" ? matchId : null, alerts }) });
      const body = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || body.error) throw new Error(body.error ?? `HTTP ${res.status}`);
      setHasPref(true); setMsg("✓ Alertas salvos."); setTimeout(() => setOpen(false), 700);
    } catch (e) { setMsg(e instanceof Error ? e.message : "Falha ao salvar."); } finally { setSaving(false); }
  };
  const remove = async () => {
    await fetch("/api/preferences", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ teamId, matchId: scope === "match" ? matchId : null }) });
    setHasPref(false); setAlerts(DEFAULTS); setMsg("Alertas removidos.");
  };
  const ativos = OPTIONS.filter((o) => alerts[o.key]).length;

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} title={hasPref ? `Alertas ativos (${ativos})` : "Configurar alertas"} className={`chip ${hasPref ? "!border-emerald-500/50 !bg-emerald-500/10 !text-emerald-500" : ""} ${className}`}>
        {hasPref ? "🔔" : "🔕"}{compact ? "" : hasPref ? ` ${ativos} alertas` : " Alertas"}
      </button>

      {open ? (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/70 p-3 sm:items-center" onClick={() => setOpen(false)}>
          <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 text-zinc-100 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
              <div><p className="text-[0.62rem] font-bold uppercase tracking-[0.16em] text-emerald-400">Notificações</p><p className="text-[0.9rem] font-extrabold">🔔 {teamName}</p></div>
              <button type="button" onClick={() => setOpen(false)} className="text-zinc-500">✕</button>
            </div>
            {!loggedIn ? (
              <div className="px-4 py-6 text-center text-[0.74rem] text-zinc-400">Entre na sua conta para receber alertas deste time no celular.</div>
            ) : (
              <>
                {matchId ? (
                  <div className="flex gap-1 px-4 pt-3">
                    {(["match", "team"] as const).map((s) => <button key={s} type="button" onClick={() => setScope(s)} className={`rounded-full px-3 py-1 text-[0.62rem] font-bold ${scope === s ? "bg-emerald-500 text-emerald-950" : "bg-zinc-900 text-zinc-400"}`}>{s === "match" ? "Só esta partida" : "Todas as partidas do time"}</button>)}
                  </div>
                ) : null}
                <ul className="divide-y divide-zinc-900 px-4 py-2">
                  {OPTIONS.map((o) => (
                    <li key={o.key} className="flex items-center gap-3 py-2.5">
                      <span className="text-lg">{o.icon}</span>
                      <span className="min-w-0 flex-1"><span className="block text-[0.78rem] font-bold">{o.label}</span>{o.hint ? <span className="block text-[0.58rem] text-zinc-500">{o.hint}</span> : null}</span>
                      <Toggle on={Boolean(alerts[o.key])} onChange={(v) => setAlerts((a) => ({ ...a, [o.key]: v }))} />
                    </li>
                  ))}
                </ul>
                <div className="flex flex-wrap items-center gap-2 border-t border-zinc-800 px-4 py-3">
                  <button type="button" onClick={save} disabled={saving} className="btn btn-primary flex-1 !py-2 !text-[0.74rem] disabled:opacity-60">{saving ? "Salvando…" : "Salvar alertas"}</button>
                  <button type="button" onClick={() => setAlerts(Object.fromEntries(OPTIONS.map((o) => [o.key, true])) as unknown as AlertFlags)} className="btn btn-ghost !py-2 !text-[0.66rem]">Todos</button>
                  <button type="button" onClick={() => setAlerts(Object.fromEntries(OPTIONS.map((o) => [o.key, false])) as unknown as AlertFlags)} className="btn btn-ghost !py-2 !text-[0.66rem]">Nenhum</button>
                  {hasPref ? <button type="button" onClick={remove} className="w-full text-center text-[0.62rem] font-bold text-rose-400">Remover alertas deste {scope === "match" ? "jogo" : "time"}</button> : null}
                  {msg ? <p className="w-full text-center text-[0.64rem] text-emerald-400">{msg}</p> : null}
                  <p className="w-full text-[0.54rem] leading-relaxed text-zinc-500">Os avisos chegam pelo Web Push/OneSignal mesmo com o site fechado (ative o push em Notificações). "Lances principais" agrupa eventos menores para evitar spam.</p>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
