"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Pick } from "@/lib/money-tips";
import { DataFooter } from "@/components/ui";

type Payload = { data: string; jogosAnalisados: number; aviso: string | null; jogo: Pick["jogo"] | null; analiseTexto: string | null; oportunidade: Pick["oportunidade"] | null; melhores: Pick[]; error?: string };

const TZ = "America/Sao_Paulo";
const dayKeyLocal = (d: Date) => { const p = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(d); const g = (t: string) => p.find((x) => x.type === t)?.value ?? ""; return `${g("year")}-${g("month")}-${g("day")}`; };
const WEEK = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];

function Crest({ src, name, size = 44 }: { src?: string; name: string; size?: number }) {
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={name} width={size} height={size} loading="lazy" className="object-contain drop-shadow" style={{ width: size, height: size }} />
  ) : <span className="flex items-center justify-center rounded-full bg-zinc-800 text-[0.55rem] font-black text-zinc-300 ring-1 ring-zinc-700" style={{ width: size, height: size }}>{name.slice(0, 3).toUpperCase()}</span>;
}

/* ------------------------- Gráfico "Últimos 10 Jogos" ------------------------- */
export function Last10Chart({ valores, historico, linha, unidade }: { valores: number[]; historico: Pick["oportunidade"]["historico"]; linha: number; unidade: string }) {
  const max = Math.max(linha + 1, ...valores, 1);
  const H = 120; // altura útil (px)
  const y = (v: number) => (v / max) * H;
  const [sel, setSel] = useState<number | null>(null); // índice (na ordem exibida) da barra selecionada
  const shown = [...valores].reverse();
  const shownHist = [...historico].reverse();
  const selected = sel !== null ? { v: shown[sel], h: shownHist[sel] } : null;
  return (
    <div className="relative rounded-2xl border border-zinc-800 bg-zinc-950 p-3">
      <div className="flex items-center justify-between"><p className="text-[0.72rem] font-extrabold text-zinc-100">Últimos 10 Jogos</p><p className="text-[0.56rem] text-zinc-500">{unidade} por jogo · mais recente à direita</p></div>
      <div className="relative mt-6" style={{ height: H + 56 }}>
        {/* linha tracejada */}
        <div className="absolute inset-x-0 flex items-center" style={{ bottom: 32 + y(linha) }}>
          <span className="w-full border-t-2 border-dashed border-violet-400/70" />
          <span className="absolute -right-0 -top-4 rounded bg-violet-500/20 px-1 text-[0.5rem] font-bold text-violet-300">{linha}</span>
        </div>
        <div className="absolute inset-x-0 bottom-0 top-0 grid" style={{ gridTemplateColumns: `repeat(${valores.length}, minmax(0, 1fr))` }}>
          {[...valores].reverse().map((v, idx) => {
            const h = [...historico].reverse()[idx];
            const acima = v > linha;
            return (
              <button type="button" key={idx} onClick={() => setSel(sel === idx ? null : idx)} aria-label={h ? `${h.emCasa ? "vs" : "@"} ${h.adversario} ${h.placar}` : String(v)} className={`relative flex flex-col items-center justify-end rounded-lg transition ${sel === idx ? "bg-violet-500/15 ring-1 ring-violet-400/60" : "hover:bg-zinc-900/60"}`}>
                {/* escudo do adversário acima */}
                <div className="absolute top-0 flex flex-col items-center"><Crest src={h?.logoAdversario} name={h?.adversario ?? "?"} size={18} /></div>
                <span className={`mb-0.5 text-[0.6rem] font-black ${acima ? "text-violet-300" : "text-zinc-500"}`}>{v}</span>
                <div className={`w-[55%] rounded-t-md transition-all ${acima ? "bg-gradient-to-t from-violet-700 to-violet-400 shadow-[0_0_12px_rgba(167,139,250,0.5)]" : "bg-zinc-700"}`} style={{ height: Math.max(3, y(v)) }} />
                <span className="mt-1 h-7 text-center text-[0.48rem] leading-tight text-zinc-500">{h ? `${h.emCasa ? "C" : "F"} · ${h.data.slice(8, 10)}/${h.data.slice(5, 7)}` : ""}</span>
              </button>
            );
          })}
        </div>
      </div>
      {/* Tooltip/modal do jogo selecionado */}
      {selected?.h ? (
        <div className="mt-2 flex items-center gap-3 rounded-xl border border-violet-500/40 bg-violet-500/10 px-3 py-2 text-zinc-100 animate-slide-up">
          <Crest src={selected.h.logoAdversario} name={selected.h.adversario} size={32} />
          <div className="min-w-0 flex-1">
            <p className="text-[0.74rem] font-bold">{selected.h.emCasa ? "vs" : "@"} {selected.h.adversario} <span className="text-zinc-400">· {selected.h.data.split("-").reverse().join("/")}</span></p>
            <p className="text-[0.62rem] text-zinc-300">Placar <b className="text-white">{selected.h.placar}</b> · {unidade.toLowerCase()} neste jogo: <b className={selected.v > linha ? "text-violet-300" : "text-zinc-400"}>{selected.v}</b> {selected.v > linha ? "✓ acima da linha" : "✗ abaixo da linha"} {linha}</p>
          </div>
          <button type="button" onClick={() => setSel(null)} className="text-zinc-500">✕</button>
        </div>
      ) : <p className="mt-2 text-center text-[0.52rem] text-zinc-600">Toque em uma barra para ver adversário e placar daquele jogo.</p>}
      <p className="mt-1 text-[0.5rem] text-zinc-500">Roxo = acima da linha {linha} · cinza = abaixo · C/F = casa/fora.</p>
    </div>
  );
}

/* --------------------------------- Pick card --------------------------------- */
function PickView({ p, texto, jogo }: { p: Pick["oportunidade"]; texto: string; jogo: Pick["jogo"] }) {
  const linhaNum = Number(p.linha.replace("+", ""));
  const periodoCurto = p.periodo === "1º Tempo" ? "1ºT" : p.periodo === "2º Tempo" ? "2ºT" : "JOGO";
  const unidade = p.mercado.toLowerCase().includes("gol") ? "Gols" : p.mercado;
  return (
    <div className="space-y-3">
      <Link href={`/jogos/${jogo.matchId}/centro`} className="block rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-4 text-center text-zinc-100">
        <p className="text-[0.58rem] font-bold uppercase tracking-[0.18em] text-zinc-500">{jogo.liga}</p>
        <div className="mt-2 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <div className="flex flex-col items-center gap-1"><Crest src={jogo.logoCasa} name={jogo.timeCasa} /><span className="text-[0.74rem] font-bold leading-tight">{jogo.timeCasa}</span></div>
          <div><p className="text-[1.3rem] font-black tabular-nums">{jogo.horario}</p><p className="text-[0.5rem] uppercase text-zinc-500">{jogo.status === "finished" ? "encerrado" : jogo.status === "live" ? "ao vivo" : "Brasília"}</p></div>
          <div className="flex flex-col items-center gap-1"><Crest src={jogo.logoFora} name={jogo.timeFora} /><span className="text-[0.74rem] font-bold leading-tight">{jogo.timeFora}</span></div>
        </div>
      </Link>

      <p className="rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-justify text-[0.74rem] leading-relaxed text-zinc-300">{texto}</p>

      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-700 via-purple-700 to-fuchsia-800 p-4 text-white shadow-[0_12px_40px_-14px_rgba(139,92,246,0.9)]">
        <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-2"><Crest src={p.logoTime} name={p.time} size={28} /><span className="text-[0.86rem] font-extrabold">{p.time}</span></div>
          <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-[0.62rem] font-black">{periodoCurto}</span>
        </div>
        <p className="relative mt-3 text-[0.62rem] font-bold uppercase tracking-[0.14em] text-violet-200">Oportunidade</p>
        <p className="relative text-[1.05rem] font-black leading-tight">{p.linha} {p.mercado.toUpperCase()} <span className="text-violet-200">·</span> {p.acertos}/{p.totalJogos}</p>
        <div className="relative mt-2 flex flex-wrap items-center gap-1.5 text-[0.6rem] text-violet-100/90">
          <span className="rounded-full bg-black/20 px-2 py-0.5">média {p.media.toFixed(2)}</span>
          <span className="rounded-full bg-black/20 px-2 py-0.5">odd estimada @{p.oddEstimada.toFixed(2)}</span>
          <span className="rounded-full bg-black/20 px-2 py-0.5">fonte {p.fonte}</span>
        </div>
      </div>

      <Last10Chart valores={p.historicoGols} historico={p.historico} linha={linhaNum} unidade={unidade} />
      <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950"><DataFooter dark fonte={p.fonte} amostra={p.totalJogos} extra="histórico anterior à partida" /></div>
    </div>
  );
}

/* --------------------------------- Tela ---------------------------------- */
export default function MoneyTips() {
  const today = useMemo(() => dayKeyLocal(new Date()), []);
  const [date, setDate] = useState(today);
  const [tab, setTab] = useState<"pick" | "melhores" | "arbitros">("pick");
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const days = useMemo(() => Array.from({ length: 9 }, (_, i) => { const d = new Date(Date.now() + (i - 6) * 86400000); const key = dayKeyLocal(d); const label = key === today ? "HOJE" : key === dayKeyLocal(new Date(Date.now() - 86400000)) ? "ONTEM" : key === dayKeyLocal(new Date(Date.now() + 86400000)) ? "AMANHÃ" : WEEK[new Date(`${key}T12:00:00`).getDay()]; return { key, label, num: key.slice(8, 10) }; }), [today]);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`/api/money-tips?data=${date}`, { cache: "no-store" });
      const body = (await res.json()) as Payload;
      if (!res.ok || body.error) throw new Error(body.error ?? `HTTP ${res.status}`);
      setData(body);
    } catch (e) { setError(e instanceof Error ? e.message : "Falha ao carregar."); } finally { setLoading(false); }
  }, [date]);
  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-3 text-zinc-100">
      {/* Header */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950 px-4 pt-3">
        <div className="flex items-center justify-between"><h1 className="text-[1.1rem] font-black tracking-[0.12em]">MONEY <span className="text-violet-400">TIPS</span></h1><span className="text-[0.58rem] text-zinc-500">{data ? `${data.jogosAnalisados} jogos analisados` : ""}</span></div>
        <nav className="mt-2 flex gap-1">
          {([["pick", "PICK DO DIA"], ["melhores", "MELHORES DO DIA"], ["arbitros", "ÁRBITROS"]] as const).map(([k, l]) => (
            <button key={k} type="button" onClick={() => setTab(k)} className={`relative px-3 py-2 text-[0.62rem] font-extrabold tracking-wide ${tab === k ? "text-violet-300" : "text-zinc-500"}`}>{l}{tab === k ? <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-violet-400" /> : null}</button>
          ))}
        </nav>
      </div>

      {/* Seletor de data */}
      <div className="no-scrollbar -mx-3 flex snap-x gap-1.5 overflow-x-auto overscroll-x-contain px-3 pb-1 lg:mx-0 lg:px-0" style={{ WebkitOverflowScrolling: "touch" }}>
        {days.map((d) => (
          <button key={d.key} type="button" onClick={() => setDate(d.key)} className={`flex min-w-[64px] shrink-0 snap-center flex-col items-center rounded-2xl px-2 py-1.5 text-[0.58rem] font-bold transition ${date === d.key ? "bg-violet-600 text-white shadow-[0_8px_20px_-8px_rgba(139,92,246,0.9)]" : "bg-zinc-900 text-zinc-400"}`}>
            <span>{d.label}</span><span className={`text-[0.82rem] font-black ${date === d.key ? "text-white" : "text-zinc-200"}`}>{d.num}</span>
          </button>
        ))}
      </div>

      {loading ? <div className="space-y-3"><div className="h-28 animate-pulse rounded-2xl bg-zinc-900" /><div className="h-16 animate-pulse rounded-2xl bg-zinc-900" /><div className="h-28 animate-pulse rounded-2xl bg-violet-900/40" /><div className="h-48 animate-pulse rounded-2xl bg-zinc-900" /><p className="text-center text-[0.6rem] text-zinc-500">Analisando os últimos 10 jogos de cada time do dia…</p></div> : null}
      {error ? <div className="rounded-2xl border border-rose-500/40 bg-zinc-950 px-3 py-3 text-[0.72rem]"><b className="text-rose-400">Erro:</b> {error} <button type="button" onClick={load} className="ml-2 font-bold text-violet-300">tentar novamente</button></div> : null}

      {!loading && data && tab === "pick" ? (
        data.oportunidade && data.jogo && data.analiseTexto ? <PickView p={data.oportunidade} texto={data.analiseTexto} jogo={data.jogo} /> : <div className="rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-8 text-center text-[0.72rem] text-zinc-500">{data.aviso ?? "Sem pick para esta data."}</div>
      ) : null}

      {!loading && data && tab === "melhores" ? (
        data.melhores.length ? (
          <div className="space-y-2">
            {data.melhores.map((m, i) => (
              <Link key={`${m.jogo.matchId}-${i}`} href={`/jogos/${m.jogo.matchId}/centro`} className="flex items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-950 px-3 py-2.5">
                <span className={`w-6 text-center text-[0.8rem] font-black ${i === 0 ? "text-violet-300" : "text-zinc-500"}`}>{i + 1}º</span>
                <Crest src={m.oportunidade.logoTime} name={m.oportunidade.time} size={30} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[0.74rem] font-bold">{m.oportunidade.time} <span className="text-[0.58rem] font-semibold text-zinc-500">· {m.jogo.timeCasa} x {m.jogo.timeFora} · {m.jogo.horario}</span></p>
                  <p className="truncate text-[0.6rem] text-violet-300">{m.oportunidade.linha} {m.oportunidade.mercado} · {m.oportunidade.periodo}</p>
                </div>
                <div className="text-right"><p className="text-[0.95rem] font-black text-violet-300">{m.oportunidade.acertos}/{m.oportunidade.totalJogos}</p><p className="text-[0.55rem] text-zinc-500">@{m.oportunidade.oddEstimada.toFixed(2)}</p></div>
              </Link>
            ))}
          </div>
        ) : <div className="rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-8 text-center text-[0.72rem] text-zinc-500">{data.aviso ?? "Sem oportunidades ≥7/10 nesta data."}</div>
      ) : null}

      {!loading && tab === "arbitros" ? (
        <div className="rounded-2xl border border-amber-500/30 bg-zinc-950 px-4 py-8 text-center text-[0.72rem] text-zinc-400">A fonte atual não informa o árbitro das partidas nem seu histórico de faltas/cartões. Esta aba é ativada automaticamente ao conectar uma fonte com arbitragem (ex.: API-Football) em Admin → APIs.</div>
      ) : null}

      <p className="px-1 text-[0.54rem] leading-relaxed text-zinc-500">Pick = maior taxa de acerto nos últimos 10 jogos reais (desempate: maior odd estimada), calculado só com jogos anteriores à partida. Odd estimada = 1 ÷ (acertos/10 − 0,06). Conteúdo informativo, não é garantia · +18.</p>
    </div>
  );
}
