import Link from "next/link";
import { ShieldCheck, UserRoundSearch } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-12 px-6 py-10 sm:px-10">
      <section className="space-y-4">
        <p className="text-sm font-semibold text-primary">RefereeRequest</p>
        <h1 className="max-w-3xl text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Request references without chasing your referees.
        </h1>
        <p className="max-w-2xl text-base text-muted">
          RefereeRequest helps candidates send complete requests once and track
          progress while referees submit references in minutes without creating
          an account.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button asChild size="lg">
            <Link href="/signup">Create an account</Link>
          </Button>
          <Button asChild variant="secondary" size="lg">
            <Link href="/signin">Sign in</Link>
          </Button>
        </div>
      </section>
      <section className="grid gap-4 sm:grid-cols-2">
        <article className="rounded-lg border border-border bg-surface p-6">
          <div className="mb-3 inline-flex rounded-md bg-secondary/10 p-2 text-secondary">
            <UserRoundSearch className="h-5 w-5" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">For candidates</h2>
          <p className="mt-2 text-sm text-muted">
            Create one clear request, attach required documents, and track
            whether it has been opened or submitted.
          </p>
        </article>
        <article className="rounded-lg border border-border bg-surface p-6">
          <div className="mb-3 inline-flex rounded-md bg-primary/10 p-2 text-primary">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">For referees</h2>
          <p className="mt-2 text-sm text-muted">
            Open a secure link, review context quickly, upload reference, and
            submit without onboarding friction.
          </p>
        </article>
      </section>
    </main>
  );
}
