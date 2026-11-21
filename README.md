# School Hub — low-friction school workspace prototype

An interactive, **fictional-data-only** proof of concept for a unified school staff workspace. The primary design goal is to minimise time, clicks, and context switching between finding information and acting on it.

> **Not production software.** The repository is public. No school data, secrets, identifiers or genuine safeguarding information should be committed, entered or copied into the prototype.

## Explore

Open `index.html` locally in a modern browser or serve the repository with any static web server. Once GitHub Pages has been enabled (Settings → Pages → Source: GitHub Actions), the included deployment workflow publishes updates from `main`.

The app uses plain HTML, CSS and JavaScript with **no dependencies and no build step**.

### Included journeys

1. **Find and support a student** — search globally (press `/` or `Ctrl/Cmd+K`), open a fictional student, inspect the academic summary, add an academic note or intervention, and send a contextual demo staff message.
2. **Review a class** — open a class straight from the homepage or search, view a student list, compare illustrative assessment means, see who has an academic follow-up, and open a student without returning to a landing page.
3. **Complete a school process** — open an assigned action, inspect its context in a side drawer, mark it complete, or create a new follow-up task.
4. **Switch staff views** — use the role menu in the header to preview different information priorities. This **does not implement security or real access control**.
5. **Explore information and operations** — open school event concepts, policy placeholders and PTM / CCA / examination review directions.

All demo edits exist in page memory only and **reset on refresh**. No data is submitted to a server.

## Interaction principles

- Universal, keyboard-accessible search in the top bar
- Main priorities on the homepage without initial scrolling on a typical school laptop
- Persistent student context while switching between views
- Side drawers for actions rather than separate pages
- Direct links from a task to its associated student or class
- Dense but legible information instead of tall decorative cards
- Responsive layouts, visible focus states, reduced-motion support
- Escape to dismiss open panels; Enter to select a search result

## V2 — Classes and assessment editing

The **Classes** area is now an interactive assessment workspace, with:

- **Flagged register:** visible EAL (English as an Additional Language), SEN (Special Educational Needs) and SOC (Student of Concern) demonstration badges; tap filters to narrow the class register. The badges are **read-only, fictional indicators** and do not expose pastoral or safeguarding case details.
- **Assessment list:** see assessment mode, mark coverage, mean, draft/published status, excluded pupils, and whether each assessment contributes to school/class summaries.
- **New, edit or reuse:** enter an assessment name, date, type and analysis mode; reuse the question/topic structure of an existing assessment without copying marks or exclusions; edit existing assessments without deleting history.
- **Structure editor:** add or remove topics or individual questions, choose maximum marks, topic tags and AO1/AO2/AO3 labels.
- **Marks matrix:** enter marks per pupil and per topic/question; blank is not the same as zero. Pupil records remain visible even when excluded.
- **Confirmation safeguards:** exclusions require a written reason and a dedicated final review. Excluding an entire assessment from class summary statistics additionally requires typing \`EXCLUDE\`. Changes to exclusion settings must be acknowledged before Save.
- **Live analysis:** class and pupil marks, mean by topic, mean by question, assessment objectives, and context-aware status of missing/incomplete/excluded records.

### Intended safety and data model

A real version must **not** let class teachers edit authoritative EAL, SEN or SOC flags: they should be synchronised from school-approved sources and shown only to appropriate staff. SOC is an administrative support indicator, not a safeguarding allegation or clinical conclusion. Safeguarding detail stays outside the classroom workspace, in an approved restricted system.

Assessment editing would require server-authorised write permissions, revision history with author/time/before-after values, independent audit storage, rollback, and clear single-source-of-truth rules. The prototype's review confirmation is a UI safeguard **only**, not a security control.

### Summary rules

- Per-student scores are calculated only when *all* item marks have been provided and validated.
- A valid **0** is included; a blank or incomplete markbook is not silently turned into zero.
- Student-level exclusions remove a student's marks from that assessment's calculations, but never delete the pupil or the entered scores.
- Excluding an assessment from summary statistics removes it from the *cross-assessment class mean* but keeps its data, standalone analysis and pupil-level figures available.
- The illustrative class summary is the **unweighted mean of eligible per-assessment percentage means**, not a high-stakes attainment indicator. A real school should define reporting periods, weighting, grading and whether different assessment types contribute differently.
- A wholly unmarked assessment remains Draft and does not enter summary calculations.

The prototype remains fully client-side, with all marks and actions held in page memory and reset on refresh.

## Deliberately not included

- Google Workspace sign-in
- SIMS, Firefly, ManageBac, SchoolsBuddy or Pupil Progress connectivity
- Actual permissions, audit trail, database or retention logic
- Safeguarding case management or reporting
- Parent or student accounts
- Production-grade messaging, notifications or task assignment

A real implementation would require school IT sponsorship, documented system owners and contracts, vetted integration methods, server-enforced least-privilege and record-level access, encryption, comprehensive audit logs, backup/restore, a data protection assessment and independent security review. Never treat UI role switching as authorisation.

## Suggested V2 work

1. Observe 5–8 representative staff members completing these workflows; record time, interaction count, scrolling and points of confusion.
2. Refine the information hierarchy using staff feedback.
3. Write a field-level data dictionary and source-of-truth map for SIMS / external systems.
4. Prototype validated permission boundaries using **synthetic identities and test data**, with the school's IT team.
5. Decide which existing systems should stay authoritative instead of replicating them.

## Files

- `index.html` — accessible entry point
- `styles.css` — responsive UI / design system
- `data.js` — explicitly fictional demo fixtures
- `app.js` — client-side navigation, search, details, interactions
- `assessment-core.js` — pure, tested assessment and exclusion calculations
- `classroom.js` — flagged registers, markbooks, assessment wizard and analysis
- `classroom.css` — compact class workflows
- `tests/fixture.test.cjs` — basic fixture invariants
- `tests/assessment.test.cjs` — assessment computation and exclusion guard tests
- `.github/workflows/ci.yml` — dependency-free syntax and fixture checks
- `.github/workflows/pages.yml` — GitHub Pages deployment workflow

## Attribution

Initial exploratory prototype, November 2026. All names, tasks, scores and records are fictional; any similarities to real pupils or staff are coincidental.
