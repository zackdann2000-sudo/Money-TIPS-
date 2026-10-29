"use client";

import { useCallback, useEffect, useState } from "react";
import type { OportunidadesResultado } from "@/lib/opportunities";
import { DataFooter } from "@/components/ui";

type Team = { id: number; nome: string; sigla: string; cor: string; escudo?: string };
type Props = { mandante: Team; visitante: Team; antes?: string };

const ICON: Record<string, string> = { Gols: "⚽", Faltas: "✋", "Chutes no Gol": "🥅", Escanteios: "🚩" };

function Card({ o }: { o: OportunidadesResultado["todosMercados"][number] }) {
  const green = o.disponivel && o.acertos >= 7;
  return (
    <article className={`relative flex h-[156px] flex-col rounded-2xl border p-3 ${green ? "border-emerald-500/40 bg-gradient-to-b from-emerald-950/40 to-zinc-950 shadow-[0_0_24px_-8px_rgba(16,185,129,0.6)]" : "border-zinc-800 bg-zinc-950"} ${!o.disponivel ? "opacity-60" : ""}`}>
      <div className="flex items-start justify-between">
        <span className="text-lg leading-none">{ICON[o.mercado] ?? "📊"}</span>
        <span className="rounded-full bg-zinc-900 px-1.5 py-0.5 text-[0.5rem] font-bold text-zinc-400">Mais de {o.linha.toFixed(1)} {o.mercado}</span>
      </div>
      <p className="mt-1 text-[0.78rem] font-extrabold leading-tight text-zinc-100">{o.mercado}</p>
      <p className="text-[0.6rem] text-zinc-400">{o.periodo} · média <b className="text-zinc-200">{o.media.toFixed(2)}</b></p>
      <div className="mt-auto flex items-end justify-between">
        <div>
          {o.disponivel ? (
            <>
              <p className={`text-[1.65rem] font-black leading-none tabular-nums ${green ? "text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.9)]" : "text-zinc-300"}`}>{o.acertos}/{o.totalJogos}{o.totalJogos < 5 ? <span className="ml-1 align-middle rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[0.45rem] font-black text-amber-400">Base Parcial</span> : null}</p>
              <div className="mt-1 flex gap-[2px]">{o.historico.map((v, i) => <span key={i} title={`jogo ${i + 1}: ${v}`} className={`h-1.5 w-2 rounded-sm ${v > o.linha ? (green ? "bg-emerald-400" : "bg-zinc-400") : "bg-zinc-800"}`} />)}</div>
            </>
          ) : <p className="text-[0.6rem] text-amber-400">indisponível<br /><span className="text-zinc-500">{o.motivo}</span></p>}
        </div>
        {o.disponivel ? (o.oddEstimada > 0 ? <span className={`rounded-xl px-2 py-1 text-[0.78rem] font-black tabular-nums ${green ? "bg-emerald-500 text-emerald-950" : "bg-zinc-800 text-zinc-200"}`}>@{o.oddEstimada.toFixed(2)}</span> : <span className="rounded-xl bg-zinc-900 px-2 py-1 text-[0.5rem] font-bold text-zinc-500">Odd Indisponível</span>) : null}
      </div>
    </article>
  );
}

export default function OportunidadesBoard({ mandante, visitante, antes }: Props) {
  const [lado, setLado] = useState<"mandante" | "visitante">("mandante");
  const [soVerdes, setSoVerdes] = useState(false);
  const [data, setData] = useState<Record<string, OportunidadesResultado | null>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const team = lado === "mandante" ? mandante : visitante;

  const load = useCallback(async (which: "mandante" | "visitante") => {
    const t = which === "mandante" ? mandante : visitante;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/oportunidades?timeId=${t.id}&mandante=${which === "mandante" ? 1 : 0}${antes ? `&antes=${antes}` : ""}`, { cache: "no-store" });
      const body = (await res.json()) as OportunidadesResultado & { error?: string };
      if (!res.ok || body.error) throw new Error(body.error ?? `HTTP ${res.status}`);
      setData((d) => ({ ...d, [which]: body }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao calcular oportunidades.");
    } finally {
      setLoading(false);
    }
  }, [mandante, visitante, antes]);

  useEffect(() => { if (!data[lado]) load(lado); }, [lado, data, load]);

  const r = data[lado] ?? null;
  const list = r ? (soVerdes ? r.todosMercados.filter((m) => m.disponivel && m.acertos >= 7) : r.todosMercados) : [];
  const greens = r?.oportunidades.length ?? 0;

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 text-zinc-100">
      <div className="border-b border-zinc-800 px-3 py-2.5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[0.8rem] font-extrabold">Oportunidades <span className="text-[0.6rem] font-semibold text-zinc-500">· últimos 10 jogos</span></p>
          <label className="flex cursor-pointer items-center gap-1.5 text-[0.6rem] text-zinc-400"><input type="checkbox" checked={soVerdes} onChange={(e) => setSoVerdes(e.target.checked)} className="h-3.5 w-3.5 accent-emerald-500" /> só greens (≥7/10)</label>
        </div>
        {/* Seletor Mandante / Visitante */}
        <div className="mt-2 grid grid-cols-2 gap-1 rounded-xl bg-zinc-900 p-1">
          {(["mandante", "visitante"] as const).map((k) => {
            const t = k === "mandante" ? mandante : visitante;
            return (
              <button key={k} type="button" onClick={() => setLado(k)} className={`flex items-center justify-center gap-2 rounded-lg px-2 py-1.5 text-[0.7rem] font-bold transition ${lado === k ? "bg-zinc-800 text-white ring-1 ring-emerald-500/40" : "text-zinc-500"}`}>
                {t.escudo ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={t.escudo} alt="" width={18} height={18} className="h-[18px] w-[18px] object-contain" /> : <span className="h-2.5 w-2.5 rounded-full" style={{ background: t.cor }} />}
                <span className="truncate">{t.nome}</span>
                <span className="text-[0.52rem] uppercase text-zinc-500">{k}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="px-3 py-3">
        {loading && !r ? <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-[156px] animate-pulse rounded-2xl bg-zinc-900" />)}</div> : null}
        {error ? <div className="rounded-xl border border-rose-500/40 px-3 py-3 text-[0.72rem]"><b className="text-rose-400">Erro:</b> {error} <button type="button" onClick={() => load(lado)} className="ml-2 font-bold text-emerald-400">tentar novamente</button></div> : null}
        {r ? (
          <>
            <div className="mb-2 flex flex-wrap items-center gap-1.5 text-[0.6rem] text-zinc-400">
              <span className={`rounded-full px-2 py-0.5 font-bold ${r.fonte === "none" ? "bg-rose-500/15 text-rose-400" : "bg-emerald-500/15 text-emerald-400"}`}>fonte: {r.fonte}</span>
              <span>{r.jogosAnalisados} jogos analisados</span>
              <span>· <b className="text-emerald-400">{greens}</b> green(s)</span>
              {r.aviso ? <span className="text-amber-400">· {r.aviso}</span> : null}
            </div>
            {list.length === 0 ? <p className="py-6 text-center text-[0.7rem] text-zinc-500">{soVerdes ? "Nenhum mercado com 7 acertos ou mais para este time." : r.aviso ?? "Sem dados."}</p> : null}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{list.map((o) => <Card key={`${o.mercado}-${o.periodo}`} o={o} />)}</div>
            {r.jogos.length ? (
              <details className="mt-2 text-[0.6rem] text-zinc-500">
                <summary className="cursor-pointer font-bold text-zinc-400">Jogos considerados ({r.jogos.length})</summary>
                <ul className="mt-1 grid gap-0.5 sm:grid-cols-2">{r.jogos.map((j, i) => <li key={i}>{j.data.split("-").reverse().slice(0, 2).join("/")} · {j.emCasa ? "vs" : "@"} {j.adversario} <b className="text-zinc-300">{j.placar}</b></li>)}</ul>
              </details>
            ) : null}
            <p className="mt-2 text-[0.55rem] leading-relaxed text-zinc-500">Acertos = jogos em que o valor do time superou a linha. Odd estimada = 1 ÷ (acertos/10 − 0,06). Verde neon a partir de 7/10. Conteúdo informativo · +18.</p>
          </>
        ) : null}
      </div>
      {r ? <DataFooter dark fonte={r.fonte} amostra={r.jogosAnalisados} /> : null}
    </div>
  );
}
