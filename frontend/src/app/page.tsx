"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ArrowUp,
  ArrowRight,
  Award,
  BadgeCheck,
  BriefcaseBusiness,
  CalendarClock,
  Check,
  FileText,
  GraduationCap,
  Landmark,
  Link2,
  Send,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { CoordinationScene } from "@/components/home/coordination-scene";
import {
  COORDINATION_SCENE,
  type JourneyMilestoneId,
} from "@/components/home/scene-model";
import { Button } from "@/components/ui/button";
import { useAuthToken } from "@/lib/auth";

type ToastState = {
  message: string;
  type: "info" | "success";
} | null;

export default function Home() {
  const router = useRouter();
  const [toast, setToast] = useState<ToastState>(null);
  const [activeStage, setActiveStage] = useState<JourneyMilestoneId>(
    COORDINATION_SCENE.activeStage,
  );
  const isAuthenticated = Boolean(useAuthToken());

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  function navigateWithToast(
    path: string,
    message: string,
    type: "info" | "success",
  ) {
    setToast({ message, type });
    window.setTimeout(() => router.push(path), 220);
  }

  return (
    <main id="top" className="rr-home">
      <header className="rr-site-header">
        <Link href="/" aria-label="Go to RefereeRequest home" className="rr-brand">
          <Image
            src="/referee-request-logo.svg"
            alt="RefereeRequest"
            width={46}
            height={46}
            priority
          />
        </Link>

        <nav className="rr-main-nav" aria-label="Explore RefereeRequest">
          <a href="#compose">Compose</a>
          <a href="#handoff">Handoff</a>
          <a href="#certainty">Certainty</a>
          <a href="#reach">Reach</a>
        </nav>

        <nav className="rr-auth-actions" aria-label="Account navigation">
          {isAuthenticated ? (
            <Button
              variant="secondary"
              onClick={() =>
                navigateWithToast("/dashboard", "Opening your dashboard...", "info")
              }
            >
              Dashboard
            </Button>
          ) : (
            <Button
              variant="secondary"
              onClick={() =>
                navigateWithToast("/signin", "Opening sign in...", "info")
              }
            >
              Sign in
            </Button>
          )}

          <Button
            onClick={() =>
              isAuthenticated
                ? navigateWithToast(
                    "/dashboard/requests/new",
                    "Opening request builder...",
                    "success",
                  )
                : navigateWithToast(
                    "/signup",
                    "Starting your request...",
                    "success",
                  )
            }
          >
            Start a request
          </Button>

        </nav>
      </header>

      <section className="rr-hero" aria-label="Reference Relay hero">
        <CoordinationScene
          activeStage={activeStage}
          onStageChange={setActiveStage}
        />

        <div className="rr-hero-content">
          <h1>References, without the chase.</h1>
          <p className="rr-support-copy">
            One secure request. Clear progress. Less follow-up.
          </p>

          <div className="rr-hero-actions">
            <Button
              size="lg"
              onClick={() =>
                isAuthenticated
                  ? navigateWithToast(
                      "/dashboard/requests/new",
                      "Opening request builder...",
                      "success",
                    )
                  : navigateWithToast(
                      "/signup",
                      "Redirecting to sign up...",
                      "success",
                    )
              }
            >
              <span className="inline-flex items-center gap-2">
                Create your request
                <ArrowRight className="h-4 w-4" />
              </span>
            </Button>
          </div>

        </div>
      </section>

      <section id="compose" className="rr-story-slide rr-story-compose">
        <div className="rr-compose-copy">
          <h2>A better ask starts complete.</h2>
          <p>Build the brief your referee wishes every candidate sent.</p>
          <div className="rr-readiness-stamp">
            <BadgeCheck />
            <span>Ready to send</span>
          </div>
        </div>
        <div className="rr-compose-visual" aria-hidden="true">
          <div className="rr-paper-piece rr-paper-context">
            <FileText />
            <span>Context</span>
          </div>
          <div className="rr-paper-piece rr-paper-deadline">
            <CalendarClock />
            <span>Deadline</span>
          </div>
          <div className="rr-paper-piece rr-paper-files">
            <ShieldCheck />
            <span>Files</span>
          </div>
          <div className="rr-ready-sheet">
            <span>REFERENCE PACKET</span>
            <dl>
              <div><dt>Purpose</dt><dd>Graduate study</dd></div>
              <div><dt>Relationship</dt><dd>Research supervisor</dd></div>
              <div><dt>Deadline</dt><dd>14 October</dd></div>
              <div><dt>Highlights</dt><dd>Leadership · Research · Delivery</dd></div>
            </dl>
            <p><ShieldCheck /> Confidential request</p>
          </div>
        </div>
      </section>

      <section id="handoff" className="rr-story-slide rr-story-handoff">
        <div className="rr-handoff-watermark" aria-hidden="true">SECURE HANDOFF</div>
        <div className="rr-handoff-heading">
          <h2>One link.<br />A human answer.</h2>
          <p>No account wall between the ask and the response.</p>
          <dl className="rr-handoff-facts">
            <div className="rr-fact-account"><dt>Account</dt><dd>Not required</dd></div>
            <div className="rr-fact-access"><dt>Access</dt><dd><ShieldCheck /> Private invitation</dd></div>
            <div className="rr-fact-decision"><dt>Decision</dt><dd>Accept <span>or</span> decline</dd></div>
          </dl>
        </div>
        <div className="rr-invitation-visual">
          <span className="rr-endpoint-label rr-endpoint-candidate" aria-hidden="true">Candidate</span>
          <span className="rr-endpoint-label rr-endpoint-referee" aria-hidden="true">Referee</span>
          <div className="rr-invitation-card">
            <div className="rr-invitation-sender">
              <UserRound />
              <span>Alex sent a reference request</span>
            </div>
            <h3>Will you provide this reference?</h3>
            <p>Review the context, deadline, and supporting files before deciding.</p>
            <div className="rr-invitation-actions" aria-hidden="true">
              <span><Check /> Accept</span>
              <span>Decline</span>
            </div>
            <small><ShieldCheck /> Secure link · No account required</small>
          </div>
          <div className="rr-link-flight" aria-hidden="true">
            <span className="rr-link-flight-line" />
            <span className="rr-link-flight-packet"><Link2 /></span>
          </div>
          <div className="rr-acceptance-receipt" aria-hidden="true">
            <BadgeCheck />
            <span>Decision received<strong>Accepted</strong></span>
          </div>
        </div>
      </section>

      <section id="certainty" className="rr-story-slide rr-story-certainty">
        <div className="rr-certainty-heading">
          <p>REFERENCE IN PROGRESS</p>
          <h2>Moving forward.</h2>
          <div className="rr-deadline-count">
            <strong>6</strong>
            <span>days to<br />deadline</span>
          </div>
        </div>
        <article className="rr-activity-receipt">
          <header>
            <span>REQUEST ACTIVITY</span>
            <strong><BadgeCheck /> On track</strong>
          </header>
          <ol>
            <li>
              <span className="rr-activity-icon"><Send /></span>
              <div><strong>Delivered</strong><small>Invitation reached your referee</small></div>
              <time>Mon<br />09:12</time>
            </li>
            <li>
              <span className="rr-activity-icon"><Check /></span>
              <div><strong>Accepted</strong><small>Your referee confirmed</small></div>
              <time>Mon<br />10:04</time>
            </li>
            <li className="rr-activity-current">
              <span className="rr-activity-icon"><FileText /></span>
              <div><strong>In progress</strong><small>Reference is being prepared</small></div>
              <time>NOW</time>
            </li>
          </ol>
          <footer className="rr-receipt-reminder">
            <CalendarClock />
            <div><strong>Reminder available</strong><span>Send when the timing is right</span></div>
          </footer>
        </article>
      </section>

      <section id="reach" className="rr-story-slide rr-story-reach">
        <div className="rr-passport-visual" aria-hidden="true">
          <div className="rr-passport-panel rr-passport-study">
            <GraduationCap />
            <span>Study</span>
          </div>
          <div className="rr-passport-panel rr-passport-work">
            <BriefcaseBusiness />
            <span>Work</span>
          </div>
          <div className="rr-passport-panel rr-passport-funding">
            <Landmark />
            <span>Funding</span>
          </div>
          <div className="rr-passport-panel rr-passport-professional">
            <Award />
            <span>Professional</span>
          </div>
        </div>
        <div className="rr-story-copy">
          <h2>One request. Many next chapters.</h2>
          <span>Built for opportunity wherever it takes you.</span>
          <div className="rr-ticket-stack" aria-label="Global opportunity contexts">
            <article className="rr-opportunity-ticket rr-ticket-study">
              <span>EDU / 01</span><strong>Admissions</strong><small>Study · Research</small>
            </article>
            <article className="rr-opportunity-ticket rr-ticket-work">
              <span>WRK / 02</span><strong>Fellowships</strong><small>Roles · Careers</small>
            </article>
            <article className="rr-opportunity-ticket rr-ticket-funding">
              <span>FND / 03</span><strong>Funding</strong><small>Grants · Scholarships</small>
            </article>
            <article className="rr-opportunity-ticket rr-ticket-professional">
              <span>PRO / 04</span><strong>Credentials</strong><small>Membership · Practice</small>
            </article>
            <div className="rr-ticket-hub">
              <ShieldCheck />
              <span>ONE REQUEST</span>
            </div>
            <p className="rr-ticket-caption">ANY COUNTRY <b>·</b> YOUR TIMEZONE</p>
            </div>
        </div>
      </section>

      <footer className="rr-footer">
        <Link href="/" aria-label="RefereeRequest home" className="rr-footer-mark">
          <Image
            src="/referee-request-logo.svg"
            alt=""
            width={40}
            height={40}
          />
        </Link>
        <p>© {new Date().getFullYear()}</p>
        <a href="#top" aria-label="Back to top" className="rr-back-to-top">
          <ArrowUp aria-hidden="true" />
        </a>
      </footer>

      {toast ? (
        <div
          role="status"
          aria-live="polite"
          className={`rr-toast rr-home-toast ${
            toast.type === "success" ? "rr-toast-success" : "rr-toast-info"
          }`}
        >
          {toast.message}
        </div>
      ) : null}
    </main>
  );
}
