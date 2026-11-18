import { ActionForm, Field } from "@/components/ActionForm";
import { contactAction } from "@/app/actions/public";
import { getSettings } from "@/lib/settings";
import { getCenters } from "@/lib/content";
import { PageHero, Section } from "@/components/ui";

export const metadata = { title: "Contact", description: "Contactez Herman FASHION à Douala : téléphone, WhatsApp, réseaux sociaux et centres." };

export default async function ContactPage() {
  const [s, centers] = await Promise.all([getSettings(), getCenters()]);
  const wa = `${s["contact.whatsapp_url"]}?text=${encodeURIComponent(s["contact.whatsapp_message"])}`;
  return (
    <>
      <PageHero eyebrow="Contact" title="Parlons de votre projet de formation" subtitle="Notre équipe vous renseigne sur les formations et les modalités d'inscription." />
      <Section>
        <div className="grid gap-8 lg:grid-cols-5">
          <div className="space-y-4 lg:col-span-2">
            <div className="card p-6">
              <h2 className="font-display text-xl font-bold">Téléphones</h2>
              <ul className="mt-3 space-y-2">{s["contact.phones"].map((p) => (<li key={p}><a className="text-lg font-semibold text-brand-dark" href={`tel:${p.replace(/\s/g, "")}`}>{p}</a></li>))}</ul>
              <a href={wa} target="_blank" rel="noopener noreferrer" className="btn btn-primary mt-5 w-full">💬 Écrire sur WhatsApp</a>
              {s["contact.email"] && <p className="mt-4 text-sm">E-mail : <a className="underline" href={`mailto:${s["contact.email"]}`}>{s["contact.email"]}</a></p>}
            </div>
            <div className="card p-6">
              <h2 className="font-display text-xl font-bold">Réseaux sociaux</h2>
              <div className="mt-3 flex gap-2">
                <a href={s["contact.facebook"]} target="_blank" rel="noopener noreferrer" className="btn btn-dark btn-sm">Facebook</a>
                <a href={s["contact.tiktok"]} target="_blank" rel="noopener noreferrer" className="btn btn-dark btn-sm">TikTok</a>
              </div>
            </div>
            <div className="card p-6">
              <h2 className="font-display text-xl font-bold">Nos centres</h2>
              {centers.map((c) => (<p key={c.id} className="mt-3 text-sm"><b>{c.name}</b><br />{c.address}</p>))}
            </div>
          </div>
          <div className="card p-6 sm:p-8 lg:col-span-3">
            <h2 className="font-display text-2xl font-bold">Envoyez-nous un message</h2>
            <ActionForm action={contactAction} submitLabel="Envoyer" className="mt-5 space-y-4">
              <div className="hidden" aria-hidden="true"><input name="website" tabIndex={-1} autoComplete="off" /></div>
              <Field label="Nom complet" name="name" />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="E-mail" name="email" type="email" required={false} />
                <Field label="Téléphone" name="phone" type="tel" required={false} />
              </div>
              <Field label="Votre message" name="message" as="textarea" rows={5} />
            </ActionForm>
          </div>
        </div>
      </Section>
    </>
  );
}
