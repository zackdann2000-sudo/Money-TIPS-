import type { MatchRow } from "@/lib/data";
import { analyzeMatch, recordPrediction, type Analysis } from "@/lib/predict";

const cache = new Map<number, { key: string; at: number; analysis: Analysis }>();
const TTL_PRE = 10 * 60 * 1000;
const TTL_LIVE = 45 * 1000;

/** Evita recalcular o modelo a cada visita: cache por partida (chave muda com status/minuto/placar). */
export async function getAnalysis(match: MatchRow, opts: { record?: boolean } = {}) {
  const key = `${match.status}-${match.minute}-${match.homeScore}-${match.awayScore}`;
  const hit = cache.get(match.id);
  const ttl = match.status === "live" ? TTL_LIVE : TTL_PRE;
  if (hit && hit.key === key && Date.now() - hit.at < ttl) return hit.analysis;
  const analysis = await analyzeMatch(match);
  cache.set(match.id, { key, at: Date.now(), analysis });
  if (opts.record !== false) {
    recordPrediction(match, analysis).catch((error) => console.error("recordPrediction", error));
  }
  return analysis;
}


/** xG para a listagem: xG real da partida (se a fonte já forneceu) ou gols esperados (λ) do modelo pré-jogo. Nunca bloqueia a página. */
export async function xgForList(list: MatchRow[], maxCompute = 14): Promise<Record<number, { home: number; away: number; source: string }>> {
  const out: Record<number, { home: number; away: number; source: string }> = {};
  let computed = 0;
  await Promise.all(
    list.map(async (m) => {
      const rh = Number(m.homeXg), ra = Number(m.awayXg);
      if (m.status !== "scheduled" && (rh > 0 || ra > 0)) { out[m.id] = { home: rh, away: ra, source: "xG real" }; return; }
      if (m.source !== "espn" || !m.leagueCode) return;
      const hit = cache.get(m.id);
      if (hit?.analysis.pre) { out[m.id] = { home: hit.analysis.pre.lambdaHome, away: hit.analysis.pre.lambdaAway, source: "modelo pré-jogo" }; return; }
      if (computed >= maxCompute) return;
      computed += 1;
      const a = await Promise.race([getAnalysis(m, { record: false }), new Promise<null>((r) => setTimeout(() => r(null), 2500))]).catch(() => null);
      if (a?.pre) out[m.id] = { home: a.pre.lambdaHome, away: a.pre.lambdaAway, source: "modelo pré-jogo" };
    }),
  );
  return out;
}