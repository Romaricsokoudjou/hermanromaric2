import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { applicationItems, applications } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { getCatalog, getCenters } from "@/lib/content";
import { getSettings } from "@/lib/settings";
import { Builder } from "@/components/Builder";

export const metadata = { title: "Mon inscription multi-formations" };

export default async function Page({ searchParams }: { searchParams: Promise<{ id?: string; programme?: string }> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const [programs, centers, settings] = await Promise.all([getCatalog(), getCenters(), getSettings()]);
  let initial: Record<string, string> = {};
  let centerId: string | undefined;
  let applicationId: string | undefined;
  if (sp.id) {
    const [a] = await db.select().from(applications).where(and(eq(applications.id, sp.id), eq(applications.userId, user.id)));
    if (a && ["draft", "needs_review", "pending_payment"].includes(a.status)) {
      applicationId = a.id;
      centerId = a.centerId;
      const items = await db.select().from(applicationItems).where(eq(applicationItems.applicationId, a.id));
      initial = Object.fromEntries(items.map((i) => [i.programId, i.durationId]));
    }
  }
  return (
    <div>
      <h2 className="font-display text-2xl font-bold">{applicationId ? "Modifier mon inscription" : "Choisir mes formations"}</h2>
      <p className="mb-5 mt-1 text-sm text-neutral-600">Sélectionnez une ou plusieurs formations, choisissez la durée de chacune et votre centre.</p>
      <Builder
        programs={programs.map((p) => ({ id: p.id, slug: p.slug, title: p.title, imageUrl: p.imageUrl, shortDescription: p.shortDescription, durations: p.durations }))}
        centers={centers.map((c) => ({ id: c.id, name: c.name, address: c.address }))}
        rule={settings["pricing.multi_rule"]}
        applicationId={applicationId}
        initialCenter={centerId}
        initialItems={initial}
        preselect={sp.programme}
      />
    </div>
  );
}
