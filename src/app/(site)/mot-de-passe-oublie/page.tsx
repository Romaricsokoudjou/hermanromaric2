import { ActionForm, Field } from "@/components/ActionForm";
import { requestResetAction, resetPasswordAction } from "@/app/actions/auth";

export const metadata = { title: "Mot de passe oublié" };

export default function ForgotPage() {
  return (
    <div className="bg-beige py-12 sm:py-20">
      <div className="container-x grid max-w-4xl gap-6 md:grid-cols-2">
        <div className="card p-6">
          <h1 className="font-display text-2xl font-bold">1. Recevoir un code</h1>
          <p className="mt-1 text-sm text-neutral-600">Saisissez l&apos;e-mail ou le téléphone de votre compte.</p>
          <ActionForm action={requestResetAction} submitLabel="Envoyer le code" className="mt-5 space-y-4">
            <Field label="E-mail ou téléphone" name="identifier" />
          </ActionForm>
        </div>
        <div className="card p-6">
          <h2 className="font-display text-2xl font-bold">2. Nouveau mot de passe</h2>
          <ActionForm action={resetPasswordAction} submitLabel="Réinitialiser" className="mt-5 space-y-4">
            <Field label="E-mail ou téléphone" name="identifier" />
            <Field label="Code reçu" name="code" />
            <Field label="Nouveau mot de passe" name="password" type="password" autoComplete="new-password" />
            <Field label="Confirmation" name="confirm" type="password" autoComplete="new-password" />
          </ActionForm>
        </div>
      </div>
    </div>
  );
}
