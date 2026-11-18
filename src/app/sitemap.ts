import type { MetadataRoute } from "next";
import { getCatalog } from "@/lib/content";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.SITE_URL || "https://hermanfashion.com";
  const programs = await getCatalog();
  const pages = ["", "/institution", "/formations", "/enseignants", "/galerie", "/temoignages", "/actualites", "/centres", "/contact", "/inscription", "/connexion", "/parrainage", "/conditions-generales", "/politique-de-confidentialite", "/mentions-legales"];
  return [
    ...pages.map((p) => ({ url: `${base}${p}`, changeFrequency: "weekly" as const, priority: p === "" ? 1 : 0.7 })),
    ...programs.map((p) => ({ url: `${base}/formations/${p.slug}`, changeFrequency: "weekly" as const, priority: 0.8 })),
  ];
}
