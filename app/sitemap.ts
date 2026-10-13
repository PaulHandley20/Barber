import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return [
    { url: `${siteUrl}/`, lastModified: now, changeFrequency: "monthly", priority: 1 },
    { url: `${siteUrl}/reservar`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${siteUrl}/privacidad`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
    { url: `${siteUrl}/terminos`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
  ];
}
