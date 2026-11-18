/**
 * Tests d'intégration métier (base réelle) : parrainage, récompenses, paiements, retraits, journal immuable.
 * Exécution : set -a; source .env; set +a; npx tsx scripts/e2e-test.ts
 */
import { createHmac } from "crypto";
import { and, eq, sql } from "drizzle-orm";
import { db, pool } from "@/db";
import { applicationItems, applications, centers, orders, payments, receipts, referralAttributions, rewardTransactions, trainingDurations, trainingPrograms, userProfiles, users, withdrawalRequests } from "@/db/schema";
import { attributeReferral, ensureReferralCode, getWallet, onPhoneVerified, requestWithdrawal, transitionWithdrawal, releaseHold, adminAdjust } from "@/lib/rewards";
import { createOrder, processChariowWebhook, recordPayment, refundPayment, submitApplication, verifyChariowSignature } from "@/lib/payments";
import { setSetting } from "@/lib/settings";
import { ensureBootstrap } from "@/lib/bootstrap";

let pass = 0;
let fail = 0;
const ok = (c: boolean, label: string) => {
  if (c) pass++;
  else fail++;
  console.log(`${c ? "✅" : "❌"} ${label}`);
};
const rnd = Math.random().toString(36).slice(2, 8);

async function mkUser(first: string, ip: string, verified = false) {
  const [u] = await db.insert(users).values({ email: `${first}.${rnd}@test.local`, phone: `+2376${Math.floor(10000000 + Math.random() * 89999999)}`, passwordHash: "x", phoneVerifiedAt: verified ? new Date() : null }).returning();
  await db.insert(userProfiles).values({ userId: u.id, firstName: first, lastName: `T${rnd}`, country: "Cameroun", city: "Douala", signupIp: ip });
  await ensureReferralCode(u.id);
  return u;
}

async function main() {
  await ensureBootstrap();
  await setSetting("rewards.enabled", true, null);
  await setSetting("rewards.training_trigger", "first_installment", null);
  await setSetting("withdrawal.min", 5000, null);

  // ── Parrainage ──
  const parrain = await mkUser("Parrain", "10.0.0.1", true);
  const code = await ensureReferralCode(parrain.id);
  ok(/^HF[A-Z2-9]{6}$/.test(code), `Code unique généré (${code})`);
  ok((await ensureReferralCode(parrain.id)) === code, "Code stable (idempotent)");

  const filleul = await mkUser("Filleul", "10.0.0.2");
  await attributeReferral(filleul.id, code, "10.0.0.2");
  const [att] = await db.select().from(referralAttributions).where(eq(referralAttributions.referredUserId, filleul.id));
  ok(att?.referrerId === parrain.id && att.status === "pending", "Attribution du filleul au parrain");
  ok((await getWallet(parrain.id)).available === 0, "Aucune récompense avant la vérification du téléphone");

  // Auto-parrainage
  await attributeReferral(parrain.id, code, "10.0.0.1");
  const self = await db.select().from(referralAttributions).where(eq(referralAttributions.referredUserId, parrain.id));
  ok(self.length === 0, "Auto-parrainage refusé");

  // Second parrain ne peut pas remplacer le premier
  const autre = await mkUser("Autre", "10.0.0.9", true);
  await attributeReferral(filleul.id, await ensureReferralCode(autre.id), "10.0.0.2");
  const [att2] = await db.select().from(referralAttributions).where(eq(referralAttributions.referredUserId, filleul.id));
  ok(att2.referrerId === parrain.id, "Premier parrain conservé (attribution non modifiable)");

  // Bonus d'inscription
  await db.update(users).set({ phoneVerifiedAt: new Date() }).where(eq(users.id, filleul.id));
  await onPhoneVerified(filleul.id);
  await onPhoneVerified(filleul.id);
  let w = await getWallet(parrain.id);
  ok(w.available === 500, `Bonus d'inscription 500 FCFA attribué une seule fois (solde ${w.available})`);

  // ── Compte suspect : même IP ──
  const clone = await mkUser("Clone", "10.0.0.1", true);
  await attributeReferral(clone.id, code, "10.0.0.1");
  await onPhoneVerified(clone.id);
  w = await getWallet(parrain.id);
  ok(w.available === 500 && w.pending === 500, `Bonus du compte suspect mis en attente (dispo ${w.available}, attente ${w.pending})`);

  // ── Paiement ──
  const [prog] = await db.select().from(trainingPrograms).limit(1);
  const [dur] = await db.select().from(trainingDurations).where(and(eq(trainingDurations.programId, prog.id), eq(trainingDurations.key, "3m")));
  const [center] = await db.select().from(centers).limit(1);
  const [app] = await db.insert(applications).values({ userId: filleul.id, centerId: center.id }).returning();
  await db.insert(applicationItems).values({ applicationId: app.id, programId: prog.id, durationId: dur.id, tuitionFee: 150000, enrollmentFee: 10000, installments: [100000, 30000, 20000] });
  ok((await submitApplication(filleul.id, app.id)) === "pending_payment", "Une formation → pas de validation administrative");
  const [app1] = await db.select().from(applications).where(eq(applications.id, app.id));
  ok(app1.approvedTotal === 160000, "Total 3 mois = 150 000 + 10 000 = 160 000 FCFA");

  const order = await createOrder(filleul.id, app.id);
  const order2 = await createOrder(filleul.id, app.id);
  ok(order.id === order2.id, "Commande unique par candidature (pas de doublon)");
  ok((await getWallet(parrain.id)).available === 500, "Aucun bonus de formation sur simple intention de paiement");

  // Webhook : signature invalide / absente de secret
  process.env.CHARIOW_WEBHOOK_SECRET = "whsec_test";
  const body = JSON.stringify({ event: "successful.sale", sale: { id: `sale_${rnd}`, amount: 100000 }, customer: { email: filleul.email }, ref: order.reference });
  const bad = await processChariowWebhook(body, new Headers({ "x-pulse-delivery-id": `d_bad_${rnd}`, "x-chariow-signature": "sha256=deadbeef", "x-pulse-event": "successful.sale" }));
  ok(bad.status === 401, "Webhook à signature invalide rejeté (401)");
  ok(!verifyChariowSignature(body, null, "whsec_test"), "Webhook sans signature rejeté");
  const sig = "sha256=" + createHmac("sha256", "whsec_test").update(body).digest("hex");
  const hdr = new Headers({ "x-pulse-delivery-id": `d_ok_${rnd}`, "x-chariow-signature": sig, "x-pulse-event": "successful.sale" });
  const good = await processChariowWebhook(body, hdr);
  ok(good.status === 200, "Webhook signé accepté");
  const again = await processChariowWebhook(body, hdr);
  ok(again.message === "Déjà traité.", "Rejeu du même webhook ignoré (idempotence)");
  const pays = await db.select().from(payments).where(eq(payments.orderId, order.id));
  ok(pays.length === 1 && pays[0].status === "confirmed" && pays[0].amount === 100000, "Paiement confirmé côté serveur (100 000 FCFA)");
  const rec = await db.select().from(receipts).where(eq(receipts.orderId, order.id));
  ok(rec.length === 1, "Reçu généré");
  const [ord] = await db.select().from(orders).where(eq(orders.id, order.id));
  ok(ord.paidAmount === 100000 && ord.status === "pending", "Paiement partiel : commande encore ouverte");
  const [app3] = await db.select().from(applications).where(eq(applications.id, app.id));
  ok(app3.status === "confirmed", "Inscription confirmée après paiement vérifié");
  w = await getWallet(parrain.id);
  ok(w.available === 5500, `Bonus de formation 5 000 FCFA attribué (solde ${w.available})`);

  // Deuxième paiement : pas de second bonus
  const r2 = await recordPayment({ orderId: order.id, provider: "chariow", providerTransactionId: `sale2_${rnd}`, amount: 30000, status: "confirmed", source: "manual", note: "test" });
  const r3 = await recordPayment({ orderId: order.id, provider: "chariow", providerTransactionId: `sale2_${rnd}`, amount: 30000, status: "confirmed", source: "manual" });
  ok(r2 === "created" && r3 === "duplicate", "Transaction dupliquée refusée");
  ok((await getWallet(parrain.id)).available === 5500, "Pas de bonus de formation double (une fois par filleul)");

  // ── Libération d'une récompense en attente ──
  const { rewardHolds } = await import("@/db/schema");
  const [hold] = await db.select().from(rewardHolds).where(and(eq(rewardHolds.referredUserId, clone.id), eq(rewardHolds.status, "held")));
  await releaseHold(hold.id, parrain.id, "test vérification");
  w = await getWallet(parrain.id);
  ok(w.pending === 0 && w.available === 6000, `Libération après vérification (dispo ${w.available})`);

  // ── Retraits ──
  let err = "";
  await requestWithdrawal(parrain.id, { beneficiaryName: "X", phone: "+237670000000", operator: "MTN Mobile Money", amount: 1000 }).catch((e) => (err = e.message));
  ok(err.includes("minimum"), "Retrait sous le seuil refusé");
  err = "";
  await requestWithdrawal(parrain.id, { beneficiaryName: "X", phone: "+237670000000", operator: "MTN Mobile Money", amount: 999999 }).catch((e) => (err = e.message));
  ok(err.includes("insuffisant"), "Retrait supérieur au solde refusé");
  const wid = await requestWithdrawal(parrain.id, { beneficiaryName: "Parrain", phone: "+237670000000", operator: "MTN Mobile Money", amount: 5000 });
  w = await getWallet(parrain.id);
  ok(w.available === 1000, "Montant réservé à la demande de retrait");
  await transitionWithdrawal(wid, parrain.id, "approved", {});
  await transitionWithdrawal(wid, parrain.id, "processing", {});
  err = "";
  await transitionWithdrawal(wid, parrain.id, "paid", {}).catch((e) => (err = e.message));
  ok(err.includes("preuve"), "Retrait « payé » refusé sans preuve de transaction");
  await transitionWithdrawal(wid, parrain.id, "paid", { proof: `MOMO-${rnd}` });
  w = await getWallet(parrain.id);
  ok(w.withdrawn === 5000 && w.available === 1000, "Retrait payé avec preuve : total retiré 5 000");
  const wid2 = await requestWithdrawal(parrain.id, { beneficiaryName: "Parrain", phone: "+237670000000", operator: "Orange Money", amount: 1000 }).catch(() => null);
  ok(wid2 === null, "Solde de 1 000 < seuil : second retrait refusé");
  await adminAdjust({ userId: parrain.id, bucket: "available", amount: 5000, note: "Test d'ajustement justifié", actorId: parrain.id });
  const wid3 = await requestWithdrawal(parrain.id, { beneficiaryName: "Parrain", phone: "+237670000000", operator: "Orange Money", amount: 6000 });
  await transitionWithdrawal(wid3, parrain.id, "approved", {});
  await transitionWithdrawal(wid3, parrain.id, "rejected", { reason: "Numéro incorrect" });
  w = await getWallet(parrain.id);
  ok(w.available === 6000 && w.withdrawn === 5000, "Rejet : montant restitué");
  const [wr] = await db.select().from(withdrawalRequests).where(eq(withdrawalRequests.id, wid3));
  ok(wr.status === "rejected", "Statut rejeté enregistré");

  // ── Cohérence & immuabilité ──
  const ledger = await db.select().from(rewardTransactions).where(eq(rewardTransactions.userId, parrain.id));
  const sums = ledger.reduce((a, t) => ({ p: a.p + t.pendingDelta, a: a.a + t.availableDelta, w: a.w + t.withdrawnDelta }), { p: 0, a: 0, w: 0 });
  w = await getWallet(parrain.id);
  ok(sums.p === w.pending && sums.a === w.available && sums.w === w.withdrawn, "Soldes = somme du journal financier");
  let blocked = false;
  await db.update(rewardTransactions).set({ note: "hack" }).where(eq(rewardTransactions.userId, parrain.id)).catch(() => (blocked = true));
  ok(blocked, "Journal financier immuable (UPDATE bloqué)");
  blocked = false;
  await db.execute(sql.raw(`update reward_wallets set available = -5 where user_id = '${parrain.id}'`)).catch(() => (blocked = true));
  ok(blocked, "Contrainte : solde négatif impossible");

  // ── Remboursement → reprise ──
  await refundPayment(pays[0].id, parrain.id);
  w = await getWallet(parrain.id);
  ok(w.available === 1000, `Reprise du bonus de formation après remboursement, retraits intacts (dispo ${w.available}, retiré ${w.withdrawn})`);

  console.log(`\n${pass} réussis, ${fail} échoués`);
  await pool.end();
  process.exit(fail ? 1 : 0);
}
main().catch(async (e) => {
  console.error(e);
  await pool.end();
  process.exit(1);
});
