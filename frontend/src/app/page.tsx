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

type SignalItem = {
  title: string;
  note: string;
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

const SIGNAL_ITEMS: SignalItem[] = [
  { title: "Request brief assembled", note: "Context, files, role, and deadline in one source." },
  { title: "Secure link delivered", note: "Referee opens directly from email without signup." },
  { title: "Open status captured", note: "You know when the request is viewed." },
  { title: "Reference submitted", note: "Upload lands and candidate gets notified." },
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
      <div className="pointer-events-none absolute -left-28 top-24 h-64 w-64 rounded-full bg-primary/8 blur-3xl" />
      <div className="pointer-events-none absolute -right-16 top-[30rem] h-72 w-72 rounded-full bg-secondary/10 blur-3xl" />
      <div className="mx-auto w-full max-w-7xl px-6 pb-14 pt-6 sm:px-10">
        <header className="flex items-center justify-between gap-4">
          <Image src="/referee-request-logo.svg" alt="RefereeRequest" width={188} height={36} priority />
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
          <Button onClick={() => navigateWithToast("/signup", "Starting your request...", "success")}>
            Start a request
          </Button>
        </header>

        <div className="mt-6 border-t border-border" />

        <section className="grid items-center gap-10 py-12 lg:grid-cols-[1fr_0.86fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.34em] text-primary">Reference requests</p>
            <h1 className="mt-5 text-5xl font-semibold leading-[0.94] tracking-tight text-foreground sm:text-7xl">
              Make the ask.
              <span className="mt-1 block text-primary">Lose the chase.</span>
            </h1>
            <p className="mt-8 max-w-xl text-2xl leading-relaxed text-muted">
              RefereeRequest turns scattered follow-ups into one clear flow from your first request to final upload.
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
                className="inline-flex items-center text-sm font-semibold uppercase tracking-[0.2em] text-muted transition-colors hover:text-foreground"
              >
                See the method
              </a>
            </div>
          </div>

          <article className="rr-paper-card relative rounded-[28px] border border-[#d9d3e5] bg-surface p-7 shadow-[0_20px_48px_-30px_rgba(24,20,38,0.45)]">
            <span className="pointer-events-none absolute -right-6 top-2 h-24 w-24 rounded-full border border-primary/45" />
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.28em] text-muted">
              <p>Live request / 024</p>
              <span className="rounded-full bg-[#F7DFA8] px-2.5 py-1 text-[11px] normal-case tracking-normal text-[#6F4E0B]">
                Moving
              </span>
            </div>
            <div className="mt-4 space-y-4 border-t border-border pt-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">For</p>
                <p className="mt-2 text-4xl font-semibold text-foreground">Dr. Amelia Hart</p>
                <p className="mt-2 text-lg text-muted">MSc application · deadline 14 May</p>
              </div>
              <div className="space-y-4 pt-2 text-base">
                <div className="border-t border-border pt-3">
                  <p className="font-semibold text-foreground">Request sent</p>
                  <p className="text-muted">Today, 09:42</p>
                </div>
                <div className="border-t border-border pt-3">
                  <p className="font-semibold text-foreground">Opened by referee</p>
                  <p className="text-muted">Today, 10:18</p>
                </div>
                <div className="border-t border-border pt-3">
                  <p className="font-semibold text-foreground">Awaiting reference upload</p>
                  <p className="text-muted">Deadline in 5 days</p>
                </div>
              </div>
            </div>
            <aside className="rr-note-card absolute -bottom-8 -left-8 rounded-3xl bg-secondary px-5 py-4 text-white shadow-2xl shadow-secondary/30">
              <p className="text-[11px] uppercase tracking-[0.22em] text-white/60">No more</p>
              <p className="mt-2 text-3xl font-semibold leading-none">“Just checking in…”</p>
            </aside>
          </article>
        </section>

        <section id="why" className="grid gap-6 border-y border-border py-10 lg:grid-cols-[1.25fr_2fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.34em] text-primary">The shift</p>
            <h2 className="mt-4 text-5xl font-semibold leading-[0.95] tracking-tight text-foreground">
              Less follow-up.
              <br />
              More forward motion.
            </h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-3">
            <div className="border-l-2 border-primary pl-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">01</p>
              <p className="mt-6 text-4xl font-semibold text-foreground">One source</p>
              <p className="mt-4 text-2xl leading-relaxed text-muted">Context, files, and deadline stay together.</p>
            </div>
            <div className="border-l-2 border-primary pl-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">02</p>
              <p className="mt-6 text-4xl font-semibold text-foreground">Clear signals</p>
              <p className="mt-4 text-2xl leading-relaxed text-muted">Know what is opened, pending, or done.</p>
            </div>
            <div className="border-l-2 border-primary pl-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">03</p>
              <p className="mt-6 text-4xl font-semibold text-foreground">Human-friendly</p>
              <p className="mt-4 text-2xl leading-relaxed text-muted">Referees submit without onboarding friction.</p>
            </div>
          </div>
        </section>

        <section id="how-it-works" className="grid gap-8 py-12 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.34em] text-primary">The method</p>
            <h2 className="mt-4 max-w-3xl text-5xl font-semibold leading-[0.95] tracking-tight text-foreground sm:text-7xl">
              A request that knows where it is going.
            </h2>
          </div>
          <p className="max-w-md text-2xl leading-relaxed text-muted">
            Three simple moves turn a stressful favor into a professional workflow.
          </p>
        </section>

        <section className="grid gap-8 pb-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div className="space-y-5">
            <p className="text-xs font-semibold uppercase tracking-[0.34em] text-primary">Request signal flow</p>
            <h2 className="text-5xl font-semibold leading-[0.95] tracking-tight text-foreground sm:text-6xl">
              From first send
              <br />
              to final file.
            </h2>
            <p className="max-w-lg text-xl leading-relaxed text-muted">
              Every state is visible so you can follow up at the right time, not every time.
            </p>
            <div className="flex flex-wrap gap-3 pt-2 text-xs font-semibold uppercase tracking-[0.16em] text-foreground">
              <span className="rr-outline-pill px-3 py-2">Sent</span>
              <span className="rr-outline-pill px-3 py-2">Opened</span>
              <span className="rr-outline-pill px-3 py-2">Pending</span>
              <span className="rr-outline-pill px-3 py-2">Submitted</span>
            </div>
          </div>
          <article className="relative overflow-hidden rounded-3xl border border-border bg-surface p-6 shadow-[0_18px_45px_-34px_rgba(24,20,38,0.5)]">
            <div className="rr-dot-grid pointer-events-none absolute inset-0 opacity-70" />
            <ol className="relative space-y-3">
              {SIGNAL_ITEMS.map((item, index) => (
                <li
                  key={item.title}
                  className={`rounded-2xl border border-border bg-white/90 p-4 ${
                    index % 2 === 1 ? "sm:ml-8" : "sm:mr-8"
                  }`}
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                    Step {index + 1}
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-foreground">{item.title}</p>
                  <p className="mt-2 text-base text-muted">{item.note}</p>
                </li>
              ))}
            </ol>
          </article>
        </section>

        <section className="grid gap-4 pb-12 lg:grid-cols-[1.1fr_0.9fr]">
          <article className="rounded-3xl border border-border bg-surface p-7">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">Who this helps</p>
            <h3 className="mt-4 text-4xl font-semibold leading-tight text-foreground sm:text-5xl">
              Built for high-stakes applications with busy referees.
            </h3>
            <p className="mt-4 text-lg leading-relaxed text-muted">
              Scholarship deadlines, university references, fellowship submissions, and hiring loops all benefit
              from one organized request path.
            </p>
          </article>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            <article className="rounded-3xl bg-secondary px-6 py-7 text-white">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Response quality</p>
              <p className="mt-3 text-3xl font-semibold leading-tight">Better context in the first message.</p>
            </article>
            <article className="rounded-3xl border border-border bg-surface px-6 py-7">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Completion rate</p>
              <p className="mt-3 text-3xl font-semibold leading-tight text-foreground">Fewer reminders, faster delivery.</p>
            </article>
          </div>
        </section>

        <section className="mb-2 grid gap-4 sm:grid-cols-3">
          <article className="rounded-2xl border border-border bg-surface p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Request quality</p>
            <p className="mt-2 text-3xl font-semibold text-foreground">One complete brief</p>
            <p className="mt-2 text-lg text-muted">Institution, program, deadline, and files in one ask.</p>
          </article>
          <article className="rounded-2xl border border-border bg-surface p-5 sm:translate-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Referee effort</p>
            <p className="mt-2 text-3xl font-semibold text-foreground">No onboarding wall</p>
            <p className="mt-2 text-lg text-muted">Referees open the link and upload directly.</p>
          </article>
          <article className="rounded-2xl border border-border bg-surface p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Candidate visibility</p>
            <p className="mt-2 text-3xl font-semibold text-foreground">Track each step</p>
            <p className="mt-2 text-lg text-muted">See sent, opened, and submitted status clearly.</p>
          </article>
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
              <Image src="/referee-request-logo.svg" alt="RefereeRequest" width={160} height={32} />
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
