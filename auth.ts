import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies, headers } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { accessLogs, sessions, users } from "@/db/schema";

export const SESSION_COOKIE = "gs_session";
const TRIAL_HOURS = 24;

export type SessionUser = typeof users.$inferSelect;

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const candidate = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  if (candidate.length !== expected.length) return false;
  return timingSafeEqual(candidate, expected);
}

export function isGmail(email: string) {
  return /@gmail\.com$/i.test(email.trim());
}

/**
 * Cadastro com Gmail ganha 1 dia (24h) grátis de acesso completo.
 * Outros domínios ganham 6h de teste antes de precisar do plano VIP.
 */
export function trialExpiryFor(email: string): { expiresAt: Date; source: string } {
  const hours = isGmail(email) ? TRIAL_HOURS : 6;
  return {
    expiresAt: new Date(Date.now() + hours * 60 * 60 * 1000),
    source: isGmail(email) ? "gmail-trial" : "email-trial",
  };
}

export function accessInfo(user: Pick<SessionUser, "accessExpiresAt" | "plan" | "role">) {
  const expires = new Date(user.accessExpiresAt).getTime();
  const diffMs = expires - Date.now();
  const daysLeft = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  const hoursLeft = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60)));
  const active = diffMs > 0 || user.role === "admin";
  return {
    active,
    daysLeft,
    hoursLeft,
    expiresAt: user.accessExpiresAt,
    plan: user.role === "admin" ? "owner" : user.plan,
    label: user.role === "admin" ? "Acesso de proprietário" : active ? (user.plan === "free" ? "Teste grátis" : "VIP ativo") : "Acesso expirado",
  };
}

export async function createSession(userId: number) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);
  const agent = (await headers()).get("user-agent") ?? "desconhecido";
  await db.insert(sessions).values({ token, userId, expiresAt, userAgent: agent });
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
  return token;
}

export async function destroySession() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    await db.delete(sessions).where(eq(sessions.token, token));
  }
  store.delete(SESSION_COOKIE);
}

export async function getSessionUser(): Promise<SessionUser | null> {
  try {
    const store = await cookies();
    const token = store.get(SESSION_COOKIE)?.value;
    if (!token) return null;
    const rows = await db
      .select({ user: users })
      .from(sessions)
      .innerJoin(users, eq(sessions.userId, users.id))
      .where(eq(sessions.token, token))
      .limit(1);
    const session = rows[0];
    if (!session) return null;
    if (session.user.role !== "admin" && new Date(session.user.accessExpiresAt).getTime() < Date.now()) {
      return { ...session.user, plan: session.user.plan };
    }
    return session.user;
  } catch {
    return null;
  }
}

export async function logAccess(userId: number | null, path: string) {
  try {
    const agent = (await headers()).get("user-agent") ?? null;
    await db.insert(accessLogs).values({ userId, path, userAgent: agent });
  } catch {
    // logging must never break a page
  }
}

export async function requireUser() {
  const user = await getSessionUser();
  if (!user) return null;
  return user;
}

export async function touchLastSeen(userId: number) {
  try {
    await db.update(users).set({ lastSeenAt: new Date() }).where(eq(users.id, userId));
  } catch {
    /* noop */
  }
}
