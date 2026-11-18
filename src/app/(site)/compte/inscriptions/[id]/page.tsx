import Link from "next/link";
import { notFound } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { applicationItems, applications, centers, orders, payments, receipts, trainingDurations, trainingPrograms } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { ActionForm } from "@/components/ActionForm";
import { cancelApplicationAction, startPaymentAction } from "@/app/actions/account";
import { dateFr, fcfa } from "@/lib/format";
import { StatusBadge } from "@/components/ui";

export const metadata = { title: "Détail de l'inscription" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const [row] = await db.select({ a: applications, c: centers.name }).from(applications).innerJoin(centers, eq(centers.id, applications.centerId)).where(and(eq(applications.id, id), eq(applications.userId, user.id)));
  if (!row) notFound();
  const { a, c } = row;
  const items = await db
    .select({ i: applicationItems, p: trainingPrograms.title, d: trainingDurations })
    .from(applicationItems)
    .innerJoin(trainingPrograms, eq(trainingPrograms.id, applicationItems.programId))
    .innerJoin(trainingDurations, eq(trainingDurations.id, applicationItems.durationId))
    .where(eq(applicationItems.applicationId, a.id));
  const [order] = await db.select().from(orders).where(eq(orders.applicationId, a.id));
  const pays = order ? await db.select({ p: payments, r: receipts.id }).from(payments).leftJoin(receipts, eq(receipts.paymentId, payments.id)).where(eq(payments.orderId, order.id)).orderBy(desc(payments.createdAt)) : [];
  const editable = ["draft", "needs_review", "pending_payment"].includes(a.status) && !(order && order.paidAmount > 0);
  const remaining = order ? Math.max(0, order.amount - order.paidAmount) : (a.approvedTotal ?? 0);
  const canPay = (a.status === "pending_payment" || (a.status === "confirmed" && remaining > 0)) && !!a.approvedTotal;

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <section className="card p-6">
          <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-display text-xl font-bold">Formations choisies</h2><StatusBadge status={a.status} /></div>
          <p className="mt-1 text-sm text-neutral-500">Centre : {c} · Créée le {dateFr(a.createdAt)}</p>
          <div className="table-wrap mt-4">
            <table className="table">
              <thead><tr><th>Formation</th><th>Durée</th><th>Diplôme</th><th>Formation</th><th>Inscription/polo</th></tr></thead>
              <tbody>{items.map(({ i, p, d }) => (<tr key={i.id}><td className="font-semibold">{p}</td><td>{d.label}</td><td>{d.diploma}</td><td>{fcfa(i.tuitionFee)}</td><td>{fcfa(i.enrollmentFee)}</td></tr>))}</tbody>
            </table>
          </div>
          {a.status === "needs_review" && <p className="mt-4 rounded-xl bg-orange-50 p-3 text-sm text-orange-800">Votre sélection comporte plusieurs formations : elle est en attente de <b>validation administrative</b>. Vous serez notifié(e) dès que le montant final sera arrêté.</p>}
        </section>
        {order && (
          <section className="card p-6">
            <h2 className="font-display text-xl font-bold">Paiements</h2>
            <p className="mt-1 text-sm text-neutral-500">Commande <span className="font-mono">{order.reference}</span> · <StatusBadge status={order.status} /></p>
            {pays.length ? (
              <ul className="mt-3 divide-y text-sm">
                {pays.map(({ p, r }) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 py-2"><span>{dateFr(p.createdAt, true)} · tranche {p.installmentNo} · {fcfa(p.amount)}</span><span className="flex items-center gap-3"><StatusBadge status={p.status} />{r && <Link href={`/compte/recus/${r}`} className="font-semibold text-brand">Reçu</Link>}</span></li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-neutral-500">Aucun paiement vérifié pour le moment. Un retour depuis la page de paiement n&apos;est pas une preuve : la confirmation arrive après vérification serveur.</p>
            )}
          </section>
        )}
      </div>
      <aside className="space-y-4">
        <div className="card p-6">
          <p className="text-sm text-neutral-500">{a.status === "needs_review" ? "Total indicatif" : "Montant total"}</p>
          <p className="font-display text-3xl font-black text-brand-dark">{fcfa(a.approvedTotal ?? a.indicativeTotal)}</p>
          {order && <p className="mt-2 text-sm">Déjà confirmé : <b>{fcfa(order.paidAmount)}</b><br />Reste à payer : <b>{fcfa(remaining)}</b></p>}
          {canPay && (
            <ActionForm action={startPaymentAction} submitLabel={order?.paidAmount ? "Payer une tranche" : "Payer en ligne"} className="mt-4 space-y-3">
              <input type="hidden" name="applicationId" value={a.id} />
              <p className="text-xs text-neutral-500">Vous serez redirigé(e) vers Chariow (Mobile Money MTN / Orange, Visa, Mastercard). Votre inscription ne sera confirmée qu&apos;après vérification du paiement par notre serveur.</p>
            </ActionForm>
          )}
          {editable && <Link href={`/compte/candidature?id=${a.id}`} className="btn btn-outline mt-3 w-full">Modifier ma sélection</Link>}
          {editable && (
            <ActionForm action={cancelApplicationAction} submitLabel="Annuler cette inscription" submitClass="btn btn-outline btn-sm mt-3 w-full text-red-600" confirmText="Annuler cette inscription ?" className="">
              <input type="hidden" name="applicationId" value={a.id} />
            </ActionForm>
          )}
        </div>
      </aside>
    </div>
  );
}
