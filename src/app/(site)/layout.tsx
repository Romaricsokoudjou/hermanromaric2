import type { ReactNode } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ChatWidget, CookieBanner, RefCapture } from "@/components/Widgets";
import { getCurrentUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { getLogoUrl } from "@/lib/content";
import { isStaff } from "@/lib/permissions";

export default async function SiteLayout({ children }: { children: ReactNode }) {
  const [user, settings, logoUrl] = await Promise.all([getCurrentUser(), getSettings(), getLogoUrl()]);
  return (
    <>
      <a href="#contenu" className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-white focus:p-2">
        Aller au contenu
      </a>
      <Header user={user ? { name: user.firstName, staff: isStaff(user.role) } : null} logoUrl={logoUrl} />
      <main id="contenu">{children}</main>
      <Footer settings={settings} logoUrl={logoUrl} />
      {/* Accès permanent à l'inscription (mobile) */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-black/10 bg-white/95 p-2.5 backdrop-blur lg:hidden">
        <Link href={user ? "/compte/candidature" : "/inscription"} className="btn btn-primary w-full">
          Commencer mon inscription
        </Link>
      </div>
      <ChatWidget />
      <CookieBanner />
      <RefCapture />
    </>
  );
}
