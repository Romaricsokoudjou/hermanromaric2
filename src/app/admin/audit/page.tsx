import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { adminAuditLogs, userProfiles } from "@/db/schema";
import { requirePermission } from "@/lib/auth";
import { dateFr } from "@/lib/format";
import { AdminTitle, Panel } from "@/components/admin";

export const metadata = { title: "Journal d'audit" };

export default async function Page() {
  await requirePermission("audit.view");
  const rows = await db.select({ l: adminAuditLogs, f: userProfiles.firstName, n: userProfiles.lastName }).from(adminAuditLogs).leftJoin(userProfiles, eq(userProfiles.userId, adminAuditLogs.actorId)).orderBy(desc(adminAuditLogs.createdAt)).limit(300);
  return (
    <div>
      <AdminTitle title="Journal d'audit" subtitle="Journal immuable (modification et suppression bloquées en base)." />
      <Panel>
        <div className="table-wrap"><table className="table"><thead><tr><th>Date</th><th>Acteur</th><th>Action</th><th>Objet</th><th>Détail</th><th>IP</th></tr></thead><tbody>
          {rows.map(({ l, f, n }) => (<tr key={l.id}><td>{dateFr(l.createdAt, true)}</td><td>{f} {n}</td><td className="font-mono text-xs">{l.action}</td><td className="text-xs">{l.entity} {l.entityId?.slice(0, 8)}</td><td className="max-w-md break-all text-[11px] text-neutral-500">{l.after ? JSON.stringify(l.after).slice(0, 220) : ""}</td><td className="text-xs">{l.ip}</td></tr>))}
        </tbody></table></div>
      </Panel>
    </div>
  );
}
