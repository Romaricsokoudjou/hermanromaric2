import type { ReactNode } from "react";
import Link from "next/link";
import { and, count, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { requireUser } from "@/lib/auth";

const NAV = [
  ["/compte", "Tableau de bord"],
  ["/compte/candidature", "Nouvelle inscription"],
  ["/compte/inscriptions", "Mes inscriptions"],
  ["/compte/paiements", "Paiements & reçus"],
  ["/compte/recompenses", "Récompenses"],
  ["/compte/notifications", "Notifications"],
  ["/compte/verification", "Vérification"],
  ["/compte/profil", "Profil"],
];

export default async function AccountLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();
  const [unread] = await db.select({ n: count() }).from(notifications).where(and(eq(notifications.userId, user.id), eq(notifications.channel, "internal"), isNull(notifications.readAt)));
  return (
    <div className="bg-beige/60 pb-20">
      <div className="container-x py-8">
        <p className="text-sm text-neutral-500">Bonjour,</p>
        <h1 className="font-display text-3xl font-bold">{user.firstName} {user.lastName}</h1>
        <nav className="-mx-5 mt-5 flex gap-2 overflow-x-auto px-5 pb-2" aria-label="Espace personnel">
          {NAV.map(([h, l]) => (
            <Link key={h} href={h} className="whitespace-nowrap rounded-full bg-white px-4 py-2 text-sm font-semibold shadow-sm ring-1 ring-black/5 hover:bg-brand hover:text-white">
              {l}
              {h === "/compte/notifications" && (unread?.n ?? 0) > 0 && <span className="ml-1.5 rounded-full bg-brand px-1.5 py-0.5 text-[10px] text-white">{unread.n}</span>}
            </Link>
          ))}
        </nav>
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}
