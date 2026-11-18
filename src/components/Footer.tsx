import Link from "next/link";
import { Logo } from "@/components/Header";
import type { Settings } from "@/lib/settings";

export function Footer({ settings, logoUrl }: { settings: Settings; logoUrl: string | null }) {
  const phones = settings["contact.phones"];
  return (
    <footer className="bg-ink pb-24 text-white/80 lg:pb-0">
      <div className="container-x grid gap-10 py-14 md:grid-cols-4">
        <div className="md:col-span-1">
          <Logo url={logoUrl} light />
          <p className="mt-4 text-sm text-white/60">Révélez votre talent, construisez votre avenir dans les métiers de la beauté et du bien-être.</p>
          <p className="mt-4 text-xs font-semibold text-brand-light">Learn. Create. Grow. Earn.</p>
        </div>
        <div>
          <h3 className="mb-3 text-sm font-bold text-white">Découvrir</h3>
          <ul className="space-y-2 text-sm">
            {[
              ["/institution", "Notre institution"],
              ["/formations", "Nos formations"],
              ["/enseignants", "Nos enseignants"],
              ["/galerie", "Galerie"],
              ["/temoignages", "Témoignages"],
              ["/actualites", "Actualités"],
              ["/centres", "Nos centres"],
            ].map(([h, l]) => (
              <li key={h}>
                <Link href={h} className="hover:text-brand-light">
                  {l}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="mb-3 text-sm font-bold text-white">Espace candidat</h3>
          <ul className="space-y-2 text-sm">
            {[
              ["/inscription", "Créer mon compte"],
              ["/connexion", "Connexion"],
              ["/parrainage", "Programme HERMAN REWARDS"],
              ["/mot-de-passe-oublie", "Mot de passe oublié"],
              ["/contact", "Contact"],
            ].map(([h, l]) => (
              <li key={h}>
                <Link href={h} className="hover:text-brand-light">
                  {l}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="mb-3 text-sm font-bold text-white">Nous joindre</h3>
          <ul className="space-y-2 text-sm">
            {phones.map((p) => (
              <li key={p}>
                <a href={`tel:${p.replace(/\s/g, "")}`} className="hover:text-brand-light">
                  {p}
                </a>
              </li>
            ))}
            <li>
              <a href={settings["contact.whatsapp_url"] + "?text=" + encodeURIComponent(settings["contact.whatsapp_message"])} target="_blank" rel="noopener noreferrer" className="hover:text-brand-light">
                WhatsApp
              </a>
            </li>
            <li>
              <a href={settings["contact.facebook"]} target="_blank" rel="noopener noreferrer" className="hover:text-brand-light">
                Facebook
              </a>
            </li>
            <li>
              <a href={settings["contact.tiktok"]} target="_blank" rel="noopener noreferrer" className="hover:text-brand-light">
                TikTok
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="container-x flex flex-col gap-3 py-6 text-xs text-white/50 md:flex-row md:items-center md:justify-between">
          <p>{settings["institution.arrete"]}</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            <Link href="/conditions-generales">Conditions générales</Link>
            <Link href="/politique-de-confidentialite">Confidentialité</Link>
            <Link href="/mentions-legales">Mentions légales</Link>
            <Link href="/legal/legal.paiement">Paiement &amp; remboursement</Link>
            <Link href="/legal/legal.parrainage">Règlement du parrainage</Link>
          </div>
        </div>
        <p className="container-x pb-6 text-xs text-white/40">© {new Date().getFullYear()} CFP HERMAN FASHION 4.0 — Tous droits réservés.</p>
      </div>
    </footer>
  );
}
