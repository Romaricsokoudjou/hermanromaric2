import { desc, eq, and } from "drizzle-orm";
import { db } from "@/db";
import { documents, instructors } from "@/db/schema";
import { getContent } from "@/lib/content";
import { getSettings } from "@/lib/settings";
import { PageHero, RichText, Section, EmptyState } from "@/components/ui";

export const metadata = { title: "Notre institution", description: "Histoire, vision, mission et engagements de CFP Herman FASHION, école de beauté à Douala." };

export default async function InstitutionPage() {
  const [keys, settings, docs, team] = await Promise.all([
    Promise.all(["history", "vision", "mission", "commitments"].map(getContent)),
    getSettings(),
    db.select().from(documents).where(and(eq(documents.kind, "agrement"), eq(documents.isPublished, true))).orderBy(desc(documents.createdAt)),
    db.select().from(instructors).where(eq(instructors.isPublished, true)),
  ]);
  return (
    <>
      <PageHero eyebrow="Institution" title="CFP HERMAN FASHION" subtitle="Un centre de formation professionnelle dédié aux métiers de la beauté et du bien-être à Douala." />
      <Section>
        <div className="grid gap-6 md:grid-cols-2">
          {keys.map((c) => c && (
            <div key={c.key} className="card p-6 sm:p-8">
              <h2 className="font-display mb-3 text-2xl font-bold">{c.title}</h2>
              <RichText body={c.body} />
            </div>
          ))}
        </div>
      </Section>
      <Section className="bg-beige">
        <div className="grid items-start gap-8 lg:grid-cols-2">
          <div>
            <h2 className="font-display text-3xl font-bold">Crédibilité institutionnelle</h2>
            <p className="mt-4 text-sm font-semibold uppercase tracking-wide text-neutral-500">Référence officielle</p>
            <p className="mt-1 break-words rounded-xl border border-brand/30 bg-white p-4 font-mono text-sm">{settings["institution.arrete"]}</p>
            <p className="mt-4 text-sm text-neutral-600">Aucune distinction ni document administratif n&apos;est affiché sans avoir été fourni par l&apos;établissement.</p>
          </div>
          <div className="card p-6">
            <h3 className="font-display text-xl font-bold">Document officiel</h3>
            {docs.length ? (
              <ul className="mt-3 space-y-2">
                {docs.map((d) => (
                  <li key={d.id}><a href={d.fileUrl} target="_blank" rel="noopener noreferrer" className="text-brand underline">📄 {d.title}</a></li>
                ))}
              </ul>
            ) : (
              <div className="mt-3"><EmptyState title="Emplacement réservé" text="Le document officiel (arrêté) sera publié ici dès son téléversement depuis l'administration." /></div>
            )}
          </div>
        </div>
      </Section>
      <Section>
        <h2 className="font-display mb-6 text-3xl font-bold">Nos enseignants</h2>
        {team.length ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {team.map((t) => (<div key={t.id} className="card p-5"><p className="font-bold">{t.name}</p><p className="text-sm text-neutral-500">{t.title}</p></div>))}
          </div>
        ) : (
          <EmptyState title="Équipe pédagogique à présenter" text="Les fiches enseignants seront ajoutées par l'établissement." />
        )}
      </Section>
    </>
  );
}
