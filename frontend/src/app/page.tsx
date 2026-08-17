import Link from "next/link";
import {
  ArrowRight,
  BellRing,
  CalendarClock,
  CheckCircle2,
  Clock3,
  FileText,
  Fingerprint,
  Link2,
  MailCheck,
  Send,
  Sparkles,
  UserRoundSearch,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="relative overflow-hidden bg-background">
      <div className="pointer-events-none absolute left-[-10rem] top-[-10rem] h-80 w-80 rounded-full bg-primary/15 blur-3xl" />
      <div className="pointer-events-none absolute right-[-6rem] top-[8rem] h-72 w-72 rounded-full bg-secondary/20 blur-3xl" />
      <div className="pointer-events-none absolute bottom-[-8rem] left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-tertiary/15 blur-3xl" />

      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 py-8 sm:px-10">
        <header className="sticky top-0 z-20 mb-8 flex items-center justify-between rounded-xl border border-border/80 bg-surface/90 px-4 py-3 shadow-sm backdrop-blur">
          <p className="text-base font-semibold text-primary">RefereeRequest</p>
          <div className="flex items-center gap-2">
            <Button asChild variant="secondary">
              <Link href="/signin">Sign in</Link>
            </Button>
            <Button asChild>
              <Link href="/signup">Get started</Link>
            </Button>
          </div>
        </header>

        <section className="grid items-center gap-10 pb-12 pt-4 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-6">
            <p className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <Sparkles className="h-4 w-4" />
              Calm workflow for candidates and busy referees
            </p>
            <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
              Reference requests that feel polished, clear, and impossible to
              ignore.
            </h1>
            <p className="max-w-2xl text-lg leading-relaxed text-muted">
              Replace scattered WhatsApp messages and email threads with one
              structured request. Referees get everything they need in one link
              and submit without creating another account.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link href="/signup" className="inline-flex items-center gap-2">
                  Create free account
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="secondary" size="lg">
                <Link href="/dashboard/requests/new">See request builder</Link>
              </Button>
            </div>
            <div className="grid gap-2 pt-2 text-sm text-foreground sm:grid-cols-2">
              <p className="inline-flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-secondary" />
                Referees do not create accounts
              </p>
              <p className="inline-flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-secondary" />
                Secure, expiring request links
              </p>
              <p className="inline-flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-secondary" />
                Timeline and status transparency
              </p>
              <p className="inline-flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-secondary" />
                Mobile-first referee experience
              </p>
            </div>
          </div>

          <article className="group relative overflow-hidden rounded-2xl border border-border bg-surface p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
            <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-primary via-secondary to-tertiary" />
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Live request status</h2>
              <span className="rounded-full bg-secondary/15 px-2.5 py-1 text-xs font-medium text-secondary">
                3 steps left
              </span>
            </div>
            <div className="space-y-4 text-sm">
              <div className="flex items-start gap-3 rounded-lg border border-border/80 bg-background/70 p-3 transition-colors group-hover:border-primary/20">
                <Send className="mt-0.5 h-4 w-4 text-primary" />
                <div>
                  <p className="font-medium text-foreground">Request sent</p>
                  <p className="text-muted">Invitation delivered to Dr Adeyemi.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-lg border border-border/80 bg-background/70 p-3 transition-colors group-hover:border-secondary/20">
                <MailCheck className="mt-0.5 h-4 w-4 text-secondary" />
                <div>
                  <p className="font-medium text-foreground">Opened by referee</p>
                  <p className="text-muted">Viewed 2 hours ago on mobile.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-lg border border-border/80 bg-background/70 p-3 transition-colors group-hover:border-tertiary/25">
                <Clock3 className="mt-0.5 h-4 w-4 text-tertiary" />
                <div>
                  <p className="font-medium text-foreground">Awaiting submission</p>
                  <p className="text-muted">Deadline: Aug 31 · 8:00 PM</p>
                </div>
              </div>
            </div>
          </article>
        </section>

        <section className="grid gap-4 pb-12 md:grid-cols-3">
          <article className="group rounded-xl border border-border bg-surface p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
            <div className="mb-3 inline-flex rounded-lg bg-secondary/12 p-2 text-secondary">
              <UserRoundSearch className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">Candidate-first</h2>
            <p className="mt-2 text-sm text-muted">
              One request builder for institutions, programmes, deadlines, and
              required context.
            </p>
          </article>
          <article className="group rounded-xl border border-border bg-surface p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
            <div className="mb-3 inline-flex rounded-lg bg-primary/12 p-2 text-primary">
              <Link2 className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">Referee-light</h2>
            <p className="mt-2 text-sm text-muted">
              Referees open one secure link, review supporting files, upload and
              submit fast.
            </p>
          </article>
          <article className="group rounded-xl border border-border bg-surface p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
            <div className="mb-3 inline-flex rounded-lg bg-tertiary/18 p-2 text-tertiary">
              <CalendarClock className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">Deadline-aware</h2>
            <p className="mt-2 text-sm text-muted">
              Approaching deadlines stand out with clear language, not hidden
              statuses.
            </p>
          </article>
        </section>

        <section className="rounded-2xl border border-border bg-surface p-8 shadow-sm">
          <h2 className="text-2xl font-semibold text-foreground">
            Built for universities, scholarships, fellowships, and jobs.
          </h2>
          <p className="mt-2 max-w-3xl text-sm text-muted">
            RefereeRequest removes follow-up fatigue with secure links,
            structured context, and clear completion visibility from request to
            submission.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-border bg-background/60 p-4">
              <p className="text-xs font-medium text-muted">SECURITY</p>
              <p className="mt-2 inline-flex items-center gap-2 text-sm font-medium text-foreground">
                <Fingerprint className="h-4 w-4 text-primary" />
                Tokenized access boundaries
              </p>
            </div>
            <div className="rounded-lg border border-border bg-background/60 p-4">
              <p className="text-xs font-medium text-muted">VISIBILITY</p>
              <p className="mt-2 inline-flex items-center gap-2 text-sm font-medium text-foreground">
                <BellRing className="h-4 w-4 text-secondary" />
                Opened and submitted updates
              </p>
            </div>
            <div className="rounded-lg border border-border bg-background/60 p-4">
              <p className="text-xs font-medium text-muted">DOCUMENTS</p>
              <p className="mt-2 inline-flex items-center gap-2 text-sm font-medium text-foreground">
                <FileText className="h-4 w-4 text-tertiary" />
                Centralized supporting files
              </p>
            </div>
          </div>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/signup" className="inline-flex items-center gap-2">
                Start now
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="secondary">
              <Link href="/signin">Existing account</Link>
            </Button>
          </div>
        </section>
      </div>
    </main>
  );
}
