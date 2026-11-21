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
- `tests/fixture.test.cjs` — basic fixture invariants
- `.github/workflows/ci.yml` — dependency-free syntax and fixture checks
- `.github/workflows/pages.yml` — GitHub Pages deployment workflow

## Attribution

Initial exploratory prototype, November 2026. All names, tasks, scores and records are fictional; any similarities to real pupils or staff are coincidental.
