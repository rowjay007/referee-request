import type { MetadataRoute } from "next";

const appURL = process.env.NEXT_PUBLIC_APP_URL ?? "https://refereerequest.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/dashboard", "/referee"],
    },
    sitemap: `${appURL}/sitemap.xml`,
    host: appURL,
  };
}
