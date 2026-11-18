import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = process.env.SITE_URL || "https://hermanfashion.com";
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/compte", "/api"] }],
    sitemap: `${base}/sitemap.xml`,
  };
}
