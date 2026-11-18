import { desc, inArray, eq } from "drizzle-orm";
import { db } from "@/db";
import { userProfiles, users } from "@/db/schema";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS, ROLE_LABELS, ROLE_PERMISSIONS, STAFF_ROLES } from "@/lib/permissions";
import { ActionForm, Field } from "@/components/ActionForm";
import { createStaffAction, setRoleAction } from "@/app/actions/admin";
import { AdminTitle, Panel, PwdField } from "@/components/admin";

export const metadata = { title: "Administrateurs" };

export default async function Page() {
  const me = await requirePermission("admins.manage");
  const staff = await db.select({ u: users, p: userProfiles }).from(users).innerJoin(userProfiles, eq(userProfiles.userId, users.id)).where(inArray(users.role, [...STAFF_ROLES])).orderBy(desc(users.createdAt));
  return (
    <div className="space-y-6">
      <AdminTitle title="Administrateurs & permissions" subtitle="Réservé au super administrateur. Chaque modification exige la ressaisie du mot de passe et est journalisée." />
      <Panel title="Équipe">
        <div className="table-wrap"><table className="table"><thead><tr><th>Membre</th><th>Rôle actuel</th><th>Modifier le rôle</th></tr></thead><tbody>
          {staff.map(({ u, p }) => (
            <tr key={u.id}><td className="font-semibold">{p.firstName} {p.lastName}<span className="block text-xs font-normal text-neutral-500">{u.email}</span></td><td>{ROLE_LABELS[u.role]}</td>
              <td>{u.id !== me.id ? (
                <ActionForm action={setRoleAction} submitLabel="OK" submitClass="btn btn-dark btn-sm" className="flex flex-wrap items-center gap-1">
                  <input type="hidden" name="userId" value={u.id} />
                  <select name="role" defaultValue={u.role} className="input !w-auto !py-1 text-xs">{[...STAFF_ROLES, "learner"].map((r) => (<option key={r} value={r}>{ROLE_LABELS[r]}</option>))}</select>
                  <input name="confirmPassword" type="password" placeholder="Votre mot de passe" className="input !w-40 !py-1 text-xs" required />
                </ActionForm>) : <span className="text-xs text-neutral-500">(vous)</span>}</td></tr>
          ))}
        </tbody></table></div>
      </Panel>
      <Panel title="Créer un compte d'équipe">
        <ActionForm action={createStaffAction} submitLabel="Créer le compte" submitClass="btn btn-primary btn-sm" className="grid gap-3 sm:grid-cols-3">
          <Field label="Prénom" name="firstName" /><Field label="Nom" name="lastName" /><Field label="Rôle" name="role" as="select">{STAFF_ROLES.map((r) => (<option key={r} value={r}>{ROLE_LABELS[r]}</option>))}</Field>
          <Field label="E-mail" name="email" type="email" /><Field label="Téléphone" name="phone" type="tel" /><Field label="Mot de passe temporaire" name="password" type="password" autoComplete="new-password" />
          <PwdField />
        </ActionForm>
      </Panel>
      <Panel title="Matrice des permissions">
        <div className="table-wrap"><table className="table"><thead><tr><th>Permission</th>{STAFF_ROLES.map((r) => (<th key={r}>{ROLE_LABELS[r]}</th>))}</tr></thead><tbody>
          {Object.entries(PERMISSIONS).map(([k, l]) => (<tr key={k}><td>{l}</td>{STAFF_ROLES.map((r) => (<td key={r} className="text-center">{ROLE_PERMISSIONS[r].includes(k) ? "✓" : ""}</td>))}</tr>))}
        </tbody></table></div>
      </Panel>
    </div>
  );
}
