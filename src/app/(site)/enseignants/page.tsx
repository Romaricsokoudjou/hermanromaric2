import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { instructors } from "@/db/schema";
import { EmptyState, PageHero, Section } from "@/components/ui";

export const metadata = { title: "Nos enseignants" };

export default async function Page() {
  const team = await db.select().from(instructors).where(eq(instructors.isPublished, true)).orderBy(asc(instructors.sortOrder));
  return (
    <>
      <PageHero eyebrow="Équipe" title="Nos enseignants" subtitle="Des professionnels engagés dans la transmission de leur savoir-faire." />
      <Section>
        {team.length ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {team.map((t) => (
              <article key={t.id} className="card overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {t.imageUrl ? <img src={t.imageUrl} alt={t.name} loading="lazy" className="aspect-[4/3] w-full object-cover" /> : <div className="grid aspect-[4/3] place-items-center bg-beige font-display text-5xl text-brand">{t.name[0]}</div>}
                <div className="p-5"><h2 className="font-display text-xl font-bold">{t.name}</h2><p className="text-sm font-semibold text-brand-dark">{t.title}</p><p className="mt-2 text-sm text-neutral-600">{t.bio}</p></div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState title="Aucun enseignant publié pour le moment" text="L'établissement publiera ici les profils de son équipe pédagogique." />
        )}
      </Section>
    </>
  );
}
