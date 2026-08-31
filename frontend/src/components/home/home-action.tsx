"use client";

import { Button } from "@/components/ui/button";
import { useAuthToken } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

type HomeActionProps = {
  kind: "account" | "request";
  label?: string;
  variant?: "default" | "secondary";
  size?: "default" | "lg";
  mobileLabel?: string;
  compactOnMobile?: boolean;
  className?: string;
  children?: ReactNode;
};

export function HomeAction({
  kind,
  label,
  variant = "default",
  size = "default",
  mobileLabel,
  compactOnMobile = false,
  className,
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
    <Button
      variant={variant}
      size={size}
      className={cn(
        compactOnMobile && "w-10 px-0 sm:w-auto sm:px-4",
        className,
      )}
      aria-label={compactOnMobile ? text : undefined}
      title={compactOnMobile ? text : undefined}
      onClick={() => router.push(path)}
    >
      <span className="inline-flex items-center gap-2">
        {compactOnMobile ? (
          <UserRound className="size-4 sm:hidden" aria-hidden="true" />
        ) : null}
        <span
          className={
            compactOnMobile
              ? "hidden sm:inline"
              : mobileLabel
                ? "hidden sm:inline"
                : undefined
          }
        >
          {text}
        </span>
        {!compactOnMobile && mobileLabel ? (
          <span className="sm:hidden">{mobileLabel}</span>
        ) : null}
        {children}
      </span>
    </Button>
  );
}
