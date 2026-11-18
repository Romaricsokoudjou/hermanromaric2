import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { news } from "@/db/schema";
import { EmptyState, PageHero, RichText, Section } from "@/components/ui";
import { dateFr } from "@/lib/format";

export const metadata = { title: "Actualités" };

export default async function Page() {
  const items = await db.select().from(news).where(eq(news.isPublished, true)).orderBy(desc(news.publishedAt));
  return (
    <>
      <PageHero eyebrow="Actualités" title="Les nouvelles de Herman FASHION" />
      <Section>
        {items.length ? (
          <div className="space-y-6">
            {items.map((a) => (
              <article key={a.id} id={a.slug} className="card grid gap-5 overflow-hidden md:grid-cols-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {a.imageUrl && <img src={a.imageUrl} alt={a.title} loading="lazy" className="h-full max-h-72 w-full object-cover" />}
                <div className={`p-6 ${a.imageUrl ? "md:col-span-2" : "md:col-span-3"}`}>
                  <p className="text-xs text-neutral-500">{dateFr(a.publishedAt)}</p>
                  <h2 className="font-display mt-1 text-2xl font-bold">{a.title}</h2>
                  <RichText body={a.content} className="mt-3" />
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState title="Aucune actualité publiée" text="Revenez bientôt : les annonces de l'établissement apparaîtront ici." />
        )}
      </Section>
    </>
  );
}
