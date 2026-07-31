# CuraLink AI Improvement Roadmap

This document tracks proposed product, safety, reliability, security, UX, and engineering improvements for CuraLink AI.

## How to Use This Roadmap

- Work on one item at a time unless a group is explicitly selected.
- Refer to an item by its ID, such as `SAFE-01` or `UX-03`.
- Change an item's status only after implementation and verification are complete.
- Valid statuses: `Not started`, `In progress`, `Blocked`, and `Complete`.

## Recommended Implementation Order

1. Medical safety and health-profile integration
2. API security, privacy controls, and automated tests
3. Chat streaming and persistence reliability
4. Structured nearby-care results
5. Symptom tracking, consultation summaries, and reminders
6. Accessibility, deployment, and maintainability

---

## Medical Safety And Personalization

### SAFE-01: Use the health profile in AI responses

- **Priority:** Critical
- **Status:** Complete
- **Goal:** Include relevant age, conditions, allergies, measurements, and lifestyle information in AI context.
- **Acceptance criteria:**
  - Only relevant profile fields are included.
  - Missing information is handled without assumptions.
  - Profile values are treated as user-provided, unverified context.
  - Sensitive profile information is not logged.

### SAFE-02: Add emergency symptom triage

- **Priority:** Critical
- **Status:** Complete
- **Goal:** Detect warning signs such as chest pain, severe breathing difficulty, stroke symptoms, severe bleeding, overdose, unconsciousness, or self-harm risk.
- **Acceptance criteria:**
  - High-risk messages trigger immediate emergency guidance.
  - Routine follow-up questions do not delay urgent advice.
  - Behavior is covered by automated tests.

### SAFE-03: Strengthen the medical system prompt

- **Priority:** Critical
- **Status:** Complete
- **Goal:** Establish consistent medical-safety behavior.
- **Acceptance criteria:**
  - Ask relevant clarifying questions.
  - Communicate uncertainty and avoid claiming a diagnosis.
  - Check known allergies and medicines when relevant.
  - Distinguish self-care from reasons to seek professional care.

### SAFE-04: Add structured symptom assessment

- **Priority:** High
- **Status:** Complete
- **Goal:** Collect onset, duration, severity, location, associated symptoms, medicines, pregnancy status, and relevant history.
- **Acceptance criteria:**
  - Guided questions and free-form chat are both supported.
  - Answers can be corrected or skipped.
  - Collected answers become conversation context.

### SAFE-05: Add medication information and interaction warnings

- **Priority:** High
- **Status:** Complete
- **Goal:** Store current medicines, dosage, frequency, and previous adverse reactions.
- **Acceptance criteria:**
  - Medicines can be added, edited, and removed.
  - Allergies and current medicines inform relevant guidance.
  - Users are told to confirm medication changes with a clinician or pharmacist.

---

## Security And Privacy

### SEC-01: Add API rate limiting

- **Priority:** Critical
- **Status:** Not started
- **Goal:** Protect authentication and paid AI endpoints from abuse.
- **Acceptance criteria:**
  - Login, signup, Google authentication, title, and chat endpoints are limited.
  - Limits are configurable.
  - Responses use a consistent error format.

### SEC-02: Improve JWT session security

- **Priority:** Critical
- **Status:** Not started
- **Goal:** Add expiring and revocable sessions.
- **Acceptance criteria:**
  - JWTs have a configured expiry.
  - Expired sessions return `401`.
  - Logout or revocation behavior is implemented.
  - Production secrets are validated at startup.

### SEC-03: Authenticate the chat-title endpoint

- **Priority:** High
- **Status:** Not started
- **Goal:** Prevent unauthenticated use of paid title generation.
- **Acceptance criteria:**
  - `/api/chat/title` requires authentication.
  - Unauthorized requests never invoke the AI provider.

### SEC-04: Validate and limit chat input

- **Priority:** Critical
- **Status:** Not started
- **Goal:** Reject oversized, invalid, or malformed chat payloads.
- **Acceptance criteria:**
  - Roles and content are validated server-side.
  - Message, conversation, request-body, and context limits are enforced.
  - Invalid messages return useful `400` responses.

### SEC-05: Add health-data privacy controls

- **Priority:** Critical
- **Status:** Not started
- **Goal:** Give users control over profile and consultation data.
- **Acceptance criteria:**
  - AI processing and location sharing require clear consent.
  - Users can export data and delete chats or their account.
  - Retention behavior and privacy policy are documented.

### SEC-06: Harden AI output rendering

- **Priority:** High
- **Status:** Not started
- **Goal:** Safely render AI Markdown and external links.
- **Acceptance criteria:**
  - Unsafe HTML is not rendered.
  - External links use safe browser attributes.
  - Prompt-injection and rendering risks have tests.

---

## Chat Reliability And Management

### CHAT-01: Fix Server-Sent Events parsing

- **Priority:** Critical
- **Status:** Not started
- **Goal:** Correctly handle frames split across network chunks and content containing line breaks.
- **Acceptance criteria:**
  - Partial frames are retained until complete.
  - Multi-line data, completion, and error events work reliably.
  - Fragmented-stream behavior has unit tests.

### CHAT-02: Persist location-denied conversations

- **Priority:** High
- **Status:** Not started
- **Goal:** Save location requests and permission-denied responses in chat history.
- **Acceptance criteria:**
  - Messages survive refresh.
  - New and existing conversations behave consistently.
  - Save failures are recoverable.

### CHAT-03: Add stream controls and recovery

- **Priority:** High
- **Status:** Not started
- **Goal:** Let users stop, retry, and recover interrupted responses.
- **Acceptance criteria:**
  - A visible stop control cancels generation.
  - Failed responses offer retry.
  - Partial responses are identified.
  - Responses cannot attach to the wrong chat.

### CHAT-04: Add edit, regenerate, and branching

- **Priority:** Medium
- **Status:** Not started
- **Goal:** Let users correct questions and explore alternative answers.
- **Acceptance criteria:**
  - User messages can be edited.
  - Assistant responses can be regenerated.
  - Original branches are not silently destroyed.

### CHAT-05: Improve chat organization

- **Priority:** Medium
- **Status:** Not started
- **Goal:** Add rename, pin, archive, date grouping, message search, export, and delete-all.
- **Acceptance criteria:**
  - Rename uses the existing backend title update.
  - Destructive actions require confirmation.
  - Search covers titles and message text.

### CHAT-06: Scale conversation storage and context

- **Priority:** High
- **Status:** Not started
- **Goal:** Prevent unbounded user documents and AI context.
- **Acceptance criteria:**
  - Chats are moved to a dedicated collection or otherwise bounded.
  - History is paginated and indexed.
  - Older AI context can be summarized.

---

## New Product Features

### PROD-01: Add a vitals and symptom timeline

- **Priority:** High
- **Status:** Not started
- **Goal:** Track temperature, blood pressure, glucose, pulse, oxygen saturation, pain, symptoms, and weight.
- **Acceptance criteria:**
  - Entries include time and optional notes.
  - Entries can be edited and deleted.
  - Trends use accessible charts.
  - Abnormal readings produce cautious guidance, not diagnoses.

### PROD-02: Generate consultation summaries

- **Priority:** High
- **Status:** Not started
- **Goal:** Create editable summaries for clinician visits.
- **Acceptance criteria:**
  - Include symptoms, timeline, history, medicines, warning signs, and questions.
  - Mark summaries as AI-generated.
  - Support editing, printing, and PDF export.

### PROD-03: Add follow-up reminders

- **Priority:** Medium
- **Status:** Not started
- **Goal:** Remind users to reassess symptoms, record measurements, take medicine, or seek care.
- **Acceptance criteria:**
  - Reminders can be completed, snoozed, edited, or deleted.
  - Users control timing and content.

### PROD-04: Add family and caregiver profiles

- **Priority:** Medium
- **Status:** Not started
- **Goal:** Support separate health contexts for dependents.
- **Acceptance criteria:**
  - Every consultation is associated with one visible profile.
  - Profile data is never mixed.
  - Switching profiles requires deliberate action.

### PROD-05: Add multilingual responses and voice input

- **Priority:** Medium
- **Status:** Not started
- **Goal:** Support selectable languages and speech-to-text.
- **Acceptance criteria:**
  - Voice input can be reviewed before sending.
  - Text-to-speech respects the selected language where supported.

---

## Nearby Care

### LOC-01: Return structured nearby-care results

- **Priority:** High
- **Status:** Not started
- **Goal:** Return facilities as structured data instead of only AI text.
- **Acceptance criteria:**
  - Include name, coordinates, distance, type, and source.
  - The UI renders results directly.
  - The AI cannot invent or alter facility details.

### LOC-02: Integrate the map into the active workflow

- **Priority:** High
- **Status:** Not started
- **Goal:** Display the existing map when results are available.
- **Acceptance criteria:**
  - Show approximate user location and facilities.
  - Result selection focuses its marker.
  - Directions open in a mapping service.
  - Loading, empty, denied, and error states are supported.

### LOC-03: Add richer facility information

- **Priority:** Medium
- **Status:** Not started
- **Goal:** Show phone, hours, emergency availability, address, website, speciality, and accessibility when available.
- **Acceptance criteria:**
  - Missing information is not inferred.
  - Data source and freshness limitations are disclosed.

### LOC-04: Add manual location search

- **Priority:** High
- **Status:** Not started
- **Goal:** Support city, locality, address, or postal-code search.
- **Acceptance criteria:**
  - Approximate and precise locations are distinguished.
  - Manual location is not retained without consent.

---

## User Experience And Accessibility

### UX-01: Improve error recovery and offline behavior

- **Priority:** High
- **Status:** Not started
- **Goal:** Provide actionable feedback for network, AI, database, and location failures.
- **Acceptance criteria:**
  - Recoverable errors include retry actions.
  - Offline state is communicated.
  - Unsaved work is preserved where possible.

### UX-02: Complete an accessibility pass

- **Priority:** High
- **Status:** Not started
- **Goal:** Support keyboard and assistive-technology users.
- **Acceptance criteria:**
  - Clickable rows and cards use semantic controls.
  - Icon buttons have accessible names.
  - Labels are connected to form fields.
  - Streaming output and errors use live regions.
  - Focus and reduced-motion behavior are supported.

### UX-03: Improve health-profile editing

- **Priority:** Medium
- **Status:** Not started
- **Goal:** Make profile updates clearer and safer.
- **Acceptance criteria:**
  - Saving state prevents duplicate submissions.
  - Client and backend validation agree.
  - Condition and allergy tags can be removed.
  - Unsaved changes and field errors are clearly shown.

### UX-04: Replace hard-coded model branding

- **Priority:** Low
- **Status:** Not started
- **Goal:** Prevent the UI displaying the wrong configured model.
- **Acceptance criteria:**
  - Branding comes from configuration or is provider-neutral.

### UX-05: Improve loading and empty states

- **Priority:** Medium
- **Status:** Not started
- **Goal:** Clearly communicate application state.
- **Acceptance criteria:**
  - Profile, history, location, and streaming have distinct feedback.
  - Empty states provide a suitable next action.
  - Loading indicators avoid major layout shifts.

---

## Backend And Data Architecture

### ENG-01: Separate backend responsibilities

- **Priority:** High
- **Status:** Not started
- **Goal:** Split prompting, Groq access, location, validation, and routing into testable modules.
- **Acceptance criteria:**
  - Route handlers mainly coordinate requests and responses.
  - AI and location services can be tested without Express.
  - Shared validation is not duplicated.

### ENG-02: Add production observability

- **Priority:** High
- **Status:** Not started
- **Goal:** Diagnose failures without exposing health information.
- **Acceptance criteria:**
  - Structured logs include request IDs.
  - Health and readiness endpoints exist.
  - AI latency and external failures are measurable.
  - Health messages and precise coordinates are excluded from logs.

### ENG-03: Handle startup failures correctly

- **Priority:** High
- **Status:** Not started
- **Goal:** Avoid accepting traffic without required configuration or services.
- **Acceptance criteria:**
  - Environment variables are validated.
  - Readiness waits for MongoDB.
  - Connection failure has a controlled shutdown or retry strategy.

### ENG-04: Strengthen database schemas and indexes

- **Priority:** High
- **Status:** Not started
- **Goal:** Enforce integrity and efficient queries.
- **Acceptance criteria:**
  - Schemas define required fields, enums, lengths, and bounds.
  - Users and chats have timestamps.
  - Authentication and history queries have indexes.

### ENG-05: Add automated test coverage

- **Priority:** Critical
- **Status:** Not started
- **Goal:** Protect critical workflows from regression.
- **Initial coverage:**
  - Authentication and authorization
  - Profile validation
  - Chat persistence
  - SSE parsing
  - Location normalization and distance filtering
  - Emergency triage and medical prompt behavior
- **Acceptance criteria:**
  - Backend and frontend test commands pass.
  - Critical tests run in CI.
  - Tests do not depend on live AI or Overpass services.

### ENG-06: Add deployment and CI automation

- **Priority:** Medium
- **Status:** Not started
- **Goal:** Make production builds repeatable.
- **Acceptance criteria:**
  - CI runs linting, tests, and frontend builds.
  - Dependency and secret scanning are included.
  - Production configuration and rollback steps are documented.

---

## Documentation

### DOC-01: Correct README drift and encoding

- **Priority:** Medium
- **Status:** Not started
- **Goal:** Make the README match the current application.
- **Known issues:**
  - It documents a nonexistent `/api/location/nearby-doctors` route and `location.js`.
  - It says 3 km while the backend uses 5 km.
  - Configuration details are outdated or contradictory.
  - Some characters have encoding corruption.
- **Acceptance criteria:**
  - Routes, configuration, architecture, and features match the code.
  - UTF-8 characters render correctly.
  - Setup instructions work from a clean environment.

### DOC-02: Add security, privacy, and medical-safety documentation

- **Priority:** High
- **Status:** Not started
- **Goal:** Document application responsibilities and limitations.
- **Acceptance criteria:**
  - Medical limitations and emergency behavior are explained.
  - Data handling and retention are documented.
  - Production security settings are listed.
  - External AI and location dependencies are disclosed.

---

## Progress Summary

| Area | Not Started | In Progress | Blocked | Complete |
|---|---:|---:|---:|---:|
| Medical safety and personalization | 0 | 0 | 0 | 5 |
| Security and privacy | 6 | 0 | 0 | 0 |
| Chat reliability and management | 6 | 0 | 0 | 0 |
| New product features | 5 | 0 | 0 | 0 |
| Nearby care | 4 | 0 | 0 | 0 |
| UX and accessibility | 5 | 0 | 0 | 0 |
| Backend and data architecture | 6 | 0 | 0 | 0 |
| Documentation | 2 | 0 | 0 | 0 |
| **Total** | **34** | **0** | **0** | **5** |
