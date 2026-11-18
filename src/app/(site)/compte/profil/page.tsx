import { ActionForm, Field } from "@/components/ActionForm";
import { changePasswordAction, updateProfileAction } from "@/app/actions/auth";
import { requireUser } from "@/lib/auth";

export const metadata = { title: "Mon profil" };

export default async function Page() {
  const u = await requireUser();
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="card p-6">
        <h2 className="font-display text-xl font-bold">Informations personnelles</h2>
        <ActionForm action={updateProfileAction} submitLabel="Enregistrer" className="mt-4 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nom" name="lastName" defaultValue={u.lastName} />
            <Field label="Prénom" name="firstName" defaultValue={u.firstName} />
            <Field label="Pays" name="country" defaultValue={u.country} />
            <Field label="Ville" name="city" defaultValue={u.city} />
          </div>
          <p className="text-xs text-neutral-500">E-mail : {u.email} · Téléphone : {u.phone} (non modifiables en ligne : contactez l&apos;établissement).</p>
        </ActionForm>
      </div>
      <div className="card p-6">
        <h2 className="font-display text-xl font-bold">Changer le mot de passe</h2>
        <ActionForm action={changePasswordAction} submitLabel="Modifier" className="mt-4 space-y-4">
          <Field label="Mot de passe actuel" name="current" type="password" autoComplete="current-password" />
          <Field label="Nouveau mot de passe" name="password" type="password" autoComplete="new-password" />
          <Field label="Confirmation" name="confirm" type="password" autoComplete="new-password" />
        </ActionForm>
      </div>
    </div>
  );
}
