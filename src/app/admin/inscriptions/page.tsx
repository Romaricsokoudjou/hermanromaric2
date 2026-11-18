import { desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { applicationItems, applications, centers, trainingDurations, trainingPrograms, userProfiles, users } from "@/db/schema";
import { requirePermission } from "@/lib/auth";
import { dateFr, fcfa } from "@/lib/format";
import { ActionForm, Field } from "@/components/ActionForm";
import { approveApplicationAction, cancelApplicationAdminAction } from "@/app/actions/admin";
import { StatusBadge } from "@/components/ui";
import { AdminTitle, Panel } from "@/components/admin";

export const metadata = { title: "Inscriptions" };

export default async function Page() {
  await requirePermission("applications.manage");
  const rows = await db
    .select({ a: applications, c: centers.name, p: userProfiles, email: users.email, phone: users.phone })
    .from(applications)
    .innerJoin(centers, eq(centers.id, applications.centerId))
    .innerJoin(userProfiles, eq(userProfiles.userId, applications.userId))
    .innerJoin(users, eq(users.id, applications.userId))
    .orderBy(desc(applications.createdAt))
    .limit(150);
  const items = rows.length
    ? await db
        .select({ i: applicationItems, t: trainingPrograms.title, d: trainingDurations.label })
        .from(applicationItems)
        .innerJoin(trainingPrograms, eq(trainingPrograms.id, applicationItems.programId))
        .innerJoin(trainingDurations, eq(trainingDurations.id, applicationItems.durationId))
        .where(inArray(applicationItems.applicationId, rows.map((r) => r.a.id)))
    : [];
  return (
    <div>
      <AdminTitle title="Inscriptions" subtitle="Les candidatures multi-formations sans règle de cumul définie exigent une validation administrative avant paiement." />
      <div className="space-y-4">
        {rows.map(({ a, c, p, email, phone }) => (
          <Panel key={a.id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold">{p.firstName} {p.lastName} <span className="font-normal text-neutral-500">· {email} · {phone}</span></p>
                <p className="text-sm text-neutral-500">{c} · {dateFr(a.createdAt, true)}</p>
              </div>
              <StatusBadge status={a.status} />
            </div>
            <ul className="mt-3 text-sm">
              {items.filter((x) => x.i.applicationId === a.id).map((x) => (<li key={x.i.id}>• {x.t} — {x.d} — {fcfa(x.i.tuitionFee)} + {fcfa(x.i.enrollmentFee)}</li>))}
            </ul>
            <p className="mt-2 text-sm">Total indicatif : <b>{fcfa(a.indicativeTotal)}</b> · Montant arrêté : <b>{a.approvedTotal ? fcfa(a.approvedTotal) : "—"}</b></p>
            {a.status === "needs_review" && (
              <ActionForm action={approveApplicationAction} submitLabel="Valider la candidature" submitClass="btn btn-primary btn-sm" className="mt-3 grid items-end gap-3 sm:grid-cols-3">
                <input type="hidden" name="applicationId" value={a.id} />
                <Field label="Montant final (FCFA)" name="approvedTotal" type="number" defaultValue={a.indicativeTotal} />
                <Field label="Note interne" name="note" required={false} />
              </ActionForm>
            )}
            {["draft", "needs_review", "pending_payment"].includes(a.status) && (
              <ActionForm action={cancelApplicationAdminAction} submitLabel="Annuler" submitClass="btn btn-outline btn-sm mt-2 text-red-600" confirmText="Annuler cette candidature ?" className="">
                <input type="hidden" name="applicationId" value={a.id} />
              </ActionForm>
            )}
          </Panel>
        ))}
        {!rows.length && <p className="text-sm text-neutral-500">Aucune candidature pour le moment.</p>}
      </div>
    </div>
  );
}
