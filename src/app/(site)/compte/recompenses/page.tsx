import { desc, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { db } from "@/db";
import { referralAttributions, userProfiles, withdrawalRequests } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { ensureReferralCode, getReferrerStats, recentLedger } from "@/lib/rewards";
import { getContent } from "@/lib/content";
import { getSettings } from "@/lib/settings";
import { dateFr, fcfa, TX_LABELS } from "@/lib/format";
import { ActionForm, Field } from "@/components/ActionForm";
import { requestWithdrawalAction } from "@/app/actions/account";
import { CopyButton } from "@/components/Widgets";
import { RichText, Stat, StatusBadge } from "@/components/ui";

export const metadata = { title: "HERMAN FASHION REWARDS" };

export default async function Page() {
  const user = await requireUser();
  const [code, stats, ledger, s, terms] = await Promise.all([ensureReferralCode(user.id), getReferrerStats(user.id), recentLedger(user.id), getSettings(), getContent("referral.terms")]);
  const h = await headers();
  const origin = process.env.SITE_URL || `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
  const link = `${origin}/inscription?ref=${code}`;
  const wa = `https://wa.me/?text=${encodeURIComponent(`Découvre les formations professionnelles de Herman FASHION à Douala et inscris-toi avec mon lien : ${link}`)}`;
  const refs = await db
    .select({ a: referralAttributions, f: userProfiles.firstName })
    .from(referralAttributions)
    .innerJoin(userProfiles, eq(userProfiles.userId, referralAttributions.referredUserId))
    .where(eq(referralAttributions.referrerId, user.id))
    .orderBy(desc(referralAttributions.createdAt));
  const wds = await db.select().from(withdrawalRequests).where(eq(withdrawalRequests.userId, user.id)).orderBy(desc(withdrawalRequests.createdAt));
  const maxBar = Math.max(1, ...stats.weeks.map((w) => w.invited));
  const maxRew = Math.max(1, ...stats.weeks.map((w) => w.rewards));

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-ink to-anthracite p-6 text-white sm:p-8">
        <div className="absolute -right-10 -top-10 h-56 w-56 rounded-full bg-brand/40 blur-3xl" />
        <div className="relative grid gap-6 md:grid-cols-3">
          <div className="md:col-span-2">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-light">HERMAN FASHION REWARDS</p>
            <h2 className="font-display mt-1 text-2xl font-bold sm:text-3xl">Partagez une opportunité, gagnez des récompenses</h2>
            {!s["rewards.enabled"] && <p className="mt-2 rounded-lg bg-white/10 p-2 text-sm">Programme suspendu par l&apos;administration : aucun nouveau bonus n&apos;est attribué.</p>}
            <p className="mt-4 text-xs text-white/60">Mon code de parrainage</p>
            <p className="font-mono text-3xl font-black tracking-widest text-brand-light">{code}</p>
            <p className="mt-3 break-all rounded-xl bg-white/10 p-3 font-mono text-xs">{link}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <CopyButton text={link} label="Copier le lien" />
              <a href={wa} target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-sm">Partager sur WhatsApp</a>
            </div>
          </div>
          <div className="grid place-items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/api/qr" alt="QR code de parrainage" className="h-40 w-40 rounded-2xl bg-white p-2" />
          </div>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Personnes invitées" value={stats.invited} hint={`${stats.clicks} visite(s) du lien`} />
        <Stat label="Comptes validés" value={stats.validated} />
        <Stat label="Inscriptions payantes" value={stats.paying} />
        <Stat label="Récompenses générées" value={fcfa(stats.generated)} accent />
        <Stat label="Bonus d'inscription gagnés" value={fcfa(stats.signupBonus)} />
        <Stat label="Bonus de formation gagnés" value={fcfa(stats.trainingBonus)} />
        <Stat label="Récompenses en attente" value={fcfa(stats.wallet.pending)} hint="Vérification en cours" />
        <Stat label="Solde disponible" value={fcfa(stats.wallet.available)} hint={`Total déjà retiré : ${fcfa(stats.wallet.withdrawn)}`} accent />
      </div>

      <section className="card p-6">
        <h2 className="font-display text-xl font-bold">Progression sur 8 semaines</h2>
        <div className="mt-5 grid grid-cols-8 items-end gap-2" style={{ height: 160 }} role="img" aria-label="Graphique de progression des invitations et récompenses">
          {stats.weeks.map((w) => (
            <div key={w.label} className="flex h-full flex-col justify-end gap-1">
              <div className="flex flex-1 items-end justify-center gap-1">
                <div className="w-1/2 rounded-t bg-brand" style={{ height: `${(w.invited / maxBar) * 100}%`, minHeight: w.invited ? 4 : 1 }} title={`${w.invited} invité(s)`} />
                <div className="w-1/2 rounded-t bg-anthracite" style={{ height: `${(w.rewards / maxRew) * 100}%`, minHeight: w.rewards ? 4 : 1 }} title={fcfa(w.rewards)} />
              </div>
              <p className="text-center text-[10px] text-neutral-500">{w.label}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-neutral-500"><span className="mr-1 inline-block h-2 w-2 rounded-full bg-brand" />Invitations · <span className="mr-1 inline-block h-2 w-2 rounded-full bg-anthracite" />Récompenses (FCFA)</p>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-6">
          <h2 className="font-display text-xl font-bold">Demander un retrait</h2>
          <p className="mt-1 text-sm text-neutral-600">Minimum {fcfa(s["withdrawal.min"])} · {s["withdrawal.fee"] > 0 ? `frais ${fcfa(s["withdrawal.fee"])}` : "aucun frais de retrait configuré"}{s["withdrawal.max_per_request"] > 0 ? ` · plafond ${fcfa(s["withdrawal.max_per_request"])} par demande` : ""}.</p>
          <ActionForm action={requestWithdrawalAction} submitLabel="Envoyer ma demande" className="mt-4 space-y-4">
            <Field label="Nom du bénéficiaire" name="beneficiaryName" defaultValue={`${user.firstName} ${user.lastName}`} />
            <Field label="Numéro de téléphone" name="phone" type="tel" defaultValue={user.phone} />
            <Field label="Opérateur" name="operator" as="select">
              {s["withdrawal.operators"].map((o) => (<option key={o}>{o}</option>))}
            </Field>
            <Field label="Montant (FCFA)" name="amount" type="number" placeholder={String(s["withdrawal.min"])} />
          </ActionForm>
        </section>
        <section className="card p-6">
          <h2 className="font-display text-xl font-bold">Mes demandes de retrait</h2>
          {wds.length ? (
            <ul className="mt-3 divide-y text-sm">
              {wds.map((w) => (
                <li key={w.id} className="py-3"><div className="flex items-center justify-between"><b>{fcfa(w.amount)}</b><StatusBadge status={w.status} /></div><p className="text-neutral-500">{w.operator} · {w.phone} · {dateFr(w.createdAt, true)}</p>{w.status === "paid" && w.proofReference && <p className="text-xs text-green-700">Preuve : {w.proofReference}</p>}{w.rejectionReason && <p className="text-xs text-red-600">Motif : {w.rejectionReason}</p>}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-neutral-500">Aucune demande.</p>
          )}
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-6">
          <h2 className="font-display text-xl font-bold">Mes filleuls</h2>
          {refs.length ? (
            <ul className="mt-3 divide-y text-sm">{refs.map(({ a, f }) => (<li key={a.id} className="flex items-center justify-between py-2"><span>{f} · {dateFr(a.createdAt)}</span><StatusBadge status={a.status} /></li>))}</ul>
          ) : (
            <p className="mt-3 text-sm text-neutral-500">Personne n&apos;a encore utilisé votre code.</p>
          )}
        </section>
        <section className="card p-6">
          <h2 className="font-display text-xl font-bold">Historique financier (journal immuable)</h2>
          {ledger.length ? (
            <div className="table-wrap mt-3"><table className="table"><thead><tr><th>Date</th><th>Opération</th><th>Montant</th><th>Disponible</th></tr></thead><tbody>
              {ledger.map((t) => {
                const delta = t.availableDelta + t.pendingDelta + (t.type === "withdrawal_paid" ? 0 : 0);
                const shown = t.type === "withdrawal_paid" ? -t.withdrawnDelta : delta;
                return (<tr key={t.id}><td>{dateFr(t.createdAt)}</td><td>{TX_LABELS[t.type] ?? t.type}{t.note && <span className="block text-[11px] text-neutral-400">{t.note}</span>}</td><td className={t.type === "withdrawal_paid" ? "text-neutral-500" : shown >= 0 ? "font-semibold text-green-700" : "font-semibold text-red-600"}>{t.type === "withdrawal_paid" ? fcfa(t.withdrawnDelta) : `${shown >= 0 ? "+" : ""}${fcfa(shown)}`}</td><td>{fcfa(t.availableAfter)}</td></tr>);
              })}
            </tbody></table></div>
          ) : (
            <p className="mt-3 text-sm text-neutral-500">Aucune opération.</p>
          )}
        </section>
      </div>
      {terms && <section className="card p-6"><h2 className="font-display mb-3 text-xl font-bold">{terms.title}</h2><RichText body={terms.body} /></section>}
    </div>
  );
}
