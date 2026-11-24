# School Hub — low-friction school workspace prototype

An interactive, **fictional-data-only** proof of concept for a unified school staff workspace. The primary design goal is to minimise time, clicks, and context switching between finding information and acting on it.

> **Not production software.** The repository is public. No school data, secrets, identifiers or genuine safeguarding information should be committed, entered or copied into the prototype.

## Version 2 rebuild (V2-09)

The new implementation is the default site at `index.html` and is also available at `v2/index.html`. The previous prototype is preserved at `legacy.html`. Serve the repository using a static HTTP server (ES modules require HTTP). Home and Notices now include editable, audience-scoped fictional communications, acknowledgements and the shared reporting schedule. Classes now has a configurable register, subject comments, target/prediction editing and a unit-organised assessment tracker with reusable definitions, mark entry, CSV/Excel paste, publication and guarded exclusions. All three academic analysis tabs now display connected student trends, class distributions and faculty/common-assessment comparisons with scoped evidence drilldowns. Students now has a filtered directory and four-tab cross-subject profiles with individually scoped assessment histories, subject comments and intervention records. Intervention now supports role-gated Wave 1–3 handovers, assigned House responses, reviews, individual study plans, closure/history and connected personal action queues. V2-09 completes the integration and usability pass, with a role-based demo guide, stale-write safeguards, scope and navigation fixes, cross-role regression tests and a headless browser smoke check. The result is a fictional-data demonstration, not a production school information system. See [V2 roadmap and data contract](v2/README.md). The descriptions below document the archived prototype, not completed V2 functionality.

## Explore

Serve the repository with a static web server; open `/` for V2 or `/legacy.html` for the archived prototype. Once GitHub Pages has been enabled (Settings → Pages → Source: GitHub Actions), the included deployment workflow publishes updates from `main`.

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

## V3 — Additive roles and Wave 1–3 student support (fictional prototype)

### Who sees which classes?

| Active role | Class visibility | Edit assessment data | Intervention scope |
| --- | --- | --- | --- |
| Teacher | Own teaching classes + pupil profiles in their tutor group | **Only their teaching classes** | Wave 1 and relevant pupil support for their classes; Wave 2+ tutor-group summary if relevant |
| Head of Faculty / Department | All classes in their faculty | Only if **also** the class teacher in this demo | All faculty cases; approves Wave 2, defines faculty response and requests House actions |
| Housemaster / Housemistress | All classes | No unless **also** teacher of that class | Case details for their own House; action requests and optional Wave 3 referral |
| School Leadership | All classes | No unless **also** teacher of that class | All cases; acts on Wave 3 referrals |

A staff member may have **multiple roles at once**, with the union of their relevant permissions. The demo staff menu switches among fictional people and allows additive role toggles to exercise the UI. Changing a role does not create real permission or provide authentication.

**Student of Concern** is not the same as **Wave 1**. Wave 1 is a class-teacher support plan and gets a **W1** badge; **SOC** appears when the same case reaches Wave 2 or 3. The full intervention history is restricted to relevant staff even when a Housemaster can browse another House's class.

### The support pathway

1. **Wave 1: class teacher** starts an intervention from a class register or profile, defines the concern, selects suggested strategies, writes the individual action plan and sets a review date. Suggestions reflect the supplied mathematics intervention examples: scaffolded practice, differentiation, vocabulary support, visual resources, motivation and study skills. A teacher can choose **Requires Wave 2** during this step; the referral asks for a reason and intentional confirmation.
2. **Request Wave 2: teacher** documents why Wave 1 is insufficient, including a potential 3-related-SIMS-behaviour-points trigger or a more serious concern. This is a deliberate request—not automated scoring or a replacement for recording behaviour points in SIMS.
3. **Wave 2: Head of Faculty** sees the action in their queue, records a faculty support plan and review date, and gives the relevant Housemaster/mistress a **specific requested action**. The shared case captures the faculty plan and the House response.
4. **Housemaster/mistress** sees the request for a student in their House, records the action taken and can mark the action complete.
5. **Wave 3: HoF or HsM** can request School Leadership involvement if Wave 2 is unsuccessful or a wider concern emerges. A written reason and deliberate confirmation are required.
6. **School Leadership** receives the referral and records the Wave 3 plan and review date.
7. **All relevant staff** can see the single chronological record, with separate wave plans, outcomes, owner actions and review history.

This is **not safeguarding case management**. It must not store confidential safeguarding information or trigger public disclosures. Emergency/safeguarding concerns must continue through the school's approved specialist processes.

Source decks supplied for this prototype:
- [Students of concern and intervention in Maths](https://docs.google.com/presentation/d/1xPzMFP9NAmG4WC8wViI_vS2aN1sCmDt4_bZgFFwmEVg/edit)
- [In-class interventions in Maths](https://docs.google.com/presentation/d/1800naLpid4EwwP9poxreig-_-U8ANMtalRM29cDtUFo/edit)

**Production requirements:** staff Google identity + group sync, class/faculty/house/tutor assignments from authoritative school sources, server-enforced row/field permissions, restricted protected data, approvals, durable audit trail with immutable events, access reviews, retention and escalation rules, backups, and a formal privacy/security assessment. The current public GitHub Pages prototype has *none* of those controls. All changes are session-only and disappear on reload. Notifications and email reminders are **illustrative**, not sent to staff.

## V4 — First-class tutor-group tags (fictional prototype)

Every student now has an explicit **tutorGroupId** (for example, **TG 11A**), separately from their year, subject class, House, and EAL/SEN/SOC indicators. A **tutorGroups** directory includes the tutor assigned to a group when present in the synthetic fixture; a group without a recorded tutor remains valid.

- **Class registers:** a compact **Tutor group** column with neutral TG 11A tags plus an **All groups / 11A / 11B …** dropdown. Tutor-group and EAL/SEN/SOC/W1 flag filters can be combined.
- **Student profiles:** tutor group is displayed with the student identity, beside year and House.
- **People and Tutor group:** the same tag identifies each pupil regardless of their teaching class. Teacher access to a tutor group works across subject areas.
- **Search:** typing a tutor-group code finds students in that group, subject to the active demo role’s scope.
- **Interventions:** the shared case list and record include tutor-group membership; a named tutor appears when the demo directory has an assignment.
- **Roles:** isTutorOf and canViewStudent use the explicit tutorGroupId, not the older form field. The older field is retained only as a compatibility alias in the demo fixture and should not be trusted for permission checks.

Tutor-group assignments are read-only in this prototype. In a production system, the authoritative student–tutor-group and staff–group assignments should be synchronised from approved school records (for example, SIMS), subject to approved administrators and an audited change process. **A tutor-group tag is routine administrative metadata, not a concern or safeguarding flag.**

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
- `access.js` — role-based access simulation with additive roles and scopes
- `support-core.js` — transition-validated fictional intervention cases
- `support-ui.js` / `support.css` — shared support queue, hand-offs, and timeline
- `tests/access-support.test.cjs` — additive role and workflow transition tests
- `tests/fixture.test.cjs` — basic fixture invariants
- `tests/assessment.test.cjs` — assessment computation and exclusion guard tests
- `.github/workflows/ci.yml` — dependency-free syntax and fixture checks
- `.github/workflows/pages.yml` — GitHub Pages deployment workflow

## Attribution

Initial exploratory prototype, November 2026. All names, tasks, scores and records are fictional; any similarities to real pupils or staff are coincidental.

The V2 branding pass uses the supplied JIS crest and campus photo, local House badge artwork and the user-supplied House colours. See [visual identity notes](v2/README.md#jis-visual-identity).

Home refinement: scope-specific faculty/teaching, tutor, House and school overviews, direct filtered navigation, prioritised personal action queue, and consistent compact JIS typography and layout.

Class/profile refinement: daily and full register layouts, quick cohort filters, direct tracker/assessment-history access, filtered pupil navigation and compact cross-subject profiles with connected support and attainment evidence.

Assessment/analysis refinement: direct pupil mark links, spreadsheet navigation and live unsaved coverage, evidence-first teaching priorities with real denominators, and direct mark/analysis navigation.
