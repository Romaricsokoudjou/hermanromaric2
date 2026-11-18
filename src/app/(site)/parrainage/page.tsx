import Link from "next/link";
import { getContent } from "@/lib/content";
import { getSettings } from "@/lib/settings";
import { getCurrentUser } from "@/lib/auth";
import { fcfa } from "@/lib/format";
import { RichText, Section, SectionTitle } from "@/components/ui";

export const metadata = {
  title: "Programme de parrainage HERMAN FASHION REWARDS",
  description: "Invitez vos proches à découvrir les formations Herman FASHION et gagnez des récompenses lorsque leurs inscriptions sont validées.",
};

export default async function ParrainagePage() {
  const [s, faq, terms, user] = await Promise.all([getSettings(), getContent("faq.referral"), getContent("referral.terms"), getCurrentUser()]);
  const cta = user ? "/compte/recompenses" : "/inscription";
  const items = (faq?.body ?? "").split(/\n\s*\n/).map((b) => {
    const [q, ...a] = b.split("\n");
    return { q, a: a.join("\n") };
  }).filter((i) => i.q);
  const trigger = s["rewards.training_trigger"] === "full_payment" ? "son paiement intégral" : "sa première tranche de paiement";
  return (
    <>
      <section className="relative overflow-hidden bg-gradient-to-br from-ink via-anthracite to-ink text-white">
        <div className="absolute -right-20 -top-20 h-96 w-96 rounded-full bg-brand/40 blur-3xl" />
        <div className="container-x relative py-16 sm:py-24">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-light">HERMAN FASHION REWARDS</p>
          <h1 className="font-display mt-3 max-w-3xl text-3xl font-black leading-tight sm:text-5xl">Et si vous gagniez des récompenses en faisant découvrir Herman FASHION ?</h1>
          <p className="mt-5 max-w-2xl text-lg text-white/80">Invitez vos proches à découvrir nos formations professionnelles et bénéficiez de récompenses lorsque leurs inscriptions sont validées.</p>
          <p className="mt-3 text-sm italic text-brand-light">« Partagez une opportunité, accompagnez un talent et gagnez des récompenses. »</p>
          <Link href={cta} className="btn btn-primary mt-8">CRÉER MON COMPTE ET PARRAINER</Link>
          {!s["rewards.enabled"] && <p className="mt-4 rounded-xl bg-white/10 p-3 text-sm">Le programme est actuellement suspendu par l&apos;administration.</p>}
        </div>
      </section>
      <Section>
        <SectionTitle eyebrow="Comment ça marche" title="Deux étapes, des récompenses transparentes" center />
        <div className="grid gap-6 md:grid-cols-2">
          <div className="card p-8">
            <span className="font-display text-5xl font-black text-brand">1</span>
            <h3 className="font-display mt-2 text-xl font-bold">Votre filleul valide son inscription</h3>
            <p className="mt-2 text-neutral-600">Il crée un compte avec votre lien, vérifie son téléphone et complète ses informations.</p>
            <p className="font-display mt-4 text-3xl font-bold text-brand-dark">Vous gagnez {fcfa(s["rewards.signup_bonus"])}</p>
          </div>
          <div className="card p-8">
            <span className="font-display text-5xl font-black text-brand">2</span>
            <h3 className="font-display mt-2 text-xl font-bold">Votre filleul effectue son paiement éligible</h3>
            <p className="mt-2 text-neutral-600">Dès que {trigger} est confirmé(e) par le système — jamais sur une simple intention de paiement.</p>
            <p className="font-display mt-4 text-3xl font-bold text-brand-dark">Vous gagnez {fcfa(s["rewards.training_bonus"])} supplémentaires</p>
          </div>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {["Un code, un lien et un QR code personnels", "Partage WhatsApp en un clic", "Portefeuille HERMAN REWARDS et retraits Mobile Money"].map((t) => (
            <p key={t} className="rounded-2xl bg-beige p-4 text-center text-sm font-semibold">{t}</p>
          ))}
        </div>
      </Section>
      <Section className="bg-beige">
        <div className="grid gap-8 lg:grid-cols-2">
          <div>
            <h2 className="font-display mb-4 text-2xl font-bold">{terms?.title}</h2>
            {terms && <RichText body={terms.body} />}
            <p className="mt-4 text-sm text-neutral-600">
              Retrait minimum : <b>{fcfa(s["withdrawal.min"])}</b>. {s["withdrawal.fee"] > 0 ? `Frais de retrait : ${fcfa(s["withdrawal.fee"])}.` : "Aucun frais de retrait n'est appliqué à ce jour."}{" "}
              <Link href="/legal/legal.parrainage" className="text-brand underline">Lire le règlement complet</Link>
            </p>
          </div>
          <div>
            <h2 className="font-display mb-4 text-2xl font-bold">Questions fréquentes</h2>
            <div className="space-y-3">
              {items.map((i) => (
                <details key={i.q} className="card group p-4">
                  <summary className="cursor-pointer list-none font-semibold">{i.q}</summary>
                  <p className="mt-2 whitespace-pre-line text-sm text-neutral-600">{i.a}</p>
                </details>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-10 text-center"><Link href={cta} className="btn btn-primary">CRÉER MON COMPTE ET PARRAINER</Link></div>
      </Section>
    </>
  );
}
