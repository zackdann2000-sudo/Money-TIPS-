type Team = { nome: string; sigla: string; cor: string; escudo?: string };
type Game = { data: Date; casa: string; fora: string; gc: number; gf: number };
type FormGame = { adversario: string; emCasa: boolean; gf: number; ga: number; resultado: "V" | "E" | "D" };

import { H2HRadials } from "@/components/match-widgets";

type Props = {
  casa: Team;
  fora: Team;
  tendencias?: { over15: number; over25: number; btts: number; cleanSheets: number; total: number; baseLabel: string };
  resumo: { vitoriasCasa: number; empates: number; vitoriasFora: number };
  historico: Game[];
  formaCasa: FormGame[];
  formaFora: FormGame[];
  fonte: string;
};

function FormDots({ games, nome }: { games: FormGame[]; nome: string }) {
  return (
    <div>
      <p className="mb-1 text-[0.66rem] font-bold">{nome} <span className="text-[0.55rem] font-semibold text-zinc-500">· últimos {games.length}</span></p>
      <div className="flex gap-1.5">
        {games.length === 0 ? <span className="text-[0.6rem] text-zinc-500">sem jogos na base</span> : null}
        {games.map((g, i) => (
          <div key={i} className="flex flex-col items-center" title={`${g.emCasa ? "vs" : "@"} ${g.adversario} ${g.gf}-${g.ga}`}>
            <span className={`flex h-7 w-7 items-center justify-center rounded-full text-[0.62rem] font-black text-white ${g.resultado === "V" ? "bg-emerald-500" : g.resultado === "E" ? "bg-amber-400 text-amber-950" : "bg-rose-500"}`}>{g.resultado}</span>
            <span className="mt-0.5 text-[0.5rem] text-zinc-500">{g.gf}-{g.ga}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function H2H({ casa, fora, resumo, historico, formaCasa, formaFora, fonte, tendencias }: Props) {
  const total = resumo.vitoriasCasa + resumo.empates + resumo.vitoriasFora;
  const pct = (v: number) => (total ? (v / total) * 100 : 33.33);
  return (
    <div className="space-y-3">
    {tendencias ? <H2HRadials {...tendencias} /> : null}
    <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 text-zinc-100">
      <div className="border-b border-zinc-800 px-3 py-2.5"><p className="text-[0.8rem] font-extrabold">Confrontos diretos (H2H)</p><p className="text-[0.58rem] text-zinc-500">{total} jogo(s) na base · {fonte}</p></div>
      <div className="px-3 py-3">
        <div className="flex items-center justify-between text-[0.66rem] font-bold"><span className="text-blue-400">{casa.sigla} {resumo.vitoriasCasa}</span><span className="text-zinc-400">Empates {resumo.empates}</span><span className="text-rose-400">{resumo.vitoriasFora} {fora.sigla}</span></div>
        <div className="mt-1 flex h-3 overflow-hidden rounded-full bg-zinc-800">
          <div className="bg-blue-500" style={{ width: `${pct(resumo.vitoriasCasa)}%` }} />
          <div className="bg-zinc-500" style={{ width: `${pct(resumo.empates)}%` }} />
          <div className="bg-rose-500" style={{ width: `${pct(resumo.vitoriasFora)}%` }} />
        </div>
        {total === 0 ? <p className="mt-2 text-[0.6rem] text-zinc-500">Sem confrontos diretos registrados nas temporadas carregadas.</p> : null}
      </div>
      {historico.length ? (
        <ul className="divide-y divide-zinc-900 border-t border-zinc-800">
          {historico.map((g, i) => (
            <li key={i} className="grid grid-cols-[3.6rem_1fr_auto_1fr] items-center gap-2 px-3 py-2 text-[0.7rem]">
              <span className="text-[0.58rem] text-zinc-500">{g.data.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" })}</span>
              <span className={`truncate text-right font-semibold ${g.gc > g.gf ? "text-white" : "text-zinc-400"}`}>{g.casa}</span>
              <span className="rounded-md bg-zinc-900 px-2 py-0.5 font-black tabular-nums">{g.gc} - {g.gf}</span>
              <span className={`truncate font-semibold ${g.gf > g.gc ? "text-white" : "text-zinc-400"}`}>{g.fora}</span>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="grid gap-3 border-t border-zinc-800 px-3 py-3 sm:grid-cols-2">
        <FormDots games={formaCasa} nome={casa.nome} />
        <FormDots games={formaFora} nome={fora.nome} />
      </div>
    </div>
    </div>
  );
}
