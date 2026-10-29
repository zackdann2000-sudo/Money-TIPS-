import { getMatches, type MatchRow } from "@/lib/data";
import { ESPN_LEAGUES } from "@/lib/espn";
import { carregarHistorico, type JogoStats } from "@/lib/opportunities";
import { dayKey, formatKickoff } from "@/lib/utils";

/* ====================================================================== */
/*  DETECTOR — scanner de oportunidades por filtros cruzados               */
/*  Mercado × Período × Data × Liga × Amostra (5/10) × Local (casa/fora)   */
/*  Histórico real (Sportmonks → Bzzoiro → ESPN) via carregarHistorico().  */
/* ====================================================================== */

export type Categoria = "Vitórias" | "Ambas Marcam" | "Gols" | "Escanteios" | "Cartões" | "Faltas" | "Impedimentos" | "Finalizações";
export type Periodo = "Jogo Todo" | "1º Tempo";
export type Local = "casa" | "fora" | "ambos";

export type Filtros = {
  categoria: Categoria;
  periodo: Periodo;
  linha: number; // ignorada em Vitórias / Ambas Marcam
  data: string; // YYYY-MM-DD (dia local)
  liga: string; // código ESPN (ex.: uefa.champions) ou "todas"
  amostra: 5 | 10;
  local: Local;
  minTaxa?: number; // padrão 70
  pagina?: number;
  porPagina?: number;
};

export const CATEGORIAS: { key: Categoria; icon: string; linhas: number[]; semLinha?: boolean; suporta1T: boolean }[] = [
  { key: "Vitórias", icon: "🏆", linhas: [], semLinha: true, suporta1T: true },
  { key: "Ambas Marcam", icon: "🤝", linhas: [], semLinha: true, suporta1T: true },
  { key: "Gols", icon: "⚽", linhas: [0.5, 1.5, 2.5, 3.5], suporta1T: true },
  { key: "Escanteios", icon: "🚩", linhas: [2.5, 3.5, 4.5, 5.5, 6.5, 7.5], suporta1T: false },
  { key: "Cartões", icon: "🟨", linhas: [0.5, 1.5, 2.5, 3.5, 4.5], suporta1T: false },
  { key: "Faltas", icon: "✋", linhas: [8.5, 10.5, 12.5, 14.5], suporta1T: false },
  { key: "Impedimentos", icon: "🚫", linhas: [0.5, 1.5, 2.5, 3.5], suporta1T: false },
  { key: "Finalizações", icon: "🎯", linhas: [6.5, 8.5, 10.5, 12.5, 14.5], suporta1T: false },
];

export const LIGAS = [{ code: "todas", name: "Todas as ligas", flag: "🌍" }, ...ESPN_LEAGUES.map((l) => ({ code: l.code, name: l.name, flag: l.flag, country: l.country }))];

export type ResultadoJogo = {
  matchId: number;
  liga: string;
  pais: string;
  horario: string;
  kickoff: string;
  status: string;
  casa: { nome: string; logo: string; id: number };
  fora: { nome: string; logo: string; id: number };
  timeAnalisado: { nome: string; logo: string; lado: "casa" | "fora" };
  mercado: string; // "Gols > 1.5 · Jogo Todo"
  acertos: number;
  total: number;
  taxa: number; // 0–100
  baseParcial: boolean;
  historico: { acerto: boolean; valor: number | null; adversario: string; emCasa: boolean; data: string; placar: string }[];
  fonte: string;
};

export type BuscaResultado = { filtros: Filtros; total: number; pagina: number; paginas: number; resultados: ResultadoJogo[]; jogosAvaliados: number; aviso?: string; tempoMs: number };

/** Valor do jogo para o mercado/período — null quando a fonte não fornece. Para Vitórias/BTTS devolve 1 (bateu) ou 0. */
export function valorDoJogo(j: JogoStats, categoria: Categoria, periodo: Periodo): number | null {
  const ht = periodo === "1º Tempo";
  switch (categoria) {
    case "Vitórias": {
      if (ht) return j.golsHT === null || j.golsSofridosHT === null ? null : j.golsHT > j.golsSofridosHT ? 1 : 0;
      return j.golsFT > j.golsSofridosFT ? 1 : 0;
    }
    case "Ambas Marcam": {
      if (ht) return j.golsHT === null || j.golsSofridosHT === null ? null : j.golsHT > 0 && j.golsSofridosHT > 0 ? 1 : 0;
      return j.golsFT > 0 && j.golsSofridosFT > 0 ? 1 : 0;
    }
    case "Gols": return ht ? j.golsHT : j.golsFT;
    case "Escanteios": return j.escanteios;
    case "Cartões": return j.cartoes;
    case "Faltas": return j.faltas;
    case "Impedimentos": return j.impedimentos;
    case "Finalizações": return j.finalizacoes;
  }
}

export function bateu(valor: number | null, categoria: Categoria, linha: number) {
  if (valor === null) return null;
  if (categoria === "Vitórias" || categoria === "Ambas Marcam") return valor === 1;
  return valor > linha;
}

export function rotuloMercado(f: Pick<Filtros, "categoria" | "periodo" | "linha">) {
  const semLinha = CATEGORIAS.find((c) => c.key === f.categoria)?.semLinha;
  return `${f.categoria}${semLinha ? "" : ` > ${f.linha}`} · ${f.periodo}`;
}

const cache = new Map<string, { at: number; value: Omit<BuscaResultado, "pagina" | "paginas" | "resultados"> & { todos: ResultadoJogo[] } }>();
const TTL = 15 * 60 * 1000;

/** Motor: para cada jogo agendado na data/liga, analisa o(s) time(s) do local escolhido nos últimos N jogos. */
export async function buscarOportunidades(filtros: Filtros): Promise<BuscaResultado> {
  const inicio = Date.now();
  const minTaxa = filtros.minTaxa ?? 70;
  const key = JSON.stringify({ ...filtros, pagina: undefined, porPagina: undefined });
  let base = cache.get(key)?.value;
  if (!base || Date.now() - (cache.get(key)?.at ?? 0) > TTL) {
    const all = (await getMatches()).filter((m) => m.source === "espn" && dayKey(m.kickoff) === filtros.data && (filtros.liga === "todas" || m.leagueCode === filtros.liga));
    const todos: ResultadoJogo[] = [];
    const avaliar = async (m: MatchRow, lado: "casa" | "fora") => {
      const teamId = lado === "casa" ? m.homeId : m.awayId;
      const hist = await carregarHistorico(teamId, new Date(m.kickoff)).catch(() => null);
      if (!hist || !hist.jogos.length) return;
      // Local: filtra pelos jogos no mesmo mando quando o usuário pediu casa/fora; "ambos" usa tudo
      const pool = filtros.local === "ambos" ? hist.jogos : hist.jogos.filter((j) => j.emCasa === (lado === "casa"));
      const amostra = pool.slice(0, filtros.amostra);
      const avaliados = amostra.map((j) => ({ j, valor: valorDoJogo(j, filtros.categoria, filtros.periodo) })).filter((x) => x.valor !== null);
      if (avaliados.length < 3) return; // sem base mínima para dizer qualquer coisa
      const acertos = avaliados.filter((x) => bateu(x.valor, filtros.categoria, filtros.linha)).length;
      const total = avaliados.length;
      const taxa = Math.round((acertos / total) * 100);
      if (taxa < minTaxa) return;
      todos.push({
        matchId: m.id, liga: m.leagueName ?? "", pais: ESPN_LEAGUES.find((l) => l.code === m.leagueCode)?.country ?? "", horario: formatKickoff(m.kickoff), kickoff: m.kickoff.toISOString(), status: m.status,
        casa: { nome: m.homeName, logo: m.homeLogo, id: m.homeId }, fora: { nome: m.awayName, logo: m.awayLogo, id: m.awayId },
        timeAnalisado: { nome: lado === "casa" ? m.homeName : m.awayName, logo: lado === "casa" ? m.homeLogo : m.awayLogo, lado },
        mercado: rotuloMercado(filtros), acertos, total, taxa, baseParcial: total < filtros.amostra,
        historico: avaliados.map((x) => ({ acerto: Boolean(bateu(x.valor, filtros.categoria, filtros.linha)), valor: x.valor, adversario: x.j.adversario, emCasa: x.j.emCasa, data: x.j.data, placar: x.j.placar })),
        fonte: hist.fonte,
      });
    };
    await Promise.all(all.slice(0, 60).flatMap((m) => (filtros.local === "casa" ? [avaliar(m, "casa")] : filtros.local === "fora" ? [avaliar(m, "fora")] : [avaliar(m, "casa"), avaliar(m, "fora")])));
    todos.sort((a, b) => b.taxa - a.taxa || b.total - a.total || a.kickoff.localeCompare(b.kickoff));
    base = { filtros, total: todos.length, todos, jogosAvaliados: all.length, tempoMs: Date.now() - inicio, aviso: all.length === 0 ? "Nenhum jogo agendado para esta data/liga nas competições monitoradas." : todos.length === 0 ? `Nenhum time atingiu ${minTaxa}% neste mercado com a amostra escolhida.` : undefined };
    cache.set(key, { at: Date.now(), value: base });
  }
  const porPagina = Math.min(50, Math.max(5, filtros.porPagina ?? 10));
  const paginas = Math.max(1, Math.ceil(base.todos.length / porPagina));
  const pagina = Math.min(paginas, Math.max(1, filtros.pagina ?? 1));
  return { filtros, total: base.todos.length, pagina, paginas, resultados: base.todos.slice((pagina - 1) * porPagina, pagina * porPagina), jogosAvaliados: base.jogosAvaliados, aviso: base.aviso, tempoMs: Date.now() - inicio };
}
