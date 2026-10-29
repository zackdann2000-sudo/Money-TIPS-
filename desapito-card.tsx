"use client";

import Link from "next/link";
import { useState } from "react";
import type { Desapito } from "@/lib/desapito";
import { DataFooter } from "@/components/ui";

const ICON: Record<string, string> = { Gols: "⚽", Finalizações: "🎯", "Chutes a gol": "🥅", Escanteios: "🚩", Cartões: "🟨", Faltas: "✋" };

function Crest({ src, name, size = 22 }: { src?: string; name: string; size?: number }) {
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={name} width={size} height={size} loading="lazy" className="object-contain" style={{ width: size, height: size }} />
  ) : <span className="flex items-center justify-center rounded-full bg-zinc-800 text-[0.5rem] font-black text-zinc-300" style={{ width: size, height: size }}>{name.slice(0, 3).toUpperCase()}</span>;
}

/** Gráfico de barras compacto dos últimos N jogos com a linha de mercado tracejada. */
function MiniChart({ d }: { d: Desapito }) {
  const max = Math.max(d.linha + 1, ...d.historico.map((h) => h.valor), 1);
  const H = 72;
  return (
    <div className="mt-2 rounded-xl border border-zinc-800 bg-zinc-900/60 p-2">
      <div className="relative" style={{ height: H + 18 }}>
        <div className="absolute inset-x-0 border-t-2 border-dashed border-amber-400/70" style={{ bottom: 18 + (d.linha / max) * H }}><span className="absolute -top-3.5 right-0 rounded bg-amber-500/20 px-1 text-[0.45rem] font-bold text-amber-300">linha {d.linha}</span></div>
        <div className="absolute inset-0 grid items-end gap-1" style={{ gridTemplateColumns: `repeat(${d.historico.length}, minmax(0, 1fr))` }}>
          {[...d.historico].reverse().map((h, i) => (
            <div key={i} className="flex flex-col items-center justify-end" title={`${h.emCasa ? "vs" : "@"} ${h.adversario} · ${h.placar} · ${h.valor}`}>
              <span className={`text-[0.5rem] font-black ${h.bateu ? "text-emerald-300" : "text-zinc-500"}`}>{h.valor}</span>
              <div className={`w-[60%] rounded-t ${h.bateu ? "bg-emerald-500" : "bg-zinc-600"}`} style={{ height: Math.max(3, (h.valor / max) * H) }} />
              <span className="mt-0.5 text-[0.42rem] text-zinc-500">{h.data.slice(8, 10)}/{h.data.slice(5, 7)}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-1 flex items-center justify-between text-[0.5rem] text-zinc-500"><span>média do time <b className="text-zinc-200">{d.media}</b></span><span>mais recente à direita</span></div>
    </div>
  );
}

export function DesapitoCard({ d }: { d: Desapito }) {
  const [view, setView] = useState<"none" | "numeros" | "grafico">("none");
  const acima = d.direcao === "acima";
  const pctTone = d.percentual >= 90 ? "text-emerald-400" : d.percentual >= 70 ? "text-emerald-300" : "text-zinc-300";
  return (
    <article className={`overflow-hidden rounded-2xl border bg-zinc-950 text-zinc-100 ${d.duplo ? "border-violet-500/50 shadow-[0_0_0_1px_rgba(139,92,246,0.15)]" : "border-zinc-800"}`}>
      {/* Jogo + horário */}
      <div className="flex items-center justify-between gap-2 border-b border-zinc-900 px-3 py-2">
        <Link href={`/jogos/${d.matchId}/centro`} className="flex min-w-0 items-center gap-1.5 text-[0.7rem] font-bold">
          <Crest src={d.jogo.logoCasa} name={d.jogo.casa} size={18} /><span className="truncate">{d.jogo.casa}</span><span className="text-zinc-500">x</span><span className="truncate">{d.jogo.fora}</span><Crest src={d.jogo.logoFora} name={d.jogo.fora} size={18} />
        </Link>
        <div className="flex shrink-0 items-center gap-1">
          {d.duplo ? <span className="rounded-full bg-violet-500/20 px-1.5 py-0.5 text-[0.5rem] font-black text-violet-300" title="Os dois times apresentam a mesma discrepância neste mercado">DUPLO</span> : null}
          <span className="text-[0.62rem] font-bold text-zinc-300">{d.jogo.status === "live" ? "AO VIVO" : d.jogo.status === "finished" ? "ENC" : d.jogo.horario}</span>
        </div>
      </div>

      <div className="px-3 py-2.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-[0.62rem] text-zinc-400"><Crest src={d.time.logo} name={d.time.nome} size={16} /><span className="truncate font-semibold text-zinc-200">{d.time.nome}</span><span className="rounded bg-zinc-800 px-1 text-[0.5rem] uppercase">{d.time.lado === "casa" ? "jogos em casa" : "jogos fora"}</span></p>
            <p className="mt-1 text-[0.86rem] font-extrabold leading-tight">{ICON[d.mercado]} {d.rotulo}</p>
            <p className="text-[0.55rem] text-zinc-500">linha {d.linhaFonte === "referencia" ? "de referência do mercado" : `da fonte (${d.linhaFonte})`} · {d.periodo}</p>
          </div>
          <div className="text-right">
            <p className={`text-[1.6rem] font-black leading-none tabular-nums ${pctTone}`}>{d.percentual}%</p>
            <p className="text-[0.52rem] text-zinc-500">{d.acertos}/{d.total} jogos{d.baseParcial ? <span className="ml-1 rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[0.45rem] font-black text-amber-400">Base Parcial</span> : null}</p>
          </div>
        </div>

        {/* Linha do tempo */}
        <div className="mt-2 flex items-center gap-[5px]">
          {[...d.historico].reverse().map((h, i) => (
            <span key={i} title={`${h.data.slice(8, 10)}/${h.data.slice(5, 7)} · ${h.emCasa ? "vs" : "@"} ${h.adversario} · ${h.placar}`} className={`flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-[0.58rem] font-black ${h.bateu ? "bg-emerald-500 text-emerald-950" : "bg-zinc-700 text-zinc-300"}`}>{h.valor}</span>
          ))}
        </div>

        {/* Discrepância */}
        <p className={`mt-2 text-[0.72rem] font-black tracking-wide ${acima ? "text-emerald-400" : "text-rose-400"}`}>
          {acima ? "+" : ""}{d.discrepancia.toFixed(1).replace(".", ",")} {acima ? "ACIMA DA LINHA" : "ABAIXO DA LINHA"}
          <span className="ml-1.5 text-[0.56rem] font-semibold text-zinc-500">(média {d.media} vs linha {d.linha})</span>
        </p>

        {/* Ações */}
        <div className="mt-2 flex gap-1.5">
          <button type="button" onClick={() => setView(view === "numeros" ? "none" : "numeros")} className={`flex-1 rounded-lg px-2 py-1.5 text-[0.62rem] font-bold ${view === "numeros" ? "bg-emerald-500 text-emerald-950" : "bg-zinc-900 text-zinc-300"}`}>Card · números</button>
          <button type="button" onClick={() => setView(view === "grafico" ? "none" : "grafico")} className={`flex-1 rounded-lg px-2 py-1.5 text-[0.62rem] font-bold ${view === "grafico" ? "bg-emerald-500 text-emerald-950" : "bg-zinc-900 text-zinc-300"}`}>Gráfico</button>
        </div>

        {view === "numeros" ? (
          <div className="mt-2 overflow-hidden rounded-xl border border-zinc-800">
            <div className="grid grid-cols-[3rem_1fr_2.2rem_3.2rem_2.4rem] gap-1 bg-zinc-900 px-2 py-1 text-[0.5rem] font-bold uppercase text-zinc-500"><span>Data</span><span>Adversário</span><span className="text-center">Local</span><span className="text-center">Placar</span><span className="text-right">Valor</span></div>
            {d.historico.map((h, i) => (
              <div key={i} className="grid grid-cols-[3rem_1fr_2.2rem_3.2rem_2.4rem] items-center gap-1 border-t border-zinc-900 px-2 py-1 text-[0.62rem]"><span className="text-zinc-500">{h.data.slice(8, 10)}/{h.data.slice(5, 7)}</span><span className="truncate">{h.adversario}</span><span className="text-center text-zinc-400">{h.emCasa ? "C" : "F"}</span><span className="text-center tabular-nums">{h.placar}</span><span className={`text-right font-black tabular-nums ${h.bateu ? "text-emerald-400" : "text-rose-400"}`}>{h.valor}</span></div>
            ))}
          </div>
        ) : null}
        {view === "grafico" ? <MiniChart d={d} /> : null}
      </div>
      <DataFooter dark fonte={d.fonte} amostra={d.total} extra={d.time.lado === "casa" ? "somente jogos como mandante" : "somente jogos como visitante"} />
    </article>
  );
}
