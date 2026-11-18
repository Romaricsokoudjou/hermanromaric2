import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { applications, centers, notifications } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { ensureReferralCode, getWallet } from "@/lib/rewards";
import { dateFr, fcfa } from "@/lib/format";
import { Stat, StatusBadge, EmptyState } from "@/components/ui";

export const metadata = { title: "Mon espace" };

export default async function AccountHome() {
  const user = await requireUser();
  const [apps, notifs, wallet, code] = await Promise.all([
    db.select({ a: applications, c: centers.name }).from(applications).innerJoin(centers, eq(centers.id, applications.centerId)).where(eq(applications.userId, user.id)).orderBy(desc(applications.createdAt)).limit(5),
    db.select().from(notifications).where(eq(notifications.userId, user.id)).orderBy(desc(notifications.createdAt)).limit(5),
    getWallet(user.id),
    ensureReferralCode(user.id),
  ]);
  const unverified = !user.phoneVerifiedAt || !user.emailVerifiedAt;
  return (
    <div className="space-y-6">
      {unverified && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm">
          <b>Vérification requise :</b> {!user.phoneVerifiedAt && "téléphone non vérifié. "}{!user.emailVerifiedAt && "e-mail non vérifié. "}
          <Link href="/compte/verification" className="font-semibold text-brand-dark underline">Vérifier maintenant</Link>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Solde disponible" value={fcfa(wallet.available)} hint="HERMAN REWARDS WALLET" accent />
        <Stat label="Récompenses en attente" value={fcfa(wallet.pending)} />
        <Stat label="Mon code de parrainage" value={<span className="font-mono text-2xl">{code}</span>} hint="Partagez votre lien dans Récompenses" />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-6">
          <div className="mb-4 flex items-center justify-between"><h2 className="font-display text-xl font-bold">Mes inscriptions</h2><Link href="/compte/candidature" className="btn btn-primary btn-sm">+ Nouvelle</Link></div>
          {apps.length ? (
            <ul className="divide-y">
              {apps.map(({ a, c }) => (
                <li key={a.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                  <div><Link href={`/compte/inscriptions/${a.id}`} className="font-semibold hover:text-brand">Inscription du {dateFr(a.createdAt)}</Link><p className="text-neutral-500">{c} · {fcfa(a.approvedTotal ?? a.indicativeTotal)}</p></div>
                  <StatusBadge status={a.status} />
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="Aucune inscription" text="Choisissez une ou plusieurs formations pour commencer." cta={{ href: "/compte/candidature", label: "Choisir mes formations" }} />
          )}
        </section>
        <section className="card p-6">
          <h2 className="font-display mb-4 text-xl font-bold">Dernières notifications</h2>
          {notifs.length ? (
            <ul className="divide-y">
              {notifs.map((n) => (
                <li key={n.id} className="py-3 text-sm"><p className="font-semibold">{n.title}</p><p className="text-neutral-500">{n.body}</p><p className="mt-1 text-xs text-neutral-400">{dateFr(n.createdAt, true)}</p></li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-neutral-500">Aucune notification pour le moment.</p>
          )}
        </section>
      </div>
      <section className="card p-6">
        <h2 className="font-display text-xl font-bold">Informations pédagogiques</h2>
        <p className="mt-2 text-sm text-neutral-600">Votre calendrier, vos horaires et les informations de votre centre vous seront communiqués par l&apos;établissement après confirmation de votre inscription. Pour toute question, contactez-nous via <Link href="/contact" className="text-brand underline">la page Contact</Link>.</p>
      </section>
    </div>
  );
}
