import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import { getCatalog } from "@/lib/content";
import { StatusBadge } from "@/components/ui";
import { AdminTitle, Panel } from "@/components/admin";
import { ProgramForm } from "./ProgramForm";

export const metadata = { title: "Formations" };

export default async function Page() {
  await requirePermission("catalog.manage");
  const programs = await getCatalog({ all: true });
  return (
    <div>
      <AdminTitle title="Formations" subtitle="Chaque formation dispose d'une page détaillée publique, modifiable ici." />
      <Panel title="Catalogue">
        <ul className="divide-y">
          {programs.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-3 py-3 text-sm">
              <div><b>{p.title}</b><span className="block text-xs text-neutral-500">/formations/{p.slug} · {p.durations.length} durée(s)</span></div>
              <div className="flex items-center gap-3"><StatusBadge status={p.isActive ? "active" : "suspended"} /><Link href={`/admin/formations/${p.id}`} className="btn btn-outline btn-sm">Modifier</Link></div>
            </li>
          ))}
        </ul>
      </Panel>
      <Panel title="Ajouter une formation" className="mt-6">
        <ProgramForm />
      </Panel>
    </div>
  );
}
