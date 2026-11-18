import { desc, eq, ilike, or } from "drizzle-orm";
import { db } from "@/db";
import { userProfiles, users } from "@/db/schema";
import { requirePermission } from "@/lib/auth";
import { ROLE_LABELS } from "@/lib/permissions";
import { dateFr } from "@/lib/format";
import { ActionForm } from "@/components/ActionForm";
import { setUserStatusAction } from "@/app/actions/admin";
import { StatusBadge } from "@/components/ui";
import { AdminTitle, Panel } from "@/components/admin";

export const metadata = { title: "Utilisateurs" };

export default async function Page({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requirePermission("users.manage");
  const q = ((await searchParams).q ?? "").trim();
  const like = `%${q}%`;
  const rows = await db
    .select({ u: users, p: userProfiles })
    .from(users)
    .innerJoin(userProfiles, eq(userProfiles.userId, users.id))
    .where(q ? or(ilike(users.email, like), ilike(users.phone, like), ilike(userProfiles.firstName, like), ilike(userProfiles.lastName, like)) : undefined)
    .orderBy(desc(users.createdAt))
    .limit(150);
  return (
    <div>
      <AdminTitle title="Utilisateurs & apprenants" subtitle="Consultation, suspension et blocage des comptes (toute action est journalisée)." />
      <form className="mb-4 flex gap-2"><input name="q" defaultValue={q} placeholder="Rechercher nom, e-mail, téléphone…" className="input max-w-sm" /><button className="btn btn-dark btn-sm">Rechercher</button></form>
      <Panel>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Utilisateur</th><th>Contact</th><th>Rôle</th><th>Vérif.</th><th>Statut</th><th>Inscrit</th><th>Action</th></tr></thead>
            <tbody>
              {rows.map(({ u, p }) => (
                <tr key={u.id}>
                  <td className="font-semibold">{p.firstName} {p.lastName}<span className="block text-xs font-normal text-neutral-500">{p.city}, {p.country}</span></td>
                  <td>{u.email}<span className="block text-xs text-neutral-500">{u.phone}</span></td>
                  <td>{ROLE_LABELS[u.role]}</td>
                  <td className="text-xs">{u.phoneVerifiedAt ? "📱✓" : "📱✗"} {u.emailVerifiedAt ? "✉️✓" : "✉️✗"}</td>
                  <td><StatusBadge status={u.status} /></td>
                  <td>{dateFr(u.createdAt)}</td>
                  <td>
                    <ActionForm action={setUserStatusAction} hideSubmit className="flex items-center gap-1">
                      <input type="hidden" name="userId" value={u.id} />
                      <select name="status" defaultValue={u.status} className="input !w-auto !py-1 text-xs"><option value="active">Actif</option><option value="suspended">Suspendu</option><option value="blocked">Bloqué</option></select>
                      <button className="btn btn-dark btn-sm">OK</button>
                    </ActionForm>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
