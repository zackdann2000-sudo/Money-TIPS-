/**
 * mockData — dados de demonstração estruturados para o Match Center.
 * Usados APENAS onde a fonte atual não fornece histórico jogo-a-jogo por jogador,
 * mercados de oportunidade e árbitro. Tudo que é mock chega à UI marcado com `demo: true`.
 *
 * A geração é determinística (seed = id do jogador/time) para a tela ficar estável entre renders.
 */

export type Last10Player = {
  id: number;
  nome: string;
  time: string;
  timeSigla: string;
  foto?: string;
  posicao: string;
  numero: number;
  titular: boolean;
  /** valores da estatística nos últimos 10 jogos (mais recente primeiro) */
  last10: number[];
};

export type Last10Category = "gols" | "assistencias" | "finalizacoes" | "finalizacoes_gol" | "desarmes" | "faltas" | "amarelos" | "defesas";

export const LAST10_CATEGORIES: { key: Last10Category; label: string; icon: string; gkOnly?: boolean }[] = [
  { key: "gols", label: "Gols", icon: "⚽" },
  { key: "assistencias", label: "Assistências", icon: "🅰️" },
  { key: "finalizacoes", label: "Finalizações", icon: "🎯" },
  { key: "finalizacoes_gol", label: "Finalizações no gol", icon: "🥅" },
  { key: "desarmes", label: "Desarmes", icon: "🛡️" },
  { key: "faltas", label: "Faltas", icon: "✋" },
  { key: "amarelos", label: "Cartões amarelos", icon: "🟨" },
  { key: "defesas", label: "Defesas de goleiro", icon: "🧤", gkOnly: true },
];

/* ---------------------------- gerador determinístico ---------------------------- */

function rng(seed: number) {
  let s = (seed * 9301 + 49297) % 233280;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

/** Poisson simples via inversão (λ pequeno) */
function poisson(lambda: number, r: () => number) {
  const L = Math.exp(-lambda);
  let k = 0, p = 1;
  do { k += 1; p *= r(); } while (p > L);
  return k - 1;
}

/** Médias-base por posição para cada categoria (valores típicos por jogo). */
const BASE: Record<Last10Category, Record<string, number>> = {
  gols: { GOL: 0, ZAG: 0.08, LAT: 0.1, VOL: 0.1, MEI: 0.22, PON: 0.35, ATA: 0.55 },
  assistencias: { GOL: 0, ZAG: 0.05, LAT: 0.18, VOL: 0.12, MEI: 0.3, PON: 0.28, ATA: 0.18 },
  finalizacoes: { GOL: 0, ZAG: 0.5, LAT: 0.8, VOL: 0.9, MEI: 1.6, PON: 2.3, ATA: 3.0 },
  finalizacoes_gol: { GOL: 0, ZAG: 0.2, LAT: 0.3, VOL: 0.3, MEI: 0.6, PON: 0.9, ATA: 1.3 },
  desarmes: { GOL: 0.1, ZAG: 1.8, LAT: 2.2, VOL: 2.6, MEI: 1.5, PON: 0.9, ATA: 0.5 },
  faltas: { GOL: 0.1, ZAG: 1.4, LAT: 1.2, VOL: 1.9, MEI: 1.3, PON: 1.0, ATA: 1.4 },
  amarelos: { GOL: 0.03, ZAG: 0.22, LAT: 0.18, VOL: 0.28, MEI: 0.16, PON: 0.12, ATA: 0.14 },
  defesas: { GOL: 3.2, ZAG: 0, LAT: 0, VOL: 0, MEI: 0, PON: 0, ATA: 0 },
};

export type MockPlayerSeed = { id: number; nome: string; time: string; timeSigla: string; foto?: string; posicao: string; numero: number; titular: boolean };

/** Gera a série de 10 jogos para um jogador em uma categoria. */
export function buildLast10(seed: MockPlayerSeed, category: Last10Category): Last10Player {
  const pos = normalizePos(seed.posicao);
  const lambda = BASE[category][pos] ?? 0.3;
  const r = rng(seed.id * 31 + category.length * 7 + pos.charCodeAt(0));
  const last10 = Array.from({ length: 10 }, () => poisson(lambda * (0.8 + r() * 0.5), r));
  return { ...seed, posicao: pos, last10 };
}

export function normalizePos(pos: string) {
  const p = pos.toUpperCase();
  if (p.startsWith("G")) return "GOL";
  if (p.startsWith("Z") || p === "CD" || p === "D") return "ZAG";
  if (p.startsWith("L") || p === "RB" || p === "LB" || p === "WB") return "LAT";
  if (p.startsWith("V") || p === "DM" || p === "CM") return "VOL";
  if (p.startsWith("P") || p === "RW" || p === "LW" || p === "W") return "PON";
  if (p.startsWith("A") || p === "F" || p === "ST" || p === "CF") return "ATA";
  return "MEI";
}

export const media = (arr: number[]) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);

/* --------------------------------- Pré-Live -------------------------------- */

export type CompareStat = { label: string; casa: number; fora: number; liga: number; casaTotal?: number; foraTotal?: number; sufixo?: string };
export type CompareCategory = "PASSES" | "DEFESA" | "DISCIPLINA" | "OUTROS";

/** Estatísticas sem fonte real (mock) — passes, desarmes etc. Médias dos times reais entram via props. */
export function mockCompareStats(homeSeed: number, awaySeed: number, games = 10): Record<CompareCategory, CompareStat[]> {
  const rh = rng(homeSeed * 13), ra = rng(awaySeed * 17);
  const mk = (label: string, base: number, spread: number, liga: number, sufixo?: string): CompareStat => {
    const casa = Math.round((base + (rh() - 0.5) * spread) * 10) / 10;
    const fora = Math.round((base + (ra() - 0.5) * spread) * 10) / 10;
    return { label, casa, fora, liga, casaTotal: Math.round(casa * games), foraTotal: Math.round(fora * games), sufixo };
  };
  return {
    PASSES: [mk("Passes", 420, 160, 445), mk("Passes certos", 350, 150, 372), mk("Precisão de passe", 83, 8, 83.6, "%"), mk("Passes longos", 48, 18, 51), mk("Cruzamentos", 17, 8, 18)],
    DEFESA: [mk("Desarmes", 16, 6, 16.8), mk("Interceptações", 9, 4, 9.5), mk("Cortes", 19, 8, 20.1), mk("Bloqueios", 3.5, 2, 3.7), mk("Duelos ganhos", 48, 12, 49)],
    DISCIPLINA: [mk("Faltas cometidas", 13.5, 5, 13.9), mk("Faltas sofridas", 13, 5, 13.9), mk("Cartões amarelos", 2.4, 1.4, 2.5), mk("Cartões vermelhos", 0.1, 0.15, 0.12)],
    OUTROS: [mk("Arremessos laterais", 22, 8, 23), mk("Tiros de meta", 8, 3, 8.4), mk("Impedimentos", 2.1, 1.4, 2.2), mk("Posse de bola", 50, 14, 50, "%")],
  };
}

/* --------------------------------- Árbitro --------------------------------- */

export type Referee = {
  nome: string;
  foto?: string;
  jogos: number;
  faltasJogo: number;
  cartoesJogo: number;
  faltas1T: number;
  faltas2T: number;
  cartoes1T: number;
  cartoes2T: number;
  penaltisJogo: number;
  demo: boolean;
};

export function mockReferee(seed: number): Referee {
  const r = rng(seed * 41);
  const faltas = 24 + r() * 8, cartoes = 4 + r() * 2.2;
  const f1 = faltas * (0.44 + r() * 0.06), c1 = cartoes * (0.36 + r() * 0.08);
  return {
    nome: "Árbitro não informado pela fonte",
    jogos: 12 + Math.round(r() * 10),
    faltasJogo: round1(faltas),
    cartoesJogo: round1(cartoes),
    faltas1T: round1(f1),
    faltas2T: round1(faltas - f1),
    cartoes1T: round1(c1),
    cartoes2T: round1(cartoes - c1),
    penaltisJogo: round1(0.2 + r() * 0.2, 2),
    demo: true,
  };
}
const round1 = (v: number, d = 1) => Math.round(v * 10 ** d) / 10 ** d;

/* ------------------------------ Oportunidades ------------------------------ */

export type OpportunityMarket = "Gols" | "Escanteios" | "Faltas" | "Arremessos laterais" | "Cartões" | "Finalizações" | "Finalizações no gol" | "Impedimentos";
export type OpportunityPeriod = "Jogo todo" | "1º Tempo" | "2º Tempo";

export type Opportunity = {
  id: string;
  mercado: OpportunityMarket;
  periodo: OpportunityPeriod;
  linha: string; // ex.: "Mais de 1,5"
  acertos: number; // quantas vezes bateu nos últimos 10
  total: number; // 10
  odd: number;
  historico: number[]; // valor do time em cada um dos 10 jogos
  demo: boolean;
};

type Line = { mercado: OpportunityMarket; periodo: OpportunityPeriod; base: number; linha: number };

const LINES: Line[] = [
  { mercado: "Gols", periodo: "Jogo todo", base: 1.4, linha: 0.5 },
  { mercado: "Gols", periodo: "Jogo todo", base: 1.4, linha: 1.5 },
  { mercado: "Gols", periodo: "2º Tempo", base: 0.8, linha: 0.5 },
  { mercado: "Escanteios", periodo: "Jogo todo", base: 5.2, linha: 3.5 },
  { mercado: "Escanteios", periodo: "Jogo todo", base: 5.2, linha: 4.5 },
  { mercado: "Escanteios", periodo: "1º Tempo", base: 2.5, linha: 1.5 },
  { mercado: "Faltas", periodo: "Jogo todo", base: 13.5, linha: 10.5 },
  { mercado: "Faltas", periodo: "2º Tempo", base: 7, linha: 5.5 },
  { mercado: "Arremessos laterais", periodo: "Jogo todo", base: 22, linha: 17.5 },
  { mercado: "Cartões", periodo: "Jogo todo", base: 2.4, linha: 1.5 },
  { mercado: "Finalizações", periodo: "Jogo todo", base: 12, linha: 8.5 },
  { mercado: "Finalizações no gol", periodo: "Jogo todo", base: 4.2, linha: 2.5 },
  { mercado: "Impedimentos", periodo: "Jogo todo", base: 2, linha: 1.5 },
];

/**
 * Simula o backend: gera (ou recebe) os valores do time nos últimos 10 jogos e conta
 * quantas vezes a linha "Mais de X" bateu. A odd estimada é derivada do hit-rate
 * (1 / probabilidade, com margem de 6%) e limitada entre 1,10 e 4,00.
 */
export function buildOpportunities(teamSeed: number, realAverages?: Partial<Record<OpportunityMarket, number>>): Opportunity[] {
  const r = rng(teamSeed * 97);
  return LINES.map((l, i) => {
    const avg = realAverages?.[l.mercado] !== undefined && l.periodo === "Jogo todo" ? realAverages[l.mercado]! : l.base;
    const scale = l.periodo === "Jogo todo" ? 1 : l.periodo === "1º Tempo" ? 0.45 : 0.55;
    const lambda = avg * scale * (0.85 + r() * 0.3);
    const historico = Array.from({ length: 10 }, () => (l.mercado === "Gols" || l.mercado === "Cartões" || l.mercado === "Impedimentos" ? poisson(lambda, r) : Math.max(0, Math.round(lambda + (r() - 0.5) * lambda * 0.9))));
    const acertos = historico.filter((v) => v > l.linha).length;
    const p = Math.min(0.95, Math.max(0.08, acertos / 10));
    const odd = Math.min(4, Math.max(1.1, Math.round((1 / p) * 0.94 * 100) / 100));
    return { id: `${teamSeed}-${i}`, mercado: l.mercado, periodo: l.periodo, linha: `Mais de ${l.linha.toFixed(1)} ${l.mercado}`, acertos, total: 10, odd, historico, demo: realAverages?.[l.mercado] === undefined };
  }).sort((a, b) => b.acertos - a.acertos || a.odd - b.odd);
}

/* ------------------------------- Campo (XY) -------------------------------- */

export type PitchPlayer = { id: number; nome: string; numero: number; foto?: string; x: number; y: number; capitao?: boolean; posicao: string };

/** Coordenadas (% do campo) por formação; índice 0 = goleiro. y=0 é a própria linha de fundo. */
export const FORMATION_XY: Record<string, [number, number][]> = {
  "4-3-3": [[50, 6], [15, 24], [38, 20], [62, 20], [85, 24], [28, 48], [50, 42], [72, 48], [18, 76], [50, 84], [82, 76]],
  "4-2-3-1": [[50, 6], [15, 24], [38, 20], [62, 20], [85, 24], [36, 42], [64, 42], [18, 62], [50, 60], [82, 62], [50, 84]],
  "4-4-2": [[50, 6], [15, 24], [38, 20], [62, 20], [85, 24], [15, 50], [38, 46], [62, 46], [85, 50], [36, 80], [64, 80]],
  "3-5-2": [[50, 6], [25, 22], [50, 18], [75, 22], [10, 50], [32, 44], [50, 40], [68, 44], [90, 50], [36, 80], [64, 80]],
  "3-4-3": [[50, 6], [25, 22], [50, 18], [75, 22], [12, 48], [38, 44], [62, 44], [88, 48], [20, 78], [50, 84], [80, 78]],
  "5-3-2": [[50, 6], [10, 30], [30, 22], [50, 18], [70, 22], [90, 30], [30, 52], [50, 46], [70, 52], [36, 80], [64, 80]],
  "4-1-4-1": [[50, 6], [15, 24], [38, 20], [62, 20], [85, 24], [50, 38], [15, 58], [38, 54], [62, 54], [85, 58], [50, 84]],
  "3-4-2-1": [[50, 6], [25, 22], [50, 18], [75, 22], [12, 46], [38, 42], [62, 42], [88, 46], [35, 66], [65, 66], [50, 84]],
  "4-3-1-2": [[50, 6], [15, 24], [38, 20], [62, 20], [85, 24], [28, 46], [50, 40], [72, 46], [50, 64], [36, 82], [64, 82]],
};

export function placeFormation(formation: string, players: { id: number; nome: string; numero: number; foto?: string; posicao: string }[]): PitchPlayer[] {
  const key = FORMATION_XY[formation] ? formation : "4-3-3";
  const xy = FORMATION_XY[key];
  return players.slice(0, 11).map((p, i) => ({ ...p, x: xy[i]?.[0] ?? 50, y: xy[i]?.[1] ?? 50 }));
}
