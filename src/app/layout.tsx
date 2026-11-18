import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { ensureBootstrap } from "@/lib/bootstrap";

export const dynamic = "force-dynamic";

const siteUrl = process.env.SITE_URL || "https://hermanfashion.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "CFP Herman FASHION — École de beauté à Douala | Formations professionnelles", template: "%s | Herman FASHION Douala" },
  description:
    "Herman FASHION, école de beauté à Douala : formation coiffure, onglerie, esthétique, make-up, massage, extension de cils, microblading et microshading au Cameroun.",
  keywords: ["école de beauté Douala", "formation esthétique Douala", "formation coiffure Cameroun", "formation onglerie Cameroun", "formation maquillage professionnel", "formation massage bien-être", "Herman FASHION Douala"],
  openGraph: { type: "website", locale: "fr_FR", siteName: "CFP Herman FASHION", title: "CFP Herman FASHION — École de beauté à Douala", description: "L'excellence dans les métiers de la beauté et du bien-être commence ici." },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = { themeColor: "#f26b1d", width: "device-width", initialScale: 1 };

export default async function RootLayout({ children }: { children: ReactNode }) {
  await ensureBootstrap();
  return (
    <html lang="fr">
      <body className="antialiased">{children}</body>
    </html>
  );
}
