import { desc, eq, and } from "drizzle-orm";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { markNotificationsReadAction } from "@/app/actions/account";
import { dateFr } from "@/lib/format";
import { EmptyState } from "@/components/ui";

export const metadata = { title: "Notifications" };

export default async function Page() {
  const user = await requireUser();
  const list = await db.select().from(notifications).where(and(eq(notifications.userId, user.id), eq(notifications.channel, "internal"))).orderBy(desc(notifications.createdAt)).limit(100);
  return list.length ? (
    <div className="space-y-3">
      <form action={markNotificationsReadAction}><button className="btn btn-outline btn-sm">Tout marquer comme lu</button></form>
      {list.map((n) => (
        <div key={n.id} className={`card p-4 ${n.readAt ? "" : "border-l-4 border-l-brand"}`}>
          <p className="font-semibold">{n.title}</p><p className="text-sm text-neutral-600">{n.body}</p><p className="mt-1 text-xs text-neutral-400">{dateFr(n.createdAt, true)}</p>
        </div>
      ))}
    </div>
  ) : (
    <EmptyState title="Aucune notification" text="Vous serez notifié(e) à chaque événement réel concernant votre compte." />
  );
}
