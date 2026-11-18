import Link from "next/link";
import { PageHero, Section } from "@/components/ui";
import { getCatalog } from "@/lib/content";
import { fcfa } from "@/lib/format";

export const metadata = {
  title: "Nos formations en beauté et bien-être à Douala",
  description: "Coiffure femme, onglerie, esthétique bio, make-up, massage, pédicure-manucure, extension de cils, microblading et microshading à Douala.",
};

export default async function FormationsPage() {
  const programs = await getCatalog();
  return (
    <>
      <PageHero eyebrow="Catalogue" title="Nos formations professionnelles" subtitle="Neuf spécialités, des durées de 3 mois à 1 an, des diplômes AQP, CQP et DQP." />
      <Section>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {programs.map((p) => (
            <article key={p.id} className="card flex flex-col overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.imageUrl ?? ""} alt={p.title} loading="lazy" className="aspect-[16/10] w-full object-cover" />
              <div className="flex flex-1 flex-col p-5">
                <h2 className="font-display text-xl font-bold">{p.title}</h2>
                <p className="mt-2 text-sm text-neutral-600">{p.shortDescription}</p>
                <ul className="mt-4 space-y-1 text-sm">
                  {p.durations.map((d) => (
                    <li key={d.id} className="flex justify-between border-b border-dashed border-neutral-200 py-1">
                      <span>{d.label} <span className="text-xs text-neutral-500">({d.diploma})</span></span>
                      <b>{fcfa(d.tuitionFee)}</b>
                    </li>
                  ))}
                  {!p.durations.length && <li className="text-neutral-500">Durées et tarifs à confirmer par l&apos;établissement.</li>}
                </ul>
                <div className="mt-5 flex gap-2">
                  <Link href={`/formations/${p.slug}`} className="btn btn-outline btn-sm flex-1">Détails</Link>
                  <Link href={`/compte/candidature?programme=${p.slug}`} className="btn btn-primary btn-sm flex-1">S&apos;inscrire</Link>
                </div>
              </div>
            </article>
          ))}
        </div>
        <p className="mt-8 text-sm text-neutral-500">Les frais d&apos;inscription et polo sont indiqués séparément sur chaque fiche. Aucun frais supplémentaire n&apos;est appliqué sans mention explicite.</p>
      </Section>
    </>
  );
}
