import { createHash, randomBytes, randomInt, scrypt as _scrypt, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { and, desc, eq, gt, isNull } from "drizzle-orm";
import { db } from "@/db";
import { sessions, userProfiles, users, verificationCodes, adminAuditLogs } from "@/db/schema";
import { can } from "@/lib/permissions";

const scrypt = promisify(_scrypt) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>;
const COOKIE = "hf_session";
const SESSION_DAYS = 14;

export const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

export async function hashPassword(pw: string) {
  const salt = randomBytes(16);
  const key = await scrypt(pw, salt, 64);
  return `scrypt$${salt.toString("hex")}$${key.toString("hex")}`;
}

export async function verifyPassword(pw: string, stored: string) {
  const [alg, saltHex, keyHex] = stored.split("$");
  if (alg !== "scrypt" || !saltHex || !keyHex) return false;
  const key = await scrypt(pw, Buffer.from(saltHex, "hex"), 64);
  const expected = Buffer.from(keyHex, "hex");
  return key.length === expected.length && timingSafeEqual(key, expected);
}

export async function getIp() {
  const h = await headers();
  return (h.get("x-forwarded-for")?.split(",")[0] ?? h.get("x-real-ip") ?? "unknown").trim();
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("hex");
  const h = await headers();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400_000);
  await db.insert(sessions).values({
    userId,
    tokenHash: sha256(token),
    expiresAt,
    ip: await getIp(),
    userAgent: h.get("user-agent")?.slice(0, 300) ?? null,
  });
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: h.get("x-forwarded-proto") === "https",
    path: "/",
    expires: expiresAt,
  });
  await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, userId));
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) await db.delete(sessions).where(eq(sessions.tokenHash, sha256(token)));
  jar.delete(COOKIE);
}

export type SessionUser = {
  id: string;
  email: string;
  phone: string;
  role: string;
  status: string;
  emailVerifiedAt: Date | null;
  phoneVerifiedAt: Date | null;
  firstName: string;
  lastName: string;
  country: string;
  city: string;
};

export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  const [row] = await db
    .select({
      id: users.id,
      email: users.email,
      phone: users.phone,
      role: users.role,
      status: users.status,
      emailVerifiedAt: users.emailVerifiedAt,
      phoneVerifiedAt: users.phoneVerifiedAt,
      firstName: userProfiles.firstName,
      lastName: userProfiles.lastName,
      country: userProfiles.country,
      city: userProfiles.city,
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .innerJoin(userProfiles, eq(userProfiles.userId, users.id))
    .where(and(eq(sessions.tokenHash, sha256(token)), gt(sessions.expiresAt, new Date())));
  if (!row || row.status === "blocked") return null;
  return row;
});

export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/connexion");
  return user;
}

export async function requirePermission(perm: string): Promise<SessionUser> {
  const user = await requireUser();
  if (!can(user.role, perm)) redirect(can(user.role, "dashboard.view") ? "/admin" : "/compte");
  return user;
}

/** Contrôle renforcé : ressaisie du mot de passe de l'acteur pour les opérations sensibles. */
export async function confirmActorPassword(actorId: string, password: string | null | undefined) {
  if (!password) throw new Error("Mot de passe de confirmation requis pour cette opération sensible.");
  const [u] = await db.select({ h: users.passwordHash }).from(users).where(eq(users.id, actorId));
  if (!u || !(await verifyPassword(password, u.h))) throw new Error("Mot de passe de confirmation incorrect.");
}

export async function audit(actorId: string | null, action: string, entity?: string, entityId?: string, before?: unknown, after?: unknown) {
  await db.insert(adminAuditLogs).values({
    actorId,
    action,
    entity,
    entityId,
    before: (before ?? null) as never,
    after: (after ?? null) as never,
    ip: await getIp(),
  });
}

/* ───────── Codes de vérification ───────── */
export async function issueCode(userId: string, purpose: "email" | "phone" | "reset") {
  // invalide les anciens codes
  await db
    .update(verificationCodes)
    .set({ usedAt: new Date() })
    .where(and(eq(verificationCodes.userId, userId), eq(verificationCodes.purpose, purpose), isNull(verificationCodes.usedAt)));
  const code = String(randomInt(100000, 1000000));
  await db.insert(verificationCodes).values({
    userId,
    purpose,
    codeHash: sha256(`${userId}:${purpose}:${code}`),
    expiresAt: new Date(Date.now() + 15 * 60_000),
  });
  return code;
}

export async function checkCode(userId: string, purpose: "email" | "phone" | "reset", code: string) {
  const [row] = await db
    .select()
    .from(verificationCodes)
    .where(and(eq(verificationCodes.userId, userId), eq(verificationCodes.purpose, purpose), isNull(verificationCodes.usedAt), gt(verificationCodes.expiresAt, new Date())))
    .orderBy(desc(verificationCodes.createdAt))
    .limit(1);
  if (!row || row.attempts >= 5) return false;
  if (row.codeHash !== sha256(`${userId}:${purpose}:${code.trim()}`)) {
    await db.update(verificationCodes).set({ attempts: row.attempts + 1 }).where(eq(verificationCodes.id, row.id));
    return false;
  }
  await db.update(verificationCodes).set({ usedAt: new Date() }).where(eq(verificationCodes.id, row.id));
  return true;
}

export const showDevCodes = () => process.env.SHOW_DEV_CODES === "1" || process.env.NODE_ENV !== "production";
