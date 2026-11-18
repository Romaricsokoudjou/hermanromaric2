import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { contactMessages, notifications, userProfiles } from "@/db/schema";
import { requirePermission } from "@/lib/auth";
import { ActionForm, Field } from "@/components/ActionForm";
import { broadcastAction, markContactHandledAction } from "@/app/actions/admin";
import { dateFr } from "@/lib/format";
import { AdminTitle, Panel } from "@/components/admin";

export const metadata = { title: "Notifications" };

export default async function Page() {
  await requirePermission("notifications.manage");
  const [msgs, notifs] = await Promise.all([
    db.select().from(contactMessages).orderBy(desc(contactMessages.createdAt)).limit(50),
    db.select({ n: notifications, f: userProfiles.firstName, l: userProfiles.lastName }).from(notifications).leftJoin(userProfiles, eq(userProfiles.userId, notifications.userId)).orderBy(desc(notifications.createdAt)).limit(50),
  ]);
  return (
    <div className="space-y-6">
      <AdminTitle title="Notifications & messages" subtitle="Les notifications automatiques ne sont créées que par des événements réels (parrainage, paiement, retrait…)." />
      <Panel title="Annonce interne">
        <ActionForm action={broadcastAction} submitLabel="Envoyer" submitClass="btn btn-primary btn-sm" className="grid gap-3 sm:grid-cols-2">
          <Field label="Destinataire (e-mail ou téléphone ; vide = tous les apprenants actifs)" name="target" required={false} />
          <Field label="Titre" name="title" />
          <div className="sm:col-span-2"><Field label="Message" name="body" as="textarea" rows={3} /></div>
        </ActionForm>
      </Panel>
      <Panel title="Messages reçus via le formulaire de contact">
        <ul className="divide-y">
          {msgs.map((m) => (
            <li key={m.id} className="py-3 text-sm">
              <div className="flex justify-between gap-3"><b>{m.name}</b><span className="text-xs text-neutral-500">{dateFr(m.createdAt, true)}</span></div>
              <p className="text-xs text-neutral-500">{m.email} {m.phone}</p>
              <p className="mt-1 whitespace-pre-line">{m.message}</p>
              {!m.handled && <ActionForm action={markContactHandledAction} submitLabel="Marquer comme traité" submitClass="btn btn-outline btn-sm mt-2" className=""><input type="hidden" name="id" value={m.id} /></ActionForm>}
            </li>
          ))}
          {!msgs.length && <li className="py-3 text-sm text-neutral-500">Aucun message.</li>}
        </ul>
      </Panel>
      <Panel title="Dernières notifications émises">
        <div className="table-wrap"><table className="table"><thead><tr><th>Date</th><th>Destinataire</th><th>Type</th><th>Titre</th><th>Canal</th></tr></thead><tbody>
          {notifs.map(({ n, f, l }) => (<tr key={n.id}><td>{dateFr(n.createdAt, true)}</td><td>{f} {l}</td><td className="text-xs">{n.type}</td><td>{n.title}</td><td>{n.channel}</td></tr>))}
        </tbody></table></div>
      </Panel>
    </div>
  );
}
