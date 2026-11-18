import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { testimonials, videos } from "@/db/schema";
import { EmptyState, PageHero, Section, VideoEmbed } from "@/components/ui";

export const metadata = { title: "Témoignages" };

export default async function Page() {
  const [items, vids] = await Promise.all([
    db.select().from(testimonials).where(eq(testimonials.isPublished, true)).orderBy(desc(testimonials.createdAt)),
    db.select().from(videos).where(eq(videos.slot, "temoignages")).orderBy(desc(videos.createdAt)),
  ]);
  const published = vids.filter((v) => v.isPublished);
  return (
    <>
      <PageHero eyebrow="Témoignages" title="Ils racontent leur expérience" subtitle="Uniquement des témoignages authentiques d'apprenants." />
      <Section>
        {published.length > 0 && <div className="mb-10 grid gap-5 md:grid-cols-2">{published.map((v) => (<div key={v.id} className="card p-4"><VideoEmbed url={v.url} title={v.title} /><p className="mt-2 font-bold">{v.title}</p></div>))}</div>}
        {items.length ? (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {items.map((t) => (
              <figure key={t.id} className="card p-6">
                <blockquote className="text-neutral-700">« {t.content} »</blockquote>
                <figcaption className="mt-4 text-sm font-bold">{t.authorName}<span className="block font-normal text-neutral-500">{t.program}</span></figcaption>
              </figure>
            ))}
          </div>
        ) : (
          <EmptyState title="Aucun témoignage publié pour le moment" text="Nous ne publions que des témoignages réels, validés par l'établissement." />
        )}
      </Section>
    </>
  );
}
