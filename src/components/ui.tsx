import Link from "next/link";
import type { ReactNode } from "react";
import { STATUS_LABELS } from "@/lib/format";

export function RichText({ body, className = "" }: { body: string; className?: string }) {
  const blocks = body.split(/\n\s*\n/);
  return (
    <div className={`space-y-4 leading-relaxed text-neutral-700 ${className}`}>
      {blocks.map((b, i) => {
        const lines = b.split("\n");
        if (lines.every((l) => l.startsWith("- "))) {
          return (
            <ul key={i} className="list-disc space-y-1.5 pl-5">
              {lines.map((l, j) => (
                <li key={j}>{l.slice(2)}</li>
              ))}
            </ul>
          );
        }
        if (lines[0].startsWith("## ")) {
          return (
            <div key={i}>
              <h2 className="font-display mb-2 text-xl font-bold text-ink">{lines[0].slice(3)}</h2>
              {lines.slice(1).map((l, j) => (
                <p key={j}>{l}</p>
              ))}
            </div>
          );
        }
        return (
          <p key={i}>
            {lines.map((l, j) => (
              <span key={j}>
                {l}
                {j < lines.length - 1 && <br />}
              </span>
            ))}
          </p>
        );
      })}
    </div>
  );
}

export function PageHero({ title, subtitle, eyebrow }: { title: string; subtitle?: string; eyebrow?: string }) {
  return (
    <section className="relative overflow-hidden bg-ink text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_0%,rgba(242,107,29,0.35),transparent_55%)]" />
      <div className="container-x relative py-14 sm:py-20">
        {eyebrow && <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-brand-light">{eyebrow}</p>}
        <h1 className="font-display fade-up max-w-3xl text-3xl font-bold leading-tight sm:text-5xl">{title}</h1>
        {subtitle && <p className="fade-up-2 mt-4 max-w-2xl text-base text-white/75 sm:text-lg">{subtitle}</p>}
      </div>
    </section>
  );
}

export function Section({ children, className = "", id }: { children: ReactNode; className?: string; id?: string }) {
  return (
    <section id={id} className={`py-14 sm:py-20 ${className}`}>
      <div className="container-x">{children}</div>
    </section>
  );
}

export function SectionTitle({ eyebrow, title, text, center }: { eyebrow?: string; title: string; text?: string; center?: boolean }) {
  return (
    <div className={`mb-10 max-w-2xl ${center ? "mx-auto text-center" : ""}`}>
      {eyebrow && <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-brand">{eyebrow}</p>}
      <h2 className="font-display text-3xl font-bold leading-tight sm:text-4xl">{title}</h2>
      {text && <p className="mt-3 text-neutral-600">{text}</p>}
    </div>
  );
}

const TONES: Record<string, string> = {
  confirmed: "bg-green-100 text-green-800",
  paid: "bg-green-100 text-green-800",
  validated: "bg-green-100 text-green-800",
  active: "bg-green-100 text-green-800",
  released: "bg-green-100 text-green-800",
  approved: "bg-blue-100 text-blue-800",
  processing: "bg-blue-100 text-blue-800",
  pending: "bg-amber-100 text-amber-800",
  pending_payment: "bg-amber-100 text-amber-800",
  pending_validation: "bg-amber-100 text-amber-800",
  held: "bg-amber-100 text-amber-800",
  recorded: "bg-amber-100 text-amber-800",
  draft: "bg-neutral-200 text-neutral-700",
  needs_review: "bg-orange-100 text-orange-800",
  to_verify: "bg-orange-100 text-orange-800",
  open: "bg-orange-100 text-orange-800",
  failed: "bg-red-100 text-red-800",
  rejected: "bg-red-100 text-red-800",
  blocked: "bg-red-100 text-red-800",
  suspended: "bg-red-100 text-red-800",
  suspicious: "bg-red-100 text-red-800",
  cancelled: "bg-neutral-200 text-neutral-700",
  refunded: "bg-purple-100 text-purple-800",
  dismissed: "bg-neutral-200 text-neutral-700",
};

export function StatusBadge({ status }: { status: string }) {
  return <span className={`badge ${TONES[status] ?? "bg-neutral-100 text-neutral-700"}`}>{STATUS_LABELS[status] ?? status}</span>;
}

export function Stat({ label, value, hint, accent }: { label: string; value: ReactNode; hint?: string; accent?: boolean }) {
  return (
    <div className={`rounded-2xl p-5 ${accent ? "bg-brand text-white" : "card"}`}>
      <p className={`text-xs font-semibold uppercase tracking-wide ${accent ? "text-white/80" : "text-neutral-500"}`}>{label}</p>
      <p className="font-display mt-1 text-2xl font-bold sm:text-3xl">{value}</p>
      {hint && <p className={`mt-1 text-xs ${accent ? "text-white/80" : "text-neutral-500"}`}>{hint}</p>}
    </div>
  );
}

export function EmptyState({ title, text, cta }: { title: string; text?: string; cta?: { href: string; label: string } }) {
  return (
    <div className="rounded-2xl border-2 border-dashed border-beige-dark bg-beige/50 p-8 text-center">
      <p className="font-display text-lg font-bold">{title}</p>
      {text && <p className="mx-auto mt-2 max-w-md text-sm text-neutral-600">{text}</p>}
      {cta && (
        <Link href={cta.href} className="btn btn-primary mt-4">
          {cta.label}
        </Link>
      )}
    </div>
  );
}

/** Lecture d'une URL vidéo : fichier téléversé ou lien YouTube / Vimeo / Facebook. */
export function VideoEmbed({ url, title }: { url: string; title: string }) {
  const yt = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/);
  if (yt)
    return <iframe className="aspect-video w-full rounded-2xl" src={`https://www.youtube-nocookie.com/embed/${yt[1]}`} title={title} allowFullScreen loading="lazy" />;
  const vi = url.match(/vimeo\.com\/(\d+)/);
  if (vi) return <iframe className="aspect-video w-full rounded-2xl" src={`https://player.vimeo.com/video/${vi[1]}`} title={title} allowFullScreen loading="lazy" />;
  if (/facebook\.com/.test(url))
    return <iframe className="aspect-video w-full rounded-2xl" src={`https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=false`} title={title} allowFullScreen loading="lazy" />;
  return <video className="aspect-video w-full rounded-2xl bg-black" src={url} controls preload="metadata" title={title} />;
}
