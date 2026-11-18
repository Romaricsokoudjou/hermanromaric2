import { desc, eq, ilike, or } from "drizzle-orm";
import { db } from "@/db";
import { rewardTransactions, rewardWallets, userProfiles, users } from "@/db/schema";
import { requirePermission } from "@/lib/auth";
import { dateFr, fcfa, TX_LABELS } from "@/lib/format";
import { ActionForm } from "@/components/ActionForm";
import { adjustWalletAction } from "@/app/actions/admin";
import { AdminTitle, Panel } from "@/components/admin";

export const metadata = { title: "Portefeuilles" };

export default async function Page({ searchParams }: { searchParams: Promise<{ q?: string; user?: string }> }) {
  await requirePermission("wallets.manage");
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const like = `%${q}%`;
  const wallets = await db
    .select({ w: rewardWallets, p: userProfiles, email: users.email, phone: users.phone })
    .from(rewardWallets)
    .innerJoin(users, eq(users.id, rewardWallets.userId))
    .innerJoin(userProfiles, eq(userProfiles.userId, rewardWallets.userId))
    .where(q ? or(ilike(users.email, like), ilike(users.phone, like), ilike(userProfiles.lastName, like), ilike(userProfiles.firstName, like)) : undefined)
    .orderBy(desc(rewardWallets.available))
    .limit(100);
  const ledger = sp.user && /^[0-9a-f-]{36}$/.test(sp.user) ? await db.select().from(rewardTransactions).where(eq(rewardTransactions.userId, sp.user)).orderBy(desc(rewardTransactions.createdAt)).limit(100) : [];
  return (
    <div className="space-y-6">
      <AdminTitle title="Portefeuilles HERMAN REWARDS" subtitle="Aucun solde n'est modifiable directement : chaque ajustement crée une écriture immuable justifiée." />
      <form className="flex gap-2"><input name="q" defaultValue={q} placeholder="Rechercher…" className="input max-w-sm" /><button className="btn btn-dark btn-sm">Rechercher</button></form>
      <Panel>
        <div className="table-wrap"><table className="table"><thead><tr><th>Utilisateur</th><th>En attente</th><th>Disponible</th><th>Retiré</th><th>Ajustement justifié</th></tr></thead><tbody>
          {wallets.map(({ w, p, email }) => (
            <tr key={w.id}>
              <td className="font-semibold">{p.firstName} {p.lastName}<span className="block text-xs font-normal text-neutral-500">{email}</span><a href={`/admin/portefeuilles?user=${w.userId}`} className="text-xs text-brand">Voir le journal</a></td>
              <td>{fcfa(w.pending)}</td><td>{fcfa(w.available)}</td><td>{fcfa(w.withdrawn)}</td>
              <td>
                <ActionForm action={adjustWalletAction} submitLabel="Ajuster" submitClass="btn btn-dark btn-sm" className="grid min-w-[280px] gap-1">
                  <input type="hidden" name="userId" value={w.userId} />
                  <div className="flex gap-1"><select name="bucket" className="input !py-1 text-xs"><option value="available">Disponible</option><option value="pending">En attente</option></select><input name="amount" type="number" placeholder="± montant" className="input !py-1 text-xs" required /></div>
                  <input name="note" placeholder="Justification détaillée (obligatoire)" className="input !py-1 text-xs" required />
                  <input name="confirmPassword" type="password" placeholder="Votre mot de passe" className="input !py-1 text-xs" required />
                </ActionForm>
              </td>
            </tr>
          ))}
          {!wallets.length && <tr><td colSpan={5} className="text-neutral-500">Aucun portefeuille.</td></tr>}
        </tbody></table></div>
      </Panel>
      {ledger.length > 0 && (
        <Panel title="Journal financier de l'utilisateur">
          <div className="table-wrap"><table className="table"><thead><tr><th>Date</th><th>Opération</th><th>Attente</th><th>Dispo</th><th>Retiré</th><th>Soldes après</th><th>Note</th></tr></thead><tbody>
            {ledger.map((t) => (<tr key={t.id}><td>{dateFr(t.createdAt, true)}</td><td>{TX_LABELS[t.type] ?? t.type}</td><td>{t.pendingDelta}</td><td>{t.availableDelta}</td><td>{t.withdrawnDelta}</td><td className="text-xs">{t.pendingAfter} / {t.availableAfter} / {t.withdrawnAfter}</td><td className="text-xs">{t.note}</td></tr>))}
          </tbody></table></div>
        </Panel>
      )}
    </div>
  );
}
