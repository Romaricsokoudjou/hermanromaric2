import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { referralCodes, userProfiles } from "@/db/schema";
import { ActionForm, Field } from "@/components/ActionForm";
import { signupAction } from "@/app/actions/auth";
import { getCurrentUser } from "@/lib/auth";

export const metadata = { title: "Créer mon compte — Inscription", description: "Créez votre compte Herman FASHION pour vous inscrire à nos formations à Douala." };

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ ref?: string }> }) {
  if (await getCurrentUser()) redirect("/compte/candidature");
  const sp = await searchParams;
  const jar = await cookies();
  const ref = (sp.ref ?? jar.get("hf_ref")?.value ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 20);
  let referrerName: string | null = null;
  if (ref) {
    const [r] = await db
      .select({ f: userProfiles.firstName })
      .from(referralCodes)
      .innerJoin(userProfiles, eq(userProfiles.userId, referralCodes.userId))
      .where(eq(referralCodes.code, ref));
    referrerName = r?.f ?? null;
  }
  return (
    <div className="bg-beige py-10 sm:py-16">
      <div className="container-x grid gap-10 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand">Inscription</p>
          <h1 className="font-display mt-2 text-3xl font-bold sm:text-4xl">Créez votre compte Herman FASHION</h1>
          <p className="mt-4 text-neutral-600">Un compte personnel vous permet de choisir vos formations, payer en ligne, suivre vos inscriptions, télécharger vos reçus et parrainer vos proches.</p>
          {referrerName && (
            <p className="mt-5 rounded-2xl border border-brand/30 bg-white p-4 text-sm">
              🎁 Vous êtes invité(e) par <b>{referrerName}</b> (code <span className="font-mono">{ref}</span>). Ce parrainage sera automatiquement associé à votre compte.
            </p>
          )}
          <ul className="mt-6 space-y-2 text-sm text-neutral-600">
            <li>✓ Vérification de votre téléphone et de votre e-mail</li>
            <li>✓ Données protégées, accès strictement personnel</li>
            <li>✓ Aucun frais pour créer un compte</li>
          </ul>
        </div>
        <div className="card p-6 sm:p-8 lg:col-span-3">
          <ActionForm action={signupAction} submitLabel="Créer mon compte">
            <input type="hidden" name="ref" value={ref} />
            <input type="hidden" name="t" value={Date.now()} />
            <div className="hidden" aria-hidden="true">
              <label>Site web<input name="website" tabIndex={-1} autoComplete="off" /></label>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nom" name="lastName" autoComplete="family-name" />
              <Field label="Prénom" name="firstName" autoComplete="given-name" />
              <Field label="Téléphone" name="phone" type="tel" autoComplete="tel" placeholder="+237 6XX XX XX XX" />
              <Field label="E-mail" name="email" type="email" autoComplete="email" />
              <Field label="Pays" name="country" defaultValue="Cameroun" />
              <Field label="Ville" name="city" defaultValue="Douala" />
              <Field label="Mot de passe" name="password" type="password" autoComplete="new-password" hint="8 caractères minimum" />
              <Field label="Confirmer le mot de passe" name="confirm" type="password" autoComplete="new-password" />
            </div>
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" name="terms" className="mt-1" />
              <span>J&apos;accepte les <Link href="/conditions-generales" className="text-brand underline">conditions générales</Link> et la <Link href="/politique-de-confidentialite" className="text-brand underline">politique de confidentialité</Link>.</span>
            </label>
          </ActionForm>
          <p className="mt-4 text-center text-sm text-neutral-600">Déjà un compte ? <Link href="/connexion" className="font-semibold text-brand">Se connecter</Link></p>
        </div>
      </div>
    </div>
  );
}
