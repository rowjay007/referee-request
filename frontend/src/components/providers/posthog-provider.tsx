"use client";

import { useEffect } from "react";

type Props = {
  children: React.ReactNode;
};

export function PostHogProvider({ children }: Props) {
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;

    if (!key || !host) {
      return;
    }

    const timer = window.setTimeout(async () => {
      const { default: posthog } = await import("posthog-js");
      posthog.init(key, {
        api_host: host,
        capture_pageview: false,
        capture_pageleave: true,
        person_profiles: "identified_only",
      });
      posthog.capture("landing_page_viewed");
    }, 5000);

    return () => window.clearTimeout(timer);
  }, []);

  return children;
}
