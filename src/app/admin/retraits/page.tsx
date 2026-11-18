import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { userProfiles, withdrawalRequests, withdrawalTransactions } from "@/db/schema";
import { requirePermission } from "@/lib/auth";
import { dateFr, fcfa } from "@/lib/format";
import { ActionForm } from "@/components/ActionForm";
import { withdrawalAction } from "@/app/actions/admin";
import { StatusBadge } from "@/components/ui";
import { AdminTitle, Panel } from "@/components/admin";

export const metadata = { title: "Retraits" };

const NEXT: Record<string, { to: string; label: string }[]> = {
  pending_validation: [{ to: "approved", label: "Approuver" }],
  approved: [{ to: "processing", label: "Passer en paiement" }],
  processing: [{ to: "paid", label: "Marquer payé" }],
};

export default async function Page() {
  await requirePermission("withdrawals.manage");
  const rows = await db.select({ w: withdrawalRequests, p: userProfiles }).from(withdrawalRequests).innerJoin(userProfiles, eq(userProfiles.userId, withdrawalRequests.userId)).orderBy(desc(withdrawalRequests.createdAt)).limit(100);
  const logs = await db.select().from(withdrawalTransactions).orderBy(desc(withdrawalTransactions.createdAt)).limit(40);
  return (
    <div className="space-y-6">
      <AdminTitle title="Retraits" subtitle="Un retrait ne peut être marqué « payé » qu'avec une preuve de transaction. Mot de passe requis pour chaque décision." />
      <div className="space-y-3">
        {rows.map(({ w, p }) => (
          <Panel key={w.id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold">{p.firstName} {p.lastName} — <span className="font-display text-lg">{fcfa(w.amount)}</span></p>
                <p className="text-sm text-neutral-600">Bénéficiaire : {w.beneficiaryName} · {w.operator} · {w.phone}</p>
                <p className="text-xs text-neutral-500">Frais : {fcfa(w.fee)} · Net à verser : <b>{fcfa(w.amount - w.fee)}</b> · {dateFr(w.createdAt, true)}</p>
                {w.proofReference && <p className="text-xs text-green-700">Preuve : {w.proofReference}</p>}
                {w.rejectionReason && <p className="text-xs text-red-600">Motif de rejet : {w.rejectionReason}</p>}
              </div>
              <StatusBadge status={w.status} />
            </div>
            {["pending_validation", "approved", "processing"].includes(w.status) && (
              <ActionForm action={withdrawalAction} hideSubmit className="mt-3 grid items-end gap-2 sm:grid-cols-4">
                <input type="hidden" name="id" value={w.id} />
                <input name="proof" placeholder="Référence / preuve de transaction" className="input !py-1.5 text-sm" />
                <input name="reason" placeholder="Motif (si rejet)" className="input !py-1.5 text-sm" />
                <input name="confirmPassword" type="password" placeholder="Votre mot de passe" className="input !py-1.5 text-sm" required />
                <div className="flex gap-1">
                  {NEXT[w.status].map((n) => (<button key={n.to} name="to" value={n.to} className="btn btn-primary btn-sm">{n.label}</button>))}
                  <button name="to" value="rejected" className="btn btn-outline btn-sm text-red-600">Rejeter</button>
                </div>
              </ActionForm>
            )}
          </Panel>
        ))}
        {!rows.length && <p className="text-sm text-neutral-500">Aucune demande de retrait.</p>}
      </div>
      <Panel title="Transactions de retrait (historique des statuts)">
        <div className="table-wrap"><table className="table"><thead><tr><th>Date</th><th>De</th><th>Vers</th><th>Preuve / note</th></tr></thead><tbody>
          {logs.map((l) => (<tr key={l.id}><td>{dateFr(l.createdAt, true)}</td><td>{l.fromStatus ?? "—"}</td><td>{l.toStatus}</td><td className="text-xs">{l.proofReference ?? l.note}</td></tr>))}
        </tbody></table></div>
      </Panel>
    </div>
  );
}
