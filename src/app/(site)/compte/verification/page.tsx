import { ActionForm, Field } from "@/components/ActionForm";
import { sendCodeAction, verifyCodeAction } from "@/app/actions/auth";
import { requireUser, showDevCodes } from "@/lib/auth";
import { StatusBadge } from "@/components/ui";

export const metadata = { title: "Vérification du compte" };

function Block({ purpose, label, value, verified }: { purpose: "phone" | "email"; label: string; value: string; verified: boolean }) {
  return (
    <div className="card p-6">
      <div className="flex items-center justify-between"><h2 className="font-display text-xl font-bold">{label}</h2><StatusBadge status={verified ? "validated" : "pending"} /></div>
      <p className="mt-1 text-sm text-neutral-600">{value}</p>
      {verified ? (
        <p className="mt-4 text-sm text-green-700">✓ Vérifié</p>
      ) : (
        <div className="mt-4 space-y-4">
          <ActionForm action={sendCodeAction} submitLabel="Recevoir un code" submitClass="btn btn-dark w-full" className="space-y-3">
            <input type="hidden" name="purpose" value={purpose} />
          </ActionForm>
          <ActionForm action={verifyCodeAction} submitLabel="Valider le code" className="space-y-3">
            <input type="hidden" name="purpose" value={purpose} />
            <Field label="Code à 6 chiffres" name="code" />
          </ActionForm>
        </div>
      )}
    </div>
  );
}

export default async function Page() {
  const user = await requireUser();
  return (
    <div className="space-y-4">
      <p className="text-sm text-neutral-600">La vérification du téléphone est nécessaire pour payer, retirer des récompenses et valider un parrainage.</p>
      {showDevCodes() && <p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-800">Mode démonstration : tant qu&apos;aucun fournisseur SMS/e-mail n&apos;est configuré (MESSAGING_WEBHOOK_URL), le code est affiché à l&apos;écran. À désactiver en production (SHOW_DEV_CODES).</p>}
      <div className="grid gap-6 md:grid-cols-2">
        <Block purpose="phone" label="Téléphone" value={user.phone} verified={!!user.phoneVerifiedAt} />
        <Block purpose="email" label="E-mail" value={user.email} verified={!!user.emailVerifiedAt} />
      </div>
    </div>
  );
}
