import { sql } from "drizzle-orm";
import { db } from "@/db";
import {
  apiIntegrations,
  banners,
  favorites,
  insights,
  leagues,
  lineups,
  matchEvents,
  matches,
  notifications,
  plans,
  subscriptions,
  teams,
  users,
} from "@/db/schema";
import { hashPassword } from "@/lib/auth";

const H = 60 * 60 * 1000;
const now = () => Date.now();
const at = (hoursFromNow: number) => new Date(now() + hoursFromNow * H);

let seedPromise: Promise<void> | null = null;

const LEAGUES = [
  { slug: "brasileirao", name: "Brasileirão Série A", country: "Brasil", flag: "🇧🇷", tier: "1", season: "2026", color: "#0b8f4e", avgGoals: "2.62", avgCorners: "10.4", avgCards: "5.2", sortOrder: 1 },
  { slug: "premier-league", name: "Premier League", country: "Inglaterra", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", tier: "1", season: "2025/26", color: "#3d195b", avgGoals: "2.98", avgCorners: "10.8", avgCards: "3.9", sortOrder: 2 },
  { slug: "laliga", name: "LaLiga", country: "Espanha", flag: "🇪🇸", tier: "1", season: "2025/26", color: "#ee8707", avgGoals: "2.71", avgCorners: "9.9", avgCards: "4.7", sortOrder: 3 },
  { slug: "serie-a", name: "Serie A", country: "Itália", flag: "🇮🇹", tier: "1", season: "2025/26", color: "#1a78cf", avgGoals: "2.66", avgCorners: "10.1", avgCards: "4.9", sortOrder: 4 },
  { slug: "bundesliga", name: "Bundesliga", country: "Alemanha", flag: "🇩🇪", tier: "1", season: "2025/26", color: "#d20515", avgGoals: "3.18", avgCorners: "10.2", avgCards: "3.7", sortOrder: 5 },
  { slug: "ligue-1", name: "Ligue 1", country: "França", flag: "🇫🇷", tier: "1", season: "2025/26", color: "#091c3e", avgGoals: "2.84", avgCorners: "9.6", avgCards: "4.2", sortOrder: 6 },
  { slug: "champions", name: "UEFA Champions League", country: "Europa", flag: "🇪🇺", tier: "Continental", season: "2025/26", color: "#0e1e5b", avgGoals: "3.11", avgCorners: "10.6", avgCards: "3.5", sortOrder: 7 },
  { slug: "libertadores", name: "Copa Libertadores", country: "América do Sul", flag: "🌎", tier: "Continental", season: "2026", color: "#0f7a3d", avgGoals: "2.41", avgCorners: "9.4", avgCards: "5.6", sortOrder: 8 },
];

type TeamSeed = {
  slug: string; name: string; shortName: string; league: string; country: string; city: string;
  stadium: string; coach: string; founded: number; badgeColor: string; badgeColorAlt: string;
  marketValue: string; position: number; played: number; wins: number; draws: number; losses: number;
  goalsFor: number; goalsAgainst: number; form: string; avgPossession: number; avgShots: number;
  avgShotsOnTarget: number; avgCorners: number; avgCards: number; avgFouls: number; avgOffsides: number;
  over25Rate: number; bttsRate: number; cleanSheets: number; description: string; formation: string;
};

const TEAMS: TeamSeed[] = [
  {
    slug: "flamengo", name: "Flamengo", shortName: "FLA", league: "brasileirao", country: "Brasil", city: "Rio de Janeiro",
    stadium: "Maracanã", coach: "Filipe Luís", founded: 1895, badgeColor: "#d5102b", badgeColorAlt: "#1a1a1a",
    marketValue: "€182M", position: 1, played: 24, wins: 16, draws: 5, losses: 3, goalsFor: 47, goalsAgainst: 21,
    form: "VVVEV", avgPossession: 60, avgShots: 16, avgShotsOnTarget: 6, avgCorners: 6, avgCards: 2,
    avgFouls: 13, avgOffsides: 2, over25Rate: 66, bttsRate: 58, cleanSheets: 9,
    description: "Melhor ataque do Brasileirão, com média de 1,96 gol por jogo e domínio territorial acima de 60%. O time de Filipe Luís combina pressão alta com transições rápidas pelos lados.",
    formation: "4-2-3-1",
  },
  {
    slug: "palmeiras", name: "Palmeiras", shortName: "PAL", league: "brasileirao", country: "Brasil", city: "São Paulo",
    stadium: "Allianz Parque", coach: "Abel Ferreira", founded: 1914, badgeColor: "#046a38", badgeColorAlt: "#f4f4f4",
    marketValue: "€168M", position: 2, played: 24, wins: 15, draws: 6, losses: 3, goalsFor: 40, goalsAgainst: 19,
    form: "VEVVV", avgPossession: 56, avgShots: 14, avgShotsOnTarget: 5, avgCorners: 6, avgCards: 3,
    avgFouls: 15, avgOffsides: 2, over25Rate: 58, bttsRate: 50, cleanSheets: 11,
    description: "Defesa mais sólida do campeonato e forte em bolas paradas. Palmeiras tem 11 jogos sem sofrer gol e a maior taxa de escanteios a favor em casa.",
    formation: "4-3-3",
  },
  {
    slug: "corinthians", name: "Corinthians", shortName: "COR", league: "brasileirao", country: "Brasil", city: "São Paulo",
    stadium: "Neo Química Arena", coach: "Dorival Júnior", founded: 1910, badgeColor: "#111111", badgeColorAlt: "#ffffff",
    marketValue: "€98M", position: 7, played: 24, wins: 10, draws: 7, losses: 7, goalsFor: 31, goalsAgainst: 29,
    form: "EVNVV", avgPossession: 51, avgShots: 12, avgShotsOnTarget: 4, avgCorners: 5, avgCards: 3,
    avgFouls: 16, avgOffsides: 2, over25Rate: 48, bttsRate: 57, cleanSheets: 6,
    description: "Time com média alta de faltas (16 por jogo) e forte apoio da torcida em casa. Costuma abrir jogos com pressão nos primeiros 20 minutos.",
    formation: "4-1-4-1",
  },
  {
    slug: "botafogo", name: "Botafogo", shortName: "BOT", league: "brasileirao", country: "Brasil", city: "Rio de Janeiro",
    stadium: "Nilton Santos", coach: "Ancelotti Jr.", founded: 1904, badgeColor: "#1b1b1b", badgeColorAlt: "#e6e6e6",
    marketValue: "€84M", position: 5, played: 24, wins: 12, draws: 5, losses: 7, goalsFor: 35, goalsAgainst: 28,
    form: "VVEVN", avgPossession: 53, avgShots: 13, avgShotsOnTarget: 5, avgCorners: 5, avgCards: 3,
    avgFouls: 14, avgOffsides: 3, over25Rate: 55, bttsRate: 61, cleanSheets: 7,
    description: "Equipe vertical, com média de 3 impedimentos por partida — a maior entre os clubes do G6. Isso reduz o volume de finalizações limpas.",
    formation: "4-2-3-1",
  },
  {
    slug: "man-city", name: "Manchester City", shortName: "MCI", league: "premier-league", country: "Inglaterra", city: "Manchester",
    stadium: "Etihad Stadium", coach: "Pep Guardiola", founded: 1880, badgeColor: "#6cabdd", badgeColorAlt: "#1c2c5b",
    marketValue: "€1.29B", position: 1, played: 22, wins: 16, draws: 4, losses: 2, goalsFor: 52, goalsAgainst: 20,
    form: "VVVVE", avgPossession: 64, avgShots: 17, avgShotsOnTarget: 7, avgCorners: 7, avgCards: 1,
    avgFouls: 9, avgOffsides: 2, over25Rate: 71, bttsRate: 54, cleanSheets: 10,
    description: "Domínio absoluto de posse e o ataque mais produtivo da Premier League. Média de 7 finalizações no alvo, com 71% dos jogos acima de 2,5 gols.",
    formation: "4-3-3",
  },
  {
    slug: "liverpool", name: "Liverpool", shortName: "LIV", league: "premier-league", country: "Inglaterra", city: "Liverpool",
    stadium: "Anfield", coach: "Arne Slot", founded: 1892, badgeColor: "#c8102e", badgeColorAlt: "#00b2a9",
    marketValue: "€1.02B", position: 2, played: 22, wins: 15, draws: 5, losses: 2, goalsFor: 49, goalsAgainst: 22,
    form: "VVVEV", avgPossession: 59, avgShots: 16, avgShotsOnTarget: 6, avgCorners: 7, avgCards: 2,
    avgFouls: 11, avgOffsides: 3, over25Rate: 68, bttsRate: 63, cleanSheets: 8,
    description: "Anfield segue como fortaleza: média de 2,3 gols em casa. O time lidera a liga em gols nos primeiros 15 minutos.",
    formation: "4-2-3-1",
  },
  {
    slug: "arsenal", name: "Arsenal", shortName: "ARS", league: "premier-league", country: "Inglaterra", city: "Londres",
    stadium: "Emirates Stadium", coach: "Mikel Arteta", founded: 1886, badgeColor: "#ef0107", badgeColorAlt: "#063672",
    marketValue: "€1.11B", position: 3, played: 22, wins: 14, draws: 5, losses: 3, goalsFor: 45, goalsAgainst: 19,
    form: "VVVNV", avgPossession: 57, avgShots: 15, avgShotsOnTarget: 5, avgCorners: 7, avgCards: 2,
    avgFouls: 11, avgOffsides: 2, over25Rate: 62, bttsRate: 48, cleanSheets: 12,
    description: "Especialista em bolas paradas: 38% dos gols vêm de escanteios e faltas laterais. Melhor defesa da Premier League em xG sofrido.",
    formation: "4-3-3",
  },
  {
    slug: "chelsea", name: "Chelsea", shortName: "CHE", league: "premier-league", country: "Inglaterra", city: "Londres",
    stadium: "Stamford Bridge", coach: "Enzo Maresca", founded: 1905, badgeColor: "#034694", badgeColorAlt: "#dba111",
    marketValue: "€1.08B", position: 4, played: 22, wins: 12, draws: 6, losses: 4, goalsFor: 43, goalsAgainst: 27,
    form: "EVVNV", avgPossession: 55, avgShots: 14, avgShotsOnTarget: 5, avgCorners: 6, avgCards: 3,
    avgFouls: 12, avgOffsides: 3, over25Rate: 65, bttsRate: 64, cleanSheets: 6,
    description: "Time mais jovem da liga e com alto índice de ambas marcam (64%). Oscila entre jogos de 4 gols e partidas travadas.",
    formation: "4-2-3-1",
  },
  {
    slug: "real-madrid", name: "Real Madrid", shortName: "RMA", league: "laliga", country: "Espanha", city: "Madri",
    stadium: "Santiago Bernabéu", coach: "Xabi Alonso", founded: 1902, badgeColor: "#febe10", badgeColorAlt: "#00529f",
    marketValue: "€1.36B", position: 1, played: 23, wins: 17, draws: 4, losses: 2, goalsFor: 55, goalsAgainst: 22,
    form: "VVVVV", avgPossession: 58, avgShots: 16, avgShotsOnTarget: 6, avgCorners: 6, avgCards: 2,
    avgFouls: 11, avgOffsides: 3, over25Rate: 69, bttsRate: 57, cleanSheets: 9,
    description: "Cinco vitórias consecutivas e o melhor ataque da LaLiga. O time tem 55 gols em 23 jogos e xG acumulado de 49,3.",
    formation: "4-3-3",
  },
  {
    slug: "barcelona", name: "Barcelona", shortName: "BAR", league: "laliga", country: "Espanha", city: "Barcelona",
    stadium: "Spotify Camp Nou", coach: "Hansi Flick", founded: 1899, badgeColor: "#a50044", badgeColorAlt: "#004d98",
    marketValue: "€1.24B", position: 2, played: 23, wins: 16, draws: 4, losses: 3, goalsFor: 61, goalsAgainst: 28,
    form: "VVNVV", avgPossession: 63, avgShots: 17, avgShotsOnTarget: 7, avgCorners: 6, avgCards: 2,
    avgFouls: 12, avgOffsides: 4, over25Rate: 74, bttsRate: 67, cleanSheets: 6,
    description: "Média de 2,65 gols por jogo e linha de impedimento altíssima: 4 impedimentos por partida. Jogos do Barça têm 74% de over 2,5.",
    formation: "4-3-3",
  },
  {
    slug: "atletico-madrid", name: "Atlético de Madrid", shortName: "ATM", league: "laliga", country: "Espanha", city: "Madri",
    stadium: "Metropolitano", coach: "Diego Simeone", founded: 1903, badgeColor: "#cb3524", badgeColorAlt: "#272e61",
    marketValue: "€674M", position: 4, played: 23, wins: 13, draws: 6, losses: 4, goalsFor: 38, goalsAgainst: 21,
    form: "EVVVE", avgPossession: 52, avgShots: 12, avgShotsOnTarget: 4, avgCorners: 5, avgCards: 4,
    avgFouls: 17, avgOffsides: 2, over25Rate: 51, bttsRate: 45, cleanSheets: 11,
    description: "Padrão clássico de Simeone: poucos gols sofridos, média de 17 faltas e 4 cartões por jogo. Forte candidato a under 2,5 fora de casa.",
    formation: "4-4-2",
  },
  {
    slug: "inter", name: "Inter de Milão", shortName: "INT", league: "serie-a", country: "Itália", city: "Milão",
    stadium: "San Siro", coach: "Cristian Chivu", founded: 1908, badgeColor: "#0068a8", badgeColorAlt: "#111111",
    marketValue: "€689M", position: 1, played: 23, wins: 16, draws: 4, losses: 3, goalsFor: 46, goalsAgainst: 20,
    form: "VVVVE", avgPossession: 57, avgShots: 15, avgShotsOnTarget: 5, avgCorners: 6, avgCards: 3,
    avgFouls: 13, avgOffsides: 3, over25Rate: 63, bttsRate: 56, cleanSheets: 9,
    description: "Líder da Serie A com o melhor saldo de gols. Ataques pelos alas geram média alta de escanteios no segundo tempo.",
    formation: "3-5-2",
  },
  {
    slug: "juventus", name: "Juventus", shortName: "JUV", league: "serie-a", country: "Itália", city: "Turim",
    stadium: "Allianz Stadium", coach: "Luciano Spalletti", founded: 1897, badgeColor: "#111111", badgeColorAlt: "#ffffff",
    marketValue: "€592M", position: 4, played: 23, wins: 12, draws: 7, losses: 4, goalsFor: 34, goalsAgainst: 22,
    form: "EVEVV", avgPossession: 54, avgShots: 12, avgShotsOnTarget: 4, avgCorners: 5, avgCards: 3,
    avgFouls: 14, avgOffsides: 2, over25Rate: 47, bttsRate: 43, cleanSheets: 10,
    description: "Time mais controlador da Itália: 47% de over 2,5 e média baixa de finalizações no alvo. Costuma decidir no segundo tempo.",
    formation: "3-4-2-1",
  },
  {
    slug: "bayern", name: "Bayern de Munique", shortName: "FCB", league: "bundesliga", country: "Alemanha", city: "Munique",
    stadium: "Allianz Arena", coach: "Vincent Kompany", founded: 1900, badgeColor: "#dc052d", badgeColorAlt: "#0066b2",
    marketValue: "€945M", position: 1, played: 20, wins: 16, draws: 3, losses: 1, goalsFor: 62, goalsAgainst: 19,
    form: "VVVVE", avgPossession: 62, avgShots: 18, avgShotsOnTarget: 7, avgCorners: 7, avgCards: 2,
    avgFouls: 10, avgOffsides: 3, over25Rate: 76, bttsRate: 62, cleanSheets: 8,
    description: "Ataque mais letal das cinco grandes ligas: 3,1 gols por partida. 76% dos jogos passam de 2,5 gols.",
    formation: "4-2-3-1",
  },
  {
    slug: "dortmund", name: "Borussia Dortmund", shortName: "BVB", league: "bundesliga", country: "Alemanha", city: "Dortmund",
    stadium: "Signal Iduna Park", coach: "Niko Kovač", founded: 1909, badgeColor: "#fde100", badgeColorAlt: "#111111",
    marketValue: "€512M", position: 3, played: 20, wins: 13, draws: 4, losses: 3, goalsFor: 45, goalsAgainst: 25,
    form: "VVNEV", avgPossession: 56, avgShots: 15, avgShotsOnTarget: 5, avgCorners: 6, avgCards: 2,
    avgFouls: 11, avgOffsides: 3, over25Rate: 70, bttsRate: 66, cleanSheets: 5,
    description: "Muralha Amarela e ritmo altíssimo: média de 3,5 gols por jogo no Signal Iduna Park, com 66% de ambas marcam.",
    formation: "4-3-3",
  },
  {
    slug: "psg", name: "Paris Saint-Germain", shortName: "PSG", league: "ligue-1", country: "França", city: "Paris",
    stadium: "Parc des Princes", coach: "Luis Enrique", founded: 1970, badgeColor: "#004170", badgeColorAlt: "#da291c",
    marketValue: "€912M", position: 1, played: 22, wins: 17, draws: 4, losses: 1, goalsFor: 58, goalsAgainst: 18,
    form: "VVVVE", avgPossession: 65, avgShots: 18, avgShotsOnTarget: 7, avgCorners: 7, avgCards: 2,
    avgFouls: 10, avgOffsides: 3, over25Rate: 72, bttsRate: 55, cleanSheets: 10,
    description: "Domínio de 65% de posse e 7 finalizações no alvo por jogo. O time sofre apenas 0,82 gol por partida.",
    formation: "4-3-3",
  },
  {
    slug: "marseille", name: "Olympique de Marseille", shortName: "OM", league: "ligue-1", country: "França", city: "Marselha",
    stadium: "Vélodrome", coach: "Roberto De Zerbi", founded: 1899, badgeColor: "#2faee0", badgeColorAlt: "#ffffff",
    marketValue: "€342M", position: 3, played: 22, wins: 12, draws: 5, losses: 5, goalsFor: 41, goalsAgainst: 29,
    form: "VNEVV", avgPossession: 54, avgShots: 14, avgShotsOnTarget: 5, avgCorners: 6, avgCards: 3,
    avgFouls: 15, avgOffsides: 2, over25Rate: 67, bttsRate: 64, cleanSheets: 4,
    description: "Casa mais quente da França e média de 3,2 gols por jogo no Vélodrome. Time com maior índice de faltas da Ligue 1.",
    formation: "4-2-3-1",
  },
  {
    slug: "benfica", name: "Benfica", shortName: "BEN", league: "champions", country: "Portugal", city: "Lisboa",
    stadium: "Estádio da Luz", coach: "José Mourinho", founded: 1904, badgeColor: "#e30613", badgeColorAlt: "#ffffff",
    marketValue: "€398M", position: 2, played: 20, wins: 13, draws: 4, losses: 3, goalsFor: 42, goalsAgainst: 21,
    form: "VVVEV", avgPossession: 58, avgShots: 15, avgShotsOnTarget: 5, avgCorners: 6, avgCards: 3,
    avgFouls: 14, avgOffsides: 2, over25Rate: 60, bttsRate: 52, cleanSheets: 8,
    description: "Organização defensiva de Mourinho e transições rápidas. Em casa, o Benfica marca em média 2,1 gols.",
    formation: "4-2-3-1",
  },
  {
    slug: "river-plate", name: "River Plate", shortName: "RIV", league: "libertadores", country: "Argentina", city: "Buenos Aires",
    stadium: "Monumental", coach: "Marcelo Gallardo", founded: 1901, badgeColor: "#ffffff", badgeColorAlt: "#e2001a",
    marketValue: "€126M", position: 1, played: 18, wins: 11, draws: 5, losses: 2, goalsFor: 33, goalsAgainst: 16,
    form: "VVEVV", avgPossession: 61, avgShots: 14, avgShotsOnTarget: 5, avgCorners: 6, avgCards: 3,
    avgFouls: 15, avgOffsides: 2, over25Rate: 55, bttsRate: 47, cleanSheets: 9,
    description: "Posse de 61% e melhor campanha da fase de grupos. Gallardo costura o meio-campo com triangulações curtas.",
    formation: "4-3-1-2",
  },
  {
    slug: "boca-juniors", name: "Boca Juniors", shortName: "BOC", league: "libertadores", country: "Argentina", city: "Buenos Aires",
    stadium: "La Bombonera", coach: "Fernando Gago", founded: 1905, badgeColor: "#103f79", badgeColorAlt: "#f2b213",
    marketValue: "€98M", position: 3, played: 18, wins: 9, draws: 5, losses: 4, goalsFor: 27, goalsAgainst: 20,
    form: "EVNVV", avgPossession: 52, avgShots: 12, avgShotsOnTarget: 4, avgCorners: 5, avgCards: 4,
    avgFouls: 18, avgOffsides: 2, over25Rate: 46, bttsRate: 51, cleanSheets: 6,
    description: "La Bombonera impõe ritmo e atrito: 18 faltas e 4 cartões por jogo. Jogos do Boca têm média de 2,1 gols.",
    formation: "4-4-2",
  },
];

const SQUADS: Record<string, string[]> = {
  flamengo: ["Rossi", "Wesley", "Léo Pereira", "Léo Ortiz", "Ayrton Lucas", "Erick Pulgar", "De la Cruz", "Arrascaeta", "Luiz Araújo", "Everton Cebolinha", "Pedro"],
  palmeiras: ["Weverton", "Mayke", "Gustavo Gómez", "Murilo", "Piquerez", "Aníbal Moreno", "Raphael Veiga", "Richard Ríos", "Estêvão", "Flaco López", "Vitor Roque"],
  "man-city": ["Ederson", "Walker", "Dias", "Gvardiol", "Aké", "Rodri", "Bernardo Silva", "Foden", "De Bruyne", "Haaland", "Doku"],
  liverpool: ["Alisson", "Alexander-Arnold", "Konaté", "Van Dijk", "Robertson", "Gravenberch", "Mac Allister", "Szoboszlai", "Salah", "Gakpo", "Díaz"],
  "real-madrid": ["Courtois", "Carvajal", "Rüdiger", "Militão", "Mendy", "Tchouaméni", "Valverde", "Bellingham", "Rodrygo", "Vinícius Jr.", "Mbappé"],
  barcelona: ["Ter Stegen", "Koundé", "Cubarsí", "Íñigo Martínez", "Balde", "Pedri", "De Jong", "Olmo", "Yamal", "Lewandowski", "Raphinha"],
  bayern: ["Neuer", "Kimmich", "Upamecano", "Kim", "Davies", "Goretzka", "Palhinha", "Musiala", "Olise", "Sané", "Kane"],
  psg: ["Donnarumma", "Hakimi", "Marquinhos", "Pacho", "Mendes", "Vitinha", "Neves", "Ruiz", "Dembélé", "Ramos", "Kvaratskhelia"],
  inter: ["Sommer", "Bastoni", "Acerbi", "Pavard", "Dimarco", "Barella", "Calhanoglu", "Mkhitaryan", "Dumfries", "Thuram", "Lautaro"],
  arsenal: ["Raya", "Timber", "Saliba", "Gabriel", "Calafiori", "Rice", "Ødegaard", "Merino", "Saka", "Havertz", "Martinelli"],
};

const FALLBACK_SURNAMES = ["Silva", "Souza", "Costa", "Oliveira", "Santos", "Pereira", "Lima", "Rocha", "Almeida", "Nunes", "Moraes", "Barbosa"];

function squadFor(team: TeamSeed) {
  const names = SQUADS[team.slug];
  if (names) {
    const positions = ["GOL", "LAT", "ZAG", "ZAG", "LAT", "VOL", "MEI", "MEI", "PON", "PON", "ATA"];
    return names.map((name, i) => ({
      name,
      number: [1, 2, 4, 3, 6, 5, 8, 10, 7, 11, 9][i] ?? i + 12,
      pos: positions[i] ?? "MEI",
      rating: (7.6 - i * 0.13).toFixed(1),
      status: i === 9 ? "Dúvida" : "Titular",
    }));
  }
  return Array.from({ length: 11 }, (_, i) => ({
    name: `${team.shortName} ${FALLBACK_SURNAMES[i % FALLBACK_SURNAMES.length]}`,
    number: [1, 2, 4, 3, 6, 5, 8, 10, 7, 11, 9][i] ?? i + 12,
    pos: ["GOL", "LAT", "ZAG", "ZAG", "LAT", "VOL", "MEI", "MEI", "PON", "PON", "ATA"][i] ?? "MEI",
    rating: (7.4 - i * 0.12).toFixed(1),
    status: "Titular",
  }));
}

export async function ensureSeed() {
  if (seedPromise) return seedPromise;
  seedPromise = (async () => {
    const existing = await db.select({ id: leagues.id }).from(leagues).limit(1);
    if (existing.length > 0) return;

    const insertedLeagues = await db.insert(leagues).values(LEAGUES).returning({ id: leagues.id, slug: leagues.slug });
    const leagueIds = new Map(insertedLeagues.map((l) => [l.slug, l.id]));

    const insertedTeams = await db
      .insert(teams)
      .values(
        TEAMS.map((t) => ({
          slug: t.slug, name: t.name, shortName: t.shortName, leagueId: leagueIds.get(t.league) ?? null,
          country: t.country, city: t.city, stadium: t.stadium, coach: t.coach, founded: t.founded,
          badgeColor: t.badgeColor, badgeColorAlt: t.badgeColorAlt, marketValue: t.marketValue,
          position: t.position, played: t.played, wins: t.wins, draws: t.draws, losses: t.losses,
          goalsFor: t.goalsFor, goalsAgainst: t.goalsAgainst, form: t.form, avgPossession: t.avgPossession,
          avgShots: t.avgShots, avgShotsOnTarget: t.avgShotsOnTarget, avgCorners: t.avgCorners,
          avgCards: t.avgCards, avgFouls: t.avgFouls, avgOffsides: t.avgOffsides, over25Rate: t.over25Rate,
          bttsRate: t.bttsRate, cleanSheets: t.cleanSheets, description: t.description, formation: t.formation,
        })),
      )
      .returning({ id: teams.id, slug: teams.slug });
    const teamIds = new Map(insertedTeams.map((t) => [t.slug, t.id]));
    const tid = (slug: string) => teamIds.get(slug)!;
    const lid = (slug: string) => leagueIds.get(slug) ?? null;

    type MatchSeed = {
      home: string; away: string; league: string; kickoff: Date; status: string; minute: number;
      round: string; venue: string; hs: number; as: number; hc: number; ac: number; hcard: number; acard: number;
      hf: number; af: number; ho: number; ao: number; hp: number; hsh: number; ash: number; hsot: number; asot: number;
      hxg: string; axg: string;
    };

    const matchSeeds: MatchSeed[] = [
      { home: "flamengo", away: "palmeiras", league: "brasileirao", kickoff: new Date(now() - 68 * 60000), status: "live", minute: 68, round: "Rodada 25", venue: "Maracanã", hs: 2, as: 1, hc: 6, ac: 3, hcard: 1, acard: 3, hf: 9, af: 14, ho: 1, ao: 2, hp: 58, hsh: 14, ash: 8, hsot: 6, asot: 3, hxg: "1.84", axg: "0.92" },
      { home: "real-madrid", away: "barcelona", league: "laliga", kickoff: new Date(now() - 34 * 60000), status: "live", minute: 34, round: "Rodada 24", venue: "Santiago Bernabéu", hs: 1, as: 1, hc: 4, ac: 2, hcard: 1, acard: 1, hf: 6, af: 5, ho: 2, ao: 1, hp: 52, hsh: 7, ash: 5, hsot: 3, asot: 2, hxg: "0.96", axg: "0.88" },
      { home: "man-city", away: "liverpool", league: "premier-league", kickoff: new Date(now() - 12 * 60000), status: "live", minute: 12, round: "Rodada 23", venue: "Etihad Stadium", hs: 0, as: 0, hc: 2, ac: 1, hcard: 0, acard: 0, hf: 1, af: 2, ho: 0, ao: 1, hp: 61, hsh: 3, ash: 2, hsot: 1, asot: 1, hxg: "0.31", axg: "0.24" },
      { home: "inter", away: "juventus", league: "serie-a", kickoff: new Date(now() - 3 * H), status: "finished", minute: 90, round: "Rodada 23", venue: "San Siro", hs: 2, as: 0, hc: 7, ac: 4, hcard: 2, acard: 3, hf: 11, af: 16, ho: 2, ao: 1, hp: 55, hsh: 15, ash: 9, hsot: 6, asot: 2, hxg: "1.72", axg: "0.71" },
      { home: "bayern", away: "dortmund", league: "bundesliga", kickoff: new Date(now() - 5 * H), status: "finished", minute: 90, round: "Rodada 21", venue: "Allianz Arena", hs: 3, as: 2, hc: 8, ac: 5, hcard: 1, acard: 2, hf: 8, af: 12, ho: 3, ao: 2, hp: 60, hsh: 19, ash: 11, hsot: 9, asot: 5, hxg: "2.71", axg: "1.63" },
      { home: "psg", away: "marseille", league: "ligue-1", kickoff: new Date(now() - 26 * H), status: "finished", minute: 90, round: "Rodada 23", venue: "Parc des Princes", hs: 2, as: 1, hc: 9, ac: 3, hcard: 1, acard: 4, hf: 9, af: 17, ho: 1, ao: 3, hp: 67, hsh: 17, ash: 7, hsot: 7, asot: 3, hxg: "2.14", axg: "0.86" },
      { home: "corinthians", away: "botafogo", league: "brasileirao", kickoff: new Date(now() - 28 * H), status: "finished", minute: 90, round: "Rodada 24", venue: "Neo Química Arena", hs: 1, as: 1, hc: 5, ac: 6, hcard: 4, acard: 2, hf: 18, af: 13, ho: 2, ao: 3, hp: 48, hsh: 11, ash: 12, hsot: 4, asot: 4, hxg: "1.08", axg: "1.21" },
      { home: "arsenal", away: "chelsea", league: "premier-league", kickoff: new Date(now() - 24 * H), status: "finished", minute: 90, round: "Rodada 22", venue: "Emirates Stadium", hs: 2, as: 1, hc: 7, ac: 4, hcard: 2, acard: 3, hf: 10, af: 13, ho: 1, ao: 2, hp: 56, hsh: 14, ash: 10, hsot: 6, asot: 4, hxg: "1.91", axg: "1.12" },
      { home: "river-plate", away: "boca-juniors", league: "libertadores", kickoff: new Date(now() - 50 * H), status: "finished", minute: 90, round: "Quartas de final", venue: "Monumental", hs: 2, as: 0, hc: 6, ac: 4, hcard: 3, acard: 5, hf: 14, af: 21, ho: 1, ao: 1, hp: 58, hsh: 13, ash: 8, hsot: 5, asot: 2, hxg: "1.58", axg: "0.54" },
      { home: "palmeiras", away: "corinthians", league: "brasileirao", kickoff: at(5), status: "scheduled", minute: 0, round: "Rodada 26", venue: "Allianz Parque", hs: 0, as: 0, hc: 0, ac: 0, hcard: 0, acard: 0, hf: 0, af: 0, ho: 0, ao: 0, hp: 50, hsh: 0, ash: 0, hsot: 0, asot: 0, hxg: "0.00", axg: "0.00" },
      { home: "liverpool", away: "arsenal", league: "premier-league", kickoff: at(8), status: "scheduled", minute: 0, round: "Rodada 24", venue: "Anfield", hs: 0, as: 0, hc: 0, ac: 0, hcard: 0, acard: 0, hf: 0, af: 0, ho: 0, ao: 0, hp: 50, hsh: 0, ash: 0, hsot: 0, asot: 0, hxg: "0.00", axg: "0.00" },
      { home: "atletico-madrid", away: "real-madrid", league: "laliga", kickoff: at(26), status: "scheduled", minute: 0, round: "Rodada 25", venue: "Metropolitano", hs: 0, as: 0, hc: 0, ac: 0, hcard: 0, acard: 0, hf: 0, af: 0, ho: 0, ao: 0, hp: 50, hsh: 0, ash: 0, hsot: 0, asot: 0, hxg: "0.00", axg: "0.00" },
      { home: "benfica", away: "inter", league: "champions", kickoff: at(30), status: "scheduled", minute: 0, round: "Oitavas de final", venue: "Estádio da Luz", hs: 0, as: 0, hc: 0, ac: 0, hcard: 0, acard: 0, hf: 0, af: 0, ho: 0, ao: 0, hp: 50, hsh: 0, ash: 0, hsot: 0, asot: 0, hxg: "0.00", axg: "0.00" },
      { home: "botafogo", away: "flamengo", league: "brasileirao", kickoff: at(32), status: "scheduled", minute: 0, round: "Rodada 26", venue: "Nilton Santos", hs: 0, as: 0, hc: 0, ac: 0, hcard: 0, acard: 0, hf: 0, af: 0, ho: 0, ao: 0, hp: 50, hsh: 0, ash: 0, hsot: 0, asot: 0, hxg: "0.00", axg: "0.00" },
      { home: "barcelona", away: "atletico-madrid", league: "laliga", kickoff: at(50), status: "scheduled", minute: 0, round: "Rodada 25", venue: "Spotify Camp Nou", hs: 0, as: 0, hc: 0, ac: 0, hcard: 0, acard: 0, hf: 0, af: 0, ho: 0, ao: 0, hp: 50, hsh: 0, ash: 0, hsot: 0, asot: 0, hxg: "0.00", axg: "0.00" },
      { home: "juventus", away: "psg", league: "champions", kickoff: at(54), status: "scheduled", minute: 0, round: "Oitavas de final", venue: "Allianz Stadium", hs: 0, as: 0, hc: 0, ac: 0, hcard: 0, acard: 0, hf: 0, af: 0, ho: 0, ao: 0, hp: 50, hsh: 0, ash: 0, hsot: 0, asot: 0, hxg: "0.00", axg: "0.00" },
      { home: "chelsea", away: "man-city", league: "premier-league", kickoff: at(56), status: "scheduled", minute: 0, round: "Rodada 24", venue: "Stamford Bridge", hs: 0, as: 0, hc: 0, ac: 0, hcard: 0, acard: 0, hf: 0, af: 0, ho: 0, ao: 0, hp: 50, hsh: 0, ash: 0, hsot: 0, asot: 0, hxg: "0.00", axg: "0.00" },
    ];

    const DEMO_MATCHES = false; // jogos reais vêm da sincronização ESPN
    const insertedMatches = !DEMO_MATCHES ? [] : await db
      .insert(matches)
      .values(
        matchSeeds.map((m) => ({
          leagueId: lid(m.league), homeTeamId: tid(m.home), awayTeamId: tid(m.away), kickoff: m.kickoff,
          status: m.status, minute: m.minute, round: m.round, venue: m.venue, homeScore: m.hs, awayScore: m.as,
          homeCorners: m.hc, awayCorners: m.ac, homeCards: m.hcard, awayCards: m.acard, homeFouls: m.hf,
          awayFouls: m.af, homeOffsides: m.ho, awayOffsides: m.ao, homePossession: m.hp, awayPossession: 100 - m.hp,
          homeShots: m.hsh, awayShots: m.ash, homeShotsOnTarget: m.hsot, awayShotsOnTarget: m.asot,
          homeXg: m.hxg, awayXg: m.axg,
        })),
      )
      .returning({ id: matches.id, homeTeamId: matches.homeTeamId, awayTeamId: matches.awayTeamId, status: matches.status });
    const matchByTeams = new Map(insertedMatches.map((m) => [`${m.homeTeamId}-${m.awayTeamId}`, m.id]));

    type EventSeed = { home: string; away: string; minute: number; type: string; side: string; player: string; detail: string; scoreAfter?: string };
    const eventSeeds: EventSeed[] = [
      { home: "flamengo", away: "palmeiras", minute: 0, type: "kickoff", side: "neutral", player: "", detail: "Bola rolando no Maracanã" },
      { home: "flamengo", away: "palmeiras", minute: 8, type: "corner", side: "home", player: "Arrascaeta", detail: "Escanteio para o Flamengo" },
      { home: "flamengo", away: "palmeiras", minute: 14, type: "foul", side: "away", player: "Aníbal Moreno", detail: "Falta no meio-campo" },
      { home: "flamengo", away: "palmeiras", minute: 21, type: "goal", side: "home", player: "Pedro", detail: "Finalização de dentro da área após cruzamento de Luiz Araújo", scoreAfter: "1-0" },
      { home: "flamengo", away: "palmeiras", minute: 27, type: "yellow", side: "away", player: "Gustavo Gómez", detail: "Cartão amarelo por falta tática" },
      { home: "flamengo", away: "palmeiras", minute: 33, type: "offside", side: "home", player: "Everton Cebolinha", detail: "Impedimento marcado pelo VAR" },
      { home: "flamengo", away: "palmeiras", minute: 39, type: "corner", side: "away", player: "Raphael Veiga", detail: "Escanteio para o Palmeiras" },
      { home: "flamengo", away: "palmeiras", minute: 45, type: "goal", side: "away", player: "Flaco López", detail: "Cabeceio após escanteio", scoreAfter: "1-1" },
      { home: "flamengo", away: "palmeiras", minute: 52, type: "yellow", side: "home", player: "Erick Pulgar", detail: "Cartão amarelo" },
      { home: "flamengo", away: "palmeiras", minute: 58, type: "penalty", side: "home", player: "Arrascaeta", detail: "Pênalti convertido com categoria", scoreAfter: "2-1" },
      { home: "flamengo", away: "palmeiras", minute: 63, type: "corner", side: "home", player: "Luiz Araújo", detail: "Escanteio para o Flamengo" },
      { home: "flamengo", away: "palmeiras", minute: 66, type: "foul", side: "away", player: "Richard Ríos", detail: "Falta dura, jogo segue" },
      { home: "real-madrid", away: "barcelona", minute: 0, type: "kickoff", side: "neutral", player: "", detail: "Clássico iniciado no Bernabéu" },
      { home: "real-madrid", away: "barcelona", minute: 11, type: "goal", side: "home", player: "Mbappé", detail: "Contra-ataque fulminante", scoreAfter: "1-0" },
      { home: "real-madrid", away: "barcelona", minute: 18, type: "offside", side: "away", player: "Lewandowski", detail: "Impedimento por 12 centímetros" },
      { home: "real-madrid", away: "barcelona", minute: 25, type: "goal", side: "away", player: "Yamal", detail: "Chute colocado de fora da área", scoreAfter: "1-1" },
      { home: "real-madrid", away: "barcelona", minute: 29, type: "yellow", side: "home", player: "Tchouaméni", detail: "Cartão amarelo" },
      { home: "man-city", away: "liverpool", minute: 0, type: "kickoff", side: "neutral", player: "", detail: "Bola rolando no Etihad" },
      { home: "man-city", away: "liverpool", minute: 6, type: "corner", side: "home", player: "Foden", detail: "Escanteio para o City" },
      { home: "man-city", away: "liverpool", minute: 10, type: "offside", side: "away", player: "Salah", detail: "Impedimento" },
      { home: "inter", away: "juventus", minute: 63, type: "goal", side: "home", player: "Thuram", detail: "Gol de cabeça", scoreAfter: "2-0" },
      { home: "inter", away: "juventus", minute: 90, type: "end", side: "neutral", player: "", detail: "Fim de jogo em San Siro", scoreAfter: "2-0" },
      { home: "bayern", away: "dortmund", minute: 90, type: "end", side: "neutral", player: "", detail: "Fim de jogo em Munique", scoreAfter: "3-2" },
      { home: "psg", away: "marseille", minute: 90, type: "end", side: "neutral", player: "", detail: "Fim de jogo em Paris", scoreAfter: "2-1" },
    ];

    if (insertedMatches.length) await db.insert(matchEvents).values(
      eventSeeds.map((e) => ({
        matchId: matchByTeams.get(`${tid(e.home)}-${tid(e.away)}`)!,
        minute: e.minute, type: e.type, side: e.side, player: e.player, detail: e.detail, scoreAfter: e.scoreAfter ?? "",
      })),
    );

    const lineupSeeds = TEAMS.map((t) => ({
      teamId: tid(t.slug),
      formation: t.formation,
      confidence: 68 + ((t.position * 3) % 24),
      source: "Escalação prevista · modelo GreenScore + histórico de escalações",
      players: squadFor(t),
    }));
    await db.insert(lineups).values(lineupSeeds);

    const insightSeeds = [
      { match: ["flamengo", "palmeiras"] as const, team: null, category: "gols", title: "Flamengo marca no 2º tempo em 78% dos jogos em casa", body: "O Flamengo tem média de 1,4 gol apenas na segunda etapa no Maracanã. Com 58% de posse e 14 finalizações, o mercado 'Flamengo marca no 2º tempo' aparece com valor acima da média.", market: "Flamengo marca no 2º tempo", confidence: 82, odds: "1.72" },
      { match: ["flamengo", "palmeiras"] as const, team: null, category: "escanteios", title: "Over 10,5 escanteios com 71% de acerto", body: "Clássicos entre Flamengo e Palmeiras somam em média 12,4 escanteios. As duas equipes estão entre as três que mais finalizam de fora da área no Brasileirão.", market: "Total de escanteios +10,5", confidence: 76, odds: "1.90" },
      { match: ["real-madrid", "barcelona"] as const, team: null, category: "cartoes", title: "Clássico com poucos cartões? Cuidado com o histórico", body: "Apesar da rivalidade, os últimos 5 clássicos tiveram média de 5,6 cartões. O árbitro designado aplica 4,9 cartões por jogo na temporada.", market: "Total de cartões +4,5", confidence: 71, odds: "1.83" },
      { match: ["real-madrid", "barcelona"] as const, team: null, category: "impedimentos", title: "Barcelona tem a linha de impedimento mais agressiva da Europa", body: "Média de 4,1 impedimentos por jogo. Contra ataques rápidos como o do Real Madrid, o mercado 'Real Madrid +2 impedimentos' tem valor.", market: "Real Madrid +2 impedimentos", confidence: 68, odds: "2.10" },
      { match: ["man-city", "liverpool"] as const, team: null, category: "mercados", title: "Ambas marcam tem 68% de acerto no confronto direto", body: "Nos últimos 8 duelos entre City e Liverpool, ambos marcaram em 6. O xG combinado das duas equipes passa de 2,8 por partida.", market: "Ambas marcam — Sim", confidence: 74, odds: "1.67" },
      { match: ["inter", "juventus"] as const, team: null, category: "gols", title: "Inter tem o melhor ataque da Serie A no 1º tempo", body: "A Inter marcou 21 dos seus 46 gols antes dos 30 minutos. Em San Siro, são 1,2 gol por jogo na primeira etapa.", market: "Inter marca no 1º tempo", confidence: 79, odds: "1.55" },
      { match: ["palmeiras", "corinthians"] as const, team: null, category: "faltas", title: "Clássico Paulista com 17 faltas de média", body: "Palmeiras e Corinthians somam 31 faltas por jogo combinadas. O mercado de faltas acima de 28 é o mais consistente do duelo.", market: "Total de faltas +28,5", confidence: 73, odds: "1.78" },
      { match: ["benfica", "inter"] as const, team: null, category: "escanteios", title: "Benfica em casa: 7,2 escanteios a favor por jogo", body: "Com posse média de 58% no Estádio da Luz, o Benfica lidera a liga portuguesa em escanteios a favor. A Inter sofre 5,8 por jogo fora.", market: "Benfica +5,5 escanteios", confidence: 80, odds: "1.62" },
      { match: ["liverpool", "arsenal"] as const, team: null, category: "gols", title: "Under 2,5 gols no Anfield contra o Arsenal", body: "Arsenal tem a melhor defesa da Premier League e cede apenas 0,8 gol por jogo fora. Nos últimos 4 confrontos, média de 1,75 gol.", market: "Under 2,5 gols", confidence: 69, odds: "1.95" },
      { match: ["bayern", "dortmund"] as const, team: null, category: "gols", title: "Klassiker tem média de 4,1 gols nos últimos 6", body: "Nenhum dos últimos 6 Klassikers terminou com menos de 3 gols. Bayern tem 76% de over 2,5 na temporada.", market: "Over 3,5 gols", confidence: 77, odds: "1.68" },
      { match: null, team: "flamengo", category: "analise", title: "Flamengo: 9 clean sheets e melhor saldo do Brasileirão", body: "Com 1,96 gol marcado e 0,87 sofrido por partida, o Flamengo tem o melhor saldo (+26) da competição. O time venceu 8 dos 12 jogos em casa.", market: "Flamengo vence o campeonato", confidence: 74, odds: "2.15" },
      { match: null, team: "botafogo", category: "analise", title: "Botafogo sofre com impedimentos: 3 por jogo", body: "A linha ofensiva do Botafogo é a mais adiantada do G6, o que gera 3 impedimentos por partida e reduz o volume de gols limpos.", market: "Botafogo +2 impedimentos", confidence: 66, odds: "1.88" },
    ];
    if (insertedMatches.length) await db.insert(insights).values(
      insightSeeds.map((i) => ({
        matchId: i.match ? (matchByTeams.get(`${tid(i.match[0])}-${tid(i.match[1])}`) ?? null) : null,
        teamId: i.team ? tid(i.team) : null,
        category: i.category, title: i.title, body: i.body, market: i.market, confidence: i.confidence,
        odds: i.odds, source: "GreenScore Analytics · dados reais de ligas 2025/26",
      })),
    );

    await db.insert(banners).values([
      { title: "Trial grátis de 1 dia com Gmail", subtitle: "Crie sua conta com Gmail e libere escanteios, faltas, impedimentos e alertas ao vivo por 24 horas.", ctaLabel: "Começar grátis", ctaHref: "/cadastro", badge: "GRÁTIS 24H", gradient: "from-emerald-600 via-green-600 to-teal-500", sortOrder: 1 },
      { title: "Escalação prevista com IA estatística", subtitle: "Prováveis titulares, dúvidas e formação de cada time antes da bola rolar.", ctaLabel: "Ver escalações", ctaHref: "/jogos", badge: "NOVO", gradient: "from-sky-600 via-blue-600 to-indigo-600", sortOrder: 2 },
      { title: "Alertas do seu time favorito", subtitle: "Gols, pênaltis, cartões e fim de jogo direto na sua tela, sem precisar atualizar.", ctaLabel: "Favoritar time", ctaHref: "/times", badge: "AO VIVO", gradient: "from-amber-500 via-orange-500 to-rose-500", sortOrder: 3 },
    ]);

    const insertedPlans = await db
      .insert(plans)
      .values([
        { slug: "vip-mensal", name: "VIP Mensal", priceCents: 4990, durationDays: 30, tagline: "O plano mais escolhido", features: ["Todos os jogos ao vivo", "Escalações previstas", "Alertas ilimitados do time favorito", "Estatísticas de faltas, cartões e impedimentos", "Análises e oportunidades"], isFeatured: true, sortOrder: 1 },
        { slug: "vip-semanal", name: "VIP Semanal", priceCents: 1590, durationDays: 7, tagline: "Para uma rodada decisiva", features: ["Acesso completo por 7 dias", "Alertas ao vivo", "Escalações previstas"], isFeatured: false, sortOrder: 2 },
        { slug: "vip-anual", name: "VIP Anual", priceCents: 39990, durationDays: 365, tagline: "Economize 33% no ano", features: ["Tudo do VIP Mensal", "Histórico completo de estatísticas", "Prioridade em novas integrações de dados", "Suporte prioritário"], isFeatured: false, sortOrder: 3 },
        { slug: "vip-diario", name: "VIP Diário", priceCents: 990, durationDays: 1, tagline: "Teste sem compromisso", features: ["Acesso total por 24h"], isFeatured: false, sortOrder: 4 },
      ])
      .returning({ slug: plans.slug, days: plans.durationDays, price: plans.priceCents });

    const admin = await db
      .insert(users)
      .values({
        name: "Proprietário GreenScore", email: "admin@greenscore.app", passwordHash: hashPassword("admin123"),
        role: "admin", plan: "pro", accessExpiresAt: new Date(now() + 1000 * 24 * H), avatarSeed: "GS",
        lastLoginAt: new Date(now() - 2 * H), lastSeenAt: new Date(now() - 30 * 60000), trialSource: "owner",
      })
      .returning({ id: users.id });
    const demo = await db
      .insert(users)
      .values({
        name: "Lucas Andrade", email: "demo@gmail.com", passwordHash: hashPassword("demo123"),
        role: "user", plan: "vip", accessExpiresAt: new Date(now() + 21 * 24 * H), avatarSeed: "LA",
        lastLoginAt: new Date(now() - 40 * 60000), lastSeenAt: new Date(now() - 5 * 60000), trialSource: "gmail-trial",
      })
      .returning({ id: users.id });
    const expired = await db
      .insert(users)
      .values({
        name: "Marina Silva", email: "marina@gmail.com", passwordHash: hashPassword("demo123"),
        role: "user", plan: "free", accessExpiresAt: new Date(now() - 3 * 24 * H), avatarSeed: "MS",
        lastLoginAt: new Date(now() - 4 * 24 * H), lastSeenAt: new Date(now() - 4 * 24 * H), trialSource: "gmail-trial",
      })
      .returning({ id: users.id });

    await db.insert(subscriptions).values([
      { userId: demo[0].id, planSlug: "vip-mensal", amountCents: 4990, startsAt: new Date(now() - 9 * 24 * H), expiresAt: new Date(now() + 21 * 24 * H), status: "active" },
      { userId: expired[0].id, planSlug: "vip-diario", amountCents: 990, startsAt: new Date(now() - 5 * 24 * H), expiresAt: new Date(now() - 4 * 24 * H), status: "expired" },
    ]);

    await db.insert(favorites).values([
      { userId: demo[0].id, teamId: tid("flamengo") },
      { userId: demo[0].id, teamId: tid("real-madrid") },
      { userId: expired[0].id, teamId: tid("corinthians") },
    ]);

    await db.insert(notifications).values([
      { userId: demo[0].id, matchId: matchByTeams.get(`${tid("flamengo")}-${tid("palmeiras")}`) ?? null, teamId: tid("flamengo"), type: "goal", title: "⚽ GOL do seu favorito Flamengo!", body: "Arrascaeta converteu pênalti aos 58' — Flamengo 2 x 1 Palmeiras.", isRead: false },
      { userId: demo[0].id, matchId: matchByTeams.get(`${tid("flamengo")}-${tid("palmeiras")}`) ?? null, teamId: tid("flamengo"), type: "corner", title: "🚩 Escanteio para o Flamengo", body: "6º escanteio do Flamengo no Maracanã aos 63 minutos.", isRead: false },
      { userId: demo[0].id, matchId: matchByTeams.get(`${tid("real-madrid")}-${tid("barcelona")}`) ?? null, teamId: tid("real-madrid"), type: "offside", title: "🚫 Impedimento no seu favorito", body: "Lewandowski estava impedido aos 18' no Bernabéu.", isRead: true },
      { userId: demo[0].id, matchId: null, teamId: tid("flamengo"), type: "lineup", title: "📋 Escalação prevista do Flamengo disponível", body: "4-2-3-1 com Arrascaeta, Pedro e Luiz Araújo. Confiança do modelo: 89%.", isRead: false },
      { userId: demo[0].id, matchId: null, teamId: null, type: "subscription", title: "💎 Plano VIP ativo", body: "Seu acesso VIP Mensal expira em 21 dias. Renove para não perder as estatísticas ao vivo.", isRead: false },
    ]);

    await db.insert(apiIntegrations).values([
      { provider: "api-football", label: "API-Football (api-sports.io)", baseUrl: "https://v3.football.api-sports.io", apiKey: "", isActive: false, status: "idle", requestsToday: 0, notes: "Cobre 1.100+ ligas, eventos ao vivo, escalações e estatísticas. Cole sua chave x-apisports-key para ativar dados reais." },
      { provider: "football-data", label: "Football-Data.org (v4)", baseUrl: "https://api.football-data.org/v4", apiKey: "", isActive: false, status: "idle", requestsToday: 0, notes: "Plano gratuito com 10 requisições/minuto. Ideal para resultados, tabelas e artilheiros." },
      { provider: "sportsdb", label: "TheSportsDB", baseUrl: "https://www.thesportsdb.com/api/v1/json", apiKey: "123", isActive: true, status: "connected", requestsToday: 42, notes: "API pública para escudos, estádios e dados históricos dos clubes." },
    ]);

    for (const p of insertedPlans) {
      if (p.slug !== "vip-mensal") continue;
      await db.insert(subscriptions).values({ userId: admin[0].id, planSlug: p.slug, amountCents: p.price, startsAt: new Date(now() - 30 * 24 * H), expiresAt: new Date(now() + 335 * 24 * H), status: "active" });
    }

    await db.execute(sql`SELECT 1`);
  })().catch((error) => {
    seedPromise = null;
    throw error;
  });
  return seedPromise;
}
