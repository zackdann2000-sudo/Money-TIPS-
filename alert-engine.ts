import { and, eq, inArray, isNull, or } from "drizzle-orm";
import { db } from "@/db";
import { matches, notifications, teams, userPreferences, users, type AlertFlags } from "@/db/schema";
import { enviarNotificacao } from "@/lib/push";
import { wantsAlert } from "@/lib/alerts";

/* ====================================================================== */
/*  ALERT ENGINE — motor de alertas estilo Flashscore                      */
/*                                                                          */
/*  Entrada: eventos normalizados vindos do feed de dados (a sincronização  */
/*  ao vivo chama `dispararEvento` a cada mudança detectada — polling de    */
/*  45s; um WebSocket pode chamar a mesma função).                          */
/*  Saída: notificação in-app + Web Push (VAPID) + OneSignal (REST, se      */
/*  houver REST API key) para cada usuário cuja preferência casar.          */
/*  Agrupamento: eventos "menores" (escanteio, chute, falta, cartão         */
/*  amarelo) são acumulados por time/partida e enviados como um único push  */
/*  de "Pressão" após uma janela de 5 minutos, evitando spam.               */
/* ====================================================================== */

export type AlertEvent = {
  type: "goal" | "redCard" | "yellowCard" | "lineup" | "matchStart" | "matchEnd" | "substitution" | "corner" | "shot" | "foul" | "penalty";
  teamId: number;
  matchId: number;
  player?: string;
  minute?: number;
  detail?: string;
  score?: { home: number; away: number; homeName: string; awayName: string; homeShort?: string; awayShort?: string };
};

const FLAG_FOR: Record<AlertEvent["type"], keyof AlertFlags | null> = {
  goal: "goals",
  penalty: "goals",
  redCard: "redCards",
  yellowCard: "yellowCards",
  lineup: "lineups",
  matchStart: "matchStart",
  matchEnd: "matchEnd",
  substitution: "substitutions",
  corner: "corners",
  shot: "pressure",
  foul: "pressure",
};

/** Eventos de impacto imediato (push na hora). Os demais entram no agrupador de pressão. */
const IMMEDIATE = new Set<AlertEvent["type"]>(["goal", "penalty", "redCard", "lineup", "matchStart", "matchEnd", "substitution", "yellowCard"]);

const GROUP_WINDOW_MS = 5 * 60 * 1000;
const GROUP_MIN_EVENTS = 3;

type Bucket = { events: AlertEvent[]; timer: NodeJS.Timeout | null; firstAt: number };
const buckets = new Map<string, Bucket>();
const recentSent = new Map<string, number>(); // dedupe: `${userId}:${matchId}:${type}:${minute}`

/* ------------------------------ Destinatários ------------------------------ */

/**
 * Busca os userIds que devem receber o evento:
 *  1) user_preferences do time (regra por partida tem prioridade sobre a regra geral do time)
 *  2) fallback: favoritos + preferências globais (alertPrefs) para quem nunca configurou o sino
 */
export async function buscarDestinatarios(ev: AlertEvent): Promise<number[]> {
  const flag = FLAG_FOR[ev.type];
  if (!flag) return [];
  const prefs = await db
    .select({ userId: userPreferences.userId, matchId: userPreferences.matchId, alerts: userPreferences.alerts, muted: userPreferences.muted })
    .from(userPreferences)
    .where(and(eq(userPreferences.teamId, ev.teamId), or(isNull(userPreferences.matchId), eq(userPreferences.matchId, ev.matchId))));
  const byUser = new Map<number, { alerts: AlertFlags; muted: boolean; specific: boolean }>();
  for (const p of prefs) {
    const specific = p.matchId === ev.matchId;
    const current = byUser.get(p.userId);
    if (!current || (specific && !current.specific)) byUser.set(p.userId, { alerts: p.alerts, muted: p.muted, specific });
  }
  const out = new Set<number>();
  for (const [userId, p] of byUser) if (!p.muted && p.alerts[flag]) out.add(userId);

  // Fallback: favoritos sem preferência específica usam as preferências globais da conta
  const legacyType = ev.type === "redCard" || ev.type === "yellowCard" ? "card" : ev.type === "matchStart" ? "kickoff" : ev.type === "matchEnd" ? "end" : ev.type === "substitution" ? "sub" : ev.type === "lineup" ? "lineup" : ev.type;
  const { favorites } = await import("@/db/schema");
  const favs = await db
    .select({ userId: favorites.userId, prefs: users.alertPrefs })
    .from(favorites)
    .innerJoin(users, eq(users.id, favorites.userId))
    .where(eq(favorites.teamId, ev.teamId));
  for (const f of favs) if (!byUser.has(f.userId) && wantsAlert(f.prefs, legacyType)) out.add(f.userId);
  return [...out];
}

/* -------------------------------- Payloads -------------------------------- */

async function nomeDoTime(teamId: number) {
  const [t] = await db.select({ name: teams.name, shortName: teams.shortName }).from(teams).where(eq(teams.id, teamId)).limit(1);
  return t ?? { name: "Time", shortName: "TIME" };
}

function placar(ev: AlertEvent) {
  return ev.score ? `${ev.score.homeName} ${ev.score.home} x ${ev.score.away} ${ev.score.awayName}` : "";
}

export async function montarPayload(ev: AlertEvent): Promise<{ title: string; body: string }> {
  const t = await nomeDoTime(ev.teamId);
  const up = t.name.toUpperCase();
  const min = ev.minute !== undefined ? `aos ${ev.minute} minutos` : "";
  const sc = placar(ev);
  switch (ev.type) {
    case "goal": return { title: `⚽ GOL DO ${up}!`, body: `${ev.player ? `${ev.player} ${min}` : min || "Gol"}${sc ? `. ${sc}.` : ""}` };
    case "penalty": return { title: `🥅 PÊNALTI — ${up}`, body: `${ev.detail ?? ev.player ?? "Pênalti"} ${min}${sc ? `. ${sc}.` : ""}` };
    case "redCard": return { title: `🟥 Expulsão no ${t.name}`, body: `${ev.player ?? "Jogador"} recebeu cartão vermelho ${min}${sc ? `. ${sc}.` : ""}` };
    case "yellowCard": return { title: `🟨 Cartão amarelo — ${t.name}`, body: `${ev.player ?? "Jogador"} ${min}${sc ? `. ${sc}.` : ""}` };
    case "lineup": return { title: `📋 Escalação do ${t.name} divulgada`, body: ev.detail ?? "Confira os titulares confirmados." };
    case "matchStart": return { title: `▶️ Bola rolando — ${t.name}`, body: sc ? `${ev.score!.homeName} x ${ev.score!.awayName} começou.` : "A partida começou." };
    case "matchEnd": return { title: `⏱️ Fim de jogo — ${t.name}`, body: sc || "Partida encerrada." };
    case "substitution": return { title: `🔄 Substituição no ${t.name}`, body: `${ev.detail ?? ev.player ?? ""} ${min}`.trim() };
    case "corner": return { title: `🚩 Escanteio — ${t.name}`, body: `${min}${sc ? ` · ${sc}` : ""}` };
    case "shot": return { title: `🎯 Finalização — ${t.name}`, body: `${ev.player ?? ""} ${min}`.trim() };
    case "foul": return { title: `✋ Falta — ${t.name}`, body: `${ev.player ?? ""} ${min}`.trim() };
  }
}

/* --------------------------------- Envio ---------------------------------- */

async function entregar(userIds: number[], ev: AlertEvent, payload: { title: string; body: string }, type: string) {
  if (!userIds.length) return 0;
  const key = (u: number) => `${u}:${ev.matchId}:${type}:${ev.minute ?? 0}:${payload.title}`;
  const fresh = userIds.filter((u) => { const k = key(u); const last = recentSent.get(k); if (last && Date.now() - last < 2 * 60 * 1000) return false; recentSent.set(k, Date.now()); return true; });
  if (!fresh.length) return 0;
  await db.insert(notifications).values(fresh.map((userId) => ({ userId, matchId: ev.matchId, teamId: ev.teamId, type, title: payload.title, body: payload.body })));
  await Promise.allSettled(fresh.map((userId) => enviarNotificacao(userId, payload.title, payload.body, { url: `/jogos/${ev.matchId}`, tag: `match-${ev.matchId}`, type })));
  void enviarOneSignal(fresh, payload, ev);
  if (recentSent.size > 5000) recentSent.clear();
  return fresh.length;
}

/** OneSignal REST (opcional): só dispara se ONESIGNAL_REST_API_KEY existir. Usa external_id = userId (definido no login do SDK). */
async function enviarOneSignal(userIds: number[], payload: { title: string; body: string }, ev: AlertEvent) {
  const key = process.env.ONESIGNAL_REST_API_KEY;
  if (!key) return;
  try {
    await fetch("https://onesignal.com/api/v1/notifications", {
      method: "POST",
      headers: { "content-type": "application/json", Authorization: `Basic ${key}` },
      body: JSON.stringify({ app_id: "f06a705d-ebd0-4390-9a11-207fe769b81d", include_aliases: { external_id: userIds.map(String) }, target_channel: "push", headings: { en: payload.title, pt: payload.title }, contents: { en: payload.body, pt: payload.body }, url: `/jogos/${ev.matchId}`, web_push_topic: `match-${ev.matchId}` }),
    });
  } catch (error) {
    console.error("onesignal rest", error);
  }
}

/* ------------------------------ Agrupamento ------------------------------- */

const LABEL: Record<string, [string, string]> = { corner: ["escanteio", "escanteios"], shot: ["chute", "chutes"], foul: ["falta", "faltas"], yellowCard: ["cartão amarelo", "cartões amarelos"] };

async function flushBucket(key: string) {
  const b = buckets.get(key);
  buckets.delete(key);
  if (!b || b.events.length < GROUP_MIN_EVENTS) return;
  const first = b.events[0];
  const counts = b.events.reduce<Record<string, number>>((acc, e) => ((acc[e.type] = (acc[e.type] ?? 0) + 1), acc), {});
  const partes = Object.entries(counts).map(([type, n]) => `${n} ${LABEL[type]?.[n === 1 ? 0 : 1] ?? type}`);
  const t = await nomeDoTime(first.teamId);
  const minutes = Math.max(1, Math.round((Date.now() - b.firstAt) / 60000));
  const payload = { title: `🔥 Pressão do ${t.name}!`, body: `${partes.join(" e ")} em ${minutes} minuto${minutes > 1 ? "s" : ""}${first.score ? ` · ${placar(first)}` : ""}.` };
  const userIds = await buscarDestinatarios({ ...first, type: "shot" }); // flag "pressure"
  await entregar(userIds, first, payload, "pressure");
}

function agrupar(ev: AlertEvent) {
  const key = `${ev.matchId}:${ev.teamId}`;
  const b = buckets.get(key) ?? { events: [], timer: null, firstAt: Date.now() };
  b.events.push(ev);
  if (!b.timer) b.timer = setTimeout(() => void flushBucket(key), GROUP_WINDOW_MS);
  buckets.set(key, b);
}

/* ------------------------------- Entrada -------------------------------- */

/**
 * dispararEvento — ponto único de entrada do motor.
 * Chamado pela sincronização ao vivo (polling) a cada evento detectado; um WebSocket pode chamar o mesmo.
 */
export async function dispararEvento(ev: AlertEvent): Promise<{ enviados: number; agrupado: boolean }> {
  if (IMMEDIATE.has(ev.type)) {
    const userIds = await buscarDestinatarios(ev);
    const payload = await montarPayload(ev);
    const enviados = await entregar(userIds, ev, payload, ev.type);
    return { enviados, agrupado: false };
  }
  agrupar(ev);
  // escanteio individual também é entregue a quem pediu explicitamente (flag corners), sem esperar o agrupamento
  if (ev.type === "corner") {
    const userIds = await buscarDestinatarios(ev);
    const payload = await montarPayload(ev);
    const enviados = await entregar(userIds, ev, payload, "corner");
    return { enviados, agrupado: true };
  }
  return { enviados: 0, agrupado: true };
}

/** Simulação para a rota de teste: monta um gol fictício do time e passa pelo motor completo. */
export async function simularGol(teamId: number, player = "Jogador Teste", minute = 32) {
  const [t] = await db.select({ id: teams.id, name: teams.name }).from(teams).where(eq(teams.id, teamId)).limit(1);
  if (!t) throw new Error("Time não encontrado.");
  const [m] = await db
    .select({ id: matches.id, home: matches.homeTeamId, away: matches.awayTeamId, hs: matches.homeScore, as: matches.awayScore })
    .from(matches)
    .where(or(eq(matches.homeTeamId, teamId), eq(matches.awayTeamId, teamId)))
    .orderBy(matches.kickoff)
    .limit(1);
  const oppId = m ? (m.home === teamId ? m.away : m.home) : null;
  const opp = oppId ? (await db.select({ name: teams.name }).from(teams).where(eq(teams.id, oppId)).limit(1))[0]?.name ?? "Adversário" : "Adversário";
  const isHome = !m || m.home === teamId;
  const ev: AlertEvent = {
    type: "goal", teamId, matchId: m?.id ?? 0, player, minute,
    score: { homeName: isHome ? t.name : opp, awayName: isHome ? opp : t.name, home: isHome ? (m?.hs ?? 0) + 1 : (m?.hs ?? 0), away: isHome ? (m?.as ?? 0) : (m?.as ?? 0) + 1 },
  };
  const destinatarios = await buscarDestinatarios(ev);
  const payload = await montarPayload(ev);
  const enviados = await entregar(destinatarios, ev, payload, "goal");
  return { evento: ev, payload, destinatarios, enviados };
}

export async function obterPreferencias(userId: number, teamId: number, matchId?: number | null) {
  const rows = await db.select().from(userPreferences).where(and(eq(userPreferences.userId, userId), eq(userPreferences.teamId, teamId), matchId ? or(isNull(userPreferences.matchId), eq(userPreferences.matchId, matchId)) : isNull(userPreferences.matchId)));
  return rows.find((r) => r.matchId === (matchId ?? null)) ?? rows.find((r) => r.matchId === null) ?? null;
}

export async function salvarPreferencias(userId: number, teamId: number, matchId: number | null, alerts: AlertFlags, muted = false) {
  const existing = await db.select({ id: userPreferences.id }).from(userPreferences).where(and(eq(userPreferences.userId, userId), eq(userPreferences.teamId, teamId), matchId ? eq(userPreferences.matchId, matchId) : isNull(userPreferences.matchId))).limit(1);
  if (existing[0]) {
    await db.update(userPreferences).set({ alerts, muted, updatedAt: new Date() }).where(eq(userPreferences.id, existing[0].id));
    return existing[0].id;
  }
  const [row] = await db.insert(userPreferences).values({ userId, teamId, matchId, alerts, muted }).returning({ id: userPreferences.id });
  return row.id;
}

export async function listarPreferencias(userId: number) {
  return db.select({ pref: userPreferences, team: { id: teams.id, name: teams.name, logo: teams.logo } }).from(userPreferences).innerJoin(teams, eq(teams.id, userPreferences.teamId)).where(eq(userPreferences.userId, userId));
}

export async function removerPreferencias(userId: number, teamId: number, matchId: number | null) {
  await db.delete(userPreferences).where(and(eq(userPreferences.userId, userId), eq(userPreferences.teamId, teamId), matchId ? eq(userPreferences.matchId, matchId) : isNull(userPreferences.matchId)));
}

export const _internals = { buckets, flushBucket, inArray };
