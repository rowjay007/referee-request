import type { MetadataRoute } from "next";

const appURL = process.env.NEXT_PUBLIC_APP_URL ?? "https://refereerequest.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    {
      url: `${appURL}/`,
      changeFrequency: "weekly",
      priority: 1,
      lastModified: now,
    },
    {
      url: `${appURL}/signin`,
      changeFrequency: "monthly",
      priority: 0.8,
      lastModified: now,
    },
    {
      url: `${appURL}/signup`,
      changeFrequency: "monthly",
      priority: 0.8,
      lastModified: now,
    },
    {
      url: `${appURL}/use-cases/academic-references`,
      changeFrequency: "monthly",
      priority: 0.8,
      lastModified: now,
    },
    {
      url: `${appURL}/use-cases/job-references`,
      changeFrequency: "monthly",
      priority: 0.8,
      lastModified: now,
    },
    {
      url: `${appURL}/use-cases/scholarships`,
      changeFrequency: "monthly",
      priority: 0.8,
      lastModified: now,
    },
  ];
}
