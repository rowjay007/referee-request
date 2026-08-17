import Link from "next/link";
import type { ComponentType } from "react";
import {
  ArrowRight,
  BellRing,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileBadge2,
  Fingerprint,
  Globe2,
  GraduationCap,
  Handshake,
  Link2,
  MailCheck,
  MessageCircleOff,
  Shield,
  Send,
  Sparkles,
  UserCheck2,
  UserRoundSearch,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="relative overflow-hidden bg-gradient-to-b from-slate-50 via-background to-slate-100">
      <div className="pointer-events-none absolute -left-40 top-0 h-[28rem] w-[28rem] rounded-full bg-primary/15 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 top-24 h-80 w-80 rounded-full bg-secondary/15 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-tertiary/10 blur-3xl" />

      <div className="mx-auto flex w-full max-w-6xl flex-col px-6 pb-16 pt-6 sm:px-10">
        <header className="sticky top-0 z-30 mb-8 flex items-center justify-between rounded-xl border border-border/80 bg-surface/85 px-4 py-3 shadow-sm backdrop-blur-md">
          <div className="inline-flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-primary" />
            <p className="text-base font-semibold text-primary">RefereeRequest</p>
          </div>
          <div className="hidden items-center gap-5 text-sm text-muted md:flex">
            <a href="#how-it-works" className="transition-colors hover:text-foreground">
              How it works
            </a>
            <a href="#why" className="transition-colors hover:text-foreground">
              Why it works
            </a>
            <a href="#faq" className="transition-colors hover:text-foreground">
              FAQ
            </a>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="secondary">
              <Link href="/signin">Sign in</Link>
            </Button>
            <Button asChild>
              <Link href="/signup">Get started</Link>
            </Button>
          </div>
        </header>

        <section className="grid items-center gap-10 pb-12 pt-2 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <p className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <Sparkles className="h-4 w-4" />
              Built for ambitious applicants and busy referees
            </p>
            <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
              Stop chasing references. Start tracking real progress.
            </h1>
            <p className="max-w-2xl text-lg leading-relaxed text-muted">
              RefereeRequest turns scattered emails and WhatsApp follow-ups into
              one clean, secure workflow from request to submission.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link href="/signup" className="inline-flex items-center gap-2">
                  Create free account
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="secondary">
                <Link href="/dashboard/requests/new">Build your first request</Link>
              </Button>
            </div>
            <div className="grid gap-3 pt-2 text-sm text-foreground sm:grid-cols-2">
              <p className="inline-flex items-center gap-2 rounded-md bg-surface/90 px-2.5 py-1.5 shadow-sm">
                <CheckCircle2 className="h-4 w-4 text-secondary" />
                No referee account required
              </p>
              <p className="inline-flex items-center gap-2 rounded-md bg-surface/90 px-2.5 py-1.5 shadow-sm">
                <CheckCircle2 className="h-4 w-4 text-secondary" />
                Secure, expiring links
              </p>
              <p className="inline-flex items-center gap-2 rounded-md bg-surface/90 px-2.5 py-1.5 shadow-sm">
                <CheckCircle2 className="h-4 w-4 text-secondary" />
                Status visibility at every step
              </p>
              <p className="inline-flex items-center gap-2 rounded-md bg-surface/90 px-2.5 py-1.5 shadow-sm">
                <CheckCircle2 className="h-4 w-4 text-secondary" />
                Designed for mobile submission
              </p>
            </div>
          </div>

          <article className="relative overflow-hidden rounded-2xl border border-border bg-surface p-6 shadow-lg shadow-slate-300/30 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
            <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-primary via-secondary to-tertiary" />
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-foreground">Request timeline</h2>
              <span className="rounded-full bg-secondary/15 px-2.5 py-1 text-xs font-medium text-secondary">
                In progress
              </span>
            </div>
            <div className="space-y-3">
              <div className="flex items-start gap-3 rounded-lg border border-border/80 bg-background/70 p-3">
                <Send className="mt-0.5 h-4 w-4 text-primary" />
                <div>
                  <p className="text-sm font-medium text-foreground">Request sent</p>
                  <p className="text-xs text-muted">
                    Complete details delivered to Prof. Okafor.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-lg border border-border/80 bg-background/70 p-3">
                <MailCheck className="mt-0.5 h-4 w-4 text-secondary" />
                <div>
                  <p className="text-sm font-medium text-foreground">Opened</p>
                  <p className="text-xs text-muted">Viewed on mobile 1 hour ago.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-lg border border-border/80 bg-background/70 p-3">
                <Clock3 className="mt-0.5 h-4 w-4 text-tertiary" />
                <div>
                  <p className="text-sm font-medium text-foreground">Awaiting upload</p>
                  <p className="text-xs text-muted">Deadline in 5 days.</p>
                </div>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-3 gap-2 text-center text-xs">
              <div className="rounded-md bg-primary/10 px-2 py-2 font-medium text-primary">
                1 Invite
              </div>
              <div className="rounded-md bg-secondary/10 px-2 py-2 font-medium text-secondary">
                2 Open
              </div>
              <div className="rounded-md bg-tertiary/15 px-2 py-2 font-medium text-tertiary">
                3 Submit
              </div>
            </div>
          </article>
        </section>

        <section id="why" className="grid gap-4 pb-12 md:grid-cols-3">
          <article className="group rounded-xl border border-border bg-surface p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
            <div className="mb-3 inline-flex rounded-lg bg-secondary/12 p-2 text-secondary">
              <UserRoundSearch className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">Candidate control</h3>
            <p className="mt-2 text-sm text-muted">
              Build one structured request with documents, context, and deadline
              instead of repeating details across channels.
            </p>
          </article>
          <article className="group rounded-xl border border-border bg-surface p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
            <div className="mb-3 inline-flex rounded-lg bg-primary/12 p-2 text-primary">
              <MessageCircleOff className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">Less chasing</h3>
            <p className="mt-2 text-sm text-muted">
              Status signals show whether requests were opened, pending, or
              submitted so you follow up with confidence.
            </p>
          </article>
          <article className="group rounded-xl border border-border bg-surface p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
            <div className="mb-3 inline-flex rounded-lg bg-tertiary/18 p-2 text-tertiary">
              <Handshake className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">Referee clarity</h3>
            <p className="mt-2 text-sm text-muted">
              Referees get purpose, institution, role, and upload action in one
              place without onboarding friction.
            </p>
          </article>
        </section>

        <section
          id="how-it-works"
          className="rounded-2xl border border-border bg-surface p-7 shadow-sm"
        >
          <h2 className="text-2xl font-semibold text-foreground">
            The 5-step completion flow
          </h2>
          <p className="mt-2 max-w-3xl text-sm text-muted">
            Optimized for fast completion on desktop and mobile.
          </p>
          <div className="mt-6 grid gap-3 md:grid-cols-5">
            <StepCard
              icon={UserCheck2}
              title="Create"
              text="Candidate creates request with context and deadline."
            />
            <StepCard
              icon={FileBadge2}
              title="Attach"
              text="Supporting documents are uploaded once."
            />
            <StepCard
              icon={Link2}
              title="Send"
              text="Secure link is delivered to the referee."
            />
            <StepCard
              icon={MailCheck}
              title="Review"
              text="Referee opens and reviews requirements quickly."
            />
            <StepCard
              icon={Send}
              title="Submit"
              text="Reference is uploaded and candidate is notified."
            />
          </div>
        </section>

        <section className="mt-12 grid gap-4 rounded-2xl border border-border bg-surface p-8 shadow-sm lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <h2 className="text-2xl font-semibold text-foreground">
              Built for scholarships, universities, fellowships, internships, and
              jobs.
            </h2>
            <p className="mt-2 max-w-3xl text-sm text-muted">
              RefereeRequest removes avoidable delays and gives you one trusted
              path from request to completed reference.
            </p>
            <div className="mt-4 grid gap-3 text-sm text-foreground sm:grid-cols-2">
              <p className="inline-flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                Tokenized access boundaries
              </p>
              <p className="inline-flex items-center gap-2">
                <BellRing className="h-4 w-4 text-secondary" />
                Submission visibility
              </p>
              <p className="inline-flex items-center gap-2">
                <Fingerprint className="h-4 w-4 text-primary" />
                Private file handling
              </p>
              <p className="inline-flex items-center gap-2">
                <CalendarClock className="h-4 w-4 text-tertiary" />
                Deadline-aware tracking
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <Button asChild size="lg">
              <Link href="/signup" className="inline-flex items-center gap-2">
                Start free today
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="secondary">
              <Link href="/signin" className="inline-flex items-center gap-2">
                I already have an account
                <ChevronRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>

        <section id="faq" className="mt-12 grid gap-4 md:grid-cols-3">
          <article className="rounded-xl border border-border bg-surface p-5">
            <p className="mb-2 inline-flex items-center gap-2 text-sm font-semibold text-foreground">
              <GraduationCap className="h-4 w-4 text-primary" />
              Do referees need accounts?
            </p>
            <p className="text-sm text-muted">
              No. They open a secure link and submit directly.
            </p>
          </article>
          <article className="rounded-xl border border-border bg-surface p-5">
            <p className="mb-2 inline-flex items-center gap-2 text-sm font-semibold text-foreground">
              <Globe2 className="h-4 w-4 text-secondary" />
              Is this only for universities?
            </p>
            <p className="text-sm text-muted">
              No. It supports scholarships, fellowships, jobs, and internships.
            </p>
          </article>
          <article className="rounded-xl border border-border bg-surface p-5">
            <p className="mb-2 inline-flex items-center gap-2 text-sm font-semibold text-foreground">
              <Shield className="h-4 w-4 text-tertiary" />
              Is the process secure?
            </p>
            <p className="text-sm text-muted">
              Yes. Links are tokenized and scoped to the request context.
            </p>
          </article>
        </section>
      </div>
    </main>
  );
}

type StepCardProps = {
  icon: ComponentType<{ className?: string }>;
  title: string;
  text: string;
};

function StepCard({ icon: Icon, title, text }: StepCardProps) {
  return (
    <article className="rounded-xl border border-border bg-background/60 p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-sm">
      <div className="mb-2 inline-flex rounded-md bg-primary/10 p-2 text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <p className="mt-1 text-xs leading-5 text-muted">{text}</p>
    </article>
  );
}
