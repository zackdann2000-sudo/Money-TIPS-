import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("user"), // user | admin
  plan: text("plan").notNull().default("free"), // free | vip | pro
  accessExpiresAt: timestamp("access_expires_at", { withTimezone: true }).notNull(),
  trialSource: text("trial_source").notNull().default("email"),
  avatarSeed: text("avatar_seed").notNull().default("GS"),
  alertPrefs: jsonb("alert_prefs")
    .$type<Record<string, boolean>>()
    .notNull()
    .default({ goal: true, penalty: true, card: false, corner: false, foul: false, offside: false, kickoff: true, end: true, lineup: true, sound: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
});

export const sessions = pgTable("sessions", {
  token: text("token").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  userAgent: text("user_agent"),
});

export const accessLogs = pgTable("access_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }),
  path: text("path").notNull(),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const leagues = pgTable("leagues", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  country: text("country").notNull(),
  flag: text("flag").notNull().default("🌍"),
  tier: text("tier").notNull().default("1"),
  season: text("season").notNull().default("2025/26"),
  color: text("color").notNull().default("#16a34a"),
  avgGoals: text("avg_goals").notNull().default("2.7"),
  avgCorners: text("avg_corners").notNull().default("9.8"),
  avgCards: text("avg_cards").notNull().default("4.1"),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const teams = pgTable("teams", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  shortName: text("short_name").notNull(),
  leagueId: integer("league_id").references(() => leagues.id, { onDelete: "set null" }),
  country: text("country").notNull().default("Brasil"),
  city: text("city").notNull().default(""),
  stadium: text("stadium").notNull().default(""),
  coach: text("coach").notNull().default(""),
  founded: integer("founded").notNull().default(1900),
  badgeColor: text("badge_color").notNull().default("#16a34a"),
  badgeColorAlt: text("badge_color_alt").notNull().default("#052e16"),
  marketValue: text("market_value").notNull().default("€0M"),
  position: integer("position").notNull().default(1),
  played: integer("played").notNull().default(0),
  wins: integer("wins").notNull().default(0),
  draws: integer("draws").notNull().default(0),
  losses: integer("losses").notNull().default(0),
  goalsFor: integer("goals_for").notNull().default(0),
  goalsAgainst: integer("goals_against").notNull().default(0),
  form: text("form").notNull().default("VVVEN"), // V=win E=draw N=loss (most recent first)
  avgPossession: integer("avg_possession").notNull().default(50),
  avgShots: integer("avg_shots").notNull().default(12),
  avgShotsOnTarget: integer("avg_shots_on_target").notNull().default(4),
  avgCorners: integer("avg_corners").notNull().default(5),
  avgCards: integer("avg_cards").notNull().default(2),
  avgFouls: integer("avg_fouls").notNull().default(12),
  avgOffsides: integer("avg_offsides").notNull().default(2),
  over25Rate: integer("over_25_rate").notNull().default(50),
  bttsRate: integer("btts_rate").notNull().default(50),
  cleanSheets: integer("clean_sheets").notNull().default(0),
  description: text("description").notNull().default(""),
  formation: text("formation").notNull().default("4-3-3"),
  logo: text("logo").notNull().default(""),
  externalId: text("external_id"),
  source: text("source").notNull().default("demo"),
  recentGames: jsonb("recent_games")
    .$type<{ date: string; opponent: string; score: string; result: string; home: boolean; competition: string }[]>()
    .notNull()
    .default([]),
  statsSample: integer("stats_sample").notNull().default(0),
});

export const matches = pgTable("matches", {
  id: serial("id").primaryKey(),
  leagueId: integer("league_id").references(() => leagues.id, { onDelete: "set null" }),
  homeTeamId: integer("home_team_id").notNull(),
  awayTeamId: integer("away_team_id").notNull(),
  kickoff: timestamp("kickoff", { withTimezone: true }).notNull(),
  status: text("status").notNull().default("scheduled"), // scheduled | live | finished
  minute: integer("minute").notNull().default(0),
  round: text("round").notNull().default("Rodada 1"),
  venue: text("venue").notNull().default(""),
  homeScore: integer("home_score").notNull().default(0),
  awayScore: integer("away_score").notNull().default(0),
  homeCorners: integer("home_corners").notNull().default(0),
  awayCorners: integer("away_corners").notNull().default(0),
  homeCards: integer("home_cards").notNull().default(0),
  awayCards: integer("away_cards").notNull().default(0),
  homeFouls: integer("home_fouls").notNull().default(0),
  awayFouls: integer("away_fouls").notNull().default(0),
  homeOffsides: integer("home_offsides").notNull().default(0),
  awayOffsides: integer("away_offsides").notNull().default(0),
  homePossession: integer("home_possession").notNull().default(50),
  awayPossession: integer("away_possession").notNull().default(50),
  homeShots: integer("home_shots").notNull().default(0),
  awayShots: integer("away_shots").notNull().default(0),
  homeShotsOnTarget: integer("home_shots_on_target").notNull().default(0),
  awayShotsOnTarget: integer("away_shots_on_target").notNull().default(0),
  homeXg: text("home_xg").notNull().default("0.00"),
  awayXg: text("away_xg").notNull().default("0.00"),
  externalId: text("external_id"),
  source: text("source").notNull().default("demo"),
  leagueCode: text("league_code").notNull().default(""),
  oddsDetails: text("odds_details").notNull().default(""),
  overUnder: text("over_under").notNull().default(""),
  statusDetail: text("status_detail").notNull().default(""),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const players = pgTable(
  "players",
  {
    id: serial("id").primaryKey(),
    source: text("source").notNull().default("espn"),
    externalId: text("external_id").notNull(),
    name: text("name").notNull(),
    shortName: text("short_name").notNull().default(""),
    slug: text("slug").notNull().default(""),
    position: text("position").notNull().default("M"), // G | D | M | F (granularidade real da fonte)
    positionName: text("position_name").notNull().default(""),
    nationality: text("nationality").notNull().default(""),
    flag: text("flag").notNull().default(""),
    age: integer("age"),
    dateOfBirth: text("date_of_birth").notNull().default(""),
    jersey: text("jersey").notNull().default(""),
    headshot: text("headshot").notNull().default(""),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("players_source_external_idx").on(table.source, table.externalId)],
);

export const playerSeasonStats = pgTable(
  "player_season_stats",
  {
    id: serial("id").primaryKey(),
    playerId: integer("player_id")
      .notNull()
      .references(() => players.id, { onDelete: "cascade" }),
    leagueCode: text("league_code").notNull(),
    season: integer("season").notNull(),
    teamExternalId: text("team_external_id").notNull().default(""),
    teamId: integer("team_id").references(() => teams.id, { onDelete: "set null" }),
    teamName: text("team_name").notNull().default(""),
    teamLogo: text("team_logo").notNull().default(""),
    // Base (elenco da equipe — disponível para todos os jogadores)
    appearances: integer("appearances").notNull().default(0),
    subIns: integer("sub_ins").notNull().default(0),
    goals: integer("goals").notNull().default(0),
    assists: integer("assists").notNull().default(0),
    shots: integer("shots").notNull().default(0),
    shotsOnTarget: integer("shots_on_target").notNull().default(0),
    foulsCommitted: integer("fouls_committed").notNull().default(0),
    foulsSuffered: integer("fouls_suffered").notNull().default(0),
    yellowCards: integer("yellow_cards").notNull().default(0),
    redCards: integer("red_cards").notNull().default(0),
    offsides: integer("offsides").notNull().default(0),
    ownGoals: integer("own_goals").notNull().default(0),
    saves: integer("saves").notNull().default(0),
    shotsFaced: integer("shots_faced").notNull().default(0),
    goalsConceded: integer("goals_conceded").notNull().default(0),
    // Detalhado (estatísticas por atleta — preenchido progressivamente)
    detailed: boolean("detailed").notNull().default(false),
    detailedAt: timestamp("detailed_at", { withTimezone: true }),
    minutes: integer("minutes"),
    starts: integer("starts"),
    penaltyGoals: integer("penalty_goals"),
    penaltyShots: integer("penalty_shots"),
    headedGoals: integer("headed_goals"),
    totalPasses: integer("total_passes"),
    accuratePasses: integer("accurate_passes"),
    totalCrosses: integer("total_crosses"),
    accurateCrosses: integer("accurate_crosses"),
    shotAssists: integer("shot_assists"),
    bigChancesCreated: integer("big_chances_created"),
    tackles: integer("tackles"),
    tacklesWon: integer("tackles_won"),
    interceptions: integer("interceptions"),
    clearances: integer("clearances"),
    blockedShots: integer("blocked_shots"),
    recoveries: integer("recoveries"),
    duels: integer("duels"),
    duelsWon: integer("duels_won"),
    touches: integer("touches"),
    cleanSheets: integer("clean_sheets"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("player_season_unique_idx").on(table.playerId, table.leagueCode, table.season),
    index("player_season_league_idx").on(table.leagueCode, table.season),
    index("player_season_team_idx").on(table.teamExternalId),
  ],
);

/** Resultados históricos (temporada atual + anterior) usados pelo modelo preditivo. */
export const historicalMatches = pgTable(
  "historical_matches",
  {
    id: serial("id").primaryKey(),
    source: text("source").notNull().default("espn"),
    externalId: text("external_id").notNull(),
    leagueCode: text("league_code").notNull(),
    season: integer("season").notNull(),
    date: timestamp("date", { withTimezone: true }).notNull(),
    homeExtId: text("home_ext_id").notNull(),
    awayExtId: text("away_ext_id").notNull(),
    homeName: text("home_name").notNull(),
    awayName: text("away_name").notNull(),
    homeScore: integer("home_score").notNull(),
    awayScore: integer("away_score").notNull(),
    neutral: boolean("neutral").notNull().default(false),
  },
  (table) => [
    uniqueIndex("historical_source_external_idx").on(table.source, table.externalId),
    index("historical_league_date_idx").on(table.leagueCode, table.date),
    index("historical_home_idx").on(table.homeExtId),
    index("historical_away_idx").on(table.awayExtId),
  ],
);

/** Toda previsão emitida fica registrada com os dados do momento, para avaliação posterior. */
export const predictions = pgTable(
  "predictions",
  {
    id: serial("id").primaryKey(),
    matchId: integer("match_id").references(() => matches.id, { onDelete: "set null" }),
    matchExternalId: text("match_external_id").notNull().default(""),
    leagueCode: text("league_code").notNull().default(""),
    kind: text("kind").notNull().default("pre"), // pre | live
    modelVersion: text("model_version").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    dataAsOf: timestamp("data_as_of", { withTimezone: true }).notNull().defaultNow(),
    minute: integer("minute").notNull().default(0),
    scoreAtPrediction: text("score_at_prediction").notNull().default(""),
    dataQuality: text("data_quality").notNull().default("baixa"), // alta | media | baixa
    sampleHome: integer("sample_home").notNull().default(0),
    sampleAway: integer("sample_away").notNull().default(0),
    probs: jsonb("probs").$type<Record<string, number>>().notNull().default({}),
    scorelines: jsonb("scorelines").$type<{ score: string; p: number }[]>().notNull().default([]),
    inputs: jsonb("inputs").$type<Record<string, unknown>>().notNull().default({}),
    projections: jsonb("projections").$type<Record<string, unknown>>().notNull().default({}),
    explanation: jsonb("explanation").$type<Record<string, unknown>>().notNull().default({}),
    settled: boolean("settled").notNull().default(false),
    actualHome: integer("actual_home"),
    actualAway: integer("actual_away"),
    brier: text("brier").notNull().default(""),
    logLoss: text("log_loss").notNull().default(""),
  },
  (table) => [index("predictions_match_idx").on(table.matchId), index("predictions_external_idx").on(table.matchExternalId)],
);

/** Resultado dos testes históricos (backtest temporal) por liga e versão do modelo. */
export const modelEvaluations = pgTable("model_evaluations", {
  id: serial("id").primaryKey(),
  leagueCode: text("league_code").notNull(),
  modelVersion: text("model_version").notNull(),
  runAt: timestamp("run_at", { withTimezone: true }).notNull().defaultNow(),
  sampleSize: integer("sample_size").notNull().default(0),
  metrics: jsonb("metrics").$type<Record<string, unknown>>().notNull().default({}),
});

export type AlertFlags = { goals: boolean; redCards: boolean; lineups: boolean; matchStart: boolean; matchEnd: boolean; substitutions: boolean; yellowCards: boolean; corners?: boolean; pressure?: boolean };

/**
 * UserPreferences — preferências de alerta por time (e opcionalmente por partida), estilo Flashscore.
 * matchId null = regra do time em todas as partidas; matchId preenchido = só naquela partida (tem prioridade).
 */
export const userPreferences = pgTable(
  "user_preferences",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    teamId: integer("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    matchId: integer("match_id").references(() => matches.id, { onDelete: "cascade" }),
    alerts: jsonb("alerts")
      .$type<AlertFlags>()
      .notNull()
      .default({ goals: true, redCards: true, lineups: true, matchStart: false, matchEnd: true, substitutions: false, yellowCards: false, corners: false, pressure: true }),
    muted: boolean("muted").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("user_preferences_unique_idx").on(table.userId, table.teamId, table.matchId), index("user_preferences_team_idx").on(table.teamId)],
);

/** Inscrições Web Push (padrão VAPID) — uma por dispositivo/navegador, associada ao usuário. */
export const pushSubscriptions = pgTable(
  "push_subscriptions",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    endpoint: text("endpoint").notNull(),
    p256dh: text("p256dh").notNull(),
    auth: text("auth").notNull(),
    userAgent: text("user_agent").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    failures: integer("failures").notNull().default(0),
  },
  (table) => [uniqueIndex("push_subscriptions_endpoint_idx").on(table.endpoint), index("push_subscriptions_user_idx").on(table.userId)],
);

export const syncState = pgTable("sync_state", {
  key: text("key").primaryKey(),
  lastRunAt: timestamp("last_run_at", { withTimezone: true }),
  lastSuccessAt: timestamp("last_success_at", { withTimezone: true }),
  lastMessage: text("last_message").notNull().default(""),
  matchesSynced: integer("matches_synced").notNull().default(0),
});

export const matchEvents = pgTable("match_events", {
  id: serial("id").primaryKey(),
  matchId: integer("match_id")
    .notNull()
    .references(() => matches.id, { onDelete: "cascade" }),
  minute: integer("minute").notNull().default(0),
  half: integer("half").notNull().default(1),
  type: text("type").notNull(), // goal | card | yellow | red | corner | foul | offside | penalty | sub | end | kickoff | var
  side: text("side").notNull().default("home"), // home | away | neutral
  player: text("player").notNull().default(""),
  detail: text("detail").notNull().default(""),
  scoreAfter: text("score_after").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const lineups = pgTable("lineups", {
  id: serial("id").primaryKey(),
  matchId: integer("match_id").references(() => matches.id, { onDelete: "cascade" }),
  teamId: integer("team_id")
    .notNull()
    .references(() => teams.id, { onDelete: "cascade" }),
  formation: text("formation").notNull().default("4-3-3"),
  confidence: integer("confidence").notNull().default(75),
  source: text("source").notNull().default("Modelo estatístico GreenScore"),
  players: jsonb("players")
    .$type<{ name: string; number: number; pos: string; rating: string; status?: string }[]>()
    .notNull()
    .default([]),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insights = pgTable("insights", {
  id: serial("id").primaryKey(),
  matchId: integer("match_id").references(() => matches.id, { onDelete: "cascade" }),
  teamId: integer("team_id").references(() => teams.id, { onDelete: "cascade" }),
  category: text("category").notNull().default("mercados"), // gols | cartoes | escanteios | mercados | impedimentos
  title: text("title").notNull(),
  body: text("body").notNull(),
  market: text("market").notNull().default(""),
  confidence: integer("confidence").notNull().default(70),
  odds: text("odds").notNull().default("1.85"),
  source: text("source").notNull().default("GreenScore Analytics"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }),
  matchId: integer("match_id").references(() => matches.id, { onDelete: "cascade" }),
  teamId: integer("team_id").references(() => teams.id, { onDelete: "cascade" }),
  type: text("type").notNull().default("goal"),
  title: text("title").notNull(),
  body: text("body").notNull(),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const favorites = pgTable(
  "favorites",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    teamId: integer("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    alertsGoals: boolean("alerts_goals").notNull().default(true),
    alertsCorners: boolean("alerts_corners").notNull().default(true),
    alertsCards: boolean("alerts_cards").notNull().default(true),
    alertsLineup: boolean("alerts_lineup").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("favorites_user_team_idx").on(table.userId, table.teamId)],
);

export const plans = pgTable("plans", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  priceCents: integer("price_cents").notNull().default(2990),
  durationDays: integer("duration_days").notNull().default(30),
  tagline: text("tagline").notNull().default(""),
  features: jsonb("features").$type<string[]>().notNull().default([]),
  isFeatured: boolean("is_featured").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const subscriptions = pgTable("subscriptions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  planSlug: text("plan_slug").notNull(),
  amountCents: integer("amount_cents").notNull().default(0),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  status: text("status").notNull().default("active"), // active | expired | canceled
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const apiIntegrations = pgTable("api_integrations", {
  id: serial("id").primaryKey(),
  provider: text("provider").notNull(),
  label: text("label").notNull(),
  baseUrl: text("base_url").notNull().default(""),
  apiKey: text("api_key").notNull().default(""),
  isActive: boolean("is_active").notNull().default(true),
  status: text("status").notNull().default("connected"), // connected | error | idle
  lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),
  lastTestedAt: timestamp("last_tested_at", { withTimezone: true }),
  lastError: text("last_error").notNull().default(""),
  lastResult: text("last_result").notNull().default(""),
  requestsToday: integer("requests_today").notNull().default(0),
  notes: text("notes").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const banners = pgTable("banners", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  subtitle: text("subtitle").notNull().default(""),
  ctaLabel: text("cta_label").notNull().default("Ver mais"),
  ctaHref: text("cta_href").notNull().default("/jogos"),
  badge: text("badge").notNull().default("DESTAQUE"),
  gradient: text("gradient").notNull().default("from-emerald-600 to-teal-500"),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
});
