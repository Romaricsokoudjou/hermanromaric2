import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { gallery } from "@/db/schema";
import { EmptyState, PageHero, Section } from "@/components/ui";

export const metadata = { title: "Galerie" };

export default async function Page() {
  const items = await db.select().from(gallery).where(eq(gallery.isPublished, true)).orderBy(asc(gallery.sortOrder));
  return (
    <>
      <PageHero eyebrow="Galerie" title="La vie à Herman FASHION" subtitle="Réalisations, ateliers et moments d'apprentissage." />
      <Section>
        {items.length ? (
          <div className="columns-2 gap-4 md:columns-3">
            {items.map((g) => (
              <figure key={g.id} className="mb-4 break-inside-avoid overflow-hidden rounded-2xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={g.imageUrl} alt={g.title ?? "Galerie Herman FASHION"} loading="lazy" className="w-full object-cover" />
                {g.title && <figcaption className="bg-beige px-3 py-2 text-xs">{g.title}</figcaption>}
              </figure>
            ))}
          </div>
        ) : (
          <EmptyState title="La galerie sera bientôt alimentée" text="Les photographies authentiques de l'établissement seront ajoutées depuis l'administration." />
        )}
      </Section>
    </>
  );
}
