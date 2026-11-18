import { getCenters } from "@/lib/content";
import { PageHero, Section } from "@/components/ui";

export const metadata = { title: "Nos centres à Douala", description: "Centres Herman FASHION à Ange Raphaël et Deido, Douala : adresses et itinéraires." };

export default async function Page() {
  const centers = await getCenters();
  return (
    <>
      <PageHero eyebrow="Centres" title="Nos centres de formation" subtitle="Retrouvez-nous à Douala, Cameroun." />
      <Section>
        <div className="grid gap-6 md:grid-cols-2">
          {centers.map((c) => (
            <article key={c.id} className="card overflow-hidden">
              <div className="grid h-40 place-items-center bg-gradient-to-br from-anthracite to-ink text-white">
                <div className="text-center"><p className="text-4xl">📍</p><p className="font-display text-xl font-bold">{c.name}</p></div>
              </div>
              <div className="p-6">
                <p className="text-neutral-700">{c.address}</p>
                {c.phone && <p className="mt-1 text-sm text-neutral-500">Tél. {c.phone}</p>}
                <div className="mt-5 flex flex-wrap gap-2">
                  {c.mapsUrl && <a href={c.mapsUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-sm">Voir la carte / Itinéraire</a>}
                  {c.mapsUrl && (
                    <a href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(c.address)}`} target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-sm">Calculer l&apos;itinéraire</a>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      </Section>
    </>
  );
}
