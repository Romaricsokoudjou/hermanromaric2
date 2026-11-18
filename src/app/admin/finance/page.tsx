import { and, eq, sql, sum } from "drizzle-orm";
import { db } from "@/db";
import { orders, payments } from "@/db/schema";
import { requirePermission } from "@/lib/auth";
import { fcfa } from "@/lib/format";
import { getProgramStats } from "@/lib/rewards";
import { Stat } from "@/components/ui";
import { AdminTitle, Panel } from "@/components/admin";

export const metadata = { title: "Gestion financière" };

export default async function Page() {
  await requirePermission("finance.view");
  const [conf] = await db.select({ s: sum(payments.amount) }).from(payments).where(eq(payments.status, "confirmed"));
  const [ref] = await db.select({ s: sum(payments.amount) }).from(payments).where(eq(payments.status, "refunded"));
  const [due] = await db.select({ s: sum(sql`${orders.amount} - ${orders.paidAmount}`) }).from(orders).where(and(sql`${orders.status} in ('pending','confirmed','to_verify')`, sql`${orders.amount} > ${orders.paidAmount}`));
  const monthly = await db.execute(sql`select to_char(date_trunc('month', created_at), 'YYYY-MM') as m, sum(amount)::int as total, count(*)::int as n from payments where status = 'confirmed' group by 1 order by 1 desc limit 12`);
  const rw = await getProgramStats();
  const exports = [["payments", "Paiements"], ["orders", "Commandes"], ["ledger", "Journal des récompenses"], ["wallets", "Portefeuilles"], ["withdrawals", "Retraits"]];
  return (
    <div>
      <AdminTitle title="Gestion financière" subtitle="Vue consolidée en lecture seule. Les chiffres proviennent uniquement de transactions vérifiées." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Paiements confirmés" value={fcfa(Number(conf?.s ?? 0))} accent />
        <Stat label="Remboursés" value={fcfa(Number(ref?.s ?? 0))} />
        <Stat label="Restant dû (commandes ouvertes)" value={fcfa(Number(due?.s ?? 0))} />
        <Stat label="Engagements récompenses" value={fcfa(rw.toPay)} hint="En attente + disponible + retraits en cours" />
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel title="Encaissements par mois">
          <table className="table"><thead><tr><th>Mois</th><th>Paiements</th><th>Total</th></tr></thead><tbody>
            {(monthly.rows as { m: string; total: number; n: number }[]).map((r) => (<tr key={r.m}><td>{r.m}</td><td>{r.n}</td><td>{fcfa(r.total)}</td></tr>))}
            {!monthly.rows.length && <tr><td colSpan={3} className="text-neutral-500">Aucun encaissement.</td></tr>}
          </tbody></table>
        </Panel>
        <Panel title="Exports CSV">
          <ul className="space-y-2 text-sm">{exports.map(([t, l]) => (<li key={t}><a className="font-semibold text-brand underline" href={`/api/admin/export?type=${t}`}>⬇ {l}</a></li>))}</ul>
        </Panel>
      </div>
    </div>
  );
}
