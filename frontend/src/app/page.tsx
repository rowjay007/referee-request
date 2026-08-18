"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, type ComponentType } from "react";
import { useRouter } from "next/navigation";
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

type ToastState = {
  message: string;
  type: "info" | "success";
} | null;

export default function Home() {
  const router = useRouter();
  const [toast, setToast] = useState<ToastState>(null);

  useEffect(() => {
    if (!toast) {
      return;
    }
    const timer = window.setTimeout(() => setToast(null), 2200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  function navigateWithToast(path: string, message: string, type: "info" | "success") {
    setToast({ message, type });
    window.setTimeout(() => router.push(path), 260);
  }

  return (
    <main className="relative overflow-hidden bg-gradient-to-b from-slate-50 via-background to-slate-100">
      <div className="pointer-events-none absolute -left-40 top-0 h-[28rem] w-[28rem] rounded-full bg-primary/15 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 top-24 h-80 w-80 rounded-full bg-secondary/15 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-tertiary/10 blur-3xl" />

      <div className="mx-auto flex w-full max-w-6xl flex-col px-4 pb-14 pt-4 sm:px-8 sm:pb-16 sm:pt-6">
        <header className="sticky top-0 z-30 mb-8 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/80 bg-surface/85 px-4 py-3 shadow-sm backdrop-blur-md sm:flex-nowrap">
          <div className="inline-flex items-center gap-2.5">
            <Image
              src="/referee-request-logo.svg"
              alt="RefereeRequest"
              width={176}
              height={36}
              priority
            />
          </div>
          <div className="hidden items-center gap-5 text-sm text-muted md:flex">
            <a href="#how-it-works" className="transition-colors hover:text-foreground">
              The method
            </a>
            <a href="#why" className="transition-colors hover:text-foreground">
              Why it works
            </a>
            <a href="#faq" className="transition-colors hover:text-foreground">
              FAQ
            </a>
          </div>
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <Button
              variant="secondary"
              className="flex-1 sm:flex-none"
              onClick={() => navigateWithToast("/signin", "Opening sign in...", "info")}
            >
              Sign in
            </Button>
            <Button
              className="flex-1 sm:flex-none"
              onClick={() => navigateWithToast("/signup", "Starting your first request...", "success")}
            >
              Start free
            </Button>
          </div>
        </header>

        <section className="grid items-center gap-10 pb-12 pt-2 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <p className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <Sparkles className="h-4 w-4" />
              Reference requests that move forward
            </p>
            <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
              Make the ask.
              <span className="block bg-gradient-to-r from-primary to-tertiary bg-clip-text text-transparent">
                Lose the chase.
              </span>
            </h1>
            <p className="max-w-2xl text-lg leading-relaxed text-muted">
              RefereeRequest replaces scattered chats and email threads with one
              clear, secure workflow from request creation to final submission.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                size="lg"
                onClick={() => navigateWithToast("/signup", "Redirecting to Google sign up...", "success")}
              >
                <span className="inline-flex items-center gap-2">
                  Create your first request
                  <ArrowRight className="h-4 w-4" />
                </span>
              </Button>
              <Button
                size="lg"
                variant="secondary"
                onClick={() => navigateWithToast("/dashboard/requests/new", "Opening request builder...", "info")}
              >
                Build your first request
              </Button>
            </div>
            <p className="text-sm font-medium text-muted">
              No referee account required · No payment required to start
            </p>
            <div className="grid gap-3 pt-2 text-sm text-foreground sm:grid-cols-2">
              <p className="inline-flex items-center gap-2 rounded-md bg-surface/90 px-2.5 py-1.5 shadow-sm transition-transform duration-300 hover:-translate-y-0.5">
                <CheckCircle2 className="h-4 w-4 text-secondary" />
                No referee account required
              </p>
              <p className="inline-flex items-center gap-2 rounded-md bg-surface/90 px-2.5 py-1.5 shadow-sm transition-transform duration-300 hover:-translate-y-0.5">
                <CheckCircle2 className="h-4 w-4 text-secondary" />
                Secure, expiring links
              </p>
              <p className="inline-flex items-center gap-2 rounded-md bg-surface/90 px-2.5 py-1.5 shadow-sm transition-transform duration-300 hover:-translate-y-0.5">
                <CheckCircle2 className="h-4 w-4 text-secondary" />
                Status visibility at every step
              </p>
              <p className="inline-flex items-center gap-2 rounded-md bg-surface/90 px-2.5 py-1.5 shadow-sm transition-transform duration-300 hover:-translate-y-0.5">
                <CheckCircle2 className="h-4 w-4 text-secondary" />
                Designed for mobile submission
              </p>
            </div>
          </div>

          <article className="rr-card-tilt relative overflow-hidden rounded-2xl border border-border bg-surface p-6 shadow-xl shadow-slate-300/30 transition-all duration-300">
            <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-primary via-secondary to-tertiary" />
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-foreground">Live request / 024</h2>
              <span className="rr-float rounded-full border border-tertiary/30 bg-tertiary/10 px-2.5 py-1 text-xs font-medium text-tertiary">
                Moving
              </span>
            </div>
            <div className="space-y-3">
              <div className="flex items-start gap-3 rounded-lg border border-border/80 bg-background/70 p-3">
                <Send className="mt-0.5 h-4 w-4 text-primary" />
                <div>
                  <p className="text-sm font-medium text-foreground">Request sent</p>
                  <p className="text-xs text-muted">
                    Complete details delivered to Dr. Amelia Hart.
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

        <section className="relative mb-12 overflow-hidden rounded-xl border border-border/60 bg-white/70 py-3">
          <div className="rr-marquee-track flex min-w-max items-center gap-8 px-4 text-xs font-semibold uppercase tracking-[0.2em] text-muted">
            <span>One request</span>
            <span>Secure link</span>
            <span>Referee opens</span>
            <span>Status updates</span>
            <span>Reference submitted</span>
            <span>One request</span>
            <span>Secure link</span>
            <span>Referee opens</span>
            <span>Status updates</span>
            <span>Reference submitted</span>
          </div>
        </section>

        <section id="why" className="grid gap-4 pb-12 md:grid-cols-3">
          <article className="rr-hover-lift group rounded-xl border border-border bg-surface p-5 shadow-sm">
            <div className="mb-3 inline-flex rounded-lg bg-secondary/12 p-2 text-secondary">
              <UserRoundSearch className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">Candidate control</h3>
            <p className="mt-2 text-sm text-muted">
              Build one structured request with documents, context, and deadline
              instead of repeating details across channels.
            </p>
          </article>
          <article className="rr-hover-lift group rounded-xl border border-border bg-surface p-5 shadow-sm">
            <div className="mb-3 inline-flex rounded-lg bg-primary/12 p-2 text-primary">
              <MessageCircleOff className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">Less chasing</h3>
            <p className="mt-2 text-sm text-muted">
              Status signals show whether requests were opened, pending, or
              submitted so you follow up with confidence.
            </p>
          </article>
          <article className="rr-hover-lift group rounded-xl border border-border bg-surface p-5 shadow-sm">
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
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">
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
            <Button
              size="lg"
              onClick={() => navigateWithToast("/signup", "Starting your request...", "success")}
            >
              <span className="inline-flex items-center gap-2">
                Start free today
                <ArrowRight className="h-4 w-4" />
              </span>
            </Button>
            <Button
              size="lg"
              variant="secondary"
              onClick={() => navigateWithToast("/signin", "Opening sign in...", "info")}
            >
              <span className="inline-flex items-center gap-2">
                I already have an account
                <ChevronRight className="h-4 w-4" />
              </span>
            </Button>
          </div>
        </section>

        <section id="faq" className="mt-12 grid gap-4 md:grid-cols-3">
          <article className="rr-hover-lift rounded-xl border border-border bg-surface p-5">
            <p className="mb-2 inline-flex items-center gap-2 text-sm font-semibold text-foreground">
              <GraduationCap className="h-4 w-4 text-primary" />
              Do referees need accounts?
            </p>
            <p className="text-sm text-muted">
              No. They open a secure link and submit directly.
            </p>
          </article>
          <article className="rr-hover-lift rounded-xl border border-border bg-surface p-5">
            <p className="mb-2 inline-flex items-center gap-2 text-sm font-semibold text-foreground">
              <Globe2 className="h-4 w-4 text-secondary" />
              Is this only for universities?
            </p>
            <p className="text-sm text-muted">
              No. It supports scholarships, fellowships, jobs, and internships.
            </p>
          </article>
          <article className="rr-hover-lift rounded-xl border border-border bg-surface p-5">
            <p className="mb-2 inline-flex items-center gap-2 text-sm font-semibold text-foreground">
              <Shield className="h-4 w-4 text-tertiary" />
              Are files protected?
            </p>
            <p className="text-sm text-muted">
              Yes. Links are tokenized and scoped to the request context.
            </p>
          </article>
        </section>

        <footer className="mt-14 rounded-2xl border border-border bg-surface px-5 py-8 shadow-sm sm:px-6 sm:py-10">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <Image
                src="/referee-request-logo.svg"
                alt="RefereeRequest"
                width={160}
                height={34}
              />
              <p className="mt-3 text-sm text-muted">
                References, without the chasing.
              </p>
              <p className="mt-2 text-xs text-muted">Built for applicants and busy referees.</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Product</p>
              <div className="mt-3 space-y-2 text-sm text-muted">
                <a href="#how-it-works" className="block transition-colors hover:text-foreground">
                  The method
                </a>
                <a href="#why" className="block transition-colors hover:text-foreground">
                  Why it works
                </a>
                <a href="#faq" className="block transition-colors hover:text-foreground">
                  FAQ
                </a>
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Access</p>
              <div className="mt-3 space-y-2 text-sm text-muted">
                <Link href="/signin" className="block transition-colors hover:text-foreground">
                  Google sign in
                </Link>
                <Link href="/signup" className="block transition-colors hover:text-foreground">
                  Google sign up
                </Link>
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Support</p>
              <div className="mt-3 space-y-2 text-sm text-muted">
                <p>For support and product help</p>
                <a className="block transition-colors hover:text-foreground" href="mailto:hello@refereerequest.com">
                  hello@refereerequest.com
                </a>
              </div>
            </div>
          </div>
          <div className="mt-7 flex flex-col gap-2 border-t border-border pt-4 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
            <p>© {new Date().getFullYear()} RefereeRequest. All rights reserved.</p>
            <div className="inline-flex items-center gap-2">
              <span className="inline-flex h-1.5 w-1.5 rounded-full bg-secondary" />
              Platform status: live
            </div>
          </div>
        </footer>
      </div>

      {toast ? (
        <div
          className={`rr-toast fixed bottom-4 right-4 z-50 max-w-[calc(100vw-2rem)] rounded-xl border px-4 py-3 text-sm text-white shadow-xl transition-all duration-300 sm:bottom-5 sm:right-5 ${
            toast.type === "success"
              ? "border-secondary/40 bg-secondary"
              : "border-primary/40 bg-primary"
          }`}
        >
          {toast.message}
        </div>
      ) : null}
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
