import { getMatches, type MatchRow } from "@/lib/data";
import { callIntegration, getIntegration } from "@/lib/providers";
import { carregarHistorico, type JogoStats } from "@/lib/opportunities";
import { dayKey, formatKickoff } from "@/lib/utils";

/* ====================================================================== */
/*  MOTOR DE DESAPITO — discrepância estatística (inspirado no Apitou)     */
/*  Cruza os últimos 5/10 jogos de cada time (separados por mando) com a   */
/*  linha de mercado e destaca onde a linha parece inconsistente.          */
/*  Linhas de GOLS vêm da fonte (Bzzoiro odds / ESPN O/U) quando existem;  */
/*  escanteios/chutes/cartões/faltas usam linhas de referência padrão,     */
/*  sempre rotuladas com a origem (linhaFonte).                            */
/* ====================================================================== */

export type Periodo = "Jogo completo" | "1º tempo" | "2º tempo";
export type Mercado = "Gols" | "Finalizações" | "Chutes a gol" | "Escanteios" | "Cartões" | "Faltas";
export type Amostra = 5 | 10;

export type Desapito = {
  id: string;
  matchId: number;
  jogo: { casa: string; fora: string; logoCasa: string; logoFora: string; horario: string; kickoff: string; liga: string; status: string };
  time: { nome: string; logo: string; lado: "casa" | "fora" };
  mercado: Mercado;
  periodo: Periodo;
  linha: number;
  linhaFonte: "bzzoiro" | "espn" | "referencia";
  rotulo: string; // "Mais de 4.5 chutes a gol"
  direcao: "acima" | "abaixo";
  media: number;
  discrepancia: number; // média − linha
  acertos: number;
  total: number;
  percentual: number;
  historico: { valor: number; bateu: boolean; adversario: string; emCasa: boolean; data: string; placar: string }[];
  baseParcial: boolean;
  duplo: boolean; // o adversário apresenta a mesma discrepância no mesmo mercado/período
  fonte: string;
  forca: number; // |discrepância| normalizada pela linha (0–1+) — usada para ordenar
};

export type DesapitoResultado = { data: string; periodo: Periodo; amostra: Amostra; total: number; duplos: number; itens: Desapito[]; jogosAvaliados: number; aviso?: string; tempoMs: number };

/* --------------------------- cálculo puro --------------------------- */

export type DesapitoCalc = { media: number; discrepancia: number; direcao: "acima" | "abaixo"; acertos: number; total: number; percentual: number; bateu: boolean[] };

/**
 * calcularDesapito(historicoTime, linhaMercado, mediaTime?)
 *  - historicoTime: valores do time nos últimos N jogos (já filtrados por mando)
 *  - linhaMercado: linha (ex.: 4.5)
 *  - mediaTime: opcional; se omitida é calculada do histórico
 * Discrepância = média − linha. Positiva → "Acima da Linha" (acertos contam valores > linha);
 * negativa → "Abaixo da Linha" (acertos contam valores < linha).
 */
export function calcularDesapito(historicoTime: number[], linhaMercado: number, mediaTime?: number): DesapitoCalc {
  const total = historicoTime.length;
  const media = mediaTime ?? (total ? historicoTime.reduce((a, b) => a + b, 0) / total : 0);
  const discrepancia = Math.round((media - linhaMercado) * 100) / 100;
  const direcao: "acima" | "abaixo" = discrepancia >= 0 ? "acima" : "abaixo";
  const bateu = historicoTime.map((v) => (direcao === "acima" ? v > linhaMercado : v < linhaMercado));
  const acertos = bateu.filter(Boolean).length;
  return { media: Math.round(media * 100) / 100, discrepancia, direcao, acertos, total, percentual: total ? Math.round((acertos / total) * 100) : 0, bateu };
}

/* ------------------------ linhas de referência ------------------------ */

/** Linhas padrão de mercado por métrica/período (por TIME, não por partida). */
const LINHAS_REF: Record<Mercado, Record<Periodo, number[]>> = {
  Gols: { "Jogo completo": [0.5, 1.5, 2.5], "1º tempo": [0.5, 1.5], "2º tempo": [0.5, 1.5] },
  Finalizações: { "Jogo completo": [8.5, 10.5, 12.5, 14.5], "1º tempo": [], "2º tempo": [] },
  "Chutes a gol": { "Jogo completo": [2.5, 3.5, 4.5, 5.5], "1º tempo": [1.5, 2.5], "2º tempo": [] },
  Escanteios: { "Jogo completo": [3.5, 4.5, 5.5, 6.5], "1º tempo": [], "2º tempo": [] },
  Cartões: { "Jogo completo": [1.5, 2.5, 3.5], "1º tempo": [], "2º tempo": [] },
  Faltas: { "Jogo completo": [9.5, 11.5, 13.5], "1º tempo": [], "2º tempo": [] },
};

const UNIDADE: Record<Mercado, string> = { Gols: "gols", Finalizações: "finalizações", "Chutes a gol": "chutes a gol", Escanteios: "escanteios", Cartões: "cartões", Faltas: "faltas" };

function valor(j: JogoStats, mercado: Mercado, periodo: Periodo): number | null {
  switch (mercado) {
    case "Gols": return periodo === "Jogo completo" ? j.golsFT : periodo === "1º tempo" ? j.golsHT : j.golsHT === null ? null : j.golsFT - j.golsHT;
    case "Finalizações": return periodo === "Jogo completo" ? j.finalizacoes : null;
    case "Chutes a gol": return periodo === "1º tempo" ? j.chutesNoGolHT : periodo === "Jogo completo" ? j.chutesNoGol ?? null : null;
    case "Escanteios": return periodo === "Jogo completo" ? j.escanteios : null;
    case "Cartões": return periodo === "Jogo completo" ? j.cartoes : null;
    case "Faltas": return periodo === "Jogo completo" ? j.faltas : null;
  }
}

/** Linha de gols real da partida (Bzzoiro odds → ESPN O/U). Linha por TIME ≈ metade da linha total, arredondada a .5. */
async function linhaGolsReal(match: MatchRow): Promise<{ total: number; fonte: "bzzoiro" | "espn" } | null> {
  if (match.overUnder) { const n = Number(match.overUnder); if (Number.isFinite(n)) return { total: n, fonte: "espn" }; }
  if (!(await getIntegration("bzzoiro"))) return null;
  // odds por evento exigem o id do evento na Bzzoiro; evitamos N buscas pesadas — usa só quando houver mapeamento rápido pela data
  const day = match.kickoff.toISOString().slice(0, 10);
  const ev = await callIntegration("bzzoiro", "/events/", { date_from: day, date_to: day, page_size: "200" });
  type Ev = { id: number; home_team: string; away_team: string };
  const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
  const same = (a: string, b: string) => { const x = norm(a), y = norm(b); return x === y || x.includes(y) || y.includes(x); };
  const found = ev.ok ? ((ev.data as { results?: Ev[] }).results ?? []).find((e) => same(e.home_team, match.homeName) && same(e.away_team, match.awayName)) : null;
  if (!found) return null;
  const odds = await callIntegration("bzzoiro", `/events/${found.id}/odds/`);
  const o = odds.ok ? (odds.data as { odds?: Record<string, number> }).odds : null;
  if (!o) return null;
  // linha "principal" = a de over/under mais próxima de 2.0 (equilibrada)
  const cands = [1.5, 2.5, 3.5].map((l) => ({ l, over: o[`over_${String(l).replace(".", "")}_goals`], under: o[`under_${String(l).replace(".", "")}_goals`] })).filter((c) => c.over && c.under);
  if (!cands.length) return null;
  cands.sort((a, b) => Math.abs(Math.log(a.over / a.under)) - Math.abs(Math.log(b.over / b.under)));
  return { total: cands[0].l, fonte: "bzzoiro" };
}

const cache = new Map<string, { at: number; value: DesapitoResultado }>();
const TTL = 15 * 60 * 1000;
const MIN_PCT = 70; // só destaca discrepâncias com ≥70% de consistência
const MIN_JOGOS = 3;

/** Motor: gera os desapitos do dia (por período e amostra). */
export async function buscarDesapitos(opts: { data?: string; periodo?: Periodo; amostra?: Amostra; liga?: string; apenasDuplos?: boolean } = {}): Promise<DesapitoResultado> {
  const inicio = Date.now();
  const data = opts.data ?? dayKey(new Date());
  const periodo = opts.periodo ?? "Jogo completo";
  const amostra = opts.amostra ?? 10;
  const key = JSON.stringify({ data, periodo, amostra, liga: opts.liga ?? "todas" });
  let base = cache.get(key)?.value;
  if (!base || Date.now() - (cache.get(key)?.at ?? 0) > TTL) {
    const all = (await getMatches()).filter((m) => m.source === "espn" && dayKey(m.kickoff) === data && (!opts.liga || opts.liga === "todas" || m.leagueCode === opts.liga));
    const itens: Desapito[] = [];
    await Promise.all(
      all.slice(0, 50).map(async (m) => {
        const [hh, ha] = await Promise.all([carregarHistorico(m.homeId, new Date(m.kickoff)).catch(() => null), carregarHistorico(m.awayId, new Date(m.kickoff)).catch(() => null)]);
        if (!hh?.jogos.length && !ha?.jogos.length) return;
        const golsReal = await linhaGolsReal(m).catch(() => null);
        const lados: { lado: "casa" | "fora"; hist: typeof hh; nome: string; logo: string }[] = [
          { lado: "casa", hist: hh, nome: m.homeName, logo: m.homeLogo },
          { lado: "fora", hist: ha, nome: m.awayName, logo: m.awayLogo },
        ];
        const porLado = new Map<string, Desapito[]>();
        for (const s of lados) {
          if (!s.hist) continue;
          // mando: casa usa jogos em casa; fora usa jogos fora (fallback: geral, marcado como base parcial)
          const mesmoMando = s.hist.jogos.filter((j) => j.emCasa === (s.lado === "casa"));
          const pool = mesmoMando.length >= MIN_JOGOS ? mesmoMando : s.hist.jogos;
          const usouGeral = mesmoMando.length < MIN_JOGOS;
          const jogos = pool.slice(0, amostra);
          for (const mercado of Object.keys(LINHAS_REF) as Mercado[]) {
            const vals = jogos.map((j) => ({ j, v: valor(j, mercado, periodo) })).filter((x): x is { j: JogoStats; v: number } => x.v !== null);
            if (vals.length < MIN_JOGOS) continue;
            let linhas = LINHAS_REF[mercado][periodo];
            let linhaFonte: Desapito["linhaFonte"] = "referencia";
            if (mercado === "Gols" && periodo === "Jogo completo" && golsReal) {
              const porTime = Math.max(0.5, Math.round(golsReal.total / 2 - 0.5) + 0.5); // 2.5 → 1.5 por time
              linhas = [porTime]; linhaFonte = golsReal.fonte;
            }
            // Escolhe a linha "de interesse": a MAIS EXIGENTE que ainda mantém ≥70% de consistência
            // (acima: maior linha batida; abaixo: menor linha respeitada). Evita destaques triviais
            // como "mais de 0.5 gols" para um time que marca 5 por jogo.
            const serie = vals.map((x) => x.v);
            const mediaSerie = serie.reduce((a, b) => a + b, 0) / serie.length;
            let melhor: { calc: DesapitoCalc; linha: number } | null = null;
            const ordenadas = [...linhas].sort((a, b) => (mediaSerie >= Math.max(...linhas) || mediaSerie >= Math.min(...linhas) ? b - a : a - b));
            for (const linha of ordenadas) {
              const calc = calcularDesapito(serie, linha);
              if (calc.percentual < MIN_PCT || Math.abs(calc.discrepancia) < 0.25) continue;
              // direção deve ser coerente com a média (acima → linha abaixo da média; abaixo → linha acima)
              if ((calc.direcao === "acima" && linha > mediaSerie) || (calc.direcao === "abaixo" && linha < mediaSerie)) continue;
              melhor = { calc, linha };
              break;
            }
            if (!melhor) continue;
            const { calc, linha } = melhor;
            const d: Desapito = {
              id: `${m.id}-${s.lado}-${mercado}-${periodo}`, matchId: m.id,
              jogo: { casa: m.homeName, fora: m.awayName, logoCasa: m.homeLogo, logoFora: m.awayLogo, horario: formatKickoff(m.kickoff), kickoff: m.kickoff.toISOString(), liga: m.leagueName ?? "", status: m.status },
              time: { nome: s.nome, logo: s.logo, lado: s.lado },
              mercado, periodo, linha, linhaFonte,
              rotulo: `${calc.direcao === "acima" ? "Mais" : "Menos"} de ${linha} ${UNIDADE[mercado]}${periodo !== "Jogo completo" ? ` (${periodo})` : ""}`,
              direcao: calc.direcao, media: calc.media, discrepancia: calc.discrepancia,
              acertos: calc.acertos, total: calc.total, percentual: calc.percentual,
              historico: vals.map((x, i) => ({ valor: x.v, bateu: calc.bateu[i], adversario: x.j.adversario, emCasa: x.j.emCasa, data: x.j.data, placar: x.j.placar })),
              baseParcial: calc.total < 5 || usouGeral, duplo: false, fonte: s.hist.fonte,
              forca: Math.abs(calc.discrepancia) / Math.max(0.5, linha),
            };
            porLado.set(`${s.lado}|${mercado}`, [...(porLado.get(`${s.lado}|${mercado}`) ?? []), d]);
            itens.push(d);
          }
        }
        // desapito duplo: ambos os lados com a MESMA direção no mesmo mercado/período
        for (const mercado of Object.keys(LINHAS_REF) as Mercado[]) {
          const c = porLado.get(`casa|${mercado}`)?.[0], f = porLado.get(`fora|${mercado}`)?.[0];
          if (c && f && c.direcao === f.direcao) { c.duplo = true; f.duplo = true; }
        }
      }),
    );
    itens.sort((a, b) => Number(b.duplo) - Number(a.duplo) || b.forca - a.forca || b.percentual - a.percentual);
    base = { data, periodo, amostra, total: itens.length, duplos: itens.filter((i) => i.duplo).length, itens, jogosAvaliados: all.length, tempoMs: Date.now() - inicio, aviso: all.length === 0 ? "Nenhum jogo nesta data." : itens.length === 0 ? `Nenhuma discrepância consistente (≥${MIN_PCT}%) encontrada para ${periodo.toLowerCase()} com ${amostra} jogos.` : undefined };
    cache.set(key, { at: Date.now(), value: base });
  }
  const itens = opts.apenasDuplos ? base.itens.filter((i) => i.duplo) : base.itens;
  return { ...base, itens, total: itens.length, tempoMs: Date.now() - inicio };
}
