import { randomInt } from "crypto";
import { and, count, desc, eq, gte, inArray, ne, sql, sum } from "drizzle-orm";
import { db } from "@/db";
import {
  fraudAlerts,
  orders,

  referralAttributions,
  referralCampaigns,
  referralCodes,
  referralEvents,
  rewardHolds,
  rewardTransactions,
  rewardWallets,
  userProfiles,
  users,
  withdrawalRequests,
  withdrawalTransactions,
} from "@/db/schema";
import { getSettings } from "@/lib/settings";
import { notify } from "@/lib/notify";
import { fcfa } from "@/lib/format";

export type DbTx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/* ───────────────────────── Codes de parrainage ───────────────────────── */
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function randomCode() {
  return "HF" + Array.from({ length: 6 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
}

export async function ensureReferralCode(userId: string): Promise<string> {
  const [existing] = await db.select().from(referralCodes).where(eq(referralCodes.userId, userId));
  if (existing) return existing.code;
  for (let i = 0; i < 8; i++) {
    const code = randomCode();
    const r = await db.insert(referralCodes).values({ userId, code }).onConflictDoNothing().returning();
    if (r.length) return r[0].code;
    const [again] = await db.select().from(referralCodes).where(eq(referralCodes.userId, userId));
    if (again) return again.code;
  }
  throw new Error("Impossible de générer un code de parrainage unique.");
}

/* ───────────────────────── Portefeuille & journal immuable ───────────────────────── */
async function lockWallet(tx: DbTx, userId: string) {
  await tx.insert(rewardWallets).values({ userId }).onConflictDoNothing();
  const [w] = await tx.select().from(rewardWallets).where(eq(rewardWallets.userId, userId)).for("update");
  return w;
}

export type LedgerInput = {
  userId: string;
  type: string;
  pending?: number;
  available?: number;
  withdrawn?: number;
  key?: string;
  referredUserId?: string;
  withdrawalId?: string;
  actorId?: string;
  note?: string;
};

/** Seule voie de modification d'un solde : écrit toujours une ligne de journal dans la même transaction. */
export async function postLedger(tx: DbTx, o: LedgerInput): Promise<boolean> {
  const w = await lockWallet(tx, o.userId);
  if (o.key) {
    const ex = await tx.select({ id: rewardTransactions.id }).from(rewardTransactions).where(eq(rewardTransactions.idempotencyKey, o.key));
    if (ex.length) return false;
  }
  const p = w.pending + (o.pending ?? 0);
  const a = w.available + (o.available ?? 0);
  const wd = w.withdrawn + (o.withdrawn ?? 0);
  if (p < 0 || a < 0 || wd < 0) throw new Error("Solde insuffisant pour cette opération.");
  await tx.insert(rewardTransactions).values({
    walletId: w.id,
    userId: o.userId,
    type: o.type,
    pendingDelta: o.pending ?? 0,
    availableDelta: o.available ?? 0,
    withdrawnDelta: o.withdrawn ?? 0,
    pendingAfter: p,
    availableAfter: a,
    withdrawnAfter: wd,
    idempotencyKey: o.key,
    referredUserId: o.referredUserId,
    withdrawalId: o.withdrawalId,
    actorId: o.actorId,
    note: o.note,
  });
  await tx.update(rewardWallets).set({ pending: p, available: a, withdrawn: wd, updatedAt: new Date() }).where(eq(rewardWallets.id, w.id));
  return true;
}

export async function getWallet(userId: string) {
  const [w] = await db.select().from(rewardWallets).where(eq(rewardWallets.userId, userId));
  return w ?? { pending: 0, available: 0, withdrawn: 0, id: "" };
}

/* ───────────────────────── Antifraude & attribution ───────────────────────── */
async function alert(userId: string | null, relatedUserId: string | null, kind: string, details: string, severity = "medium") {
  await db.insert(fraudAlerts).values({ userId, relatedUserId, kind, details, severity });
}

/** Attribue un filleul à son parrain (premier parrain valide, définitif). */
export async function attributeReferral(newUserId: string, rawCode: string, ip: string) {
  const code = rawCode.trim().toUpperCase();
  if (!code) return;
  const [rc] = await db.select().from(referralCodes).where(and(eq(referralCodes.code, code), eq(referralCodes.isActive, true)));
  if (!rc) return;
  if (rc.userId === newUserId) return; // auto-parrainage interdit
  const settings = await getSettings();
  const [referrer] = await db.select().from(users).where(eq(users.id, rc.userId));
  const [refProfile] = await db.select().from(userProfiles).where(eq(userProfiles.userId, rc.userId));
  const [newProfile] = await db.select().from(userProfiles).where(eq(userProfiles.userId, newUserId));
  if (!referrer || !newProfile) return;

  const reasons: string[] = [];
  if (referrer.status !== "active") reasons.push("Parrain suspendu ou bloqué");
  if (ip !== "unknown" && refProfile?.signupIp === ip) reasons.push("Même adresse IP que le parrain");
  const norm = (s?: string) => (s ?? "").trim().toLowerCase();
  if (refProfile && norm(refProfile.firstName) === norm(newProfile.firstName) && norm(refProfile.lastName) === norm(newProfile.lastName))
    reasons.push("Même identité (nom et prénom) que le parrain");
  const since = new Date(Date.now() - 24 * 3600_000);
  if (ip !== "unknown") {
    const [c] = await db.select({ n: count() }).from(referralAttributions).where(and(eq(referralAttributions.signupIp, ip), gte(referralAttributions.createdAt, since)));
    if ((c?.n ?? 0) >= settings["rewards.max_signups_per_ip_per_day"]) reasons.push("Trop d'inscriptions parrainées depuis la même adresse IP en 24 h");
  }
  const [burst] = await db.select({ n: count() }).from(referralAttributions).where(and(eq(referralAttributions.referrerId, rc.userId), gte(referralAttributions.createdAt, new Date(Date.now() - 3600_000))));
  if ((burst?.n ?? 0) >= 10) reasons.push("Rythme d'inscriptions inhabituel pour ce parrain (≥10 en 1 h)");

  const suspicious = reasons.length > 0;
  const ins = await db
    .insert(referralAttributions)
    .values({ referrerId: rc.userId, referredUserId: newUserId, code, status: suspicious ? "suspicious" : "pending", signupIp: ip })
    .onConflictDoNothing()
    .returning();
  if (!ins.length) return;
  await db.insert(referralEvents).values({ type: "signup", referrerId: rc.userId, referredUserId: newUserId, uniqueKey: `signup:${newUserId}`, meta: { suspicious, reasons } }).onConflictDoNothing();
  if (suspicious) await alert(rc.userId, newUserId, "suspicious_signup", reasons.join(" ; "), "high");
  await notify({
    userId: rc.userId,
    type: "referral_code_used",
    title: "Votre code de parrainage a été utilisé",
    body: `${newProfile.firstName} a créé un compte avec votre code. Votre bonus sera étudié dès la validation de son numéro de téléphone.`,
    dedupeKey: `code_used:${newUserId}`,
  });
}

async function campaignBlocks(referrerId: string, amount: number): Promise<string | null> {
  const now = new Date();
  const camps = await db.select().from(referralCampaigns).where(eq(referralCampaigns.isActive, true));
  for (const c of camps) {
    if ((c.startsAt && c.startsAt > now) || (c.endsAt && c.endsAt < now)) continue;
    const types = ["signup_bonus", "training_bonus", "hold"];
    if (c.budget > 0) {
      const [t] = await db.select({ s: sum(sql`${rewardTransactions.availableDelta} + ${rewardTransactions.pendingDelta}`) }).from(rewardTransactions).where(inArray(rewardTransactions.type, types));
      if (Number(t?.s ?? 0) + amount > c.budget) return `Budget de la campagne « ${c.name} » atteint`;
    }
    if (c.perReferrerCap > 0) {
      const [t] = await db.select({ s: sum(sql`${rewardTransactions.availableDelta} + ${rewardTransactions.pendingDelta}`) }).from(rewardTransactions).where(and(eq(rewardTransactions.userId, referrerId), inArray(rewardTransactions.type, types)));
      if (Number(t?.s ?? 0) + amount > c.perReferrerCap) return `Plafond par parrain de la campagne « ${c.name} » atteint`;
    }
  }
  return null;
}

/** Attribue (ou met en attente) un bonus, une seule fois par filleul et par type. */
async function awardBonus(kind: "signup" | "training", referrerId: string, referredId: string, amount: number, suffix = "") {
  if (amount <= 0) return;
  const creditKey = `${kind}_bonus:${referredId}${suffix}`;
  const holdKey = `hold:${kind}:${referredId}${suffix}`;
  const [att] = await db.select().from(referralAttributions).where(eq(referralAttributions.referredUserId, referredId));
  const [referrer] = await db.select().from(users).where(eq(users.id, referrerId));
  let reason: string | null = null;
  if (att?.status === "suspicious") reason = "Attribution suspecte — vérification requise";
  else if (referrer?.status !== "active") reason = "Compte du parrain suspendu ou bloqué";
  else reason = await campaignBlocks(referrerId, amount);

  const awarded = await db.transaction(async (tx) => {
    const lock = await lockWallet(tx, referrerId);
    void lock;
    const dup = await tx
      .select({ id: rewardTransactions.id })
      .from(rewardTransactions)
      .where(inArray(rewardTransactions.idempotencyKey, [creditKey, holdKey]));
    if (dup.length) return null;
    if (reason) {
      await tx.insert(rewardHolds).values({ referrerId, referredUserId: referredId, kind, amount, reason }).onConflictDoNothing();
      await postLedger(tx, { userId: referrerId, type: "hold", pending: amount, key: holdKey, referredUserId: referredId, note: reason });
      await tx.insert(referralEvents).values({ type: `${kind}_bonus_held`, referrerId, referredUserId: referredId, uniqueKey: `${kind}_held:${referredId}${suffix}`, meta: { amount, reason } }).onConflictDoNothing();
      return "held";
    }
    await postLedger(tx, { userId: referrerId, type: `${kind}_bonus`, available: amount, key: creditKey, referredUserId: referredId, note: `Montant appliqué au moment de l'événement : ${amount} FCFA` });
    await tx.insert(referralEvents).values({ type: `${kind}_bonus_awarded`, referrerId, referredUserId: referredId, uniqueKey: `${kind}_awarded:${referredId}${suffix}`, meta: { amount } }).onConflictDoNothing();
    return "credited";
  });
  if (awarded === "credited") {
    await notify({
      userId: referrerId,
      type: `${kind}_bonus`,
      title: kind === "signup" ? `Bonus d'inscription de ${fcfa(amount)} attribué` : `Bonus de formation de ${fcfa(amount)} attribué`,
      body: kind === "signup" ? "Votre filleul a validé son inscription. Le bonus est disponible dans votre portefeuille." : "Le paiement de votre filleul a été confirmé par le système. Le bonus est disponible dans votre portefeuille.",
      dedupeKey: `${kind}_bonus_notice:${referredId}${suffix}`,
      external: true,
    });
  }
}

/** Appelé quand le téléphone d'un utilisateur est réellement vérifié par code. */
export async function onPhoneVerified(userId: string) {
  const [att] = await db.select().from(referralAttributions).where(eq(referralAttributions.referredUserId, userId));
  if (!att || att.status === "rejected") return;
  const settings = await getSettings();
  await db.insert(referralEvents).values({ type: "phone_verified", referrerId: att.referrerId, referredUserId: userId, uniqueKey: `phone_verified:${userId}` }).onConflictDoNothing();
  if (att.status === "pending") await db.update(referralAttributions).set({ status: "validated" }).where(eq(referralAttributions.id, att.id));
  const [p] = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId));
  await notify({ userId: att.referrerId, type: "referral_validated", title: "Votre filleul a validé son inscription", body: `${p?.firstName ?? "Votre filleul"} a vérifié son numéro de téléphone.`, dedupeKey: `referee_validated:${userId}` });
  if (!settings["rewards.enabled"]) return;
  await awardBonus("signup", att.referrerId, userId, settings["rewards.signup_bonus"]);
}

/** Appelé après qu'un paiement a été confirmé côté serveur. */
export async function onPaymentConfirmed(orderId: string) {
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId));
  if (!order) return;
  const [att] = await db.select().from(referralAttributions).where(eq(referralAttributions.referredUserId, order.userId));
  if (!att || att.status === "rejected") return;
  const settings = await getSettings();
  await db.insert(referralEvents).values({ type: "payment_confirmed", referrerId: att.referrerId, referredUserId: order.userId, uniqueKey: `payment_confirmed:${order.id}:${order.paidAmount}` }).onConflictDoNothing();
  await notify({ userId: att.referrerId, type: "referral_payment", title: "Votre filleul a effectué un paiement confirmé", body: "Un paiement a été vérifié par le système pour l'un de vos filleuls.", dedupeKey: `referee_paid:${order.userId}` });
  if (!settings["rewards.enabled"]) return;
  const eligible = settings["rewards.training_trigger"] === "full_payment" ? order.paidAmount >= order.amount : order.paidAmount > 0;
  if (!eligible) return;
  const suffix = settings["rewards.training_once_per_referee"] ? "" : `:${order.id}`;
  await awardBonus("training", att.referrerId, order.userId, settings["rewards.training_bonus"], suffix);
}

/** Remboursement / annulation : applique la politique de reprise configurée, sans toucher aux montants déjà retirés. */
export async function onPaymentRefunded(orderId: string, actorId: string | null) {
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId));
  if (!order) return;
  const [att] = await db.select().from(referralAttributions).where(eq(referralAttributions.referredUserId, order.userId));
  if (!att) return;
  const settings = await getSettings();
  const [bonus] = await db.select().from(rewardTransactions).where(and(eq(rewardTransactions.referredUserId, order.userId), eq(rewardTransactions.type, "training_bonus"), eq(rewardTransactions.userId, att.referrerId)));
  const [hold] = await db.select().from(rewardHolds).where(and(eq(rewardHolds.referredUserId, order.userId), eq(rewardHolds.kind, "training"), eq(rewardHolds.status, "held")));
  if (hold) {
    await cancelHold(hold.id, actorId, "Paiement remboursé / annulé");
    return;
  }
  if (!bonus) return;
  if (settings["rewards.clawback_policy"] === "manual_review") {
    await alert(att.referrerId, order.userId, "refund_manual_review", `Paiement remboursé : le bonus de formation de ${fcfa(bonus.availableDelta)} requiert une revue manuelle.`, "high");
    return;
  }
  const done = await db.transaction(async (tx) => {
    const w = await lockWallet(tx, att.referrerId);
    const take = Math.min(w.available, bonus.availableDelta);
    if (take > 0) await postLedger(tx, { userId: att.referrerId, type: "clawback", available: -take, key: `clawback:${order.id}`, referredUserId: order.userId, actorId: actorId ?? undefined, note: "Reprise suite au remboursement du paiement du filleul" });
    return take;
  });
  if (done < bonus.availableDelta)
    await alert(att.referrerId, order.userId, "clawback_shortfall", `Reprise partielle (${fcfa(done)} sur ${fcfa(bonus.availableDelta)}) : le solde disponible est insuffisant. Procédure documentée requise ; aucun montant déjà retiré n'a été débité.`, "high");
}

export async function releaseHold(holdId: string, actorId: string, note?: string) {
  await db.transaction(async (tx) => {
    const [h] = await tx.select().from(rewardHolds).where(eq(rewardHolds.id, holdId)).for("update");
    if (!h || h.status !== "held") throw new Error("Récompense déjà traitée.");
    await postLedger(tx, { userId: h.referrerId, type: "hold_release", pending: -h.amount, available: h.amount, key: `release:${h.id}`, referredUserId: h.referredUserId, actorId, note });
    await tx.update(rewardHolds).set({ status: "released", resolvedBy: actorId, resolvedAt: new Date() }).where(eq(rewardHolds.id, h.id));
    await tx.update(referralAttributions).set({ status: "validated" }).where(and(eq(referralAttributions.referredUserId, h.referredUserId), eq(referralAttributions.status, "suspicious")));
  });
}

export async function cancelHold(holdId: string, actorId: string | null, note?: string) {
  await db.transaction(async (tx) => {
    const [h] = await tx.select().from(rewardHolds).where(eq(rewardHolds.id, holdId)).for("update");
    if (!h || h.status !== "held") throw new Error("Récompense déjà traitée.");
    await postLedger(tx, { userId: h.referrerId, type: "hold_cancel", pending: -h.amount, key: `cancel:${h.id}`, referredUserId: h.referredUserId, actorId: actorId ?? undefined, note });
    await tx.update(rewardHolds).set({ status: "cancelled", resolvedBy: actorId, resolvedAt: new Date() }).where(eq(rewardHolds.id, h.id));
  });
}

export async function adminAdjust(opts: { userId: string; bucket: "available" | "pending"; amount: number; note: string; actorId: string }) {
  if (!opts.note || opts.note.trim().length < 10) throw new Error("Une justification détaillée (10 caractères minimum) est obligatoire.");
  if (!Number.isInteger(opts.amount) || opts.amount === 0) throw new Error("Montant invalide.");
  await db.transaction(async (tx) => {
    await postLedger(tx, { userId: opts.userId, type: "admin_adjustment", [opts.bucket]: opts.amount, actorId: opts.actorId, note: opts.note.trim() });
  });
}

/* ───────────────────────── Retraits ───────────────────────── */
export async function requestWithdrawal(userId: string, input: { beneficiaryName: string; phone: string; operator: string; amount: number }) {
  const s = await getSettings();
  const [u] = await db.select().from(users).where(eq(users.id, userId));
  if (!u || u.status !== "active") throw new Error("Votre compte ne permet pas de demander un retrait pour le moment.");
  if (!u.phoneVerifiedAt) throw new Error("Vérifiez votre numéro de téléphone avant de demander un retrait.");
  if (!s["rewards.enabled"]) throw new Error("Le programme est actuellement désactivé.");
  const operators = s["withdrawal.operators"];
  if (!operators.includes(input.operator)) throw new Error("Opérateur non disponible.");
  if (!Number.isInteger(input.amount) || input.amount <= 0) throw new Error("Montant invalide.");
  if (input.amount < s["withdrawal.min"]) throw new Error(`Le montant minimum de retrait est de ${fcfa(s["withdrawal.min"])}.`);
  if (s["withdrawal.max_per_request"] > 0 && input.amount > s["withdrawal.max_per_request"]) throw new Error(`Le plafond par demande est de ${fcfa(s["withdrawal.max_per_request"])}.`);
  const fee = s["withdrawal.fee"];
  if (fee >= input.amount) throw new Error("Montant inférieur aux frais configurés.");

  const [open] = await db.select({ n: count() }).from(withdrawalRequests).where(and(eq(withdrawalRequests.userId, userId), inArray(withdrawalRequests.status, ["recorded", "pending_validation", "approved", "processing"])));
  if ((open?.n ?? 0) >= 3) throw new Error("Vous avez déjà plusieurs demandes en cours de traitement.");
  if (s["withdrawal.max_per_month"] > 0) {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const [m] = await db.select({ s: sum(withdrawalRequests.amount) }).from(withdrawalRequests).where(and(eq(withdrawalRequests.userId, userId), ne(withdrawalRequests.status, "rejected"), gte(withdrawalRequests.createdAt, monthStart)));
    if (Number(m?.s ?? 0) + input.amount > s["withdrawal.max_per_month"]) throw new Error(`Le plafond mensuel de retrait est de ${fcfa(s["withdrawal.max_per_month"])}.`);
  }

  const id = await db.transaction(async (tx) => {
    const w = await lockWallet(tx, userId);
    if (w.available < input.amount) throw new Error("Solde disponible insuffisant.");
    const [wr] = await tx
      .insert(withdrawalRequests)
      .values({ userId, walletId: w.id, beneficiaryName: input.beneficiaryName, phone: input.phone, operator: input.operator, amount: input.amount, fee, status: "pending_validation" })
      .returning();
    await tx.insert(withdrawalTransactions).values([
      { withdrawalId: wr.id, fromStatus: null, toStatus: "recorded", actorId: userId },
      { withdrawalId: wr.id, fromStatus: "recorded", toStatus: "pending_validation", actorId: userId },
    ]);
    await postLedger(tx, { userId, type: "withdrawal_request", available: -input.amount, withdrawalId: wr.id, key: `withdrawal_request:${wr.id}`, note: `${input.operator} ${input.phone}` });
    return wr.id;
  });
  await notify({ userId, type: "withdrawal_received", title: "Demande de retrait reçue", body: `Votre demande de ${fcfa(input.amount)} est enregistrée et en attente de validation.`, dedupeKey: `wd_received:${id}` });
  return id;
}

const TRANSITIONS: Record<string, string[]> = {
  recorded: ["pending_validation", "rejected"],
  pending_validation: ["approved", "rejected"],
  approved: ["processing", "rejected"],
  processing: ["paid", "rejected"],
};

export async function transitionWithdrawal(id: string, actorId: string, to: string, opts: { proof?: string; reason?: string }) {
  const result = await db.transaction(async (tx) => {
    const [wr] = await tx.select().from(withdrawalRequests).where(eq(withdrawalRequests.id, id)).for("update");
    if (!wr) throw new Error("Demande introuvable.");
    if (!(TRANSITIONS[wr.status] ?? []).includes(to)) throw new Error("Transition de statut non autorisée.");
    if (to === "paid" && (!opts.proof || opts.proof.trim().length < 4)) throw new Error("Une preuve de transaction est obligatoire pour marquer un retrait comme payé.");
    if (to === "rejected" && (!opts.reason || opts.reason.trim().length < 3)) throw new Error("Un motif de rejet est obligatoire.");
    if (to === "paid") {
      await postLedger(tx, { userId: wr.userId, type: "withdrawal_paid", withdrawn: wr.amount, withdrawalId: wr.id, key: `withdrawal_paid:${wr.id}`, actorId, note: `Preuve : ${opts.proof}` });
    }
    if (to === "rejected") {
      await postLedger(tx, { userId: wr.userId, type: "withdrawal_release", available: wr.amount, withdrawalId: wr.id, key: `withdrawal_release:${wr.id}`, actorId, note: opts.reason });
    }
    await tx
      .update(withdrawalRequests)
      .set({ status: to, reviewedBy: actorId, updatedAt: new Date(), ...(opts.proof ? { proofReference: opts.proof.trim() } : {}), ...(opts.reason ? { rejectionReason: opts.reason.trim() } : {}) })
      .where(eq(withdrawalRequests.id, id));
    await tx.insert(withdrawalTransactions).values({ withdrawalId: id, fromStatus: wr.status, toStatus: to, actorId, proofReference: opts.proof, note: opts.reason });
    return wr;
  });
  const messages: Record<string, [string, string]> = {
    approved: ["Retrait approuvé", `Votre demande de ${fcfa(result.amount)} a été approuvée.`],
    processing: ["Retrait en cours de paiement", `Le paiement de ${fcfa(result.amount)} est en cours.`],
    paid: ["Retrait payé", `Votre retrait de ${fcfa(result.amount)} a été payé.`],
    rejected: ["Retrait rejeté", `Votre demande de ${fcfa(result.amount)} a été rejetée. Le montant a été restitué à votre solde disponible.`],
  };
  const m = messages[to];
  if (m) await notify({ userId: result.userId, type: `withdrawal_${to}`, title: m[0], body: m[1], dedupeKey: `wd_${to}:${id}`, external: true });
}

/* ───────────────────────── Statistiques réelles ───────────────────────── */
export async function getReferrerStats(userId: string) {
  const [invited] = await db.select({ n: count() }).from(referralAttributions).where(eq(referralAttributions.referrerId, userId));
  const [validated] = await db.select({ n: count() }).from(referralAttributions).where(and(eq(referralAttributions.referrerId, userId), eq(referralAttributions.status, "validated")));
  const [clicks] = await db.select({ n: count() }).from(referralEvents).where(and(eq(referralEvents.referrerId, userId), eq(referralEvents.type, "link_visit")));
  const [paying] = await db
    .select({ n: sql<number>`count(distinct ${orders.userId})` })
    .from(orders)
    .innerJoin(referralAttributions, eq(referralAttributions.referredUserId, orders.userId))
    .where(and(eq(referralAttributions.referrerId, userId), sql`${orders.paidAmount} > 0`));
  const earned = async (type: string) => {
    const [r] = await db.select({ s: sum(rewardTransactions.availableDelta) }).from(rewardTransactions).where(and(eq(rewardTransactions.userId, userId), eq(rewardTransactions.type, type)));
    return Number(r?.s ?? 0);
  };
  const wallet = await getWallet(userId);
  const attrs = await db.select({ at: referralAttributions.createdAt, status: referralAttributions.status }).from(referralAttributions).where(eq(referralAttributions.referrerId, userId));
  const tx = await db.select({ at: rewardTransactions.createdAt, a: rewardTransactions.availableDelta, p: rewardTransactions.pendingDelta, type: rewardTransactions.type }).from(rewardTransactions).where(eq(rewardTransactions.userId, userId));
  const weeks: { label: string; invited: number; rewards: number }[] = [];
  const now = Date.now();
  for (let i = 7; i >= 0; i--) {
    const from = now - (i + 1) * 7 * 86400_000;
    const to = now - i * 7 * 86400_000;
    weeks.push({
      label: new Date(to).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }),
      invited: attrs.filter((a) => +a.at > from && +a.at <= to).length,
      rewards: tx.filter((t) => ["signup_bonus", "training_bonus", "hold"].includes(t.type) && +t.at > from && +t.at <= to).reduce((s, t) => s + t.a + t.p, 0),
    });
  }
  const signupBonus = await earned("signup_bonus");
  const trainingBonus = await earned("training_bonus");
  return {
    invited: invited?.n ?? 0,
    validated: validated?.n ?? 0,
    clicks: clicks?.n ?? 0,
    paying: Number(paying?.n ?? 0),
    signupBonus,
    trainingBonus,
    generated: signupBonus + trainingBonus + wallet.pending,
    wallet,
    weeks,
  };
}

export async function getProgramStats() {
  const n = async (q: Promise<{ n: number | string }[]>) => Number((await q)[0]?.n ?? 0);
  const sumType = async (type: string, col: "availableDelta" | "withdrawnDelta") => {
    const [r] = await db.select({ s: sum(rewardTransactions[col]) }).from(rewardTransactions).where(eq(rewardTransactions.type, type));
    return Number(r?.s ?? 0);
  };
  const [w] = await db.select({ p: sum(rewardWallets.pending), a: sum(rewardWallets.available) }).from(rewardWallets);
  const [reserved] = await db.select({ s: sum(withdrawalRequests.amount) }).from(withdrawalRequests).where(inArray(withdrawalRequests.status, ["recorded", "pending_validation", "approved", "processing"]));
  return {
    activeReferrers: await n(db.select({ n: sql<number>`count(distinct ${referralAttributions.referrerId})` }).from(referralAttributions)),
    referees: await n(db.select({ n: count() }).from(referralAttributions)),
    attributedSignups: await n(db.select({ n: count() }).from(referralAttributions).where(eq(referralAttributions.status, "validated"))),
    payingReferees: await n(
      db
        .select({ n: sql<number>`count(distinct ${orders.userId})` })
        .from(orders)
        .innerJoin(referralAttributions, eq(referralAttributions.referredUserId, orders.userId))
        .where(sql`${orders.paidAmount} > 0`),
    ),
    signupBonuses: await sumType("signup_bonus", "availableDelta"),
    trainingBonuses: await sumType("training_bonus", "availableDelta"),
    withdrawn: await sumType("withdrawal_paid", "withdrawnDelta"),
    pending: Number(w?.p ?? 0),
    available: Number(w?.a ?? 0),
    reserved: Number(reserved?.s ?? 0),
    toPay: Number(w?.p ?? 0) + Number(w?.a ?? 0) + Number(reserved?.s ?? 0),
  };
}

export async function recentLedger(userId: string, limit = 50) {
  return db.select().from(rewardTransactions).where(eq(rewardTransactions.userId, userId)).orderBy(desc(rewardTransactions.createdAt)).limit(limit);
}

