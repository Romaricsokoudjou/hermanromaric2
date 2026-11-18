import Link from "next/link";
import { redirect } from "next/navigation";
import { ActionForm, Field } from "@/components/ActionForm";
import { loginAction } from "@/app/actions/auth";
import { getCurrentUser } from "@/lib/auth";

export const metadata = { title: "Connexion" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; reset?: string }> }) {
  if (await getCurrentUser()) redirect("/compte");
  const sp = await searchParams;
  return (
    <div className="bg-beige py-12 sm:py-20">
      <div className="container-x max-w-md">
        <div className="card p-6 sm:p-8">
          <h1 className="font-display text-3xl font-bold">Connexion</h1>
          <p className="mt-1 text-sm text-neutral-600">Accédez à votre espace personnel.</p>
          {sp.reset && <p className="mt-4 rounded-xl bg-green-50 p-3 text-sm text-green-700">Mot de passe réinitialisé. Vous pouvez vous connecter.</p>}
          <ActionForm action={loginAction} submitLabel="Se connecter" className="mt-6 space-y-4">
            <input type="hidden" name="next" value={sp.next ?? ""} />
            <Field label="E-mail ou téléphone" name="identifier" autoComplete="username" />
            <Field label="Mot de passe" name="password" type="password" autoComplete="current-password" />
          </ActionForm>
          <div className="mt-5 flex justify-between text-sm">
            <Link href="/mot-de-passe-oublie" className="text-brand">Mot de passe oublié ?</Link>
            <Link href="/inscription" className="font-semibold">Créer un compte</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
