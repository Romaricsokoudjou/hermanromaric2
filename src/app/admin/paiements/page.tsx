import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { orders, paymentWebhooks, payments, userProfiles } from "@/db/schema";
import { requirePermission } from "@/lib/auth";
import { dateFr, fcfa } from "@/lib/format";
import { ActionForm, Field } from "@/components/ActionForm";
import { manualPaymentAction, refundPaymentAction, verifyPaymentAction } from "@/app/actions/admin";
import { StatusBadge } from "@/components/ui";
import { AdminTitle, Panel, PwdField } from "@/components/admin";

export const metadata = { title: "Paiements" };

export default async function Page() {
  await requirePermission("payments.manage");
  const [ords, pays, hooks] = await Promise.all([
    db.select({ o: orders, p: userProfiles }).from(orders).innerJoin(userProfiles, eq(userProfiles.userId, orders.userId)).orderBy(desc(orders.createdAt)).limit(100),
    db.select({ p: payments, o: orders.reference, n: userProfiles.lastName }).from(payments).innerJoin(orders, eq(orders.id, payments.orderId)).innerJoin(userProfiles, eq(userProfiles.userId, payments.userId)).orderBy(desc(payments.createdAt)).limit(100),
    db.select().from(paymentWebhooks).orderBy(desc(paymentWebhooks.createdAt)).limit(30),
  ]);
  return (
    <div className="space-y-6">
      <AdminTitle title="Paiements" subtitle="Une redirection n'est jamais une preuve : seuls les webhooks signés ou une vérification manuelle justifiée confirment un paiement." />
      <Panel title="Enregistrer un paiement vérifié manuellement">
        <ActionForm action={manualPaymentAction} submitLabel="Enregistrer le paiement" submitClass="btn btn-primary btn-sm" className="grid items-end gap-3 sm:grid-cols-3">
          <Field label="Référence de commande" name="reference" placeholder="HF-2026-ABC123" />
          <Field label="ID de transaction du prestataire (preuve)" name="transactionId" />
          <Field label="Montant vérifié (FCFA)" name="amount" type="number" />
          <Field label="Prestataire" name="provider" defaultValue="chariow" />
          <Field label="Note" name="note" required={false} />
          <PwdField />
        </ActionForm>
      </Panel>
      <Panel title="Paiements">
        <div className="table-wrap"><table className="table"><thead><tr><th>Date</th><th>Commande</th><th>Payeur</th><th>Transaction</th><th>Montant</th><th>Statut</th><th>Source</th><th>Action</th></tr></thead><tbody>
          {pays.map(({ p, o, n }) => (
            <tr key={p.id}>
              <td>{dateFr(p.createdAt, true)}</td><td className="font-mono text-xs">{o}</td><td>{n}</td><td className="max-w-[160px] break-all font-mono text-xs">{p.providerTransactionId}</td><td>{fcfa(p.amount)}</td><td><StatusBadge status={p.status} /></td><td>{p.source}</td>
              <td>
                {p.status === "to_verify" && (
                  <ActionForm action={verifyPaymentAction} submitLabel="Confirmer" submitClass="btn btn-primary btn-sm" className="space-y-1">
                    <input type="hidden" name="paymentId" value={p.id} />
                    <input name="amount" type="number" placeholder="Montant vérifié" className="input !py-1 text-xs" required />
                    <input name="confirmPassword" type="password" placeholder="Votre mot de passe" className="input !py-1 text-xs" required />
                  </ActionForm>
                )}
                {p.status === "confirmed" && (
                  <ActionForm action={refundPaymentAction} submitLabel="Rembourser" submitClass="btn btn-outline btn-sm text-red-600" confirmText="Marquer ce paiement comme remboursé ? La reprise de récompense sera appliquée selon la politique." className="space-y-1">
                    <input type="hidden" name="paymentId" value={p.id} />
                    <input name="note" placeholder="Motif" className="input !py-1 text-xs" />
                    <input name="confirmPassword" type="password" placeholder="Votre mot de passe" className="input !py-1 text-xs" required />
                  </ActionForm>
                )}
              </td>
            </tr>
          ))}
          {!pays.length && <tr><td colSpan={8} className="text-neutral-500">Aucun paiement.</td></tr>}
        </tbody></table></div>
      </Panel>
      <Panel title="Commandes">
        <div className="table-wrap"><table className="table"><thead><tr><th>Date</th><th>Référence</th><th>Client</th><th>Montant</th><th>Confirmé</th><th>Statut</th></tr></thead><tbody>
          {ords.map(({ o, p }) => (<tr key={o.id}><td>{dateFr(o.createdAt)}</td><td className="font-mono text-xs">{o.reference}</td><td>{p.firstName} {p.lastName}</td><td>{fcfa(o.amount)}</td><td>{fcfa(o.paidAmount)}</td><td><StatusBadge status={o.status} /></td></tr>))}
        </tbody></table></div>
      </Panel>
      <Panel title="Journal des webhooks reçus">
        <div className="table-wrap"><table className="table"><thead><tr><th>Date</th><th>Livraison</th><th>Événement</th><th>Signature</th><th>Résultat</th></tr></thead><tbody>
          {hooks.map((h) => (<tr key={h.id}><td>{dateFr(h.createdAt, true)}</td><td className="max-w-[160px] break-all font-mono text-xs">{h.deliveryId}</td><td>{h.event}</td><td>{h.signatureValid ? "✓ valide" : "✗ invalide"}</td><td>{h.result}</td></tr>))}
          {!hooks.length && <tr><td colSpan={5} className="text-neutral-500">Aucun webhook reçu. URL à déclarer dans Chariow (Pulse) : /api/webhooks/chariow</td></tr>}
        </tbody></table></div>
      </Panel>
    </div>
  );
}
