import Link from "next/link";
import { count, eq, inArray, sum, and, gte } from "drizzle-orm";
import { db } from "@/db";
import { applications, contactMessages, fraudAlerts, orders, payments, rewardHolds, users, withdrawalRequests } from "@/db/schema";
import { requirePermission } from "@/lib/auth";
import { fcfa } from "@/lib/format";
import { Stat } from "@/components/ui";
import { AdminTitle, Panel } from "@/components/admin";
import { can } from "@/lib/permissions";
import { getSettings } from "@/lib/settings";

export default async function Page() {
  const me = await requirePermission("dashboard.view");
  const n = async (q: Promise<{ n: number }[]>) => (await q)[0]?.n ?? 0;
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const [learners, apps, review, toVerify, openWd, alerts, holds, msgs, collected, monthCollected, s] = await Promise.all([
    n(db.select({ n: count() }).from(users).where(eq(users.role, "learner"))),
    n(db.select({ n: count() }).from(applications)),
    n(db.select({ n: count() }).from(applications).where(eq(applications.status, "needs_review"))),
    n(db.select({ n: count() }).from(payments).where(eq(payments.status, "to_verify"))),
    n(db.select({ n: count() }).from(withdrawalRequests).where(inArray(withdrawalRequests.status, ["pending_validation", "approved", "processing"]))),
    n(db.select({ n: count() }).from(fraudAlerts).where(eq(fraudAlerts.status, "open"))),
    n(db.select({ n: count() }).from(rewardHolds).where(eq(rewardHolds.status, "held"))),
    n(db.select({ n: count() }).from(contactMessages).where(eq(contactMessages.handled, false))),
    db.select({ s: sum(orders.paidAmount) }).from(orders),
    db.select({ s: sum(payments.amount) }).from(payments).where(and(eq(payments.status, "confirmed"), gte(payments.createdAt, monthStart))),
    getSettings(),
  ]);
  const todo: [string, number, string, string][] = [
    ["Candidatures à valider", review, "/admin/inscriptions", "applications.manage"],
    ["Paiements à vérifier", toVerify, "/admin/paiements", "payments.manage"],
    ["Retraits à traiter", openWd, "/admin/retraits", "withdrawals.manage"],
    ["Alertes fraude ouvertes", alerts, "/admin/parrainage", "rewards.manage"],
    ["Récompenses en attente de vérification", holds, "/admin/parrainage", "rewards.manage"],
    ["Messages de contact non traités", msgs, "/admin/notifications", "notifications.manage"],
  ];
  return (
    <div>
      <AdminTitle title="Tableau de bord" subtitle="Toutes les valeurs proviennent de la base de données." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Apprenants inscrits (comptes)" value={learners} />
        <Stat label="Candidatures" value={apps} />
        {can(me.role, "finance.view") && <Stat label="Total encaissé (confirmé)" value={fcfa(Number(collected[0]?.s ?? 0))} accent />}
        {can(me.role, "finance.view") && <Stat label="Encaissé ce mois-ci" value={fcfa(Number(monthCollected[0]?.s ?? 0))} />}
      </div>
      <Panel title="À traiter" className="mt-6">
        <ul className="divide-y">
          {todo.filter(([, , , p]) => can(me.role, p)).map(([l, v, h]) => (
            <li key={l} className="flex items-center justify-between py-3 text-sm"><span>{l}</span><Link href={h} className={`badge ${v ? "bg-orange-100 text-orange-800" : "bg-neutral-100 text-neutral-500"}`}>{v}</Link></li>
          ))}
        </ul>
      </Panel>
      {can(me.role, "settings.manage") && (
        <Panel title="Points d'attention avant lancement public" className="mt-6">
          <ul className="list-disc space-y-2 pl-5 text-sm text-neutral-700">
            <li>Webhook Chariow : {process.env.CHARIOW_WEBHOOK_SECRET ? "secret configuré ✓" : <b className="text-red-600">CHARIOW_WEBHOOK_SECRET non défini — aucune confirmation automatique de paiement n&apos;est possible (vérification manuelle uniquement).</b>}</li>
            <li>Envoi des codes SMS/e-mail : {process.env.MESSAGING_WEBHOOK_URL ? "fournisseur configuré ✓" : <b className="text-amber-700">MESSAGING_WEBHOOK_URL non défini — mode démonstration (codes affichés à l&apos;écran, SHOW_DEV_CODES).</b>}</li>
            <li>HERMAN AI : {process.env.AI_API_KEY ? "fournisseur IA configuré ✓" : "mode base de connaissances (aucune clé AI_API_KEY)."}</li>
            <li>Règle de cumul multi-formations : <b>{s["pricing.multi_rule"] === "undefined" ? "non définie (validation administrative requise)" : s["pricing.multi_rule"]}</b></li>
            <li>Vérifier les coordonnées : le numéro WhatsApp communiqué ({s["contact.whatsapp_url"].replace("https://wa.me/", "+")}) diffère du premier téléphone ({s["contact.phones"][0]}).</li>
            <li>Valider juridiquement et comptablement le programme HERMAN REWARDS avant le lancement public (désactivable dans Paramètres Rewards).</li>
          </ul>
        </Panel>
      )}
    </div>
  );
}
