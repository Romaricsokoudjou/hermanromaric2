import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { applications, centers, orders, payments, receipts, userProfiles } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { dateFr, fcfa } from "@/lib/format";
import { PrintButton } from "@/components/PrintButton";

export const metadata = { title: "Reçu de paiement" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const [r] = await db
    .select({ r: receipts, o: orders, p: payments, c: centers.name })
    .from(receipts)
    .innerJoin(orders, eq(orders.id, receipts.orderId))
    .innerJoin(payments, eq(payments.id, receipts.paymentId))
    .innerJoin(applications, eq(applications.id, orders.applicationId))
    .innerJoin(centers, eq(centers.id, applications.centerId))
    .where(and(eq(receipts.id, id), eq(receipts.userId, user.id)));
  if (!r) notFound();
  const [prof] = await db.select().from(userProfiles).where(eq(userProfiles.userId, user.id));
  const s = await getSettings();
  return (
    <div className="mx-auto max-w-2xl">
      <div className="card p-8">
        <div className="flex items-start justify-between border-b pb-5">
          <div><p className="font-display text-2xl font-black">HERMAN FASHION</p><p className="text-xs text-neutral-500">CFP · Douala, Cameroun</p><p className="mt-1 text-[11px] text-neutral-500">{s["institution.arrete"]}</p></div>
          <div className="text-right"><p className="text-xs uppercase tracking-wide text-neutral-500">Reçu</p><p className="font-mono font-bold">{r.r.number}</p><p className="text-xs">{dateFr(r.r.issuedAt, true)}</p></div>
        </div>
        <dl className="mt-6 grid grid-cols-2 gap-4 text-sm">
          <div><dt className="text-neutral-500">Reçu de</dt><dd className="font-semibold">{prof?.firstName} {prof?.lastName}</dd></div>
          <div><dt className="text-neutral-500">Centre</dt><dd className="font-semibold">{r.c}</dd></div>
          <div><dt className="text-neutral-500">Commande</dt><dd className="font-mono">{r.o.reference}</dd></div>
          <div><dt className="text-neutral-500">Tranche</dt><dd>n° {r.p.installmentNo}</dd></div>
          <div><dt className="text-neutral-500">Prestataire</dt><dd className="capitalize">{r.p.provider}</dd></div>
          <div><dt className="text-neutral-500">Transaction vérifiée</dt><dd className="break-all font-mono text-xs">{r.p.providerTransactionId}</dd></div>
        </dl>
        <div className="mt-6 rounded-2xl bg-beige p-5 text-center"><p className="text-xs uppercase tracking-wide text-neutral-500">Montant payé</p><p className="font-display text-4xl font-black text-brand-dark">{fcfa(r.r.amount)}</p></div>
        <p className="mt-4 text-xs text-neutral-500">Total commande : {fcfa(r.o.amount)} · Total confirmé à ce jour : {fcfa(r.o.paidAmount)}</p>
      </div>
      <div className="mt-4 text-center"><PrintButton /></div>
    </div>
  );
}
