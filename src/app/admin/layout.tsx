import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { can, isStaff, ROLE_LABELS } from "@/lib/permissions";
import { Logo } from "@/components/Header";
import { logoutAction } from "@/app/actions/auth";

export const metadata = { title: { default: "Administration", template: "%s | Admin Herman FASHION" }, robots: { index: false, follow: false } };

const NAV: [string, string, string][] = [
  ["/admin", "Tableau de bord", "dashboard.view"],
  ["/admin/utilisateurs", "Utilisateurs & apprenants", "users.manage"],
  ["/admin/inscriptions", "Inscriptions", "applications.manage"],
  ["/admin/formations", "Formations", "catalog.manage"],
  ["/admin/tarifs", "Tarifs", "pricing.manage"],
  ["/admin/contenu/centres", "Centres", "catalog.manage"],
  ["/admin/paiements", "Paiements", "payments.manage"],
  ["/admin/finance", "Gestion financière", "finance.view"],
  ["/admin/portefeuilles", "Portefeuilles", "wallets.manage"],
  ["/admin/parrainage", "HERMAN REWARDS", "rewards.manage"],
  ["/admin/retraits", "Retraits", "withdrawals.manage"],
  ["/admin/contenu/enseignants", "Enseignants", "content.manage"],
  ["/admin/contenu/galerie", "Galerie", "content.manage"],
  ["/admin/contenu/videos", "Vidéos", "content.manage"],
  ["/admin/contenu/actualites", "Actualités", "content.manage"],
  ["/admin/contenu/temoignages", "Témoignages", "content.manage"],
  ["/admin/contenu/documents", "Documents & agrément", "content.manage"],
  ["/admin/contenu/textes", "Textes, FAQ, légal, logo", "content.manage"],
  ["/admin/medias", "Médiathèque", "content.manage"],
  ["/admin/ia", "HERMAN AI", "ai.manage"],
  ["/admin/notifications", "Notifications & messages", "notifications.manage"],
  ["/admin/administrateurs", "Administrateurs", "admins.manage"],
  ["/admin/parametres", "Paramètres généraux", "settings.manage"],
  ["/admin/audit", "Journal d'audit", "audit.view"],
];

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();
  if (!isStaff(user.role)) redirect("/compte");
  const links = NAV.filter(([, , p]) => can(user.role, p));
  return (
    <div className="min-h-screen bg-neutral-100 lg:flex">
      <aside className="bg-ink text-white lg:sticky lg:top-0 lg:h-screen lg:w-64 lg:shrink-0 lg:overflow-y-auto">
        <div className="flex items-center justify-between p-4 lg:block">
          <Link href="/"><Logo light /></Link>
          <p className="mt-3 hidden rounded-lg bg-white/10 p-2 text-xs lg:block">{user.firstName} {user.lastName}<br /><span className="text-brand-light">{ROLE_LABELS[user.role]}</span></p>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:grid lg:gap-0.5 lg:overflow-visible" aria-label="Administration">
          {links.map(([h, l]) => (
            <Link key={h} href={h} className="whitespace-nowrap rounded-lg px-3 py-2 text-sm text-white/80 hover:bg-white/10 hover:text-white">{l}</Link>
          ))}
          <form action={logoutAction}><button className="w-full whitespace-nowrap rounded-lg px-3 py-2 text-left text-sm text-white/50 hover:text-white">Déconnexion</button></form>
        </nav>
      </aside>
      <div className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">{children}</div>
    </div>
  );
}
