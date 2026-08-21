import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/dashboard/requests", label: "Requests" },
  { href: "/dashboard/requests/new", label: "Create request" },
  { href: "/dashboard/profile", label: "Profile" },
  { href: "/dashboard/settings", label: "Settings" },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-6 sm:px-10">
        <Link href="/" aria-label="Go to RefereeRequest home">
          <Image src="/referee-request-logo.svg" alt="RefereeRequest" width={40} height={40} priority />
        </Link>
        <nav className="flex flex-wrap items-center gap-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-full border border-border bg-surface px-3 py-1.5 text-sm text-muted transition-colors hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
          <Link
            href="/signout"
            className="rounded-full border border-border bg-surface px-3 py-1.5 text-sm text-muted transition-colors hover:text-foreground"
          >
            Sign out
          </Link>
        </nav>
      </header>
      {children}
    </div>
  );
}
