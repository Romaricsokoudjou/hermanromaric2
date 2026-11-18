import Link from "next/link";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { instructors, news, testimonials, videos } from "@/db/schema";
import { getCatalog, getCenters, getContent, lowestPrice } from "@/lib/content";
import { getSettings } from "@/lib/settings";
import { fcfa, dateFr } from "@/lib/format";
import { EmptyState, RichText, Section, SectionTitle, VideoEmbed } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth";

const SLOTS = [
  { slot: "presentation", title: "Présentation de Herman FASHION" },
  { slot: "formations", title: "Immersion dans les formations" },
  { slot: "temoignages", title: "Témoignages et expériences" },
];

export default async function HomePage() {
  const [programs, centers, settings, user, vids, team, tests, articles, vision] = await Promise.all([
    getCatalog(),
    getCenters(),
    getSettings(),
    getCurrentUser(),
    db.select().from(videos).where(eq(videos.isPublished, true)).orderBy(desc(videos.createdAt)),
    db.select().from(instructors).where(eq(instructors.isPublished, true)).limit(4),
    db.select().from(testimonials).where(eq(testimonials.isPublished, true)).orderBy(desc(testimonials.createdAt)).limit(3),
    db.select().from(news).where(and(eq(news.isPublished, true))).orderBy(desc(news.publishedAt)).limit(3),
    getContent("mission"),
  ]);
  const ctaHref = user ? "/compte/candidature" : "/inscription";
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "EducationalOrganization",
    name: "CFP Herman FASHION",
    description: "École de beauté à Douala : formations professionnelles aux métiers de la beauté et du bien-être.",
    address: { "@type": "PostalAddress", addressLocality: "Douala", addressCountry: "CM" },
    telephone: settings["contact.phones"],
    sameAs: [settings["contact.facebook"], settings["contact.tiktok"]],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      {/* HERO */}
      <section className="relative isolate overflow-hidden bg-ink text-white">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="https://images.pexels.com/photos/10593034/pexels-photo-10593034.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=900&w=1600" alt="Formation professionnelle en coiffure" className="absolute inset-0 -z-20 h-full w-full object-cover opacity-45" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-ink via-ink/80 to-transparent" />
        <div className="absolute -right-24 -top-24 -z-10 h-96 w-96 rounded-full bg-brand/30 blur-3xl" />
        <div className="container-x py-20 sm:py-28 lg:py-36">
          <p className="fade-up mb-4 inline-block rounded-full border border-white/25 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-brand-light">Votre talent mérite une formation d&apos;excellence.</p>
          <h1 className="font-display fade-up-2 max-w-3xl text-4xl font-black leading-[1.08] sm:text-6xl">L&apos;excellence dans les métiers de la beauté et du bien-être commence ici.</h1>
          <p className="fade-up-3 mt-6 max-w-2xl text-base text-white/80 sm:text-lg">Herman FASHION forme les talents de demain grâce à un enseignement professionnel, pratique et adapté aux exigences du secteur de la beauté.</p>
          <div className="fade-up-3 mt-9 flex flex-col gap-3 sm:flex-row">
            <Link href="/formations" className="btn btn-primary">Découvrir nos formations</Link>
            <Link href={ctaHref} className="btn btn-ghost-light">Commencer mon inscription</Link>
          </div>
          <dl className="mt-14 grid max-w-xl grid-cols-3 gap-6 border-t border-white/15 pt-6 text-sm">
            <div><dt className="text-white/50">Spécialités</dt><dd className="font-display text-2xl font-bold">{programs.length}</dd></div>
            <div><dt className="text-white/50">Centres</dt><dd className="font-display text-2xl font-bold">{centers.length}</dd></div>
            <div><dt className="text-white/50">Diplômes</dt><dd className="font-display text-2xl font-bold">AQP · CQP · DQP</dd></div>
          </dl>
        </div>
      </section>

      {/* INSTITUTION */}
      <Section>
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <SectionTitle eyebrow="Notre institution" title="Un centre de formation professionnel au cœur de Douala" />
            {vision && <RichText body={vision.body} />}
            <div className="mt-6 rounded-2xl border border-brand/30 bg-brand/5 p-4 text-sm">
              <p className="font-semibold text-brand-dark">Référence officielle</p>
              <p className="mt-1 break-words font-mono text-xs sm:text-sm">{settings["institution.arrete"]}</p>
            </div>
            <Link href="/institution" className="btn btn-dark mt-6">En savoir plus</Link>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {programs.slice(0, 4).map((p, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={p.id} src={p.imageUrl ?? ""} alt={p.title} loading="lazy" className={`h-44 w-full rounded-2xl object-cover shadow-lg sm:h-56 ${i % 2 ? "mt-6" : ""}`} />
            ))}
          </div>
        </div>
      </Section>

      {/* FORMATIONS */}
      <Section className="bg-beige">
        <SectionTitle eyebrow="Nos formations" title="Neuf spécialités pour construire votre avenir" text="Chaque formation allie théorie, pratique encadrée et préparation à l'insertion professionnelle." />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {programs.map((p) => {
            const low = lowestPrice(p);
            return (
              <Link key={p.id} href={`/formations/${p.slug}`} className="group card overflow-hidden transition hover:-translate-y-1">
                <div className="aspect-[16/10] overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.imageUrl ?? ""} alt={p.title} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                </div>
                <div className="p-5">
                  <h3 className="font-display text-xl font-bold">{p.title}</h3>
                  <p className="mt-2 line-clamp-2 text-sm text-neutral-600">{p.shortDescription}</p>
                  <p className="mt-4 flex items-center justify-between text-sm">
                    <span className="font-semibold text-brand-dark">{low ? `À partir de ${fcfa(low)}` : "Tarifs à venir"}</span>
                    <span className="text-brand">Détails →</span>
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </Section>

      {/* VIDÉOS */}
      <Section>
        <SectionTitle eyebrow="Vidéos" title="Herman FASHION en images" text="Trois espaces vidéo animés par l'établissement." />
        <div className="grid gap-5 lg:grid-cols-3">
          {SLOTS.map((s) => {
            const v = vids.find((x) => x.slot === s.slot);
            return (
              <div key={s.slot} className="card p-4">
                {v ? (
                  <VideoEmbed url={v.url} title={v.title} />
                ) : (
                  <div className="grid aspect-video place-items-center rounded-2xl bg-anthracite text-center text-white">
                    <div className="px-4">
                      <p className="text-3xl">▶</p>
                      <p className="mt-1 text-sm text-white/70">Vidéo prochainement disponible</p>
                    </div>
                  </div>
                )}
                <p className="mt-3 font-display font-bold">{v?.title ?? s.title}</p>
              </div>
            );
          })}
        </div>
      </Section>

      {/* CENTRES */}
      <Section className="bg-ink text-white">
        <SectionTitle eyebrow="Nos centres" title="Deux centres à Douala" />
        <div className="grid gap-5 md:grid-cols-2">
          {centers.map((c) => (
            <div key={c.id} className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <h3 className="font-display text-2xl font-bold">{c.name}</h3>
              <p className="mt-2 text-white/70">{c.address}</p>
              {c.mapsUrl && <a href={c.mapsUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary mt-5">Itinéraire</a>}
            </div>
          ))}
        </div>
      </Section>

      {/* ENSEIGNANTS */}
      <Section>
        <SectionTitle eyebrow="Nos enseignants" title="Une équipe pédagogique engagée" />
        {team.length ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {team.map((t) => (
              <div key={t.id} className="card overflow-hidden text-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {t.imageUrl ? <img src={t.imageUrl} alt={t.name} loading="lazy" className="aspect-square w-full object-cover" /> : <div className="grid aspect-square place-items-center bg-beige font-display text-4xl text-brand">{t.name[0]}</div>}
                <div className="p-4"><p className="font-bold">{t.name}</p><p className="text-sm text-neutral-500">{t.title}</p></div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="Présentation de l'équipe à venir" text="Les fiches des enseignants seront publiées par l'établissement." />
        )}
      </Section>

      {/* TÉMOIGNAGES */}
      <Section className="bg-beige">
        <SectionTitle eyebrow="Témoignages" title="Ils ont fait confiance à Herman FASHION" />
        {tests.length ? (
          <div className="grid gap-5 md:grid-cols-3">
            {tests.map((t) => (
              <figure key={t.id} className="card p-6">
                <blockquote className="text-neutral-700">« {t.content} »</blockquote>
                <figcaption className="mt-4 text-sm font-bold">{t.authorName}<span className="block font-normal text-neutral-500">{t.program}</span></figcaption>
              </figure>
            ))}
          </div>
        ) : (
          <EmptyState title="Témoignages authentiques à venir" text="Nous ne publions que des témoignages réels, recueillis auprès de nos apprenants." />
        )}
      </Section>

      {/* ACTUALITÉS */}
      <Section>
        <SectionTitle eyebrow="Actualités" title="La vie de l'établissement" />
        {articles.length ? (
          <div className="grid gap-5 md:grid-cols-3">
            {articles.map((a) => (
              <Link key={a.id} href={`/actualites#${a.slug}`} className="card p-5 hover:-translate-y-1 transition">
                <p className="text-xs text-neutral-500">{dateFr(a.publishedAt)}</p>
                <h3 className="font-display mt-1 text-lg font-bold">{a.title}</h3>
                <p className="mt-2 line-clamp-3 text-sm text-neutral-600">{a.excerpt}</p>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState title="Aucune actualité publiée pour le moment" cta={{ href: "/actualites", label: "Voir les actualités" }} />
        )}
      </Section>

      {/* MODALITÉS */}
      <Section className="bg-beige">
        <SectionTitle eyebrow="Modalités d'inscription" title="S'inscrire en cinq étapes" center />
        <ol className="grid gap-4 md:grid-cols-5">
          {["Créer mon compte", "Vérifier mon téléphone", "Choisir mes formations et mon centre", "Payer en ligne", "Recevoir ma confirmation et mon reçu"].map((s, i) => (
            <li key={s} className="card p-5">
              <span className="font-display text-3xl font-black text-brand">{i + 1}</span>
              <p className="mt-2 text-sm font-semibold">{s}</p>
            </li>
          ))}
        </ol>
        <div className="mt-8 text-center"><Link href={ctaHref} className="btn btn-primary">Commencer mon inscription</Link></div>
      </Section>

      {/* PARRAINAGE */}
      <section className="bg-gradient-to-br from-brand to-brand-dark py-16 text-white">
        <div className="container-x grid items-center gap-8 lg:grid-cols-2">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/80">HERMAN FASHION REWARDS</p>
            <h2 className="font-display mt-2 text-3xl font-bold sm:text-4xl">Partagez une opportunité, accompagnez un talent et gagnez des récompenses.</h2>
          </div>
          <div className="rounded-3xl bg-white/10 p-6 backdrop-blur">
            <p><b className="font-display text-2xl">{fcfa(settings["rewards.signup_bonus"])}</b> lorsque votre filleul valide son inscription.</p>
            <p className="mt-2"><b className="font-display text-2xl">{fcfa(settings["rewards.training_bonus"])}</b> lorsque son paiement éligible est confirmé.</p>
            <Link href="/parrainage" className="btn btn-dark mt-5">Découvrir le programme</Link>
          </div>
        </div>
      </section>
    </>
  );
}
