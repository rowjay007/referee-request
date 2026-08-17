import Link from "next/link";
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  FileText,
  Link2,
  ShieldCheck,
  UserRoundSearch,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="bg-background">
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 py-8 sm:px-10">
        <header className="flex items-center justify-between border-b border-border py-4">
          <p className="text-base font-semibold text-primary">RefereeRequest</p>
          <Button asChild variant="secondary">
            <Link href="/signin">Sign in</Link>
          </Button>
        </header>

        <section className="grid gap-10 py-14 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div className="space-y-6">
            <p className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-muted">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Referee links are secure and time-bound
            </p>
            <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
              Get references submitted on time without repeated follow-ups.
            </h1>
            <p className="max-w-2xl text-lg text-muted">
              Candidates create one complete request. Referees open a secure
              link, understand what is needed immediately, and submit in
              minutes without creating an account.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link href="/signup" className="inline-flex items-center gap-2">
                  Create free account
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="secondary" size="lg">
                <Link href="/dashboard/requests/new">Try request flow</Link>
              </Button>
            </div>
            <div className="grid gap-2 pt-2 text-sm text-foreground sm:grid-cols-2">
              <p className="inline-flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-secondary" />
                No referee account required
              </p>
              <p className="inline-flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-secondary" />
                Deadline-aware request tracking
              </p>
              <p className="inline-flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-secondary" />
                Supporting documents attached once
              </p>
              <p className="inline-flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-secondary" />
                Clear submission visibility
              </p>
            </div>
          </div>

          <article className="rounded-xl border border-border bg-surface p-6">
            <h2 className="text-lg font-semibold text-foreground">
              How it works
            </h2>
            <ol className="mt-5 space-y-4 text-sm text-foreground">
              <li className="flex gap-3">
                <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-white">
                  1
                </span>
                <span>Create one complete reference request.</span>
              </li>
              <li className="flex gap-3">
                <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-white">
                  2
                </span>
                <span>Referee receives a secure link and supporting context.</span>
              </li>
              <li className="flex gap-3">
                <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-white">
                  3
                </span>
                <span>Referee uploads and submits the reference quickly.</span>
              </li>
              <li className="flex gap-3">
                <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-white">
                  4
                </span>
                <span>You get notified when submission is complete.</span>
              </li>
            </ol>
          </article>
        </section>

        <section className="grid gap-4 pb-14 md:grid-cols-3">
          <article className="rounded-lg border border-border bg-surface p-5">
            <div className="mb-3 inline-flex rounded-md bg-secondary/10 p-2 text-secondary">
              <UserRoundSearch className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">Candidate-first</h2>
            <p className="mt-2 text-sm text-muted">
              Build requests once, then track open, pending, and submitted
              states clearly.
            </p>
          </article>
          <article className="rounded-lg border border-border bg-surface p-5">
            <div className="mb-3 inline-flex rounded-md bg-primary/10 p-2 text-primary">
              <Link2 className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">Referee-light</h2>
            <p className="mt-2 text-sm text-muted">
              Referees use a secure link with no dashboard onboarding or account
              creation friction.
            </p>
          </article>
          <article className="rounded-lg border border-border bg-surface p-5">
            <div className="mb-3 inline-flex rounded-md bg-tertiary/15 p-2 text-tertiary">
              <CalendarClock className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">Deadline-aware</h2>
            <p className="mt-2 text-sm text-muted">
              Keep each institution deadline visible so references arrive on
              time.
            </p>
          </article>
        </section>

        <section className="rounded-xl border border-border bg-surface p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-foreground">
                Built for scholarships, universities, jobs, and fellowships.
              </h2>
              <p className="mt-2 max-w-2xl text-sm text-muted">
                RefereeRequest removes the WhatsApp-and-email chaos by giving
                applicants and referees one clear path to completion.
              </p>
            </div>
            <div className="flex shrink-0 gap-3">
              <Button asChild>
                <Link href="/signup">Start now</Link>
              </Button>
              <Button asChild variant="secondary">
                <Link href="/signin" className="inline-flex items-center gap-2">
                  Existing account
                  <FileText className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
