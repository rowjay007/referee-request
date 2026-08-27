# RefereeRequest Product Repositioning and Phase Realignment

Date: 2026-08-26
Branch: dev

## Executive Decision

RefereeRequest should not compete as a generic recommendation-letter storage product.

RefereeRequest should focus on one owned wedge:

The global applicant-to-referee coordination layer that makes reference completion faster, clearer, and less stressful before submission to any destination system.

This keeps the product differentiated from Interfolio style dossier platforms and from destination-bound systems like Common App.

## Required Product Question Answer

Why would someone use RefereeRequest instead of Interfolio, Common App, a university portal, email, WhatsApp, or a spreadsheet?

Because RefereeRequest gives candidates and referees a single, lightweight, accountless coordination workflow for the full reference journey across many destination systems:

- structured request packet in one place
- readiness check before send
- explicit referee accept or decline
- clear action-oriented status progression
- deadline-aware reminders and follow-up
- lower referee friction with no account requirement

Interfolio and Common App solve broad dossier or destination application workflows. RefereeRequest wins by solving cross-system coordination speed and certainty for individuals.

## Competitive Reality and Evidence

### Interfolio

Observed capabilities from public pages:

- secure referee upload links
- applicant status tracking
- reminders
- confidentiality model where applicants see status but not letter content
- reusable letters and dossier delivery model
- paid delivery ecosystem and broad academic workflows

Evidence references:

- Interfolio Dossier product page: collection, secure management, reusable letters, delivery ecosystem
- Interfolio Academic Search guide: secure link, accept or deny, reminders, status, confidentiality handling

### Common App

Observed capabilities from public recommender guide:

- recommender invitation flow
- explicit invite acceptance or decline options
- multiple recommender types
- status and form workflow tied to Common App system
- one-and-done recommendation submission and reuse behavior in transfer flow

Evidence references:

- Common App recommender guide page

### Refeasy

The source extraction tool could not retrieve structured page content from refeasy.com during this review. Existing claim set from prior research should be treated as provisional until manually validated in-browser or through alternative sources.

### Competitive Implication

Requesting letters, secure links, reminders, and basic tracking are table stakes.

Differentiation must come from superior applicant-referee coordination quality, not from feature parity claims.

## Strategy Grill Before Implementation

### Competitive

- Is this differentiated: Yes, if product ownership stays on pre-submission coordination and referee experience.
- Can incumbents do parts of this: Yes. The advantage must be simplicity and speed for individual users outside a single destination ecosystem.
- Feature vs product risk: High risk if implementation drifts into generic storage or full application management.
- Why switch: Faster request preparation, less back-and-forth, explicit acceptance state, clearer anxiety-reducing statuses.

### Product

Smallest differentiated version:

- Reference Packet structure
- Request Readiness gate
- Referee Accept or Decline action
- Action-oriented dashboard statuses and CTAs

Must remove from near-term scope:

- universal portal integrations
- dossier-like delivery products
- heavy CRM or full application tracker

Core wedge:

- Better ask quality + better referee clarity + better submission certainty.

### User

- Candidate time saved: reduced repeated messaging and attachment chaos.
- Referee friction reduced: one page with full context and direct accept/decline.
- Candidate anxiety reduced: explicit states and next actions.
- Completion rates improved: readiness gate plus better context and reminders.

### Global

- Current model is mostly global-safe but terminology is still academic-heavy.
- Must support broader opportunity contexts and country/timezone handling.
- No Nigeria hard-coding found in current backend schema or routing.

### Technical

- Existing modular monolith can support this without rewrite.
- Chi routes are easy to extend.
- Store layer already uses transactional transitions and event recording.
- Main gaps are schema shape and state machine completeness.

### Security

- Confidentiality model currently partial: candidate cannot view submitted content today, but confidentiality is not explicit per request.
- Secure token flow exists with hash storage and expiration checks.
- Need explicit accept/decline events and permission-safe transitions.
- Need stronger server-side state gate checks for new lifecycle states.

### Business

- Freemium path remains plausible with self-serve entry.
- Return loops can come from contacts history, repeat requests, and outcomes.
- Monetization can layer later on advanced reminders, team usage, or delivery workflows without harming core free flow.

## Current Architecture Review Summary

### Backend

- Go API with Chi router and middleware stack
- transactional store methods for send/open/submit
- secure referee token hashing
- notification outbox with worker dispatch and retries
- status currently limited to draft, sent, opened, submitted, cancelled, expired

### Frontend

- Next.js app router
- multi-step request creation page that auto-sends in one submit path
- dashboard and requests pages with current state messaging
- referee page currently assumes open then upload flow, no explicit accept or decline
- PostHog event instrumentation exists but event names do not match revised funnel

### Observability

- OpenTelemetry middleware and notification counters present
- request-level event table exists and can support richer lifecycle telemetry

## Target Product Model Delta

### Core domain concepts to add or formalize

- Reference Packet
- Request Readiness
- Referee decision: accepted or declined
- Confidentiality mode: confidential or non-confidential
- Application context fields for global workflows

### Canonical status lifecycle

Backend-controlled transitions:

- draft
- sent
- delivered
- opened
- accepted
- in_progress
- submitted
- declined
- expired
- cancelled

Transition rules:

- only backend may mutate status
- each transition records event metadata
- invalid transitions return conflict validation

## Database and API Change Plan

### Database

Add to reference_requests:

- opportunity_organization
- opportunity_role
- opportunity_country
- application_type
- submission_method
- candidate_context
- why_applying
- relationship_context
- highlight_traits jsonb
- highlight_achievements text
- preferred_completion_at timestamptz nullable
- confidentiality_mode text check in confidential, non_confidential
- readiness_score smallint
- readiness_missing jsonb
- accepted_at timestamptz nullable
- declined_at timestamptz nullable
- decline_reason text nullable
- timezone_iana text

Add to referee_invitations:

- decision text check in accepted, declined nullable
- decided_at timestamptz nullable

Status check constraint migration:

- extend enum-like check values to canonical list above

### API

Candidate endpoints:

- POST /api/v1/requests creates draft packet fields
- GET /api/v1/requests/{id}/readiness returns readiness details
- POST /api/v1/requests/{id}/send enforces readiness gate
- POST /api/v1/requests/{id}/reminder queues manual reminder

Referee endpoints:

- POST /api/v1/referee/{token}/decision with accepted or declined
- GET /api/v1/referee/{token} returns packet summary plus decision state
- POST /api/v1/referee/{token}/submit allowed only after accepted

Dashboard behavior:

- action-oriented items derived from canonical status and deadlines

## Five-Phase Realignment Plan

This plan keeps the existing five-phase structure and maps the repositioning without restart.

### Phase 1: Foundation and auth baseline

Grill focus:

- Keep identity and security baseline stable.

Work:

- No rewrite required.
- Add product positioning language updates in landing and docs only after phase gates.

Gate outputs:

- architecture note confirming no auth redesign needed

### Phase 2: Candidate request workflow

Grill focus:

- Is request creation collecting enough context for a strong reference.

Work:

- Add Reference Packet fields and readiness logic
- Add readiness endpoint
- Block send when readiness fails
- Update candidate create flow to draft first, then explicit send

Tests:

- readiness pass and fail scenarios
- status transition draft to sent with readiness gate

Security:

- validate server-side ownership and payload constraints

UX:

- request builder shows missing checklist and explains why

### Phase 3: Referee experience

Grill focus:

- Can referee decide quickly with enough context and no account.

Work:

- Add accept or decline decision endpoint
- Add dedicated context view sections
- enforce submit only when accepted
- better referee decision and follow-up status propagation

Tests:

- token validity, expiry, revoked
- accept, decline, and submit transition guards

Security:

- decision and submit paths protected by token hash and state checks

### Phase 4: Notifications and reminders

Grill focus:

- Do reminders reduce uncertainty without spam.

Work:

- manual reminder action
- state-aware reminder throttling
- thank-you notification action for candidates
- notification templates aligned to new states

Tests:

- reminder eligibility matrix by status
- retry behavior and dead-letter path

Observability:

- metrics by notification_type and final state

### Phase 5: Dashboard, analytics, and validation hardening

Grill focus:

- Is the dashboard action-oriented and globally usable.

Work:

- command-center cards and action CTAs
- global timezone correctness pass
- align PostHog events to revised funnel names
- funnel and completion rate instrumentation

Tests:

- e2e happy path from request draft to submission
- timezone rendering checks

## Product Analytics Alignment

Track these events:

- landing_page_viewed
- signup_started
- signup_completed
- request_started
- request_completed
- request_readiness_completed
- request_sent
- referee_request_opened
- referee_request_accepted
- referee_request_declined
- referee_context_viewed
- reference_upload_started
- reference_submitted
- reminder_sent
- thank_you_sent

Primary metric:

- percentage of sent requests completed before deadline

Secondary metrics:

- median time from sent to accepted
- median time from accepted to submitted
- decline rate and top decline reasons

## What Not To Build Now

Deliberately excluded in this realignment:

- universal integrations with application portals
- full dossier delivery network
- full application tracking platform
- CRM-like referee relationship suite beyond lightweight reuse
- AI-generated reference writing

## Risks and Mitigations

- Risk: schema bloat in one phase
  - Mitigation: add packet fields in additive migration, keep old fields until rollout complete
- Risk: breaking existing flows
  - Mitigation: backward-compatible API responses and staged frontend toggles
- Risk: status complexity bugs
  - Mitigation: centralized transition guards and transition tests
- Risk: unclear confidentiality expectations
  - Mitigation: explicit confidentiality mode in request and UI copy

## Immediate Implementation Backlog

1. Add migration for status expansion, packet fields, confidentiality mode, and invitation decision fields.
2. Add backend readiness evaluator and readiness endpoint.
3. Add referee decision endpoint and state transitions.
4. Update request creation UI from auto-send to draft plus readiness plus send.
5. Update referee page with accept or decline first, then context and upload.
6. Update dashboard to action-oriented cards and CTAs by status.
7. Align PostHog event names to revised funnel.
8. Extend OpenAPI spec for new endpoints and schemas.
9. Add tests for transitions, readiness, and confidentiality enforcement.

## Current Conclusion

Proceed with implementation.

Do not restart architecture.

Implement the differentiated coordination wedge using additive schema and endpoint changes, preserving existing auth, token security, outbox delivery pattern, and modular monolith structure.
