"use client";

import { useEffect, useRef, useState } from "react";
import type { Opportunity } from "./mockData";

type Team = { nome: string; sigla: string; cor: string; escudo?: string };

type Props = {
  casa: Team;
  fora: Team;
  oportunidadesCasa: Opportunity[];
  oportunidadesFora: Opportunity[];
};

const ICON: Record<string, string> = { Gols: "⚽", Escanteios: "🚩", Faltas: "✋", "Arremessos laterais": "🤾", Cartões: "🟨", Finalizações: "🎯", "Finalizações no gol": "🥅", Impedimentos: "🚫" };

function OpportunityCard({ o }: { o: Opportunity }) {
  const green = o.acertos >= 7;
  return (
    <article className="relative flex h-[150px] w-[150px] shrink-0 snap-start flex-col rounded-2xl border border-zinc-800 bg-gradient-to-b from-zinc-900 to-zinc-950 p-3">
      <div className="flex items-start justify-between">
        <span className="text-lg leading-none">{ICON[o.mercado] ?? "📊"}</span>
        {o.demo ? <span className="rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[0.48rem] font-bold text-amber-400">demo</span> : <span className="rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[0.48rem] font-bold text-emerald-400">real</span>}
      </div>
      <p className="mt-1 text-[0.74rem] font-extrabold leading-tight">{o.mercado}</p>
      <p className="text-[0.58rem] text-zinc-400">{o.linha} · {o.periodo}</p>
      <div className="mt-auto flex items-end justify-between">
        <div>
          <p className={`text-[1.5rem] font-black leading-none tabular-nums ${green ? "text-emerald-400" : "text-zinc-300"}`}>{o.acertos}/{o.total}</p>
          <div className="mt-1 flex gap-[2px]">{o.historico.map((v, i) => <span key={i} className={`h-1.5 w-2 rounded-sm ${v > Number(o.linha.replace(/[^\d,]/g, "").replace(",", ".")) ? "bg-emerald-500" : "bg-zinc-700"}`} title={`jogo ${i + 1}: ${v}`} />)}</div>
        </div>
        <span className={`rounded-lg px-1.5 py-0.5 text-[0.7rem] font-black ${green ? "bg-emerald-500 text-emerald-950" : "bg-zinc-800 text-zinc-200"}`}>@{o.odd.toFixed(2)}</span>
      </div>
    </article>
  );
}

export default function Opportunities({ casa, fora, oportunidadesCasa, oportunidadesFora }: Props) {
  const [visao, setVisao] = useState<"times" | "jogadores">("times");
  const [lado, setLado] = useState<"casa" | "fora">("casa");
  const [page, setPage] = useState(0);
  const scroller = useRef<HTMLDivElement>(null);
  const list = lado === "casa" ? oportunidadesCasa : oportunidadesFora;
  const team = lado === "casa" ? casa : fora;
  const perPage = 2;
  const pages = Math.max(1, Math.ceil(list.length / perPage));
  const greens = list.filter((o) => o.acertos >= 7).length;

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const onScroll = () => setPage(Math.min(pages - 1, Math.round(el.scrollLeft / (el.clientWidth || 1))));
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [pages, lado]);

  const goTo = (i: number) => { const el = scroller.current; if (el) el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" }); };

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 text-zinc-100">
      <div className="border-b border-zinc-800 px-3 py-2.5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[0.8rem] font-extrabold">Oportunidades <span className="text-[0.6rem] font-semibold text-zinc-500">· análise de greens (últimos 10 jogos)</span></p>
          <div className="flex rounded-full bg-zinc-900 p-0.5 text-[0.6rem] font-bold">
            <button type="button" onClick={() => setVisao("times")} className={`rounded-full px-3 py-1 ${visao === "times" ? "bg-emerald-500 text-emerald-950" : "text-zinc-400"}`}>Times</button>
            <button type="button" onClick={() => setVisao("jogadores")} className={`rounded-full px-3 py-1 ${visao === "jogadores" ? "bg-emerald-500 text-emerald-950" : "text-zinc-400"}`}>Jogadores</button>
          </div>
        </div>
        {visao === "times" ? (
          <div className="mt-2 flex items-center gap-2">
            <button type="button" onClick={() => { setLado(lado === "casa" ? "fora" : "casa"); setPage(0); goTo(0); }} className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-[0.7rem] font-bold">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: team.cor }} />{team.nome}<span className="text-zinc-500">⇄</span>
            </button>
            <span className="text-[0.6rem] text-zinc-400">{greens} de {list.length} mercados com ≥70% de acerto</span>
          </div>
        ) : null}
      </div>

      {visao === "jogadores" ? (
        <p className="px-4 py-8 text-center text-[0.7rem] text-zinc-500">Visão por jogadores em breve — os mercados de jogador dependem de estatísticas jogo a jogo (não fornecidas pela fonte atual).</p>
      ) : (
        <div className="px-3 pb-2 pt-2">
          <p className="mb-1.5 text-center text-[0.56rem] text-zinc-500">← Arraste para o lado para ver mais opções →</p>
          <div ref={scroller} className="no-scrollbar flex snap-x snap-mandatory gap-2 overflow-x-auto scroll-smooth">
            {list.map((o) => <OpportunityCard key={o.id} o={o} />)}
          </div>
          <div className="mt-2 flex items-center justify-center gap-1.5">
            {Array.from({ length: pages }).map((_, i) => <button key={i} type="button" aria-label={`página ${i + 1}`} onClick={() => goTo(i)} className={`h-1.5 rounded-full transition-all ${page === i ? "w-4 bg-emerald-400" : "w-1.5 bg-zinc-700"}`} />)}
          </div>
          <p className="mt-2 text-[0.55rem] leading-relaxed text-zinc-500">Hit rate = vezes em que a linha bateu nos últimos 10 jogos do time; verde a partir de 7/10. Odd estimada = 1 ÷ taxa com margem de 6% (não é cotação de casa de apostas). Cartões com selo <b>real</b> usam médias oficiais sincronizadas; <b>demo</b> indica série simulada. Conteúdo informativo · +18.</p>
        </div>
      )}
    </div>
  );
}
