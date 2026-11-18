"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { and, eq, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { fraudAlerts, sessions, userProfiles, users } from "@/db/schema";
import { checkCode, createSession, destroySession, getCurrentUser, getIp, hashPassword, issueCode, showDevCodes, verifyPassword } from "@/lib/auth";
import { attributeReferral, ensureReferralCode, onPhoneVerified } from "@/lib/rewards";
import { deliverExternal } from "@/lib/notify";
import { rateLimit } from "@/lib/ratelimit";
import { isValidPhone, normalizePhone } from "@/lib/format";
import { safe, str } from "@/lib/action";
import { isStaff } from "@/lib/permissions";
import type { FormState } from "@/components/ActionForm";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function signupAction(_: FormState, fd: FormData): Promise<FormState> {
  return safe(async () => {
    const ip = await getIp();
    if (str(fd, "website")) throw new Error("Inscription refusée."); // honeypot anti-robot
    const elapsed = Date.now() - Number(str(fd, "t") || 0);
    if (!(elapsed > 2500)) throw new Error("Veuillez patienter quelques secondes avant de valider le formulaire.");
    if (!rateLimit(`signup:${ip}`, 5, 3600_000)) throw new Error("Trop de tentatives. Réessayez plus tard.");

    const firstName = str(fd, "firstName");
    const lastName = str(fd, "lastName");
    const country = str(fd, "country");
    const city = str(fd, "city");
    const email = str(fd, "email").toLowerCase();
    const phone = normalizePhone(str(fd, "phone"));
    const password = String(fd.get("password") ?? "");
    if (!firstName || !lastName || !country || !city) throw new Error("Tous les champs sont obligatoires.");
    if (!EMAIL_RE.test(email)) throw new Error("Adresse e-mail invalide.");
    if (!isValidPhone(phone)) throw new Error("Numéro de téléphone invalide (ex. +237 6XX XX XX XX).");
    if (password.length < 8) throw new Error("Le mot de passe doit contenir au moins 8 caractères.");
    if (password !== String(fd.get("confirm") ?? "")) throw new Error("Les mots de passe ne correspondent pas.");
    if (fd.get("terms") !== "on") throw new Error("Vous devez accepter les conditions générales.");

    const dup = await db.select({ id: users.id }).from(users).where(or(eq(users.email, email), eq(users.phone, phone)));
    if (dup.length) throw new Error("Un compte existe déjà avec cet e-mail ou ce numéro de téléphone.");

    const h = (await import("next/headers")).headers;
    const ua = (await h()).get("user-agent")?.slice(0, 300) ?? null;
    const [u] = await db.insert(users).values({ email, phone, passwordHash: await hashPassword(password) }).returning();
    await db.insert(userProfiles).values({ userId: u.id, firstName, lastName, country, city, signupIp: ip, signupUserAgent: ua });
    await ensureReferralCode(u.id);

    // Détection de comptes en doublon (même identité, même IP)
    if (ip !== "unknown") {
      const same = await db
        .select({ userId: userProfiles.userId })
        .from(userProfiles)
        .where(and(eq(userProfiles.signupIp, ip), sql`lower(${userProfiles.firstName}) = ${firstName.toLowerCase()}`, sql`lower(${userProfiles.lastName}) = ${lastName.toLowerCase()}`, sql`${userProfiles.userId} <> ${u.id}`));
      if (same.length) await db.insert(fraudAlerts).values({ userId: u.id, relatedUserId: same[0].userId, kind: "duplicate_account", severity: "medium", details: "Même nom, prénom et adresse IP qu'un compte existant." });
    }

    const jar = await cookies();
    const ref = str(fd, "ref") || jar.get("hf_ref")?.value || "";
    if (ref) await attributeReferral(u.id, ref, ip);

    await createSession(u.id);
    redirect("/compte/verification");
  });
}

export async function loginAction(_: FormState, fd: FormData): Promise<FormState> {
  return safe(async () => {
    const ip = await getIp();
    const identifier = str(fd, "identifier").toLowerCase();
    if (!rateLimit(`login:${ip}`, 15, 15 * 60_000) || !rateLimit(`login:${identifier}`, 8, 15 * 60_000)) throw new Error("Trop de tentatives de connexion. Réessayez dans quelques minutes.");
    const phone = normalizePhone(identifier);
    const [u] = await db.select().from(users).where(or(eq(users.email, identifier), eq(users.phone, phone)));
    const ok = u ? await verifyPassword(String(fd.get("password") ?? ""), u.passwordHash) : false;
    if (!u || !ok) throw new Error("Identifiants incorrects.");
    if (u.status === "blocked") throw new Error("Ce compte est bloqué. Contactez l'établissement.");
    await createSession(u.id);
    const next = str(fd, "next");
    redirect(next.startsWith("/") && !next.startsWith("//") ? next : isStaff(u.role) ? "/admin" : "/compte");
  });
}

export async function logoutAction() {
  await destroySession();
  redirect("/");
}

export async function sendCodeAction(_: FormState, fd: FormData): Promise<FormState> {
  return safe(async () => {
    const user = await getCurrentUser();
    if (!user) throw new Error("Session expirée.");
    const purpose = str(fd, "purpose") === "email" ? "email" : "phone";
    if (!rateLimit(`code:${user.id}:${purpose}`, 4, 3600_000)) throw new Error("Trop de demandes de code. Réessayez plus tard.");
    if (purpose === "phone" && user.phoneVerifiedAt) throw new Error("Téléphone déjà vérifié.");
    if (purpose === "email" && user.emailVerifiedAt) throw new Error("E-mail déjà vérifié.");
    const code = await issueCode(user.id, purpose);
    const msg = `Herman FASHION : votre code de vérification est ${code}. Il expire dans 15 minutes.`;
    const sent = await deliverExternal(purpose === "phone" ? "sms" : "email", purpose === "phone" ? user.phone : user.email, "Code de vérification Herman FASHION", msg);
    if (sent) return `Un code a été envoyé à ${purpose === "phone" ? user.phone : user.email}.`;
    if (showDevCodes()) return { info: `Mode démonstration (aucun fournisseur SMS/e-mail configuré) — votre code est : ${code}` };
    throw new Error("Le service d'envoi de codes n'est pas encore configuré. Contactez l'établissement.");
  });
}

export async function verifyCodeAction(_: FormState, fd: FormData): Promise<FormState> {
  return safe(async () => {
    const user = await getCurrentUser();
    if (!user) throw new Error("Session expirée.");
    const purpose = str(fd, "purpose") === "email" ? "email" : "phone";
    if (!(await checkCode(user.id, purpose, str(fd, "code")))) throw new Error("Code invalide ou expiré.");
    if (purpose === "phone") {
      await db.update(users).set({ phoneVerifiedAt: new Date() }).where(eq(users.id, user.id));
      await onPhoneVerified(user.id);
      return "Téléphone vérifié avec succès.";
    }
    await db.update(users).set({ emailVerifiedAt: new Date() }).where(eq(users.id, user.id));
    return "E-mail vérifié avec succès.";
  });
}

export async function updateProfileAction(_: FormState, fd: FormData): Promise<FormState> {
  return safe(async () => {
    const user = await getCurrentUser();
    if (!user) throw new Error("Session expirée.");
    const firstName = str(fd, "firstName");
    const lastName = str(fd, "lastName");
    const country = str(fd, "country");
    const city = str(fd, "city");
    if (!firstName || !lastName || !country || !city) throw new Error("Tous les champs sont obligatoires.");
    await db.update(userProfiles).set({ firstName, lastName, country, city }).where(eq(userProfiles.userId, user.id));
    return "Profil mis à jour.";
  });
}

export async function changePasswordAction(_: FormState, fd: FormData): Promise<FormState> {
  return safe(async () => {
    const user = await getCurrentUser();
    if (!user) throw new Error("Session expirée.");
    const [u] = await db.select().from(users).where(eq(users.id, user.id));
    if (!(await verifyPassword(String(fd.get("current") ?? ""), u.passwordHash))) throw new Error("Mot de passe actuel incorrect.");
    const pw = String(fd.get("password") ?? "");
    if (pw.length < 8 || pw !== String(fd.get("confirm") ?? "")) throw new Error("Nouveau mot de passe invalide ou non confirmé (8 caractères minimum).");
    await db.update(users).set({ passwordHash: await hashPassword(pw) }).where(eq(users.id, user.id));
    return "Mot de passe modifié.";
  });
}

export async function requestResetAction(_: FormState, fd: FormData): Promise<FormState> {
  return safe(async () => {
    const ip = await getIp();
    const identifier = str(fd, "identifier").toLowerCase();
    if (!rateLimit(`reset:${ip}`, 5, 3600_000)) throw new Error("Trop de demandes. Réessayez plus tard.");
    const [u] = await db.select().from(users).where(or(eq(users.email, identifier), eq(users.phone, normalizePhone(identifier))));
    const generic = "Si un compte correspond, un code de réinitialisation vient d'être envoyé.";
    if (!u) return generic;
    const code = await issueCode(u.id, "reset");
    const msg = `Herman FASHION : code de réinitialisation du mot de passe ${code} (valable 15 minutes).`;
    const sent = (await deliverExternal("email", u.email, "Réinitialisation du mot de passe", msg)) || (await deliverExternal("sms", u.phone, "Réinitialisation", msg));
    if (!sent && showDevCodes()) return { info: `Mode démonstration (aucun fournisseur d'envoi configuré) — code : ${code}` };
    return generic;
  });
}

export async function resetPasswordAction(_: FormState, fd: FormData): Promise<FormState> {
  return safe(async () => {
    const ip = await getIp();
    if (!rateLimit(`resetpw:${ip}`, 10, 3600_000)) throw new Error("Trop de tentatives.");
    const identifier = str(fd, "identifier").toLowerCase();
    const [u] = await db.select().from(users).where(or(eq(users.email, identifier), eq(users.phone, normalizePhone(identifier))));
    const pw = String(fd.get("password") ?? "");
    if (pw.length < 8 || pw !== String(fd.get("confirm") ?? "")) throw new Error("Mot de passe invalide ou non confirmé (8 caractères minimum).");
    if (!u || !(await checkCode(u.id, "reset", str(fd, "code")))) throw new Error("Code invalide ou expiré.");
    await db.update(users).set({ passwordHash: await hashPassword(pw) }).where(eq(users.id, u.id));
    await db.delete(sessions).where(eq(sessions.userId, u.id));
    redirect("/connexion?reset=1");
  });
}
