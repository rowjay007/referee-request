"use client";

import { Button } from "@/components/ui/button";
import { useAuthToken } from "@/lib/auth";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

type HomeActionProps = {
  kind: "account" | "request";
  label?: string;
  variant?: "default" | "secondary";
  size?: "default" | "lg";
  children?: ReactNode;
};

export function HomeAction({
  kind,
  label,
  variant = "default",
  size = "default",
  children,
}: HomeActionProps) {
  const router = useRouter();
  const isAuthenticated = Boolean(useAuthToken());
  const path =
    kind === "account"
      ? isAuthenticated
        ? "/dashboard"
        : "/signin"
      : isAuthenticated
        ? "/dashboard/requests/new"
        : "/signup";
  const text = label ?? (isAuthenticated ? "Dashboard" : "Sign in");

  return (
    <Button variant={variant} size={size} onClick={() => router.push(path)}>
      <span className="inline-flex items-center gap-2">
        {text}
        {children}
      </span>
    </Button>
  );
}
