import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { trainingPrograms } from "@/db/schema";
import { requirePermission } from "@/lib/auth";
import { AdminTitle, Panel } from "@/components/admin";
import { ProgramForm } from "../ProgramForm";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("catalog.manage");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const [p] = await db.select().from(trainingPrograms).where(eq(trainingPrograms.id, id));
  if (!p) notFound();
  return (
    <div>
      <AdminTitle title={`Modifier : ${p.title}`}>
        <Link href="/admin/tarifs" className="btn btn-outline btn-sm">Durées & tarifs →</Link>
      </AdminTitle>
      <Panel><ProgramForm p={p} /></Panel>
    </div>
  );
}
