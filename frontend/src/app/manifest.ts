import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "RefereeRequest",
    short_name: "RefereeRequest",
    description: "Request and track references without chasing referees manually.",
    start_url: "/",
    display: "standalone",
    background_color: "#0b1020",
    theme_color: "#2563eb",
    icons: [
      {
        src: "/icon",
        sizes: "64x64",
        type: "image/png",
      },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
