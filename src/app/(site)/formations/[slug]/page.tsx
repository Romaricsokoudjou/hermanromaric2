import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getProgram } from "@/lib/content";
import { fcfa } from "@/lib/format";
import { Section } from "@/components/ui";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const p = await getProgram((await params).slug);
  if (!p) return {};
  return { title: `Formation ${p.title} à Douala`, description: p.shortDescription, openGraph: { images: p.imageUrl ? [p.imageUrl] : [] } };
}

function List({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div className="card p-6">
      <h2 className="font-display text-xl font-bold">{title}</h2>
      <ul className="mt-3 space-y-2 text-sm text-neutral-700">
        {items.map((i) => (
          <li key={i} className="flex gap-2"><span className="text-brand">●</span>{i}</li>
        ))}
      </ul>
    </div>
  );
}

export default async function FormationPage({ params }: { params: Promise<{ slug: string }> }) {
  const p = await getProgram((await params).slug);
  if (!p) notFound();
  const ld = {
    "@context": "https://schema.org",
    "@type": "Course",
    name: p.title,
    description: p.shortDescription,
    provider: { "@type": "EducationalOrganization", name: "CFP Herman FASHION" },
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <section className="relative isolate bg-ink text-white">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={p.imageUrl ?? ""} alt={p.title} className="absolute inset-0 -z-10 h-full w-full object-cover opacity-40" />
        <div className="container-x py-16 sm:py-24">
          <Link href="/formations" className="text-sm text-white/70 hover:text-white">← Toutes les formations</Link>
          <h1 className="font-display mt-3 max-w-3xl text-4xl font-black sm:text-5xl">{p.title}</h1>
          <p className="mt-4 max-w-2xl text-white/80">{p.shortDescription}</p>
          <Link href={`/compte/candidature?programme=${p.slug}`} className="btn btn-primary mt-7">Je m&apos;inscris à cette formation</Link>
        </div>
      </section>
      <Section>
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <div className="card p-6"><h2 className="font-display text-xl font-bold">Description</h2><p className="mt-3 text-neutral-700">{p.description}</p></div>
            <List title="Objectifs pédagogiques" items={p.objectives} />
            <List title="Compétences développées" items={p.skills} />
            <List title="Programmes disponibles" items={p.programs} />
            <List title="Débouchés possibles" items={p.careers} />
          </div>
          <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
            <div className="card p-6">
              <h2 className="font-display text-xl font-bold">Durées & tarifs</h2>
              {p.durations.length ? (
                <div className="mt-4 space-y-4">
                  {p.durations.map((d) => (
                    <div key={d.id} className="rounded-xl border border-beige-dark p-4">
                      <div className="flex items-baseline justify-between"><b>{d.label}</b><span className="badge bg-brand/10 text-brand-dark">{d.diploma}</span></div>
                      <p className="font-display mt-1 text-2xl font-bold">{fcfa(d.tuitionFee)}</p>
                      <p className="text-xs text-neutral-500">+ Inscription et polo : {fcfa(d.enrollmentFee)}</p>
                      {d.installments.length > 0 && <p className="mt-2 text-xs text-neutral-600">Tranches : {d.installments.map((i) => fcfa(i)).join(" + ")}</p>}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm text-neutral-500">Tarifs à confirmer par l&apos;établissement.</p>
              )}
              <Link href={`/compte/candidature?programme=${p.slug}`} className="btn btn-primary mt-5 w-full">S&apos;inscrire</Link>
            </div>
          </aside>
        </div>
      </Section>
    </>
  );
}
