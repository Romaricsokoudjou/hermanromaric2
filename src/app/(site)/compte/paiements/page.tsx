import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { orders, payments, receipts } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { dateFr, fcfa } from "@/lib/format";
import { EmptyState, StatusBadge } from "@/components/ui";

export const metadata = { title: "Paiements et reçus" };

export default async function Page() {
  const user = await requireUser();
  const rows = await db
    .select({ p: payments, o: orders.reference, r: receipts.id, rn: receipts.number })
    .from(payments)
    .innerJoin(orders, eq(orders.id, payments.orderId))
    .leftJoin(receipts, eq(receipts.paymentId, payments.id))
    .where(eq(payments.userId, user.id))
    .orderBy(desc(payments.createdAt));
  return rows.length ? (
    <div className="card table-wrap p-2">
      <table className="table">
        <thead><tr><th>Date</th><th>Commande</th><th>Tranche</th><th>Montant</th><th>Statut</th><th>Reçu</th></tr></thead>
        <tbody>
          {rows.map(({ p, o, r, rn }) => (
            <tr key={p.id}><td>{dateFr(p.createdAt, true)}</td><td className="font-mono text-xs">{o}</td><td>{p.installmentNo}</td><td>{fcfa(p.amount)}</td><td><StatusBadge status={p.status} /></td><td>{r ? <Link href={`/compte/recus/${r}`} className="font-semibold text-brand">{rn}</Link> : "—"}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  ) : (
    <EmptyState title="Aucun paiement enregistré" text="Vos paiements confirmés et vos reçus apparaîtront ici." />
  );
}
