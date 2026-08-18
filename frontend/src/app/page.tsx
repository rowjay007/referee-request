"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowRight, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

type ToastState = {
  message: string;
  type: "info" | "success";
} | null;

type FaqItem = {
  question: string;
  answer: string;
};

const FAQ_ITEMS: FaqItem[] = [
  {
    question: "Do referees need an account?",
    answer: "No. They use a private link and submit directly.",
  },
  {
    question: "What can I use it for?",
    answer: "Universities, scholarships, fellowships, jobs, and internships.",
  },
  {
    question: "Are files protected?",
    answer: "Yes. Access is scoped to each request through secure tokens.",
  },
];

export default function Home() {
  const router = useRouter();
  const [toast, setToast] = useState<ToastState>(null);
  const [openFaqIndex, setOpenFaqIndex] = useState(0);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  function navigateWithToast(path: string, message: string, type: "info" | "success") {
    setToast({ message, type });
    window.setTimeout(() => router.push(path), 220);
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="rr-motion-float pointer-events-none absolute -left-28 top-24 h-64 w-64 rounded-full bg-primary/8 blur-3xl" />
      <div className="rr-motion-float rr-motion-float-delay pointer-events-none absolute -right-16 top-[30rem] h-72 w-72 rounded-full bg-secondary/10 blur-3xl" />
      <div className="mx-auto w-full max-w-7xl px-6 pb-14 pt-6 sm:px-10">
        <header className="rr-motion-rise flex items-center justify-between gap-4">
          <Link href="/" aria-label="Go to RefereeRequest home">
            <Image src="/referee-request-logo.svg" alt="RefereeRequest" width={44} height={44} priority />
          </Link>
          <nav className="hidden items-center gap-10 text-sm text-muted md:flex">
            <a href="#how-it-works" className="transition-colors hover:text-foreground">
              The method
            </a>
            <a href="#why" className="transition-colors hover:text-foreground">
              Why it works
            </a>
            <a href="#faq" className="transition-colors hover:text-foreground">
              FAQ
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => navigateWithToast("/signin", "Opening sign in...", "info")}>
              Sign in
            </Button>
            <Button onClick={() => navigateWithToast("/signup", "Starting your request...", "success")}>
              Start a request
            </Button>
          </div>
        </header>

        <div className="mt-6 border-t border-border" />

        <section className="grid items-center gap-10 py-12 lg:grid-cols-[1fr_0.94fr]">
          <div className="rr-motion-rise">
            <h1 className="mt-2 text-5xl font-semibold leading-[0.94] tracking-tight text-foreground sm:text-7xl">
              The clean way to
              <span className="mt-1 block">get a reference.</span>
            </h1>
            <p className="mt-8 max-w-xl text-2xl leading-relaxed text-muted">
              Create once, share one secure link, and track each step clearly.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Button
                size="lg"
                className="rounded-full px-6"
                onClick={() =>
                  navigateWithToast("/signup", "Redirecting to Google sign up...", "success")
                }
              >
                <span className="inline-flex items-center gap-2">
                  Create your first request
                  <ArrowRight className="h-4 w-4" />
                </span>
              </Button>
              <a
                href="#how-it-works"
                className="rounded-full border border-border bg-surface px-5 py-2 text-sm font-semibold uppercase tracking-[0.14em] text-muted transition-colors hover:text-foreground"
              >
                See the method
              </a>
            </div>
            <p className="mt-6 inline-flex rounded-full border border-border bg-surface px-4 py-2 text-sm uppercase tracking-[0.2em] text-muted">
              References, without the chasing.
            </p>
          </div>

          <article className="rr-paper-card rr-motion-float relative rounded-[22px] border border-[#c8d5e7] bg-[#f4f8ff] shadow-[0_24px_52px_-34px_rgba(24,20,38,0.5)]">
            <div className="flex items-center justify-between border-b border-[#c8d5e7] px-5 py-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted">Workspace</p>
                <p className="mt-1 text-2xl font-semibold text-foreground">Good morning, Alex</p>
              </div>
              <span className="rounded-xl bg-[#c9f3ef] px-3 py-1 text-xs font-semibold text-[#0d5b54]">
                3 active
              </span>
            </div>
            <div className="grid grid-cols-3 border-b border-[#c8d5e7] text-foreground">
              <div className="border-r border-[#c8d5e7] px-5 py-4">
                <p className="text-[10px] uppercase tracking-[0.2em] text-muted">Active</p>
                <p className="mt-2 text-5xl font-semibold">03</p>
              </div>
              <div className="border-r border-[#c8d5e7] px-5 py-4">
                <p className="text-[10px] uppercase tracking-[0.2em] text-muted">Submitted</p>
                <p className="mt-2 text-5xl font-semibold">12</p>
              </div>
              <div className="px-5 py-4">
                <p className="text-[10px] uppercase tracking-[0.2em] text-muted">On time</p>
                <p className="mt-2 text-5xl font-semibold">98%</p>
              </div>
            </div>
            <div className="px-5 py-5">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-lg font-semibold text-foreground">Recent activity</p>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">View all</p>
              </div>
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-lg font-semibold text-foreground">Prof. Okafor</p>
                    <p className="text-sm text-muted">Request</p>
                  </div>
                  <div className="text-right">
                    <span className="rounded-lg bg-[#c8efc6] px-2.5 py-1 text-xs font-semibold text-[#245d20]">
                      Opened
                    </span>
                    <p className="mt-1 text-sm text-muted">10:18</p>
                  </div>
                </div>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-lg font-semibold text-foreground">Dr. Mensah</p>
                    <p className="text-sm text-muted">Request</p>
                  </div>
                  <div className="text-right">
                    <span className="rounded-lg bg-[#ffedd7] px-2.5 py-1 text-xs font-semibold text-[#9a5a13]">
                      Awaiting upload
                    </span>
                    <p className="mt-1 text-sm text-muted">Yesterday</p>
                  </div>
                </div>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-lg font-semibold text-foreground">A. Williams</p>
                    <p className="text-sm text-muted">Request</p>
                  </div>
                  <div className="text-right">
                    <span className="rounded-lg bg-[#c9f3ef] px-2.5 py-1 text-xs font-semibold text-[#0d5b54]">
                      Submitted
                    </span>
                    <p className="mt-1 text-sm text-muted">Mon</p>
                  </div>
                </div>
              </div>
            </div>
          </article>
        </section>

        <section id="why" className="rounded-3xl border border-border bg-surface p-6 sm:p-8">
          <div className="grid gap-8 lg:grid-cols-[1.05fr_1.95fr]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.34em] text-primary">The shift</p>
              <h2 className="mt-4 text-5xl font-semibold leading-[0.95] tracking-tight text-foreground">
                Less follow-up.
                <br />
                More forward motion.
              </h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <article className="rr-tilt-3d rr-motion-rise relative overflow-hidden rounded-2xl border border-border bg-background/70 p-5">
                <span className="pointer-events-none absolute -right-5 -top-5 h-16 w-16 rounded-full bg-primary/10" />
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">01</p>
                <p className="mt-3 text-4xl font-semibold text-foreground">One source</p>
                <p className="mt-3 text-xl leading-relaxed text-muted">Context, files, and deadline stay together.</p>
              </article>
              <article className="rr-tilt-3d rr-motion-rise relative overflow-hidden rounded-2xl border border-border bg-background/70 p-5" style={{ animationDelay: "120ms" }}>
                <span className="pointer-events-none absolute -left-6 bottom-2 h-14 w-14 rounded-2xl border border-primary/30" />
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">02</p>
                <p className="mt-3 text-4xl font-semibold text-foreground">Clear signals</p>
                <p className="mt-3 text-xl leading-relaxed text-muted">Know what is opened, pending, or done.</p>
              </article>
              <article className="rr-tilt-3d rr-motion-rise relative overflow-hidden rounded-2xl border border-border bg-background/70 p-5" style={{ animationDelay: "220ms" }}>
                <span className="pointer-events-none absolute -right-7 bottom-3 h-16 w-16 rounded-full border border-primary/35" />
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">03</p>
                <p className="mt-3 text-4xl font-semibold text-foreground">Human-friendly</p>
                <p className="mt-3 text-xl leading-relaxed text-muted">Referees submit without onboarding friction.</p>
              </article>
            </div>
          </div>
        </section>

        <section id="how-it-works" className="py-12">
          <div className="rounded-3xl border border-border bg-surface p-6 sm:p-8">
            <div className="grid gap-7 lg:grid-cols-[1.12fr_0.88fr] lg:items-end">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.34em] text-primary">The method</p>
                <h2 className="mt-4 max-w-3xl text-5xl font-semibold leading-[0.95] tracking-tight text-foreground sm:text-7xl">
                  A request that knows where it is going.
                </h2>
                <p className="mt-5 max-w-2xl text-xl leading-relaxed text-muted">Three moves. One clear workflow.</p>
              </div>
              <div className="space-y-3">
                <article className="rr-tilt-3d rounded-2xl border border-border bg-background/80 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Step 1</p>
                  <p className="mt-2 text-2xl font-semibold text-foreground">Build one complete request</p>
                </article>
                <article className="rr-tilt-3d rounded-2xl border border-border bg-background/80 p-4 sm:translate-x-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Step 2</p>
                  <p className="mt-2 text-2xl font-semibold text-foreground">Send one secure referee link</p>
                </article>
                <article className="rr-tilt-3d rounded-2xl border border-border bg-background/80 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Step 3</p>
                  <p className="mt-2 text-2xl font-semibold text-foreground">Track status until submission</p>
                </article>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-3xl bg-secondary px-8 py-12 text-white sm:px-10">
          <p className="text-xs font-semibold uppercase tracking-[0.34em] text-primary">
            Your next application deserves this
          </p>
          <h2 className="mt-5 text-5xl font-semibold leading-[0.95] tracking-tight sm:text-7xl">
            Start with a better ask.
          </h2>
          <p className="mt-5 max-w-2xl text-2xl text-white/75">
            Build the request once. Let RefereeRequest carry it through.
          </p>
          <Button
            size="lg"
            className="mt-8 rounded-full border border-primary/40 bg-primary px-6 hover:bg-primary/90"
            onClick={() => navigateWithToast("/signup", "Opening signup...", "success")}
          >
            <span className="inline-flex items-center gap-2">
              Start free
              <ArrowRight className="h-4 w-4" />
            </span>
          </Button>
        </section>

        <section id="faq" className="grid gap-8 py-12 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.34em] text-primary">FAQ</p>
            <h2 className="mt-4 text-5xl font-semibold leading-[0.95] tracking-tight text-foreground sm:text-6xl">
              Good questions.
              <br />
              Straight answers.
            </h2>
          </div>
          <div className="space-y-1 border-t border-border">
            {FAQ_ITEMS.map((item, index) => {
              const isOpen = openFaqIndex === index;
              return (
                <article key={item.question} className="border-b border-border py-5">
                  <button
                    className="flex w-full items-center justify-between gap-4 text-left"
                    onClick={() => setOpenFaqIndex(isOpen ? -1 : index)}
                    type="button"
                  >
                    <span className="text-2xl font-semibold text-foreground">{item.question}</span>
                    {isOpen ? (
                      <Minus className="h-5 w-5 text-primary" />
                    ) : (
                      <Plus className="h-5 w-5 text-primary" />
                    )}
                  </button>
                  {isOpen ? <p className="mt-4 text-xl leading-relaxed text-muted">{item.answer}</p> : null}
                </article>
              );
            })}
          </div>
        </section>

        <footer className="border-t border-border py-8 text-sm text-muted">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <Link href="/" aria-label="Go to RefereeRequest home">
                <Image src="/referee-request-logo.svg" alt="RefereeRequest" width={36} height={36} />
              </Link>
              <span>References without the chasing.</span>
            </div>
            <div className="flex flex-wrap items-center gap-5">
              <a href="#how-it-works" className="transition-colors hover:text-foreground">
                The method
              </a>
              <a href="#why" className="transition-colors hover:text-foreground">
                Why it works
              </a>
              <Link href="/signin" className="transition-colors hover:text-foreground">
                Google sign in
              </Link>
              <a href="mailto:hello@refereerequest.com" className="transition-colors hover:text-foreground">
                hello@refereerequest.com
              </a>
            </div>
          </div>
          <p className="mt-4 text-xs">© {new Date().getFullYear()} RefereeRequest. All rights reserved.</p>
        </footer>
      </div>

      {toast ? (
        <div
          className={`rr-toast fixed bottom-4 right-4 z-50 max-w-[calc(100vw-2rem)] rounded-lg border px-4 py-3 text-sm text-white shadow-lg ${
            toast.type === "success" ? "border-primary/40 bg-primary" : "border-secondary/40 bg-secondary"
          }`}
        >
          {toast.message}
        </div>
      ) : null}
    </main>
  );
}
