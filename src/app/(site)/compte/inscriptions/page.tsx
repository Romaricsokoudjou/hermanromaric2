import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { applications, centers } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { dateFr, fcfa } from "@/lib/format";
import { EmptyState, StatusBadge } from "@/components/ui";

export const metadata = { title: "Mes inscriptions" };

export default async function Page() {
  const user = await requireUser();
  const apps = await db.select({ a: applications, c: centers.name }).from(applications).innerJoin(centers, eq(centers.id, applications.centerId)).where(eq(applications.userId, user.id)).orderBy(desc(applications.createdAt));
  return apps.length ? (
    <div className="card table-wrap p-2">
      <table className="table">
        <thead><tr><th>Date</th><th>Centre</th><th>Montant</th><th>Statut</th><th /></tr></thead>
        <tbody>
          {apps.map(({ a, c }) => (
            <tr key={a.id}>
              <td>{dateFr(a.createdAt)}</td><td>{c}</td><td>{fcfa(a.approvedTotal ?? a.indicativeTotal)}</td><td><StatusBadge status={a.status} /></td>
              <td><Link href={`/compte/inscriptions/${a.id}`} className="font-semibold text-brand">Détails →</Link></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ) : (
    <EmptyState title="Aucune inscription pour le moment" cta={{ href: "/compte/candidature", label: "Choisir mes formations" }} />
  );
}
