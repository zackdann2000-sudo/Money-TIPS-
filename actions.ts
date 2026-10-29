"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { ensureSeed } from "@/db/seed";
import {
  apiIntegrations,
  favorites,
  lineups,
  matchEvents,
  matches,
  notifications,
  plans,
  subscriptions,
  teams,
  users,
} from "@/db/schema";
import { createSession, destroySession, getSessionUser, logAccess } from "@/lib/auth";
import { authenticate, registerUser } from "@/lib/users";
import { normalizeBaseUrl, presetFor, syncProvider, testProvider } from "@/lib/providers";
import { ALERT_OPTIONS, wantsAlert } from "@/lib/alerts";
import { enviarParaUsuarios } from "@/lib/push";

export type FormState = { error?: string; success?: string };

const ALL_PATHS = ["/", "/jogos", "/times", "/ligas", "/analises", "/notificacoes", "/conta", "/admin", "/admin/usuarios", "/admin/apis", "/admin/jogos", "/api/live"];

function revalidateAll() {
  for (const path of ALL_PATHS) {
    try {
      revalidatePath(path);
    } catch {
      /* noop */
    }
  }
}

export async function signupAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const accepted = formData.get("terms");
  if (!accepted) return { error: "Aceite os termos de uso para continuar." };
  const result = await registerUser({
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  });
  if (!result.ok) return { error: result.error };

  await createSession(result.userId);
  await logAccess(result.userId, "/cadastro");
  revalidateAll();
  redirect("/conta?novo=1");
}

export async function loginAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await ensureSeed();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Preencha e-mail e senha." };
  const user = await authenticate(email, password);
  if (!user) {
    return { error: "E-mail ou senha incorretos. Use demo@gmail.com / demo123 para testar." };
  }
  await createSession(user.id);
  await logAccess(user.id, "/login");
  revalidateAll();
  redirect(user.role === "admin" ? "/admin" : "/jogos");
}

export async function logoutAction() {
  await destroySession();
  revalidateAll();
  redirect("/");
}

export async function subscribeAction(formData: FormData) {
  await ensureSeed();
  const planSlug = String(formData.get("plan") ?? "vip-mensal");
  const user = await getSessionUser();
  if (!user) redirect(`/login?next=planos`);
  const [plan] = await db.select().from(plans).where(eq(plans.slug, planSlug)).limit(1);
  if (!plan) redirect("/planos?erro=plano");

  const base = Math.max(Date.now(), new Date(user.accessExpiresAt).getTime());
  const expiresAt = new Date(base + plan.durationDays * 86400000);
  await db
    .update(users)
    .set({ plan: plan.slug === "vip-anual" ? "pro" : "vip", accessExpiresAt: expiresAt })
    .where(eq(users.id, user.id));
  await db.insert(subscriptions).values({
    userId: user.id,
    planSlug: plan.slug,
    amountCents: plan.priceCents,
    startsAt: new Date(),
    expiresAt,
    status: "active",
  });
  await db.insert(notifications).values({
    userId: user.id,
    type: "subscription",
    title: `💎 ${plan.name} ativado!`,
    body: `Seu acesso VIP vai até ${expiresAt.toLocaleDateString("pt-BR")}. Aproveite alertas ilimitados e todas as estatísticas ao vivo.`,
  });
  await logAccess(user.id, "/planos/checkout");
  revalidateAll();
  redirect("/conta?assinou=1");
}

export async function toggleFavoriteAction(formData: FormData) {
  const teamId = Number(formData.get("teamId"));
  const redirectTo = String(formData.get("redirectTo") ?? "/times");
  const user = await getSessionUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(redirectTo)}`);
  const [existing] = await db
    .select({ id: favorites.id })
    .from(favorites)
    .where(and(eq(favorites.userId, user.id), eq(favorites.teamId, teamId)))
    .limit(1);
  if (existing) {
    await db.delete(favorites).where(eq(favorites.id, existing.id));
  } else {
    await db.insert(favorites).values({ userId: user.id, teamId });
    const [team] = await db.select({ name: teams.name }).from(teams).where(eq(teams.id, teamId)).limit(1);
    await db.insert(notifications).values({
      userId: user.id,
      teamId,
      type: "favorite",
      title: `⭐ ${team?.name ?? "Time"} adicionado aos favoritos`,
      body: "Você receberá alertas de gols, cartões, escanteios, impedimentos, escalação prevista e fim de jogo deste time.",
    });
  }
  revalidateAll();
  redirect(redirectTo);
}

export async function markAllReadAction(formData: FormData) {
  const user = await getSessionUser();
  const redirectTo = String(formData.get("redirectTo") ?? "/notificacoes");
  if (user) {
    await db.update(notifications).set({ isRead: true }).where(eq(notifications.userId, user.id));
  }
  revalidatePath("/notificacoes");
  redirect(redirectTo);
}

export async function deleteNotificationAction(formData: FormData) {
  const user = await getSessionUser();
  const id = Number(formData.get("id"));
  if (user && id) {
    await db.delete(notifications).where(and(eq(notifications.id, id), eq(notifications.userId, user.id)));
  }
  revalidatePath("/notificacoes");
  redirect("/notificacoes");
}

export async function saveIntegrationAction(formData: FormData) {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") redirect("/login?next=admin/apis");
  const id = Number(formData.get("id") ?? 0);
  const providerInput = String(formData.get("provider") ?? "").trim();
  const preset = presetFor(providerInput || "custom");
  const provider = preset.id === "custom" && providerInput ? providerInput : preset.id;
  const label = String(formData.get("label") ?? "").trim() || preset.label;
  const baseUrl = normalizeBaseUrl(provider, String(formData.get("baseUrl") ?? ""));
  const apiKeyInput = String(formData.get("apiKey") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const isActive = formData.get("isActive") === "on";

  let savedId = id;
  let apiKey = apiKeyInput;
  if (id) {
    const [current] = await db.select().from(apiIntegrations).where(eq(apiIntegrations.id, id)).limit(1);
    if (!current) redirect("/admin/apis?erro=nao-encontrada");
    apiKey = apiKeyInput || current.apiKey;
    await db
      .update(apiIntegrations)
      .set({ provider, label, baseUrl, notes, isActive, apiKey })
      .where(eq(apiIntegrations.id, id));
  } else {
    const [created] = await db
      .insert(apiIntegrations)
      .values({ provider, label, baseUrl, apiKey, notes, isActive, status: "idle" })
      .returning({ id: apiIntegrations.id });
    savedId = created.id;
  }

  // Testa a conexão imediatamente para o dono saber se a chave e a URL estão corretas.
  const test = await testProvider(provider, baseUrl, apiKey);
  await db
    .update(apiIntegrations)
    .set({
      status: test.ok ? "connected" : "error",
      lastTestedAt: new Date(),
      lastError: test.ok ? "" : test.message,
      lastResult: test.ok ? test.message : "",
      requestsToday: sql`${apiIntegrations.requestsToday} + 1`,
    })
    .where(eq(apiIntegrations.id, savedId));

  revalidateAll();
  redirect(`/admin/apis?${test.ok ? "salvo=1" : "falha=1"}&id=${savedId}`);
}

export async function testIntegrationAction(formData: FormData) {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") redirect("/login?next=admin/apis");
  const id = Number(formData.get("id"));
  const [row] = await db.select().from(apiIntegrations).where(eq(apiIntegrations.id, id)).limit(1);
  if (!row) redirect("/admin/apis?erro=nao-encontrada");
  const baseUrl = normalizeBaseUrl(row.provider, row.baseUrl);
  const test = await testProvider(row.provider, baseUrl, row.apiKey);
  await db
    .update(apiIntegrations)
    .set({
      baseUrl,
      status: test.ok ? "connected" : "error",
      lastTestedAt: new Date(),
      lastError: test.ok ? "" : test.message,
      lastResult: test.ok ? test.message : "",
      requestsToday: sql`${apiIntegrations.requestsToday} + 1`,
    })
    .where(eq(apiIntegrations.id, id));
  revalidateAll();
  redirect(`/admin/apis?${test.ok ? "testado=1" : "falha=1"}&id=${id}`);
}

export async function syncIntegrationAction(formData: FormData) {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") redirect("/login?next=admin/apis");
  const id = Number(formData.get("id"));
  const [row] = await db.select().from(apiIntegrations).where(eq(apiIntegrations.id, id)).limit(1);
  if (!row) redirect("/admin/apis?erro=nao-encontrada");
  const baseUrl = normalizeBaseUrl(row.provider, row.baseUrl);
  const result = await syncProvider(row.provider, baseUrl, row.apiKey);
  await db
    .update(apiIntegrations)
    .set({
      baseUrl,
      status: result.ok ? "connected" : "error",
      lastSyncAt: result.ok ? new Date() : row.lastSyncAt,
      lastTestedAt: new Date(),
      lastError: result.ok ? "" : result.message,
      lastResult: result.ok ? result.message : row.lastResult,
      requestsToday: sql`${apiIntegrations.requestsToday} + 2`,
    })
    .where(eq(apiIntegrations.id, id));
  revalidateAll();
  redirect(`/admin/apis?${result.ok ? "sincronizado=1" : "falha=1"}&id=${id}`);
}

export async function toggleIntegrationAction(formData: FormData) {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") redirect("/login");
  const id = Number(formData.get("id"));
  const [row] = await db.select().from(apiIntegrations).where(eq(apiIntegrations.id, id)).limit(1);
  if (row) {
    await db
      .update(apiIntegrations)
      .set({ isActive: !row.isActive, status: !row.isActive ? "connected" : "idle", lastSyncAt: new Date() })
      .where(eq(apiIntegrations.id, id));
  }
  revalidateAll();
  redirect("/admin/apis");
}

export async function deleteIntegrationAction(formData: FormData) {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") redirect("/login");
  const id = Number(formData.get("id"));
  await db.delete(apiIntegrations).where(eq(apiIntegrations.id, id));
  revalidateAll();
  redirect("/admin/apis");
}

export async function adjustUserAccessAction(formData: FormData) {
  const admin = await getSessionUser();
  if (!admin || admin.role !== "admin") redirect("/login?next=admin/usuarios");
  const userId = Number(formData.get("userId"));
  const days = Number(formData.get("days") ?? 0);
  const action = String(formData.get("action") ?? "extend");
  const [target] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!target) redirect("/admin/usuarios?erro=usuario");

  if (action === "expire") {
    await db.update(users).set({ accessExpiresAt: new Date(Date.now() - 60000), plan: "free" }).where(eq(users.id, userId));
    await db.insert(notifications).values({
      userId,
      type: "subscription",
      title: "Acesso expirado",
      body: "Seu período de acesso foi encerrado pelo administrador. Assine o VIP para voltar a acompanhar as estatísticas.",
    });
  } else {
    const base = Math.max(Date.now(), new Date(target.accessExpiresAt).getTime());
    await db
      .update(users)
      .set({ accessExpiresAt: new Date(base + (days || 30) * 86400000), plan: days >= 365 ? "pro" : "vip" })
      .where(eq(users.id, userId));
    await db.insert(subscriptions).values({
      userId,
      planSlug: days >= 365 ? "vip-anual" : "vip-mensal",
      amountCents: 0,
      startsAt: new Date(),
      expiresAt: new Date(base + (days || 30) * 86400000),
      status: "active",
    });
    await db.insert(notifications).values({
      userId,
      type: "subscription",
      title: "🎁 Acesso liberado pelo proprietário",
      body: `Você recebeu ${days || 30} dias de acesso VIP cortesia. Bom proveito!`,
    });
  }
  revalidateAll();
  redirect("/admin/usuarios?atualizado=1");
}

export async function createTeamAction(formData: FormData) {
  await ensureSeed();
  const admin = await getSessionUser();
  if (!admin || admin.role !== "admin") redirect("/login?next=admin/jogos");
  const name = String(formData.get("name") ?? "").trim();
  if (!name) redirect("/admin/jogos?erro=nome");
  const slug = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  await db
    .insert(teams)
    .values({
      slug,
      name,
      shortName: name.slice(0, 3).toUpperCase(),
      leagueId: Number(formData.get("leagueId")) || null,
      country: String(formData.get("country") ?? "Brasil"),
      stadium: String(formData.get("stadium") ?? ""),
      coach: String(formData.get("coach") ?? ""),
      badgeColor: String(formData.get("badgeColor") ?? "#16a34a"),
      position: Number(formData.get("position")) || 10,
      formation: String(formData.get("formation") ?? "4-3-3"),
    })
    .onConflictDoNothing();
  revalidateAll();
  redirect("/admin/jogos?time=1");
}

export async function createMatchAction(formData: FormData) {
  await ensureSeed();
  const admin = await getSessionUser();
  if (!admin || admin.role !== "admin") redirect("/login?next=admin/jogos");
  const homeTeamId = Number(formData.get("homeTeamId"));
  const awayTeamId = Number(formData.get("awayTeamId"));
  if (!homeTeamId || !awayTeamId || homeTeamId === awayTeamId) redirect("/admin/jogos?erro=times");
  const kickoffRaw = String(formData.get("kickoff") ?? "");
  const kickoff = kickoffRaw ? new Date(kickoffRaw) : new Date(Date.now() + 3 * 3600000);
  const [created] = await db
    .insert(matches)
    .values({
      leagueId: Number(formData.get("leagueId")) || null,
      homeTeamId,
      awayTeamId,
      kickoff,
      status: String(formData.get("status") ?? "scheduled"),
      round: String(formData.get("round") ?? "Rodada"),
      venue: String(formData.get("venue") ?? ""),
    })
    .returning({ id: matches.id });
  await db.insert(matchEvents).values({
    matchId: created.id,
    minute: 0,
    type: "lineup",
    side: "neutral",
    detail: "Escalação prevista disponível no GreenScore",
  });
  revalidateAll();
  redirect(`/admin/jogos?jogo=${created.id}`);
}

export async function updateMatchStatusAction(formData: FormData) {
  const admin = await getSessionUser();
  if (!admin || admin.role !== "admin") redirect("/login");
  const id = Number(formData.get("id"));
  const status = String(formData.get("status") ?? "live");
  await db.update(matches).set({ status, minute: status === "finished" ? 90 : status === "live" ? 1 : 0, updatedAt: new Date() }).where(eq(matches.id, id));
  revalidateAll();
  redirect("/admin/jogos?status=1");
}

/** Gera o próximo evento ao vivo (gols, escanteios, faltas, impedimentos, cartões, pênaltis, fim de jogo). */
export async function simulateLiveEventAction(formData: FormData) {
  const matchId = Number(formData.get("matchId"));
  const redirectTo = String(formData.get("redirectTo") ?? `/jogos/${matchId}`);
  const [match] = await db.select().from(matches).where(eq(matches.id, matchId)).limit(1);
  if (!match) redirect(redirectTo);

  const teamsRows = await db
    .select({ id: teams.id, name: teams.name, shortName: teams.shortName, color: teams.badgeColor })
    .from(teams)
    .where(sql`${teams.id} in (${match.homeTeamId}, ${match.awayTeamId})`);
  const homeT = teamsRows.find((t) => t.id === match.homeTeamId);
  const awayT = teamsRows.find((t) => t.id === match.awayTeamId);
  const teamLineups = await db.select().from(lineups).where(sql`${lineups.teamId} in (${match.homeTeamId}, ${match.awayTeamId})`);

  if (match.status !== "live") {
    await db.update(matches).set({ status: "live", minute: Math.max(1, match.minute), updatedAt: new Date() }).where(eq(matches.id, match.id));
    await db.insert(matchEvents).values({ matchId: match.id, minute: match.minute, type: "kickoff", side: "neutral", detail: "Bola rolando!" });
    revalidateAll();
    redirect(redirectTo);
  }

  const minute = Math.min(95, match.minute + 1 + Math.floor(Math.random() * 4));
  const side = Math.random() < 0.52 ? "home" : "away";
  const teamId = side === "home" ? match.homeTeamId : match.awayTeamId;
  const teamName = side === "home" ? homeT?.name : awayT?.name;
  const squad = teamLineups.find((l) => l.teamId === teamId)?.players ?? [];
  const player = squad.length ? squad[Math.floor(Math.random() * squad.length)].name : "Jogador";
  const roll = Math.random();
  let type = "corner";
  if (roll < 0.26) type = "corner";
  else if (roll < 0.48) type = "foul";
  else if (roll < 0.6) type = "offside";
  else if (roll < 0.74) type = "yellow";
  else if (roll < 0.86) type = "goal";
  else if (roll < 0.92) type = "penalty";
  else if (roll < 0.96) type = "red";
  else type = "var";

  const update: Record<string, unknown> = { minute, updatedAt: new Date() };
  const isGoal = type === "goal" || type === "penalty";
  const homeScore = match.homeScore + (isGoal && side === "home" ? 1 : 0);
  const awayScore = match.awayScore + (isGoal && side === "away" ? 1 : 0);
  if (isGoal) {
    update.homeScore = homeScore;
    update.awayScore = awayScore;
    update[side === "home" ? "homeShots" : "awayShots"] = match[side === "home" ? "homeShots" : "awayShots"] + 1;
    update[side === "home" ? "homeShotsOnTarget" : "awayShotsOnTarget"] = match[side === "home" ? "homeShotsOnTarget" : "awayShotsOnTarget"] + 1;
  }
  if (type === "corner") update[side === "home" ? "homeCorners" : "awayCorners"] = match[side === "home" ? "homeCorners" : "awayCorners"] + 1;
  if (type === "foul") update[side === "home" ? "homeFouls" : "awayFouls"] = match[side === "home" ? "homeFouls" : "awayFouls"] + 1;
  if (type === "offside") update[side === "home" ? "homeOffsides" : "awayOffsides"] = match[side === "home" ? "homeOffsides" : "awayOffsides"] + 1;
  if (type === "yellow" || type === "red") update[side === "home" ? "homeCards" : "awayCards"] = match[side === "home" ? "homeCards" : "awayCards"] + 1;
  if (minute >= 90) {
    update.status = "finished";
    update.minute = 90;
  }
  await db.update(matches).set(update).where(eq(matches.id, match.id));

  const scoreAfter = `${homeScore}-${awayScore}`;
  const labels: Record<string, { player: string; detail: string; emoji: string }> = {
    goal: { player, detail: `Gol de ${player} para o ${teamName}`, emoji: "⚽" },
    penalty: { player, detail: `Pênalti convertido por ${player} (${teamName})`, emoji: "🥅" },
    corner: { player, detail: `Escanteio para o ${teamName}`, emoji: "🚩" },
    foul: { player, detail: `Falta cometida por ${player} (${teamName})`, emoji: "✋" },
    offside: { player, detail: `${player} impedido — ${teamName}`, emoji: "🚫" },
    yellow: { player, detail: `Cartão amarelo para ${player} (${teamName})`, emoji: "🟨" },
    red: { player, detail: `Cartão vermelho para ${player} (${teamName})`, emoji: "🟥" },
    var: { player, detail: `VAR revisa lance do ${teamName}`, emoji: "📺" },
  };
  const info = labels[type];
  await db.insert(matchEvents).values({
    matchId: match.id,
    minute: update.minute as number,
    type,
    side,
    player,
    detail: info.detail,
    scoreAfter: isGoal ? scoreAfter : "",
  });
  if (minute >= 90) {
    await db.insert(matchEvents).values({
      matchId: match.id,
      minute: 90,
      type: "end",
      side: "neutral",
      detail: `Fim de jogo: ${homeT?.name} ${homeScore} x ${awayScore} ${awayT?.name}`,
      scoreAfter,
    });
  }

  const favRows = (
    await db
      .select({ userId: favorites.userId, prefs: users.alertPrefs })
      .from(favorites)
      .innerJoin(users, eq(favorites.userId, users.id))
      .where(eq(favorites.teamId, teamId))
  ).filter((f) => wantsAlert(f.prefs, minute >= 90 ? "end" : type));
  if (favRows.length) {
    enviarParaUsuarios(favRows.map((f) => f.userId), `${info.emoji} ${info.detail}`, `${homeT?.shortName} ${homeScore} x ${awayScore} ${awayT?.shortName} · ${update.minute}'`, { url: `/jogos/${match.id}`, tag: `match-${match.id}`, type });
    await db.insert(notifications).values(
      favRows.map((f) => ({
        userId: f.userId,
        matchId: match.id,
        teamId,
        type,
        title: `${info.emoji} ${info.detail}`,
        body: `${homeT?.shortName} ${homeScore} x ${awayScore} ${awayT?.shortName} · ${update.minute}'${minute >= 90 ? " · Fim de jogo" : ""}`,
      })),
    );
  }
  revalidateAll();
  redirect(redirectTo);
}

export async function updateLineupAction(formData: FormData) {
  const admin = await getSessionUser();
  if (!admin || admin.role !== "admin") redirect("/login");
  const teamId = Number(formData.get("teamId"));
  const formation = String(formData.get("formation") ?? "4-3-3");
  const raw = String(formData.get("players") ?? "");
  const names = raw.split("\n").map((line) => line.trim()).filter(Boolean);
  const players = names.map((line, i) => {
    const [name, pos, rating] = line.split("|").map((p) => p.trim());
    return { name, number: i + 1, pos: pos || "MEI", rating: rating || "7.0", status: "Titular" };
  });
  const [existing] = await db.select().from(lineups).where(eq(lineups.teamId, teamId)).limit(1);
  if (existing) {
    await db.update(lineups).set({ formation, players, updatedAt: new Date(), source: "Escalação atualizada pelo proprietário" }).where(eq(lineups.id, existing.id));
  } else {
    await db.insert(lineups).values({ teamId, formation, players, source: "Escalação cadastrada pelo proprietário" });
  }
  revalidateAll();
  redirect("/admin/jogos?escalacao=1");
}

export async function saveAlertPrefsAction(formData: FormData) {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/notificacoes");
  const prefs: Record<string, boolean> = {};
  for (const option of ALERT_OPTIONS) prefs[option.key] = formData.get(option.key) === "on";
  prefs.sound = formData.get("sound") === "on";
  await db.update(users).set({ alertPrefs: prefs }).where(eq(users.id, user.id));
  revalidatePath("/notificacoes");
  revalidatePath("/conta");
  redirect("/notificacoes?prefs=1");
}

export async function syncNowAction(formData: FormData) {
  const redirectTo = String(formData.get("redirectTo") ?? "/jogos");
  const { syncEspn } = await import("@/lib/espn");
  const report = await syncEspn(true);
  revalidateAll();
  redirect(`${redirectTo}${redirectTo.includes("?") ? "&" : "?"}sync=${report.ok ? "ok" : "erro"}`);
}

export async function syncPlayersAction(formData: FormData) {
  const admin = await getSessionUser();
  if (!admin || admin.role !== "admin") redirect("/login?next=/admin/jogos");
  const league = String(formData.get("liga") ?? "bra.1");
  const { syncLeaguePlayers } = await import("@/lib/players");
  const result = await syncLeaguePlayers(league, true);
  revalidatePath("/jogadores");
  revalidatePath("/admin/jogos");
  redirect(`/admin/jogos?jogadores=${encodeURIComponent(result.message)}`);
}

export async function runBacktestAction(formData: FormData) {
  const admin = await getSessionUser();
  if (!admin || admin.role !== "admin") redirect("/login?next=/ia/desempenho");
  const league = String(formData.get("liga") ?? "bra.1");
  const { runBacktest } = await import("@/lib/predict");
  try {
    const result = await runBacktest(league);
    revalidatePath("/ia/desempenho");
    redirect(`/ia/desempenho?ok=${encodeURIComponent(result ? `${league} · ${result.n} jogos · Brier ${result.brier.toFixed(4)} vs ${result.baseline.brier.toFixed(4)}` : `${league}: histórico insuficiente`)}`);
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    redirect(`/ia/desempenho?erro=${encodeURIComponent(error instanceof Error ? error.message : "falha")}`);
  }
}

export async function registerVisitAction(path: string) {
  const user = await getSessionUser();
  await logAccess(user?.id ?? null, path);
}
