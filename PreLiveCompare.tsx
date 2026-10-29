"use client";

import { useState } from "react";
import type { CompareCategory, CompareStat, Referee } from "./mockData";
import { DataFooter } from "@/components/ui";

type Props = {
  casa: { nome: string; sigla: string; cor: string; escudo?: string };
  fora: { nome: string; sigla: string; cor: string; escudo?: string };
  stats: Record<CompareCategory, CompareStat[]>;
  /** categorias cujas estatísticas vêm de fonte real (as demais recebem selo DEMO) */
  realCategories?: CompareCategory[];
  jogosBase: number;
  arbitro: Referee;
};

const CATS: CompareCategory[] = ["PASSES", "DEFESA", "DISCIPLINA", "OUTROS"];

function Crest({ src, nome, cor, size = 22 }: { src?: string; nome: string; cor: string; size?: number }) {
  // eslint-disable-next-line @next/next/no-img-element
  return src ? <img src={src} alt={nome} width={size} height={size} className="object-contain" style={{ width: size, height: size }} /> : <span className="flex items-center justify-center rounded-full text-[0.55rem] font-black text-white" style={{ width: size, height: size, background: cor }}>{nome.slice(0, 2).toUpperCase()}</span>;
}

export default function PreLiveCompare({ casa, fora, stats, realCategories = [], jogosBase, arbitro }: Props) {
  const [modo, setModo] = useState<"total" | "medias">("medias");
  const [cat, setCat] = useState<CompareCategory>("DISCIPLINA");
  const [refOpen, setRefOpen] = useState(false);
  const list = stats[cat] ?? [];
  const isReal = realCategories.includes(cat);

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 text-zinc-100">
      <div className="flex items-center justify-between gap-2 border-b border-zinc-800 px-3 py-2.5">
        <div>
          <p className="text-[0.8rem] font-extrabold">Pré-Live · comparativo</p>
          <p className="text-[0.58rem] text-zinc-500">Base: últimos {jogosBase} jogos de cada equipe</p>
        </div>
        <div className="flex overflow-hidden rounded-lg border border-zinc-800 text-[0.62rem] font-bold">
          <button type="button" onClick={() => setModo("total")} className={`px-3 py-1 ${modo === "total" ? "bg-zinc-800 text-white" : "text-zinc-500"}`}>Total</button>
          <button type="button" onClick={() => setModo("medias")} className={`px-3 py-1 ${modo === "medias" ? "bg-zinc-800 text-white" : "text-zinc-500"}`}>Médias</button>
        </div>
      </div>

      <div className="flex items-center justify-between px-3 py-2">
        <span className="flex items-center gap-1.5 text-[0.72rem] font-bold" style={{ color: "#60a5fa" }}><Crest src={casa.escudo} nome={casa.nome} cor={casa.cor} />{casa.nome}</span>
        <span className="flex items-center gap-1.5 text-[0.72rem] font-bold" style={{ color: "#fb923c" }}>{fora.nome}<Crest src={fora.escudo} nome={fora.nome} cor={fora.cor} /></span>
      </div>

      <div className="no-scrollbar flex gap-1 border-b border-zinc-800 px-3 pb-2">
        {CATS.map((c) => (
          <button key={c} type="button" onClick={() => setCat(c)} className={`shrink-0 rounded-full px-3 py-1 text-[0.6rem] font-black tracking-wide ${cat === c ? "bg-emerald-500 text-emerald-950" : "bg-zinc-900 text-zinc-400"}`}>{c}</button>
        ))}
        {!isReal ? <span className="ml-auto self-center rounded-full bg-amber-500/15 px-2 py-0.5 text-[0.52rem] font-bold text-amber-400">DEMO</span> : <span className="ml-auto self-center rounded-full bg-emerald-500/15 px-2 py-0.5 text-[0.52rem] font-bold text-emerald-400">DADOS REAIS</span>}
      </div>

      <ul className="divide-y divide-zinc-900">
        {list.map((s) => {
          const c = modo === "total" ? (s.casaTotal ?? s.casa * jogosBase) : s.casa;
          const f = modo === "total" ? (s.foraTotal ?? s.fora * jogosBase) : s.fora;
          const fmt = (v: number) => (s.sufixo === "%" ? `${Math.round(v)}%` : modo === "total" ? Math.round(v).toString() : v.toFixed(1));
          const casaMelhor = c > f, foraMelhor = f > c;
          return (
            <li key={s.label} className="grid grid-cols-[4.2rem_1fr_4.2rem] items-center gap-2 px-3 py-2">
              <span className={`rounded-xl px-2 py-1.5 text-center text-[0.86rem] font-black tabular-nums ${casaMelhor ? "bg-blue-500 text-white" : "bg-blue-500/20 text-blue-200"}`}>{fmt(c)}</span>
              <span className="text-center">
                <span className="block text-[0.72rem] font-bold">{s.label}</span>
                <span className="block text-[0.55rem] uppercase tracking-wide text-zinc-500">Média da liga {s.sufixo === "%" ? `${Math.round(s.liga)}%` : s.liga.toFixed(1)}</span>
              </span>
              <span className={`rounded-xl px-2 py-1.5 text-center text-[0.86rem] font-black tabular-nums ${foraMelhor ? "bg-orange-500 text-white" : "bg-orange-500/20 text-orange-200"}`}>{fmt(f)}</span>
            </li>
          );
        })}
      </ul>

      <DataFooter dark fonte={isReal ? "espn" : "demo"} amostra={isReal ? jogosBase : undefined} extra={isReal ? "médias reais por partida" : "categoria sem fonte real no momento"} />

      {/* Card do árbitro */}
      <button type="button" onClick={() => setRefOpen(true)} className="flex w-full items-center gap-3 border-t border-zinc-800 bg-zinc-900/60 px-3 py-3 text-left transition hover:bg-zinc-900">
        {arbitro.foto ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={arbitro.foto} alt="" width={40} height={40} className="h-10 w-10 rounded-full object-cover" /> : <span className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-800 text-lg">🧑‍⚖️</span>}
        <span className="min-w-0 flex-1">
          <span className="block text-[0.6rem] uppercase tracking-wide text-zinc-500">Árbitro da partida</span>
          <span className="block truncate text-[0.78rem] font-bold">{arbitro.nome}</span>
          <span className="block text-[0.6rem] text-zinc-400">{arbitro.faltasJogo} faltas/jogo · {arbitro.cartoesJogo} cartões/jogo{arbitro.demo ? " · demo" : ""}</span>
        </span>
        <span className="text-[0.7rem] font-bold text-emerald-400">ver médias →</span>
      </button>

      {refOpen ? (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 p-3 sm:items-center" onClick={() => setRefOpen(false)}>
          <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 p-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-800 text-xl">🧑‍⚖️</span>
              <div className="min-w-0 flex-1"><p className="truncate text-[0.9rem] font-extrabold">{arbitro.nome}</p><p className="text-[0.62rem] text-zinc-400">{arbitro.jogos} jogos apitados na base{arbitro.demo ? " · dados de demonstração" : ""}</p></div>
              <button type="button" onClick={() => setRefOpen(false)} className="text-zinc-500">✕</button>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {[["Faltas / jogo", arbitro.faltasJogo], ["Cartões / jogo", arbitro.cartoesJogo], ["Faltas 1º tempo", arbitro.faltas1T], ["Faltas 2º tempo", arbitro.faltas2T], ["Cartões 1º tempo", arbitro.cartoes1T], ["Cartões 2º tempo", arbitro.cartoes2T], ["Pênaltis / jogo", arbitro.penaltisJogo]].map(([l, v]) => (
                <div key={l as string} className="rounded-xl bg-zinc-900 px-3 py-2"><p className="text-[0.56rem] uppercase tracking-wide text-zinc-500">{l as string}</p><p className="text-[1.1rem] font-black text-emerald-400">{v as number}</p></div>
              ))}
            </div>
            <p className="mt-2 text-[0.56rem] text-zinc-500">{arbitro.demo ? "A fonte atual não informa o árbitro nem seu histórico; valores ilustrativos até a integração de uma fonte com arbitragem (ex.: API-Football)." : "Fonte: integração configurada no painel."}</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
