"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { SportsAlertFeed, SportsAlertMatch } from "@/lib/sports-alert";

const TZ = "America/Sao_Paulo";
const time = (iso: string) => new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: TZ });

function Logo({ src, name }: { src: string; name: string }) {
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={name} width={40} height={40} loading="lazy" className="h-10 w-10 object-contain drop-shadow" />
  ) : (
    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-800 text-[0.62rem] font-black text-zinc-300 ring-1 ring-zinc-700">{name.slice(0, 3).toUpperCase()}</span>
  );
}

function StatusPill({ m }: { m: SportsAlertMatch }) {
  if (m.isLive) return <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500 px-2 py-0.5 text-[0.58rem] font-black text-emerald-950"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-950" />{m.status === "halftime" ? "INTERVALO" : m.minute ? `${m.minute}'` : "AO VIVO"}</span>;
  if (m.isFinished) return <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[0.58rem] font-black text-zinc-300">ENCERRADO</span>;
  if (m.status === "postponed") return <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[0.58rem] font-black text-amber-400">ADIADO</span>;
  if (m.status === "cancelled") return <span className="rounded-full bg-rose-500/20 px-2 py-0.5 text-[0.58rem] font-black text-rose-400">CANCELADO</span>;
  return <span className="rounded-full bg-sky-500/15 px-2 py-0.5 text-[0.58rem] font-black text-sky-400">{time(m.kickoff_utc)}</span>;
}

function Stat({ label, home, away, pct }: { label: string; home: number | null; away: number | null; pct?: boolean }) {
  const f = (v: number | null) => (v === null ? "—" : pct ? `${Math.round(v)}%` : Number.isInteger(v) ? v : v.toFixed(2));
  const total = (home ?? 0) + (away ?? 0);
  const hp = total ? ((home ?? 0) / total) * 100 : 50;
  return (
    <div className="text-[0.6rem]">
      <div className="flex justify-between"><span className="tabular-nums text-zinc-200">{f(home)}</span><span className="text-zinc-500">{label}</span><span className="tabular-nums text-zinc-200">{f(away)}</span></div>
      <div className="mt-0.5 flex h-1 overflow-hidden rounded-full bg-zinc-800"><div className="bg-emerald-500" style={{ width: `${hp}%` }} /><div className="bg-sky-500" style={{ width: `${100 - hp}%` }} /></div>
    </div>
  );
}

export function MatchCard({ m }: { m: SportsAlertMatch }) {
  const [open, setOpen] = useState(false);
  return (
    <article className={`rounded-2xl border bg-zinc-950 p-3 text-zinc-100 ${m.isLive ? "border-emerald-500/40 shadow-[0_0_0_1px_rgba(16,185,129,0.15)]" : "border-zinc-800"}`}>
      <div className="flex items-center justify-between text-[0.58rem] text-zinc-500">
        <span className="truncate">{m.country ? `${m.country} · ` : ""}{m.leagueName || `Liga ${m.leagueId}`}</span>
        <StatusPill m={m} />
      </div>
      <div className="mt-2 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <div className="flex min-w-0 flex-col items-center gap-1 text-center"><Logo src={m.homeTeamLogo} name={m.homeTeam} /><span className="w-full truncate text-[0.7rem] font-bold">{m.homeTeam}</span></div>
        <div className="text-center">
          {m.isLive || m.isFinished ? (
            <p className="text-[1.5rem] font-black tabular-nums leading-none">{m.homeScore ?? 0}<span className="mx-1 text-zinc-600">-</span>{m.awayScore ?? 0}</p>
          ) : (
            <p className="text-[1.1rem] font-black tabular-nums leading-none">{time(m.kickoff_utc)}</p>
          )}
          <p className="mt-0.5 text-[0.52rem] uppercase tracking-wide text-zinc-500">{m.isLive ? "ao vivo" : m.isFinished ? "final" : "horário de Brasília"}</p>
        </div>
        <div className="flex min-w-0 flex-col items-center gap-1 text-center"><Logo src={m.awayTeamLogo} name={m.awayTeam} /><span className="w-full truncate text-[0.7rem] font-bold">{m.awayTeam}</span></div>
      </div>
      {m.isLive ? (
        <button type="button" onClick={() => setOpen((v) => !v)} className="mt-2 w-full rounded-lg bg-zinc-900 py-1 text-[0.6rem] font-bold text-emerald-400">
          {open ? "ocultar estatísticas" : m.basicStats ? "ver xG · posse · chutes" : "estatísticas ainda indisponíveis"}
        </button>
      ) : null}
      {open && m.basicStats ? (
        <div className="mt-2 space-y-1.5 rounded-xl border border-zinc-800 p-2">
          <Stat label="xG" home={m.basicStats.xg.home} away={m.basicStats.xg.away} />
          <Stat label="Posse" home={m.basicStats.possession.home} away={m.basicStats.possession.away} pct />
          <Stat label="Chutes" home={m.basicStats.shots.home} away={m.basicStats.shots.away} />
          <Stat label="No alvo" home={m.basicStats.shotsOnTarget.home} away={m.basicStats.shotsOnTarget.away} />
          <Stat label="Escanteios" home={m.basicStats.corners.home} away={m.basicStats.corners.away} />
          <p className="text-[0.5rem] text-zinc-500">fonte {m.basicStats.source} · {time(m.basicStats.updatedAt)}</p>
        </div>
      ) : null}
    </article>
  );
}

export default function SportsAlertBoard({ initialDate }: { initialDate: string }) {
  const [date, setDate] = useState(initialDate);
  const [feed, setFeed] = useState<SportsAlertFeed | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "live" | "scheduled" | "finished">("all");
  const [country, setCountry] = useState<string>("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/sports-alert?date=${date}`, { cache: "no-store" });
      const body = (await res.json()) as SportsAlertFeed;
      if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
      setFeed(body);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao carregar o feed.");
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => { load(); const t = setInterval(load, 60000); return () => clearInterval(t); }, [load]);

  const countries = useMemo(() => [...new Set((feed?.matches ?? []).map((m) => m.country).filter(Boolean))].sort(), [feed]);
  const list = useMemo(() => (feed?.matches ?? []).filter((m) => (filter === "live" ? m.isLive : filter === "finished" ? m.isFinished : filter === "scheduled" ? !m.isLive && !m.isFinished : true)).filter((m) => !country || m.country === country), [feed, filter, country]);
  const liveCount = feed?.matches.filter((m) => m.isLive).length ?? 0;
  const shift = (d: number) => setDate(new Date(new Date(`${date}T12:00:00Z`).getTime() + d * 86400000).toISOString().slice(0, 10));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-1.5">
        <button type="button" onClick={() => shift(-1)} className="chip">‹</button>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input !w-auto !py-1 !text-[0.72rem]" />
        <button type="button" onClick={() => shift(1)} className="chip">›</button>
        <div className="ml-auto flex overflow-hidden rounded-lg border hairline text-[0.62rem] font-bold">
          {(["all", "live", "scheduled", "finished"] as const).map((f) => <button key={f} type="button" onClick={() => setFilter(f)} className={`px-2.5 py-1 ${filter === f ? "bg-emerald-500 text-emerald-950" : "muted"}`}>{f === "all" ? "Todos" : f === "live" ? `Ao vivo (${liveCount})` : f === "scheduled" ? "Agendados" : "Encerrados"}</button>)}
        </div>
      </div>
      {countries.length ? (
        <div className="no-scrollbar -mx-3 flex gap-1 overflow-x-auto px-3 lg:mx-0 lg:px-0">
          <button type="button" onClick={() => setCountry("")} className={`chip !py-1 ${!country ? "!border-emerald-500/50 !text-emerald-500" : ""}`}>🌍 Todos os países</button>
          {countries.map((c) => <button key={c} type="button" onClick={() => setCountry(c)} className={`chip !py-1 ${country === c ? "!border-emerald-500/50 !text-emerald-500" : ""}`}>{c}</button>)}
        </div>
      ) : null}
      {feed ? <p className="text-[0.6rem] muted">Fonte: <b className={feed.source === "sportmonks" ? "text-emerald-500" : "text-amber-500"}>{feed.source}</b> · {feed.matches.length} jogos · atualização a cada 60 s{feed.fallbackReason ? ` · ${feed.fallbackReason}` : ""}</p> : null}
      {loading && !feed ? <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-28 animate-pulse rounded-2xl bg-zinc-900" />)}</div> : null}
      {error ? <div className="card border-rose-500/40 px-3 py-3 text-[0.74rem]"><b className="text-rose-500">Erro:</b> {error} <button type="button" onClick={load} className="ml-2 font-bold text-[var(--brand)]">tentar novamente</button></div> : null}
      {!loading && feed && list.length === 0 ? <div className="card px-4 py-8 text-center text-[0.74rem] muted">Nenhum jogo para este filtro.</div> : null}
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{list.map((m) => <MatchCard key={`${m.source}-${m.id}`} m={m} />)}</div>
    </div>
  );
}
