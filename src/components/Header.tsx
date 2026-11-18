"use client";

import Link from "next/link";
import { useState } from "react";
import { logoutAction } from "@/app/actions/auth";

export function Logo({ url, light }: { url?: string | null; light?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="Logo CFP Herman Fashion" className="h-10 w-auto" />
      ) : (
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand font-display text-lg font-black text-white shadow-md">HF</span>
      )}
      <span className="leading-tight">
        <span className={`font-display block text-lg font-black tracking-tight ${light ? "text-white" : "text-ink"}`}>HERMAN FASHION</span>
        <span className={`block text-[10px] font-semibold uppercase tracking-[0.22em] ${light ? "text-white/60" : "text-neutral-500"}`}>CFP · Douala</span>
      </span>
    </span>
  );
}

const MAIN = [
  { href: "/institution", label: "Institution" },
  { href: "/formations", label: "Formations" },
  { href: "/centres", label: "Centres" },
  { href: "/actualites", label: "Actualités" },
  { href: "/parrainage", label: "Parrainage" },
  { href: "/contact", label: "Contact" },
];
const MORE = [
  { href: "/enseignants", label: "Nos enseignants" },
  { href: "/galerie", label: "Galerie" },
  { href: "/temoignages", label: "Témoignages" },
];

export function Header({ user, logoUrl }: { user: { name: string; staff: boolean } | null; logoUrl: string | null }) {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b border-black/5 bg-white/90 backdrop-blur">
      <div className="container-x flex h-16 items-center justify-between gap-4">
        <Link href="/" aria-label="Accueil Herman Fashion" onClick={() => setOpen(false)}>
          <Logo url={logoUrl} />
        </Link>
        <nav className="hidden items-center gap-1 lg:flex" aria-label="Navigation principale">
          {MAIN.map((l) => (
            <Link key={l.href} href={l.href} className="rounded-full px-3 py-2 text-sm font-medium text-anthracite hover:bg-beige">
              {l.label}
            </Link>
          ))}
          <details className="relative">
            <summary className="cursor-pointer list-none rounded-full px-3 py-2 text-sm font-medium text-anthracite hover:bg-beige">Plus ▾</summary>
            <div className="card absolute right-0 mt-2 w-48 p-2">
              {MORE.map((l) => (
                <Link key={l.href} href={l.href} className="block rounded-lg px-3 py-2 text-sm hover:bg-beige">
                  {l.label}
                </Link>
              ))}
            </div>
          </details>
        </nav>
        <div className="hidden items-center gap-2 lg:flex">
          {user ? (
            <>
              <Link href={user.staff ? "/admin" : "/compte"} className="btn btn-outline btn-sm">
                {user.staff ? "Administration" : "Mon espace"}
              </Link>
              <form action={logoutAction}>
                <button className="px-2 text-sm text-neutral-500 hover:text-ink">Déconnexion</button>
              </form>
            </>
          ) : (
            <Link href="/connexion" className="px-3 text-sm font-semibold hover:text-brand">
              Connexion
            </Link>
          )}
          <Link href={user ? "/compte/candidature" : "/inscription"} className="btn btn-primary btn-sm">
            S&apos;inscrire
          </Link>
        </div>
        <button className="grid h-10 w-10 place-items-center rounded-xl border border-black/10 lg:hidden" aria-label="Menu" aria-expanded={open} onClick={() => setOpen(!open)}>
          <span className="text-xl leading-none">{open ? "✕" : "☰"}</span>
        </button>
      </div>
      {open && (
        <div className="border-t border-black/5 bg-white lg:hidden">
          <nav className="container-x grid gap-1 py-4" aria-label="Menu mobile">
            {[...MAIN, ...MORE].map((l) => (
              <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className="rounded-xl px-3 py-3 font-medium hover:bg-beige">
                {l.label}
              </Link>
            ))}
            <div className="mt-3 grid grid-cols-2 gap-2">
              {user ? (
                <Link href={user.staff ? "/admin" : "/compte"} onClick={() => setOpen(false)} className="btn btn-outline">
                  {user.staff ? "Administration" : "Mon espace"}
                </Link>
              ) : (
                <Link href="/connexion" onClick={() => setOpen(false)} className="btn btn-outline">
                  Connexion
                </Link>
              )}
              <Link href={user ? "/compte/candidature" : "/inscription"} onClick={() => setOpen(false)} className="btn btn-primary">
                S&apos;inscrire
              </Link>
            </div>
            {user && (
              <form action={logoutAction} className="mt-2">
                <button className="w-full rounded-xl px-3 py-3 text-left text-sm text-neutral-500">Se déconnecter</button>
              </form>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
