import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { centers, siteContent, trainingDurations, trainingPrices, trainingPrograms } from "@/db/schema";

export type CatalogDuration = {
  id: string;
  key: string;
  label: string;
  months: number;
  diploma: string;
  isActive: boolean;
  priceId: string | null;
  tuitionFee: number;
  enrollmentFee: number;
  installments: number[];
};
export type CatalogProgram = typeof trainingPrograms.$inferSelect & { durations: CatalogDuration[] };

export async function getCatalog(opts: { all?: boolean } = {}): Promise<CatalogProgram[]> {
  const progs = await db.select().from(trainingPrograms).where(opts.all ? undefined : eq(trainingPrograms.isActive, true)).orderBy(asc(trainingPrograms.sortOrder), asc(trainingPrograms.title));
  const rows = await db
    .select({ d: trainingDurations, p: trainingPrices })
    .from(trainingDurations)
    .leftJoin(trainingPrices, eq(trainingPrices.durationId, trainingDurations.id))
    .orderBy(asc(trainingDurations.months));
  return progs.map((p) => ({
    ...p,
    durations: rows
      .filter((r) => r.d.programId === p.id && (opts.all || (r.d.isActive && r.p)))
      .map((r) => ({
        id: r.d.id,
        key: r.d.key,
        label: r.d.label,
        months: r.d.months,
        diploma: r.d.diploma,
        isActive: r.d.isActive,
        priceId: r.p?.id ?? null,
        tuitionFee: r.p?.tuitionFee ?? 0,
        enrollmentFee: r.p?.enrollmentFee ?? 0,
        installments: r.p?.installments ?? [],
      })),
  }));
}

export async function getProgram(slug: string) {
  const all = await getCatalog();
  return all.find((p) => p.slug === slug) ?? null;
}

export async function getContent(key: string) {
  const [row] = await db.select().from(siteContent).where(eq(siteContent.key, key));
  return row ?? null;
}

export async function getCenters(all = false) {
  return db.select().from(centers).where(all ? undefined : eq(centers.isActive, true)).orderBy(asc(centers.sortOrder));
}

export async function getLogoUrl() {
  const c = await getContent("brand.logo");
  return c?.body?.trim() || null;
}

export function lowestPrice(p: CatalogProgram) {
  const prices = p.durations.map((d) => d.tuitionFee + d.enrollmentFee).filter((n) => n > 0);
  return prices.length ? Math.min(...prices) : null;
}

export { and };
