import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { PostHogProvider } from "@/components/providers/posthog-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const appURL = process.env.NEXT_PUBLIC_APP_URL ?? "https://refereerequest.com";

export const metadata: Metadata = {
  metadataBase: new URL(appURL),
  title: {
    default: "RefereeRequest",
    template: "%s | RefereeRequest",
  },
  description:
    "Request, track, and receive references without chasing referees manually.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: appURL,
    siteName: "RefereeRequest",
    title: "RefereeRequest",
    description:
      "Request, track, and receive references without chasing referees manually.",
    images: [{ url: "/opengraph-image", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "RefereeRequest",
    description:
      "Request, track, and receive references without chasing referees manually.",
    images: ["/twitter-image"],
  },
  icons: {
    icon: [{ url: "/favicon.ico" }],
    shortcut: ["/favicon.ico"],
    apple: [{ url: "/favicon.ico" }],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <PostHogProvider>{children}</PostHogProvider>
      </body>
    </html>
  );
}
