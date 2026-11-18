import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { applicationItems, applications, orders, paymentWebhooks, payments, receipts, userProfiles, users } from "@/db/schema";
import { getSettings } from "@/lib/settings";
import { notify } from "@/lib/notify";
import { fcfa } from "@/lib/format";
import { onPaymentConfirmed, onPaymentRefunded } from "@/lib/rewards";

import { computeTotal } from "@/lib/pricing";
export { computeTotal };

export async function submitApplication(userId: string, applicationId: string) {
  const [app] = await db.select().from(applications).where(and(eq(applications.id, applicationId), eq(applications.userId, userId)));
  if (!app) throw new Error("Candidature introuvable.");
  if (!["draft", "needs_review", "pending_payment"].includes(app.status)) throw new Error("Cette candidature ne peut plus être modifiée.");
  const items = await db.select().from(applicationItems).where(eq(applicationItems.applicationId, app.id));
  if (!items.length) throw new Error("Sélectionnez au moins une formation.");
  const s = await getSettings();
  const total = computeTotal(items, items.length > 1 ? s["pricing.multi_rule"] : "sum_all");
  const needsReview = items.length > 1 && s["pricing.multi_rule"] === "undefined";
  await db
    .update(applications)
    .set({ status: needsReview ? "needs_review" : "pending_payment", indicativeTotal: total, approvedTotal: needsReview ? null : total, updatedAt: new Date() })
    .where(eq(applications.id, app.id));
  return needsReview ? "needs_review" : "pending_payment";
}

/** Une seule commande par candidature (contrainte d'unicité) : aucun doublon possible. */
export async function createOrder(userId: string, applicationId: string) {
  const [app] = await db.select().from(applications).where(and(eq(applications.id, applicationId), eq(applications.userId, userId)));
  if (!app) throw new Error("Candidature introuvable.");
  if (app.status !== "pending_payment" && app.status !== "confirmed") throw new Error("La candidature doit d'abord être validée avant le paiement.");
  if (!app.approvedTotal || app.approvedTotal <= 0) throw new Error("Montant à payer non défini.");
  const reference = `HF-${new Date().getFullYear()}-${randomBytes(3).toString("hex").toUpperCase()}`;
  await db.insert(orders).values({ reference, applicationId: app.id, userId, amount: app.approvedTotal }).onConflictDoNothing();
  const [order] = await db.select().from(orders).where(eq(orders.applicationId, app.id));
  if (order.status === "failed") await db.update(orders).set({ status: "pending" }).where(eq(orders.id, order.id));
  await db.update(orders).set({ redirectedAt: new Date() }).where(eq(orders.id, order.id));
  return order;
}

function receiptNumber() {
  const d = new Date();
  return `HF-R-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}-${randomBytes(3).toString("hex").toUpperCase()}`;
}

export async function recordPayment(o: {
  orderId: string;
  provider: string;
  providerTransactionId: string;
  amount: number;
  status: "confirmed" | "to_verify" | "failed";
  method?: string;
  source: "webhook" | "manual";
  verifiedBy?: string;
  note?: string;
}): Promise<"created" | "duplicate"> {
  const result = await db.transaction(async (tx) => {
    const [order] = await tx.select().from(orders).where(eq(orders.id, o.orderId)).for("update");
    if (!order) throw new Error("Commande introuvable.");
    const [prior] = await tx.select({ n: sql<number>`count(*)` }).from(payments).where(and(eq(payments.orderId, order.id), eq(payments.status, "confirmed")));
    const inserted = await tx
      .insert(payments)
      .values({
        orderId: order.id,
        userId: order.userId,
        provider: o.provider,
        providerTransactionId: o.providerTransactionId,
        amount: o.amount,
        installmentNo: Number(prior?.n ?? 0) + 1,
        status: o.status,
        method: o.method,
        source: o.source,
        verifiedBy: o.verifiedBy,
        note: o.note,
      })
      .onConflictDoNothing()
      .returning();
    if (!inserted.length) return null; // transaction déjà enregistrée
    const pay = inserted[0];
    if (o.status === "confirmed") {
      const paid = order.paidAmount + o.amount;
      await tx.update(orders).set({ paidAmount: paid, status: paid >= order.amount ? "confirmed" : "pending" }).where(eq(orders.id, order.id));
      await tx.update(applications).set({ status: "confirmed", updatedAt: new Date() }).where(eq(applications.id, order.applicationId));
      await tx.insert(receipts).values({ number: receiptNumber(), paymentId: pay.id, orderId: order.id, userId: order.userId, amount: o.amount });
    } else if (o.status === "to_verify") {
      await tx.update(orders).set({ status: order.paidAmount > 0 ? order.status : "to_verify" }).where(eq(orders.id, order.id));
    } else if (o.status === "failed" && order.paidAmount === 0) {
      await tx.update(orders).set({ status: "failed" }).where(eq(orders.id, order.id));
    }
    return order;
  });
  if (!result) return "duplicate";
  if (o.status === "confirmed") {
    await notify({ userId: result.userId, type: "payment_confirmed", title: "Paiement confirmé", body: `Votre paiement de ${fcfa(o.amount)} (commande ${result.reference}) a été vérifié. Votre reçu est disponible.`, dedupeKey: `payment_confirmed:${o.provider}:${o.providerTransactionId}`, external: true });
    await onPaymentConfirmed(result.id);
  } else if (o.status === "failed") {
    await notify({ userId: result.userId, type: "payment_failed", title: "Paiement échoué", body: `Le paiement de la commande ${result.reference} a échoué. Vous pouvez réessayer.`, dedupeKey: `payment_failed:${o.provider}:${o.providerTransactionId}` });
  }
  return "created";
}

export async function refundPayment(paymentId: string, actorId: string) {
  const [pay] = await db.select().from(payments).where(eq(payments.id, paymentId));
  if (!pay || pay.status !== "confirmed") throw new Error("Seul un paiement confirmé peut être remboursé.");
  await db.transaction(async (tx) => {
    const [order] = await tx.select().from(orders).where(eq(orders.id, pay.orderId)).for("update");
    const paid = Math.max(0, order.paidAmount - pay.amount);
    await tx.update(payments).set({ status: "refunded", verifiedBy: actorId }).where(eq(payments.id, pay.id));
    await tx.update(orders).set({ paidAmount: paid, status: paid === 0 ? "refunded" : "pending" }).where(eq(orders.id, order.id));
  });
  await onPaymentRefunded(pay.orderId, actorId);
}

/* ───────────────────────── Webhook Chariow (Pulse) ───────────────────────── */
export function verifyChariowSignature(rawBody: string, header: string | null, secret: string) {
  if (!header || !header.startsWith("sha256=")) return false;
  const expected = createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
  const got = header.slice(7).trim().toLowerCase();
  const a = Buffer.from(expected);
  const b = Buffer.from(got);
  return a.length === b.length && timingSafeEqual(a, b);
}

function findAmount(obj: unknown, depth = 0): number | null {
  if (!obj || typeof obj !== "object" || depth > 4) return null;
  const rec = obj as Record<string, unknown>;
  for (const k of ["amount", "total", "price", "total_amount"]) {
    const v = rec[k];
    if (typeof v === "number" && v > 0) return Math.round(v);
    if (typeof v === "string" && /^\d+(\.\d+)?$/.test(v) && Number(v) > 0) return Math.round(Number(v));
    if (v && typeof v === "object") {
      const inner = (v as Record<string, unknown>).value ?? (v as Record<string, unknown>).amount;
      if (typeof inner === "number" && inner > 0) return Math.round(inner);
    }
  }
  for (const v of Object.values(rec)) {
    const r = findAmount(v, depth + 1);
    if (r) return r;
  }
  return null;
}

function findString(obj: unknown, keys: string[], depth = 0): string | null {
  if (!obj || typeof obj !== "object" || depth > 4) return null;
  const rec = obj as Record<string, unknown>;
  for (const k of keys) if (typeof rec[k] === "string" && rec[k]) return rec[k] as string;
  for (const v of Object.values(rec)) {
    const r = findString(v, keys, depth + 1);
    if (r) return r;
  }
  return null;
}

export async function processChariowWebhook(rawBody: string, headers: Headers): Promise<{ status: number; message: string }> {
  const secret = process.env.CHARIOW_WEBHOOK_SECRET;
  if (!secret) return { status: 503, message: "Webhook non configuré (CHARIOW_WEBHOOK_SECRET manquant)." };
  const deliveryId = headers.get("x-pulse-delivery-id") ?? "";
  const valid = verifyChariowSignature(rawBody, headers.get("x-chariow-signature"), secret);
  let payload: unknown = null;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    /* ignoré */
  }
  if (!valid || !deliveryId) {
    if (deliveryId) await db.insert(paymentWebhooks).values({ provider: "chariow", deliveryId: `invalid:${deliveryId}:${randomBytes(4).toString("hex")}`, event: headers.get("x-pulse-event"), signatureValid: false, payload: null, result: "signature invalide" }).onConflictDoNothing();
    return { status: 401, message: "Signature invalide." };
  }
  const event = headers.get("x-pulse-event") ?? findString(payload, ["event"]) ?? "";
  const dup = await db.insert(paymentWebhooks).values({ provider: "chariow", deliveryId, event, signatureValid: true, payload: payload as never }).onConflictDoNothing().returning();
  if (!dup.length) return { status: 200, message: "Déjà traité." };
  const setResult = (r: string) => db.update(paymentWebhooks).set({ result: r }).where(and(eq(paymentWebhooks.provider, "chariow"), eq(paymentWebhooks.deliveryId, deliveryId)));

  if (event !== "successful.sale") {
    await setResult(`événement ${event || "inconnu"} journalisé (aucune action financière)`);
    return { status: 200, message: "OK" };
  }
  const saleId = findString((payload as Record<string, unknown>)?.sale ?? payload, ["id", "sale_id"]) ?? deliveryId;
  const amount = findAmount((payload as Record<string, unknown>)?.sale ?? payload);

  // Rapprochement : référence de commande HF-… présente dans le payload, sinon e-mail / téléphone client unique.
  let order: typeof orders.$inferSelect | undefined;
  const ref = rawBody.match(/HF-\d{4}-[A-F0-9]{6}/i)?.[0]?.toUpperCase();
  if (ref) [order] = await db.select().from(orders).where(eq(orders.reference, ref));
  if (!order) {
    const email = findString((payload as Record<string, unknown>)?.customer, ["email"])?.toLowerCase();
    const phone = findString((payload as Record<string, unknown>)?.customer, ["phone", "phone_number"])?.replace(/[\s-]/g, "");
    const cands = email || phone
      ? await db.select({ id: users.id }).from(users).where(email ? eq(users.email, email) : sql`replace(${users.phone}, ' ', '') = ${phone}`)
      : [];
    if (cands.length === 1) {
      const open = await db.select().from(orders).where(and(eq(orders.userId, cands[0].id), inArray(orders.status, ["pending", "to_verify"])));
      if (open.length === 1) order = open[0];
    }
  }
  if (!order) {
    await setResult("vente signée valide mais aucune commande rapprochée — à traiter manuellement");
    return { status: 200, message: "OK" };
  }
  const res = await recordPayment({
    orderId: order.id,
    provider: "chariow",
    providerTransactionId: saleId,
    amount: amount ?? 0,
    status: amount ? "confirmed" : "to_verify",
    source: "webhook",
    note: amount ? undefined : "Montant non déterminé dans le webhook — vérification manuelle requise",
  });
  await setResult(res === "duplicate" ? "transaction déjà enregistrée" : amount ? `paiement confirmé (${order.reference})` : `à vérifier (${order.reference})`);
  return { status: 200, message: "OK" };
}

export async function ownerOf(userId: string) {
  const [p] = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId));
  return p;
}

/** Un paiement « à vérifier » est confirmé par un gestionnaire financier après contrôle de la transaction chez le prestataire. */
export async function verifyPendingPayment(paymentId: string, amount: number, actorId: string) {
  if (!Number.isInteger(amount) || amount <= 0) throw new Error("Montant invalide.");
  const orderId = await db.transaction(async (tx) => {
    const [pay] = await tx.select().from(payments).where(eq(payments.id, paymentId)).for("update");
    if (!pay || pay.status !== "to_verify") throw new Error("Ce paiement n'est pas « à vérifier ».");
    const [order] = await tx.select().from(orders).where(eq(orders.id, pay.orderId)).for("update");
    const paid = order.paidAmount + amount;
    const [prior] = await tx.select({ n: sql<number>`count(*)` }).from(payments).where(and(eq(payments.orderId, order.id), eq(payments.status, "confirmed")));
    await tx.update(payments).set({ status: "confirmed", amount, verifiedBy: actorId, installmentNo: Number(prior?.n ?? 0) + 1 }).where(eq(payments.id, pay.id));
    await tx.update(orders).set({ paidAmount: paid, status: paid >= order.amount ? "confirmed" : "pending" }).where(eq(orders.id, order.id));
    await tx.update(applications).set({ status: "confirmed", updatedAt: new Date() }).where(eq(applications.id, order.applicationId));
    await tx.insert(receipts).values({ number: receiptNumber(), paymentId: pay.id, orderId: order.id, userId: order.userId, amount });
    return order.id;
  });
  const [o] = await db.select().from(orders).where(eq(orders.id, orderId));
  await notify({ userId: o.userId, type: "payment_confirmed", title: "Paiement confirmé", body: `Votre paiement de ${fcfa(amount)} (commande ${o.reference}) a été vérifié. Votre reçu est disponible.`, dedupeKey: `payment_verified:${paymentId}`, external: true });
  await onPaymentConfirmed(orderId);
}
