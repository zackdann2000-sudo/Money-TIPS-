"use client";

import { useMemo, useState } from "react";
import { buildLast10, LAST10_CATEGORIES, media, type Last10Category, type MockPlayerSeed } from "./mockData";
import { DataFooter } from "@/components/ui";

type Props = {
  casa: { nome: string; sigla: string; cor: string };
  fora: { nome: string; sigla: string; cor: string };
  jogadores: MockPlayerSeed[];
  /** médias reais da temporada por jogador (gols/assist./finalizações…) quando existirem — exibidas ao lado */
  mediasReais?: Record<number, Partial<Record<Last10Category, number>>>;
  demo?: boolean;
};

function Avatar({ src, nome, cor, size = 34 }: { src?: string; nome: string; cor: string; size?: number }) {
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={nome} width={size} height={size} loading="lazy" className="shrink-0 rounded-full border-2 bg-zinc-800 object-cover" style={{ width: size, height: size, borderColor: cor }} />
  ) : (
    <span className="flex shrink-0 items-center justify-center rounded-full border-2 bg-zinc-800 text-[0.62rem] font-black text-zinc-200" style={{ width: size, height: size, borderColor: cor }}>
      {nome.split(" ").slice(0, 2).map((n) => n[0]).join("")}
    </span>
  );
}

export default function Last10Matrix({ casa, fora, jogadores, mediasReais, demo = true }: Props) {
  const [categoria, setCategoria] = useState<Last10Category>("gols");
  const [soEscalacao, setSoEscalacao] = useState(true);
  const [reservas, setReservas] = useState(false);
  const [time, setTime] = useState<"todos" | "casa" | "fora">("todos");

  const rows = useMemo(() => {
    const cat = LAST10_CATEGORIES.find((c) => c.key === categoria)!;
    return jogadores
      .filter((p) => (time === "todos" ? true : time === "casa" ? p.timeSigla === casa.sigla : p.timeSigla === fora.sigla))
      .filter((p) => (soEscalacao && !reservas ? p.titular : reservas && !soEscalacao ? !p.titular : true))
      .filter((p) => (cat.gkOnly ? p.posicao.toUpperCase().startsWith("G") : !p.posicao.toUpperCase().startsWith("G") || categoria === "faltas" || categoria === "amarelos"))
      .map((p) => buildLast10(p, categoria))
      .map((p) => ({ ...p, media: media(p.last10) }))
      .filter((p) => p.media > 0 || p.last10.some((v) => v > 0))
      .sort((a, b) => b.media - a.media);
  }, [jogadores, categoria, soEscalacao, reservas, time, casa.sigla, fora.sigla]);

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 text-zinc-100">
      <div className="border-b border-zinc-800 px-3 py-2.5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[0.8rem] font-extrabold">Matriz Last 10 <span className="text-[0.6rem] font-semibold text-zinc-500">· últimos 10 jogos por jogador</span></p>
          {demo ? <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[0.55rem] font-bold text-amber-400" title="A fonte atual não fornece estatísticas jogo a jogo por jogador; série gerada por mockData">DEMO</span> : null}
        </div>
        <div className="no-scrollbar mt-2 flex gap-1 overflow-x-auto">
          {LAST10_CATEGORIES.map((c) => (
            <button key={c.key} type="button" onClick={() => setCategoria(c.key)} className={`shrink-0 rounded-full px-2.5 py-1 text-[0.62rem] font-bold transition ${categoria === c.key ? "bg-emerald-500 text-emerald-950" : "bg-zinc-900 text-zinc-400 hover:text-zinc-200"}`}>
              {c.icon} {c.label}
            </button>
          ))}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-[0.64rem]">
          <label className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-zinc-900 px-2 py-1"><input type="checkbox" checked={soEscalacao} onChange={(e) => setSoEscalacao(e.target.checked)} className="h-3.5 w-3.5 accent-emerald-500" /> Só escalação</label>
          <label className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-zinc-900 px-2 py-1"><input type="checkbox" checked={reservas} onChange={(e) => setReservas(e.target.checked)} className="h-3.5 w-3.5 accent-emerald-500" /> + Reservas</label>
          <div className="ml-auto flex overflow-hidden rounded-lg border border-zinc-800">
            {(["todos", "casa", "fora"] as const).map((t) => (
              <button key={t} type="button" onClick={() => setTime(t)} className={`px-2.5 py-1 text-[0.6rem] font-bold ${time === t ? "bg-zinc-800 text-white" : "text-zinc-500"}`} style={time === t && t !== "todos" ? { color: t === "casa" ? casa.cor : fora.cor } : undefined}>
                {t === "todos" ? "Ambos" : t === "casa" ? casa.sigla : fora.sigla}
              </button>
            ))}
          </div>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="px-4 py-8 text-center text-[0.7rem] text-zinc-500">Nenhum jogador com registros nesta categoria para os filtros escolhidos.</p>
      ) : (
        <ul className="divide-y divide-zinc-900">
          {rows.map((p, i) => {
            const cor = p.timeSigla === casa.sigla ? casa.cor : fora.cor;
            const real = mediasReais?.[p.id]?.[categoria];
            return (
              <li key={p.id} className="flex items-center gap-2.5 px-3 py-2">
                <span className={`w-6 text-center text-[0.68rem] font-black ${i < 3 ? "text-emerald-400" : "text-zinc-500"}`}>{i + 1}º</span>
                <Avatar src={p.foto} nome={p.nome} cor={cor} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-[0.76rem] font-bold">{p.nome} <span className="text-[0.58rem] font-semibold text-zinc-500">#{p.numero} · {p.posicao}{!p.titular ? " · res." : ""}</span></p>
                    <p className="shrink-0 text-[0.62rem] text-zinc-400">Média: <b className="text-emerald-400">{p.media.toFixed(2)}</b> <span className="text-zinc-600">· 10 jogos</span></p>
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <span className="truncate text-[0.58rem]" style={{ color: cor }}>{p.time}{real !== undefined ? <span className="ml-1 text-zinc-500">· temporada {real.toFixed(2)}/j (real)</span> : null}</span>
                    <div className="flex shrink-0 gap-[3px]" title="verde = jogo ≥ média · cinza = abaixo da média (mais recente à esquerda)">
                      {p.last10.map((v, j) => (
                        <span key={j} className={`flex h-4 w-4 items-center justify-center rounded-full text-[0.5rem] font-black ${v >= p.media && v > 0 ? "bg-emerald-500 text-emerald-950" : "bg-zinc-700/70 text-zinc-400"}`}>{v}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <p className="border-t border-zinc-800 px-3 py-1.5 text-[0.55rem] text-zinc-500">Círculo verde = valor do jogo ≥ média dos 10 · número dentro do círculo = valor no jogo · ordem: mais recente à esquerda.</p>
      <DataFooter dark fonte={demo ? "demo" : "espn"} amostra={10} extra={demo ? "série jogo a jogo simulada (fonte não fornece por jogador); médias da temporada são reais" : undefined} />
    </div>
  );
}
