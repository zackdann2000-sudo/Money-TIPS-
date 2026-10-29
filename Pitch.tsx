import type { PitchPlayer } from "./mockData";

type Team = { nome: string; sigla: string; cor: string; formacao: string; jogadores: PitchPlayer[]; fonte?: string };

function Player({ p, cor, invert }: { p: PitchPlayer; cor: string; invert: boolean }) {
  // p.y = distância da própria linha de fundo (0–100). Mandante ocupa a metade inferior; visitante a superior.
  const y = invert ? 100 - p.y / 2 : p.y / 2;
  return (
    <div className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center" style={{ left: `${p.x}%`, top: `${y}%` }}>
      <div className="relative">
        {p.foto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.foto} alt={p.nome} width={34} height={34} loading="lazy" className="h-[34px] w-[34px] rounded-full border-2 bg-zinc-900 object-cover shadow-lg" style={{ borderColor: cor }} />
        ) : (
          <span className="flex h-[34px] w-[34px] items-center justify-center rounded-full border-2 bg-zinc-900/90 text-[0.66rem] font-black text-white shadow-lg" style={{ borderColor: cor }}>{p.numero || "–"}</span>
        )}
        {p.capitao ? <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-400 text-[0.5rem] font-black text-amber-950 ring-2 ring-zinc-950">C</span> : null}
        {p.foto ? <span className="absolute -bottom-1 -left-1 rounded-full bg-zinc-950 px-1 text-[0.5rem] font-black text-white ring-1 ring-zinc-700">{p.numero}</span> : null}
      </div>
      <span className="mt-0.5 max-w-[64px] truncate rounded bg-black/55 px-1 text-[0.52rem] font-bold text-white">{p.nome.split(" ").slice(-1)[0]}</span>
    </div>
  );
}

/** Campo completo: mandante atacando para cima (metade inferior), visitante na metade superior. */
export default function Pitch({ casa, fora }: { casa: Team; fora: Team }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 text-zinc-100">
      <div className="flex items-center justify-between px-3 py-2 text-[0.68rem]">
        <span className="font-bold" style={{ color: casa.cor }}>{casa.nome} · {casa.formacao}</span>
        <span className="font-bold" style={{ color: fora.cor }}>{fora.formacao} · {fora.nome}</span>
      </div>
      <div className="relative mx-auto aspect-[2/3] w-full max-w-[420px] overflow-hidden rounded-xl border-2 border-emerald-200/30 bg-gradient-to-b from-emerald-700 to-emerald-800">
        {/* faixas de grama */}
        <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,rgba(255,255,255,0.03)_0,rgba(255,255,255,0.03)_10%,transparent_10%,transparent_20%)]" />
        {/* linhas */}
        <div className="absolute inset-x-0 top-1/2 h-px bg-white/50" />
        <div className="absolute left-1/2 top-1/2 h-20 w-20 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/50" />
        <div className="absolute left-1/2 top-0 h-[18%] w-[60%] -translate-x-1/2 border border-t-0 border-white/50" />
        <div className="absolute left-1/2 top-0 h-[7%] w-[28%] -translate-x-1/2 border border-t-0 border-white/50" />
        <div className="absolute bottom-0 left-1/2 h-[18%] w-[60%] -translate-x-1/2 border border-b-0 border-white/50" />
        <div className="absolute bottom-0 left-1/2 h-[7%] w-[28%] -translate-x-1/2 border border-b-0 border-white/50" />
        {/* visitante em cima (invertido), mandante embaixo */}
        {fora.jogadores.map((p) => <Player key={`a-${p.id}`} p={p} cor={fora.cor} invert={false} />)}
        {casa.jogadores.map((p) => <Player key={`h-${p.id}`} p={p} cor={casa.cor} invert />)}
      </div>
      <p className="px-3 py-1.5 text-[0.55rem] text-zinc-500">{casa.fonte ?? "Escalação"} · {fora.fonte ?? "Escalação"} · posições por formação (coordenadas X/Y) · C = capitão.</p>
    </div>
  );
}
