"use server";

import { redirect } from "next/navigation";
import { and, eq, inArray, ne } from "drizzle-orm";
import { db } from "@/db";
import { applicationItems, applications, centers, notifications, orders, payments, trainingDurations, trainingPrices, trainingPrograms } from "@/db/schema";
import { getCurrentUser, requireUser } from "@/lib/auth";
import { createOrder, submitApplication } from "@/lib/payments";
import { requestWithdrawal } from "@/lib/rewards";
import { getSettings } from "@/lib/settings";
import { rateLimit } from "@/lib/ratelimit";
import { isValidPhone, normalizePhone } from "@/lib/format";
import { num, safe, str } from "@/lib/action";
import type { FormState } from "@/components/ActionForm";

export async function saveApplicationAction(_: FormState, fd: FormData): Promise<FormState> {
  return safe(async () => {
    const user = await requireUser();
    const centerId = str(fd, "centerId");
    let raw: { programId: string; durationId: string }[] = [];
    try {
      raw = JSON.parse(str(fd, "items"));
    } catch {
      throw new Error("Sélection invalide.");
    }
    if (!Array.isArray(raw) || !raw.length) throw new Error("Sélectionnez au moins une formation.");
    if (new Set(raw.map((r) => r.programId)).size !== raw.length) throw new Error("Une formation ne peut être sélectionnée qu'une fois.");
    const [center] = await db.select().from(centers).where(and(eq(centers.id, centerId), eq(centers.isActive, true)));
    if (!center) throw new Error("Choisissez un centre.");

    // Tarifs relus côté serveur (jamais pris du client)
    const resolved: { prog: typeof trainingPrograms.$inferSelect; dur: typeof trainingDurations.$inferSelect; price: typeof trainingPrices.$inferSelect }[] = [];
    for (const r of raw) {
      const [row] = await db
        .select({ prog: trainingPrograms, dur: trainingDurations, price: trainingPrices })
        .from(trainingDurations)
        .innerJoin(trainingPrograms, eq(trainingPrograms.id, trainingDurations.programId))
        .innerJoin(trainingPrices, eq(trainingPrices.durationId, trainingDurations.id))
        .where(and(eq(trainingDurations.id, r.durationId), eq(trainingPrograms.id, r.programId), eq(trainingDurations.isActive, true), eq(trainingPrograms.isActive, true)));
      if (!row) throw new Error("Formation ou durée indisponible.");
      resolved.push(row);
    }

    const appId = str(fd, "applicationId");
    // Prévention des doubles inscriptions à la même formation
    const others = await db
      .select({ programId: applicationItems.programId, appId: applications.id })
      .from(applicationItems)
      .innerJoin(applications, eq(applications.id, applicationItems.applicationId))
      .where(and(eq(applications.userId, user.id), ne(applications.status, "cancelled"), appId ? ne(applications.id, appId) : undefined));
    const dup = resolved.find((r) => others.some((o) => o.programId === r.prog.id));
    if (dup) throw new Error(`Vous avez déjà une inscription en cours pour « ${dup.prog.title} ».`);

    let id = appId;
    if (id) {
      const [a] = await db.select().from(applications).where(and(eq(applications.id, id), eq(applications.userId, user.id)));
      if (!a || !["draft", "needs_review", "pending_payment"].includes(a.status)) throw new Error("Cette candidature ne peut plus être modifiée.");
      const [o] = await db.select().from(orders).where(eq(orders.applicationId, id));
      if (o && o.paidAmount > 0) throw new Error("Une candidature déjà payée ne peut plus être modifiée.");
    }
    await db.transaction(async (tx) => {
      if (!id) {
        const [a] = await tx.insert(applications).values({ userId: user.id, centerId }).returning();
        id = a.id;
      } else {
        await tx.update(applications).set({ centerId, status: "draft", approvedTotal: null, updatedAt: new Date() }).where(eq(applications.id, id));
        await tx.delete(applicationItems).where(eq(applicationItems.applicationId, id));
      }
      await tx.insert(applicationItems).values(resolved.map((r) => ({ applicationId: id, programId: r.prog.id, durationId: r.dur.id, tuitionFee: r.price.tuitionFee, enrollmentFee: r.price.enrollmentFee, installments: r.price.installments })));
    });
    await submitApplication(user.id, id);
    redirect(`/compte/inscriptions/${id}`);
  });
}

export async function startPaymentAction(_: FormState, fd: FormData): Promise<FormState> {
  return safe(async () => {
    const user = await requireUser();
    if (!rateLimit(`pay:${user.id}`, 10, 3600_000)) throw new Error("Trop de tentatives de paiement. Réessayez plus tard.");
    if (!user.phoneVerifiedAt) throw new Error("Vérifiez votre numéro de téléphone avant de payer (menu Vérification).");
    if (user.status !== "active") throw new Error("Votre compte est suspendu. Contactez l'établissement.");
    const order = await createOrder(user.id, str(fd, "applicationId"));
    const s = await getSettings();
    const url = new URL(s["payments.chariow_url"]);
    url.searchParams.set("hf_ref", order.reference);
    redirect(url.toString());
  });
}

export async function cancelApplicationAction(_: FormState, fd: FormData): Promise<FormState> {
  return safe(async () => {
    const user = await requireUser();
    const id = str(fd, "applicationId");
    const [a] = await db.select().from(applications).where(and(eq(applications.id, id), eq(applications.userId, user.id)));
    if (!a || !["draft", "needs_review", "pending_payment"].includes(a.status)) throw new Error("Annulation impossible.");
    const [o] = await db.select().from(orders).where(eq(orders.applicationId, id));
    if (o) {
      const pays = await db.select({ id: payments.id }).from(payments).where(and(eq(payments.orderId, o.id), inArray(payments.status, ["confirmed", "to_verify"])));
      if (pays.length) throw new Error("Des paiements existent : contactez l'établissement.");
    }
    await db.update(applications).set({ status: "cancelled", updatedAt: new Date() }).where(eq(applications.id, id));
    redirect("/compte/inscriptions");
  });
}

export async function requestWithdrawalAction(_: FormState, fd: FormData): Promise<FormState> {
  return safe(async () => {
    const user = await requireUser();
    if (!rateLimit(`wd:${user.id}`, 5, 3600_000)) throw new Error("Trop de demandes. Réessayez plus tard.");
    const phone = normalizePhone(str(fd, "phone"));
    if (!isValidPhone(phone)) throw new Error("Numéro de bénéficiaire invalide.");
    const name = str(fd, "beneficiaryName");
    if (name.length < 3) throw new Error("Nom du bénéficiaire requis.");
    await requestWithdrawal(user.id, { beneficiaryName: name, phone, operator: str(fd, "operator"), amount: num(fd, "amount") });
    return "Demande de retrait enregistrée. Elle sera validée par un gestionnaire financier.";
  });
}

export async function markNotificationsReadAction() {
  const user = await getCurrentUser();
  if (!user) return;
  await db.update(notifications).set({ readAt: new Date() }).where(and(eq(notifications.userId, user.id), eq(notifications.channel, "internal")));
  const { revalidatePath } = await import("next/cache");
  revalidatePath("/compte", "layout");
}
