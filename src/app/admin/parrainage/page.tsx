import { desc, eq, ilike, inArray, like, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { fraudAlerts, referralAttributions, referralCampaigns, referralCodes, rewardHolds, rewardTransactions, systemSettingsHistory, userProfiles, users } from "@/db/schema";
import { requirePermission } from "@/lib/auth";
import { getProgramStats } from "@/lib/rewards";
import { getSettings, type SettingKey } from "@/lib/settings";
import { dateFr, fcfa, TX_LABELS } from "@/lib/format";
import { ActionForm, Field } from "@/components/ActionForm";
import { SettingsFields } from "@/components/SettingsFields";
import { correctAttributionAction, fraudDecisionAction, holdDecisionAction, saveCampaignAction, saveSettingsAction } from "@/app/actions/admin";
import { Stat, StatusBadge } from "@/components/ui";
import { AdminTitle, Panel, PwdField } from "@/components/admin";

export const metadata = { title: "Gestion HERMAN REWARDS" };

export default async function Page({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requirePermission("rewards.manage");
  const q = ((await searchParams).q ?? "").trim();
  const [stats, s, campaigns, holds, alerts, history, recent] = await Promise.all([
    getProgramStats(),
    getSettings(),
    db.select().from(referralCampaigns).orderBy(desc(referralCampaigns.createdAt)),
    db.select({ h: rewardHolds, rf: userProfiles.firstName, rl: userProfiles.lastName }).from(rewardHolds).innerJoin(userProfiles, eq(userProfiles.userId, rewardHolds.referrerId)).where(eq(rewardHolds.status, "held")).orderBy(desc(rewardHolds.createdAt)),
    db.select().from(fraudAlerts).orderBy(desc(fraudAlerts.createdAt)).limit(50),
    db.select().from(systemSettingsHistory).where(or(like(systemSettingsHistory.key, "rewards.%"), like(systemSettingsHistory.key, "withdrawal.%"))).orderBy(desc(systemSettingsHistory.createdAt)).limit(20),
    db.select().from(rewardTransactions).where(inArray(rewardTransactions.type, ["signup_bonus", "training_bonus", "clawback", "hold_release"])).orderBy(desc(rewardTransactions.createdAt)).limit(30),
  ]);
  const like2 = `%${q}%`;
  const referrers = await db
    .select({ code: referralCodes.code, uid: referralCodes.userId, f: userProfiles.firstName, l: userProfiles.lastName, email: users.email, status: users.status, n: sql<number>`(select count(*) from referral_attributions a where a.referrer_id = ${referralCodes.userId})::int` })
    .from(referralCodes)
    .innerJoin(userProfiles, eq(userProfiles.userId, referralCodes.userId))
    .innerJoin(users, eq(users.id, referralCodes.userId))
    .where(q ? or(ilike(referralCodes.code, like2), ilike(users.email, like2), ilike(userProfiles.lastName, like2)) : sql`(select count(*) from referral_attributions a where a.referrer_id = ${referralCodes.userId}) > 0`)
    .orderBy(desc(sql`2`))
    .limit(50);
  const attrs = await db
    .select({ a: referralAttributions, f: userProfiles.firstName, l: userProfiles.lastName })
    .from(referralAttributions)
    .innerJoin(userProfiles, eq(userProfiles.userId, referralAttributions.referredUserId))
    .orderBy(desc(referralAttributions.createdAt))
    .limit(50);
  const rk = (k: string[]) => k as SettingKey[];
  return (
    <div className="space-y-6">
      <AdminTitle title="Gestion du programme HERMAN REWARDS" subtitle="Programme de parrainage direct — aucune commission multi-niveaux. Toute modification de règle est historisée et non rétroactive." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Parrains actifs" value={stats.activeReferrers} />
        <Stat label="Filleuls (total)" value={stats.referees} />
        <Stat label="Inscriptions attribuées (validées)" value={stats.attributedSignups} />
        <Stat label="Paiements issus du parrainage" value={stats.payingReferees} hint="Filleuls ayant un paiement confirmé" />
        <Stat label="Total bonus d'inscription" value={fcfa(stats.signupBonuses)} />
        <Stat label="Total bonus de formation" value={fcfa(stats.trainingBonuses)} />
        <Stat label="Total retraits effectués" value={fcfa(stats.withdrawn)} />
        <Stat label="Récompenses restant à payer" value={fcfa(stats.toPay)} accent hint={`Attente ${fcfa(stats.pending)} · dispo ${fcfa(stats.available)} · retraits en cours ${fcfa(stats.reserved)}`} />
      </div>

      <Panel title="Règles du programme (montants, déclencheur, antifraude, retraits)">
        <ActionForm action={saveSettingsAction} submitLabel="Enregistrer les règles" submitClass="btn btn-primary" className="space-y-4">
          <input type="hidden" name="__group" value="rewards" />
          <SettingsFields keys={rk(["rewards.enabled", "rewards.signup_bonus", "rewards.training_bonus", "rewards.training_trigger", "rewards.training_once_per_referee", "rewards.clawback_policy", "rewards.max_signups_per_ip_per_day"])} s={s} />
          <PwdField />
        </ActionForm>
        <ActionForm action={saveSettingsAction} submitLabel="Enregistrer retraits & plafonds" submitClass="btn btn-primary" className="mt-6 space-y-4 border-t pt-6">
          <input type="hidden" name="__group" value="withdrawal" />
          <SettingsFields keys={rk(["withdrawal.min", "withdrawal.fee", "withdrawal.max_per_request", "withdrawal.max_per_month", "withdrawal.operators"])} s={s} />
          <PwdField />
        </ActionForm>
      </Panel>

      <Panel title="Récompenses en attente de vérification">
        {holds.length ? (
          <div className="table-wrap"><table className="table"><thead><tr><th>Parrain</th><th>Type</th><th>Montant</th><th>Motif</th><th>Décision</th></tr></thead><tbody>
            {holds.map(({ h, rf, rl }) => (
              <tr key={h.id}><td>{rf} {rl}</td><td>{h.kind === "signup" ? "Inscription" : "Formation"}</td><td>{fcfa(h.amount)}</td><td className="max-w-xs text-xs">{h.reason}</td>
                <td><ActionForm action={holdDecisionAction} hideSubmit className="grid min-w-[220px] gap-1">
                  <input type="hidden" name="holdId" value={h.id} />
                  <input name="note" placeholder="Justification" className="input !py-1 text-xs" />
                  <input name="confirmPassword" type="password" placeholder="Votre mot de passe" className="input !py-1 text-xs" required />
                  <div className="flex gap-1"><button name="decision" value="release" className="btn btn-primary btn-sm">Libérer</button><button name="decision" value="cancel" className="btn btn-outline btn-sm text-red-600">Annuler</button></div>
                </ActionForm></td></tr>
            ))}
          </tbody></table></div>
        ) : <p className="text-sm text-neutral-500">Aucune récompense en attente.</p>}
      </Panel>

      <Panel title="Alertes de fraude">
        {alerts.length ? (
          <div className="table-wrap"><table className="table"><thead><tr><th>Date</th><th>Type</th><th>Détail</th><th>Statut</th><th>Décision</th></tr></thead><tbody>
            {alerts.map((a) => (
              <tr key={a.id}><td>{dateFr(a.createdAt, true)}</td><td>{a.kind}<span className="block text-xs text-neutral-500">{a.severity}</span></td><td className="max-w-sm text-xs">{a.details}</td><td><StatusBadge status={a.status} /></td>
                <td>{a.status === "open" && (
                  <ActionForm action={fraudDecisionAction} hideSubmit className="grid gap-1">
                    <input type="hidden" name="alertId" value={a.id} />
                    <label className="flex items-center gap-1 text-xs"><input type="checkbox" name="suspend" /> suspendre le compte lié</label>
                    <div className="flex gap-1"><button name="decision" value="confirm" className="btn btn-dark btn-sm">Confirmer</button><button name="decision" value="dismiss" className="btn btn-outline btn-sm">Classer</button></div>
                  </ActionForm>
                )}</td></tr>
            ))}
          </tbody></table></div>
        ) : <p className="text-sm text-neutral-500">Aucune alerte.</p>}
      </Panel>

      <Panel title="Campagnes — budget et plafonds">
        <div className="space-y-3">
          {campaigns.map((c) => (
            <ActionForm key={c.id} action={saveCampaignAction} submitLabel="Enregistrer" submitClass="btn btn-dark btn-sm" className="grid items-end gap-3 rounded-xl border p-3 sm:grid-cols-6">
              <input type="hidden" name="id" value={c.id} />
              <Field label="Nom" name="name" defaultValue={c.name} />
              <Field label="Budget (0 = illimité)" name="budget" type="number" defaultValue={c.budget} />
              <Field label="Plafond / parrain" name="perReferrerCap" type="number" defaultValue={c.perReferrerCap} />
              <Field label="Début" name="startsAt" type="date" required={false} defaultValue={c.startsAt?.toISOString().slice(0, 10)} />
              <Field label="Fin" name="endsAt" type="date" required={false} defaultValue={c.endsAt?.toISOString().slice(0, 10)} />
              <label className="flex items-center gap-2 pb-3 text-sm"><input type="checkbox" name="isActive" defaultChecked={c.isActive} /> Active</label>
            </ActionForm>
          ))}
          <ActionForm action={saveCampaignAction} submitLabel="Créer la campagne" submitClass="btn btn-primary btn-sm" className="grid items-end gap-3 rounded-xl border border-dashed p-3 sm:grid-cols-6">
            <Field label="Nom" name="name" placeholder="Nouvelle campagne" />
            <Field label="Budget (0 = illimité)" name="budget" type="number" defaultValue={0} />
            <Field label="Plafond / parrain" name="perReferrerCap" type="number" defaultValue={0} />
            <Field label="Début" name="startsAt" type="date" required={false} />
            <Field label="Fin" name="endsAt" type="date" required={false} />
            <label className="flex items-center gap-2 pb-3 text-sm"><input type="checkbox" name="isActive" defaultChecked /> Active</label>
          </ActionForm>
          <p className="text-xs text-neutral-500">Au-delà du budget ou du plafond, les nouveaux bonus sont mis en attente de vérification (jamais perdus ni crédités automatiquement).</p>
        </div>
      </Panel>

      <Panel title="Parrains & filleuls">
        <form className="mb-3 flex gap-2"><input name="q" defaultValue={q} placeholder="Rechercher un code, e-mail ou nom…" className="input max-w-sm" /><button className="btn btn-dark btn-sm">Rechercher</button></form>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="table-wrap"><table className="table"><thead><tr><th>Parrain</th><th>Code</th><th>Filleuls</th><th>Statut</th></tr></thead><tbody>
            {referrers.map((r) => (<tr key={r.uid}><td>{r.f} {r.l}<span className="block text-xs text-neutral-500">{r.email}</span></td><td className="font-mono text-xs">{r.code}</td><td>{r.n}</td><td><StatusBadge status={r.status} /></td></tr>))}
            {!referrers.length && <tr><td colSpan={4} className="text-neutral-500">Aucun résultat.</td></tr>}
          </tbody></table></div>
          <div className="table-wrap"><table className="table"><thead><tr><th>Filleul</th><th>Code</th><th>Statut</th><th>Date</th></tr></thead><tbody>
            {attrs.map(({ a, f, l }) => (<tr key={a.id}><td>{f} {l}</td><td className="font-mono text-xs">{a.code}</td><td><StatusBadge status={a.status} /></td><td>{dateFr(a.createdAt)}</td></tr>))}
            {!attrs.length && <tr><td colSpan={4} className="text-neutral-500">Aucun filleul.</td></tr>}
          </tbody></table></div>
        </div>
        <h3 className="font-display mb-2 mt-6 font-bold">Corriger une attribution (erreur documentée, tracée dans l&apos;audit)</h3>
        <ActionForm action={correctAttributionAction} submitLabel="Corriger l'attribution" submitClass="btn btn-dark btn-sm" className="grid items-end gap-3 sm:grid-cols-2">
          <Field label="Filleul (e-mail ou téléphone)" name="referred" />
          <Field label="Code du bon parrain" name="code" />
          <Field label="Justification documentée" name="note" as="textarea" rows={2} />
          <PwdField />
        </ActionForm>
      </Panel>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Dernières récompenses distribuées">
          <div className="table-wrap"><table className="table"><tbody>
            {recent.map((t) => (<tr key={t.id}><td>{dateFr(t.createdAt, true)}</td><td>{TX_LABELS[t.type] ?? t.type}</td><td>{fcfa(t.availableDelta)}</td></tr>))}
            {!recent.length && <tr><td className="text-neutral-500">Aucune récompense distribuée.</td></tr>}
          </tbody></table></div>
        </Panel>
        <Panel title="Historique des modifications de règles">
          <div className="table-wrap"><table className="table"><tbody>
            {history.map((h) => (<tr key={h.id}><td>{dateFr(h.createdAt, true)}</td><td className="font-mono text-xs">{h.key}</td><td className="text-xs">{JSON.stringify(h.oldValue)} → {JSON.stringify(h.newValue)}</td></tr>))}
            {!history.length && <tr><td className="text-neutral-500">Aucune modification.</td></tr>}
          </tbody></table></div>
        </Panel>
      </div>
    </div>
  );
}
