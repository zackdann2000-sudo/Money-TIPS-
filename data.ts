import { and, asc, count, desc, eq, gte, inArray, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/db";
import { ensureSeed } from "@/db/seed";
import { ensureFreshData, TZ } from "@/lib/espn";
import { buildMatchInsights, type LiveInsight } from "@/lib/insights";
import {
  accessLogs,
  apiIntegrations,
  banners,
  favorites,
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

const homeTeams = alias(teams, "home_teams");
const awayTeams = alias(teams, "away_teams");

async function ready() {
  try {
    await ensureSeed();
  } catch (error) {
    console.error("seed failed", error);
  }
  try {
    await ensureFreshData();
  } catch (error) {
    console.error("espn refresh failed", error);
  }
  return true;
}

export function localDayKey(date: Date | string) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(date));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

const matchSelection = {
  id: matches.id,
  kickoff: matches.kickoff,
  status: matches.status,
  minute: matches.minute,
  round: matches.round,
  venue: matches.venue,
  homeScore: matches.homeScore,
  awayScore: matches.awayScore,
  homeCorners: matches.homeCorners,
  awayCorners: matches.awayCorners,
  homeCards: matches.homeCards,
  awayCards: matches.awayCards,
  homeFouls: matches.homeFouls,
  awayFouls: matches.awayFouls,
  homeOffsides: matches.homeOffsides,
  awayOffsides: matches.awayOffsides,
  homePossession: matches.homePossession,
  awayPossession: matches.awayPossession,
  homeShots: matches.homeShots,
  awayShots: matches.awayShots,
  homeShotsOnTarget: matches.homeShotsOnTarget,
  awayShotsOnTarget: matches.awayShotsOnTarget,
  homeXg: matches.homeXg,
  awayXg: matches.awayXg,
  source: matches.source,
  leagueCode: matches.leagueCode,
  updatedAt: matches.updatedAt,
  oddsDetails: matches.oddsDetails,
  overUnder: matches.overUnder,
  statusDetail: matches.statusDetail,
  leagueId: matches.leagueId,
  leagueName: leagues.name,
  leagueFlag: leagues.flag,
  leagueColor: leagues.color,
  homeId: homeTeams.id,
  homeName: homeTeams.name,
  homeShort: homeTeams.shortName,
  homeColor: homeTeams.badgeColor,
  homeColorAlt: homeTeams.badgeColorAlt,
  homeSlug: homeTeams.slug,
  homeLogo: homeTeams.logo,
  awayId: awayTeams.id,
  awayName: awayTeams.name,
  awayShort: awayTeams.shortName,
  awayColor: awayTeams.badgeColor,
  awayColorAlt: awayTeams.badgeColorAlt,
  awaySlug: awayTeams.slug,
  awayLogo: awayTeams.logo,
};

export type MatchRow = {
  id: number; kickoff: Date; status: string; minute: number; round: string; venue: string;
  homeScore: number; awayScore: number; homeCorners: number; awayCorners: number;
  homeCards: number; awayCards: number; homeFouls: number; awayFouls: number;
  homeOffsides: number; awayOffsides: number; homePossession: number; awayPossession: number;
  homeShots: number; awayShots: number; homeShotsOnTarget: number; awayShotsOnTarget: number;
  homeXg: string; awayXg: string; source: string; leagueCode: string; updatedAt: Date; oddsDetails: string; overUnder: string; statusDetail: string;
  leagueId: number | null; leagueName: string | null;
  leagueFlag: string | null; leagueColor: string | null;
  homeId: number; homeName: string; homeShort: string; homeColor: string; homeColorAlt: string; homeSlug: string; homeLogo: string;
  awayId: number; awayName: string; awayShort: string; awayColor: string; awayColorAlt: string; awaySlug: string; awayLogo: string;
};

function baseMatchQuery() {
  return db
    .select(matchSelection)
    .from(matches)
    .leftJoin(leagues, eq(matches.leagueId, leagues.id))
    .innerJoin(homeTeams, eq(matches.homeTeamId, homeTeams.id))
    .innerJoin(awayTeams, eq(matches.awayTeamId, awayTeams.id));
}

export async function getBanners() {
  await ready();
  return db.select().from(banners).where(eq(banners.isActive, true)).orderBy(asc(banners.sortOrder));
}

export async function getLeagues() {
  await ready();
  return db.select().from(leagues).orderBy(asc(leagues.sortOrder));
}

export async function getMatches(opts: { status?: string; leagueId?: number; teamId?: number; limit?: number } = {}): Promise<MatchRow[]> {
  await ready();
  const filters = [];
  if (opts.status) filters.push(eq(matches.status, opts.status));
  if (opts.leagueId) filters.push(eq(matches.leagueId, opts.leagueId));
  if (opts.teamId) filters.push(or(eq(matches.homeTeamId, opts.teamId), eq(matches.awayTeamId, opts.teamId)));
  const query = baseMatchQuery();
  const rows = filters.length ? await query.where(and(...filters)).orderBy(asc(matches.kickoff)) : await query.orderBy(asc(matches.kickoff));
  return (opts.limit ? rows.slice(0, opts.limit) : rows) as MatchRow[];
}

export async function getMatchesByDay() {
  const rows = await getMatches();
  const groups = new Map<string, MatchRow[]>();
  for (const row of rows) {
    const key = localDayKey(row.kickoff);
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }
  return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([day, list]) => ({ day, list }));
}

export async function getMatchById(id: number) {
  await ready();
  const [match] = await baseMatchQuery().where(eq(matches.id, id)).limit(1);
  if (!match) return null;
  const events = await db.select().from(matchEvents).where(eq(matchEvents.matchId, id)).orderBy(desc(matchEvents.minute), desc(matchEvents.id));
  const matchLineups = await db.select().from(lineups).where(eq(lineups.matchId, id));
  const teamLineups = await db
    .select({ lineup: lineups })
    .from(lineups)
    .where(inArray(lineups.teamId, [match.homeId, match.awayId]));
  const teamRows = await db.select().from(teams).where(inArray(teams.id, [match.homeId, match.awayId]));
  const homeTeam = teamRows.find((t) => t.id === match.homeId) ?? null;
  const awayTeam = teamRows.find((t) => t.id === match.awayId) ?? null;
  const tips: LiveInsight[] = buildMatchInsights(match as MatchRow, homeTeam, awayTeam);
  return {
    match: match as MatchRow,
    events,
    lineups: [...matchLineups, ...teamLineups.map((l) => l.lineup)].filter((l, i, arr) => arr.findIndex((x) => x.teamId === l.teamId) === i),
    insights: tips,
    homeTeam,
    awayTeam,
  };
}

export async function getTeams() {
  await ready();
  return db
    .select({
      team: teams,
      leagueName: leagues.name,
      leagueFlag: leagues.flag,
    })
    .from(teams)
    .leftJoin(leagues, eq(teams.leagueId, leagues.id))
    .orderBy(asc(leagues.sortOrder), desc(sql`${teams.wins} * 3 + ${teams.draws}`), asc(teams.name));
}

export async function getTeamBySlug(slug: string) {
  await ready();
  const [row] = await db
    .select({ team: teams, leagueName: leagues.name, leagueFlag: leagues.flag, leagueColor: leagues.color, leagueSlug: leagues.slug })
    .from(teams)
    .leftJoin(leagues, eq(teams.leagueId, leagues.id))
    .where(eq(teams.slug, slug))
    .limit(1);
  if (!row) return null;
  const recent = await getMatches({ teamId: row.team.id, status: "finished", limit: 6 });
  const upcoming = await getMatches({ teamId: row.team.id, status: "scheduled", limit: 5 });
  const [lineup] = await db.select().from(lineups).where(eq(lineups.teamId, row.team.id)).limit(1);
  const teamInsights: LiveInsight[] = [...recent, ...upcoming].flatMap((m) => buildMatchInsights(m, row.team, row.team)).slice(0, 4);
  const opponents = await db
    .select({ id: teams.id, name: teams.name, shortName: teams.shortName, color: teams.badgeColor, slug: teams.slug })
    .from(teams)
    .where(and(eq(teams.leagueId, row.team.leagueId ?? 0), sql`${teams.id} <> ${row.team.id}`));
  const [standing] = await db
    .select({ team: teams })
    .from(teams)
    .where(eq(teams.leagueId, row.team.leagueId ?? 0))
    .orderBy(desc(teams.wins))
    .limit(8);
  const leagueTeams = await db
    .select({ id: teams.id, slug: teams.slug, logo: teams.logo, name: teams.name, shortName: teams.shortName, color: teams.badgeColor, colorAlt: teams.badgeColorAlt, played: teams.played, wins: teams.wins, draws: teams.draws, losses: teams.losses, goalsFor: teams.goalsFor, goalsAgainst: teams.goalsAgainst, position: teams.position, form: teams.form })
    .from(teams)
    .where(eq(teams.leagueId, row.team.leagueId ?? 0))
    .orderBy(desc(sql`${teams.wins} * 3 + ${teams.draws}`), desc(teams.wins));
  return {
    team: row.team,
    leagueName: row.leagueName,
    leagueFlag: row.leagueFlag,
    leagueColor: row.leagueColor,
    leagueSlug: row.leagueSlug,
    recent,
    upcoming,
    lineup: lineup ?? null,
    insights: teamInsights,
    leagueTeams,
    opponents,
    highlights: standing?.team ?? row.team,
  };
}

export function buildFormHistory(team: { form: string; name: string; goalsFor: number; goalsAgainst: number; played: number }, opponents: { name: string; shortName: string; color: string; slug: string }[]) {
  const letters = team.form.toUpperCase().split("").slice(0, 5);
  return letters.map((letter, index) => {
    const opp = opponents[index % Math.max(1, opponents.length)] ?? { name: "Adversário", shortName: "ADV", color: "#64748b", slug: "" };
    const scored = letter === "V" ? 2 + (index % 2) : letter === "E" ? 1 : index % 2;
    const conceded = letter === "V" ? index % 2 : letter === "E" ? 1 : 2;
    return {
      id: `${team.name}-${index}`,
      opponent: opp.name,
      opponentShort: opp.shortName,
      opponentColor: opp.color,
      home: index % 2 === 0,
      scored,
      conceded,
      result: letter,
      date: new Date(Date.now() - (index + 1) * 4 * 86400000),
      competition: index < 3 ? "Campeonato" : "Copa",
    };
  });
}

export async function getInsights(opts: { limit?: number; category?: string } = {}) {
  const all = await getMatches();
  const teamIds = [...new Set(all.flatMap((m) => [m.homeId, m.awayId]))];
  const teamRows = teamIds.length ? await db.select().from(teams).where(inArray(teams.id, teamIds)) : [];
  const byId = new Map(teamRows.map((t) => [t.id, t]));
  const ordered = [...all.filter((m) => m.status === "live"), ...all.filter((m) => m.status === "scheduled"), ...all.filter((m) => m.status === "finished")];
  let rows = ordered.flatMap((m) => buildMatchInsights(m, byId.get(m.homeId), byId.get(m.awayId)));
  if (opts.category) rows = rows.filter((r) => r.category === opts.category);
  rows = rows.map((insight) => {
    const m = all.find((x) => x.id === insight.matchId);
    return {
      insight,
      homeName: m?.homeName ?? null,
      awayName: m?.awayName ?? null,
      homeShort: m?.homeShort ?? null,
      awayShort: m?.awayShort ?? null,
      homeColor: m?.homeColor ?? null,
      awayColor: m?.awayColor ?? null,
      matchId: insight.matchId,
      kickoff: m?.kickoff ?? null,
    };
  }) as unknown as typeof rows;
  return (opts.limit ? rows.slice(0, opts.limit) : rows) as unknown as {
    insight: LiveInsight; homeName: string | null; awayName: string | null; homeShort: string | null; awayShort: string | null;
    homeColor: string | null; awayColor: string | null; matchId: number | null; kickoff: Date | null;
  }[];
}

export async function getPlans() {
  await ready();
  return db.select().from(plans).orderBy(asc(plans.sortOrder));
}

export async function getUserNotifications(userId: number) {
  return db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt)).limit(30);
}

export async function getUnreadCount(userId: number) {
  const [row] = await db
    .select({ total: count() })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
  return Number(row?.total ?? 0);
}

export async function getFavorites(userId: number) {
  return db
    .select({ favorite: favorites, team: teams })
    .from(favorites)
    .innerJoin(teams, eq(favorites.teamId, teams.id))
    .where(eq(favorites.userId, userId));
}

export async function isFavorite(userId: number, teamId: number) {
  const [row] = await db
    .select({ id: favorites.id })
    .from(favorites)
    .where(and(eq(favorites.userId, userId), eq(favorites.teamId, teamId)))
    .limit(1);
  return Boolean(row);
}

export async function getLeagueBySlug(slug: string) {
  await ready();
  const [league] = await db.select().from(leagues).where(eq(leagues.slug, slug)).limit(1);
  if (!league) return null;
  const leagueTeams = (await db
    .select()
    .from(teams)
    .where(eq(teams.leagueId, league.id))
    .orderBy(desc(sql`${teams.wins} * 3 + ${teams.draws}`), desc(teams.wins))).map((t, i) => ({ ...t, position: i + 1 }));
  const leagueMatches = await getMatches({ leagueId: league.id });
  return { league, teams: leagueTeams, matches: leagueMatches };
}

export async function getAdminOverview() {
  await ready();
  const [userRows, subs, integrationRows, totals, logs] = await Promise.all([
    db.select().from(users).orderBy(desc(users.createdAt)),
    db.select().from(subscriptions).orderBy(desc(subscriptions.createdAt)).limit(20),
    db.select().from(apiIntegrations).orderBy(asc(apiIntegrations.id)),
    db
      .select({
        total: count(),
        active: sql<number>`sum(case when ${users.accessExpiresAt} > now() then 1 else 0 end)`,
        expired: sql<number>`sum(case when ${users.accessExpiresAt} <= now() then 1 else 0 end)`,
      })
      .from(users),
    db
      .select({ log: accessLogs, userName: users.name, userEmail: users.email })
      .from(accessLogs)
      .leftJoin(users, eq(accessLogs.userId, users.id))
      .orderBy(desc(accessLogs.createdAt))
      .limit(25),
  ]);
  const activeCount = Number(totals[0]?.active ?? 0);
  const expiredCount = Number(totals[0]?.expired ?? 0);
  const revenue = subs.filter((s) => s.status === "active").reduce((sum, s) => sum + s.amountCents, 0);
  const [matchCount] = await db.select({ total: count() }).from(matches);
  const [teamCount] = await db.select({ total: count() }).from(teams);
  return {
    users: userRows,
    subscriptions: subs,
    integrations: integrationRows,
    logs,
    stats: {
      totalUsers: Number(totals[0]?.total ?? 0),
      activeUsers: activeCount,
      expiredUsers: expiredCount,
      revenue,
      matches: Number(matchCount?.total ?? 0),
      teams: Number(teamCount?.total ?? 0),
    },
  };
}

export async function getIntegrations() {
  await ready();
  return db.select().from(apiIntegrations).orderBy(asc(apiIntegrations.id));
}

export async function getRecentAccessForUser(userId: number) {
  return db.select().from(accessLogs).where(eq(accessLogs.userId, userId)).orderBy(desc(accessLogs.createdAt)).limit(10);
}

export async function getActiveSubscription(userId: number) {
  const [row] = await db
    .select()
    .from(subscriptions)
    .where(and(eq(subscriptions.userId, userId), gte(subscriptions.expiresAt, new Date())))
    .orderBy(desc(subscriptions.expiresAt))
    .limit(1);
  return row ?? null;
}
