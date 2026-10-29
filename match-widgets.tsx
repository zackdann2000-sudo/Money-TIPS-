"use client";

import { useEffect, useState } from "react";
import { ClientOnly, MomentumChart, RadialStat, WillTheyScore, type MomentumPoint } from "@/components/charts";

/** Momentum: busca /api/jogos/:id/momentum (Bzzoiro real ou mock marcado). */
export function MomentumWidget({ matchId, homeName, awayName, status }: { matchId: number; homeName: string; awayName: string; status: string }) {
  const [data, setData] = useState<{ source: string; points: MomentumPoint[]; goals: { minute: number; side: "home" | "away" }[] } | null>(null);
  useEffect(() => {
    let alive = true;
    const load = () => fetch(`/api/jogos/${matchId}/momentum`, { cache: "no-store" }).then((r) => r.json()).then((d) => alive && d.points && setData(d)).catch(() => undefined);
    load();
    const t = status === "live" ? setInterval(load, 60000) : null;
    return () => { alive = false; if (t) clearInterval(t); };
  }, [matchId, status]);
  if (status === "scheduled") return null;
  if (!data) return <div className="h-56 animate-pulse rounded-2xl bg-zinc-900" />;
  return (
    <div className="relative">
      {data.source === "mock" ? <span className="absolute right-3 top-2 z-10 rounded-full bg-amber-500/15 px-2 py-0.5 text-[0.5rem] font-black text-amber-400" title="A fonte não publicou momentum para esta partida; curva ilustrativa">DEMO</span> : null}
      <MomentumChart data={data.points} homeName={homeName} awayName={awayName} goals={data.goals} source={data.source === "mock" ? "sem dado da fonte (ilustrativo)" : "Bzzoiro Sports Data"} />
    </div>
  );
}

export function WillTheyScoreWidget(props: { homeName: string; awayName: string; homeScores: number; awayScores: number; homeCleanSheet: number; awayCleanSheet: number; source: string }) {
  return <ClientOnly height={150}><WillTheyScore {...props} /></ClientOnly>;
}

/** 4 radiais do H2H: Over 1.5, Over 2.5, Ambas marcam, Clean sheets — base = confrontos diretos (fallback: últimos jogos dos dois times). */
export function H2HRadials({ over15, over25, btts, cleanSheets, total, baseLabel }: { over15: number; over25: number; btts: number; cleanSheets: number; total: number; baseLabel: string }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 text-zinc-100">
      <div className="flex items-center justify-between px-3 py-2"><p className="text-[0.78rem] font-extrabold">Tendências do confronto</p><span className="text-[0.55rem] text-zinc-500">{baseLabel}</span></div>
      <ClientOnly height={120}>
        <div className="grid grid-cols-4 gap-1 px-2 pb-3">
          <RadialStat label="Over 1.5" value={over15} total={total} color="#22c55e" />
          <RadialStat label="Over 2.5" value={over25} total={total} color="#38bdf8" />
          <RadialStat label="Ambas marcam" value={btts} total={total} color="#f59e0b" />
          <RadialStat label="Clean sheets" value={cleanSheets} total={total} color="#a78bfa" />
        </div>
      </ClientOnly>
      <p className="px-3 pb-2 text-[0.5rem] text-zinc-500">Clean sheets = jogos do confronto em que pelo menos um dos times não sofreu gol.</p>
    </div>
  );
}
