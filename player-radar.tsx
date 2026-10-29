"use client";

import { ClientOnly, PlayerRadar, type RadarAxis } from "@/components/charts";

/** Radar de 5 atributos vs média da liga (50 = média da posição na temporada). */
export function PlayerRadarWidget({ data, playerName, source }: { data: RadarAxis[]; playerName: string; source: string }) {
  return <ClientOnly height={256}><PlayerRadar data={data} playerName={playerName} source={source} /></ClientOnly>;
}
