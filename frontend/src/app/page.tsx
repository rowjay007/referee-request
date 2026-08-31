import { CoordinationScene } from "@/components/home/coordination-scene";
import { HomeAction } from "@/components/home/home-action";
import {
  ArrowRight,
  ArrowUp,
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
import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <main id="top" className="rr-home">
      <header className="sticky top-0 z-30 flex h-16 items-center border-b border-[#d8d1c6] bg-[#f2eee4]/95 px-4 backdrop-blur-sm sm:px-6 lg:px-10">
        <Link
          href="/"
          aria-label="Go to RefereeRequest home"
          className="flex min-w-0 items-center gap-2.5 text-[#172126] no-underline"
        >
          <Image
            src="/referee-request-logo.svg"
            alt="RefereeRequest"
            width={38}
            height={38}
            className="size-9 shrink-0 sm:size-10"
            priority
          />
        </Link>

        <nav
          className="ml-auto flex items-center gap-2"
          aria-label="Account navigation"
        >
          <HomeAction kind="account" variant="secondary" compactOnMobile />
          <HomeAction
            kind="request"
            label="Start a request"
            mobileLabel="Start"
            className="px-3 sm:px-4"
          />
        </nav>
      </header>

      <section className="rr-hero" aria-label="Reference Relay hero">
        <CoordinationScene />

        <div className="rr-hero-content">
          <h1>References, without the chase.</h1>
          <p className="rr-support-copy">
            One secure request. Clear progress. Less follow-up.
          </p>

          <div className="rr-hero-actions">
            <HomeAction kind="request" label="Create your request" size="lg">
              <ArrowRight className="h-4 w-4" />
            </HomeAction>
          </div>
        </div>
      </section>

      <section id="compose" className="rr-story-slide rr-story-compose">
        <div className="rr-compose-copy">
          <span className="rr-compose-index">01 / COMPOSE</span>
          <h2>A better ask starts complete.</h2>
          <p>Build the brief your referee wishes every candidate sent.</p>
          <ol
            className="rr-packet-index"
            aria-label="Reference packet contents"
          >
            <li>
              <span>01</span> Why you are asking
            </li>
            <li>
              <span>02</span> What matters most
            </li>
            <li>
              <span>03</span> When it is needed
            </li>
          </ol>
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
            <header>
              <span>REFERENCE PACKET</span>
              <b>3 / 3 COMPLETE</b>
            </header>
            <dl>
              <div>
                <dt>Purpose</dt>
                <dd>Graduate study</dd>
              </div>
              <div>
                <dt>Relationship</dt>
                <dd>Research supervisor</dd>
              </div>
              <div>
                <dt>Deadline</dt>
                <dd>14 October</dd>
              </div>
              <div>
                <dt>Highlights</dt>
                <dd>Leadership · Research · Delivery</dd>
              </div>
            </dl>
            <p>
              <ShieldCheck /> Confidential request
            </p>
            <span className="rr-packet-spine" />
          </div>
        </div>
      </section>

      <section id="handoff" className="rr-story-slide rr-story-handoff">
        <div className="rr-handoff-watermark" aria-hidden="true">
          SECURE HANDOFF
        </div>
        <div className="rr-handoff-heading">
          <h2>
            One link.
            <br />A human answer.
          </h2>
          <p>No account wall between the ask and the response.</p>
          <dl className="rr-handoff-facts">
            <div className="rr-fact-account">
              <dt>Account</dt>
              <dd>Not required</dd>
            </div>
            <div className="rr-fact-access">
              <dt>Access</dt>
              <dd>
                <ShieldCheck /> Private invitation
              </dd>
            </div>
            <div className="rr-fact-decision">
              <dt>Decision</dt>
              <dd>
                Accept <span>or</span> decline
              </dd>
            </div>
          </dl>
        </div>
        <div className="rr-invitation-visual">
          <span
            className="rr-endpoint-label rr-endpoint-candidate"
            aria-hidden="true"
          >
            Candidate
          </span>
          <span
            className="rr-endpoint-label rr-endpoint-referee"
            aria-hidden="true"
          >
            Referee
          </span>
          <div className="rr-invitation-card">
            <div className="rr-invitation-sender">
              <UserRound />
              <span>Alex sent a reference request</span>
            </div>
            <h3>Will you provide this reference?</h3>
            <p>
              Review the context, deadline, and supporting files before
              deciding.
            </p>
            <div className="rr-invitation-actions" aria-hidden="true">
              <span>
                <Check /> Accept
              </span>
              <span>Decline</span>
            </div>
            <small>
              <ShieldCheck /> Secure link · No account required
            </small>
          </div>
          <div className="rr-link-flight" aria-hidden="true">
            <span className="rr-link-flight-line" />
            <span className="rr-link-flight-packet">
              <Link2 />
            </span>
          </div>
          <div className="rr-acceptance-receipt" aria-hidden="true">
            <BadgeCheck />
            <span>
              Decision received<strong>Accepted</strong>
            </span>
          </div>
        </div>
      </section>

      <section id="certainty" className="rr-story-slide rr-story-certainty">
        <div className="rr-certainty-heading">
          <p>
            <span aria-hidden="true" /> LIVE REFERENCE
          </p>
          <h2>Moving forward.</h2>
          <span className="rr-certainty-note">
            You know what happened,
            <br />
            what is happening, and what comes next.
          </span>
          <div className="rr-deadline-count">
            <div>
              <strong>6</strong>
              <span>days</span>
            </div>
            <p>
              Plenty of time.
              <br />
              <b>Due 14 Oct</b>
            </p>
          </div>
        </div>
        <article className="rr-activity-receipt">
          <header>
            <span>RR / 04-218</span>
            <strong>
              <BadgeCheck /> On track
            </strong>
          </header>
          <ol>
            <li>
              <span className="rr-activity-icon">
                <Send />
              </span>
              <div>
                <strong>Delivered</strong>
                <small>Invitation reached your referee</small>
              </div>
              <time>
                Mon
                <br />
                09:12
              </time>
            </li>
            <li>
              <span className="rr-activity-icon">
                <Check />
              </span>
              <div>
                <strong>Accepted</strong>
                <small>Your referee confirmed</small>
              </div>
              <time>
                Mon
                <br />
                10:04
              </time>
            </li>
            <li className="rr-activity-current">
              <span className="rr-activity-icon">
                <FileText />
              </span>
              <div>
                <strong>In progress</strong>
                <small>Reference is being prepared</small>
              </div>
              <time>NOW</time>
            </li>
          </ol>
          <footer className="rr-receipt-reminder">
            <CalendarClock />
            <div>
              <strong>Reminder available</strong>
              <span>Send when the timing is right</span>
            </div>
            <span className="rr-reminder-action">Ready when you are</span>
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
          <div
            className="rr-ticket-stack"
            aria-label="Global opportunity contexts"
          >
            <article className="rr-opportunity-ticket rr-ticket-study">
              <span>EDU / 01</span>
              <strong>Admissions</strong>
              <small>Study · Research</small>
            </article>
            <article className="rr-opportunity-ticket rr-ticket-work">
              <span>WRK / 02</span>
              <strong>Fellowships</strong>
              <small>Roles · Careers</small>
            </article>
            <article className="rr-opportunity-ticket rr-ticket-funding">
              <span>FND / 03</span>
              <strong>Funding</strong>
              <small>Grants · Scholarships</small>
            </article>
            <article className="rr-opportunity-ticket rr-ticket-professional">
              <span>PRO / 04</span>
              <strong>Credentials</strong>
              <small>Membership · Practice</small>
            </article>
            <div className="rr-ticket-hub">
              <ShieldCheck />
              <span>ONE REQUEST</span>
            </div>
            <p className="rr-ticket-caption">
              ANY COUNTRY <b>·</b> YOUR TIMEZONE
            </p>
          </div>
        </div>
      </section>

      <footer className="rr-footer">
        <Link
          href="/"
          aria-label="RefereeRequest home"
          className="rr-footer-mark"
        >
          <Image
            src="/referee-request-logo.svg"
            alt=""
            width={40}
            height={40}
            className="size-9"
          />
        </Link>
        <p>© {new Date().getFullYear()}</p>
        <a href="#top" aria-label="Back to top" className="rr-back-to-top">
          <ArrowUp aria-hidden="true" />
        </a>
      </footer>
    </main>
  );
}
