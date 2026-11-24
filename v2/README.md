# JIS Hub — Version 2 rebuild

**Fictional-data-only engineering prototype.** No real pupils, staff records, medical details, confidential notes, safeguarding details, credentials or identifiers may be entered here. The public static website is not secure school information management software.

## Roadmap

Based on the supplied visual mock-up: [JIS Hub plan](https://docs.google.com/presentation/d/1cuU2s-utebJggQRodu65GPoKwim3lCGBTwwr9YGR820/edit). This is a fresh implementation, not a migration of the legacy mock statistics. V2-02 replaces the default site; the previous prototype is preserved at /legacy.html.

| Pass | Deliverable |
|---|---|
| V2-01 | Normalised records, synthetic multi-subject school, role scopes, derived analytics, demo store and tests |
| V2-02 | New responsive shell, five functional navigation destinations, global search, tables, scope selectors, tooltips and accessible action panels; other modules inactive |
| V2-03 | Role-aware Home and Notices, staff notices, briefings and shared reporting deadlines |
| V2-04 | Class overview, quick class selector, student information, flags, target comparisons and subject comments |
| V2-05 | Unit-based markbook, assessment creation/reuse, total/topic/question marks, Excel/CSV import, common assessments, grade boundaries, weighting, exclusions and edit safeguards |
| V2-06 | Student, class and faculty analysis including charts, distributions, topic and question analysis, reports and drill-downs |
| V2-07 | Student directory and four-tab student profiles, cross-subject results and tutor/House views |
| V2-08 | Wave 1–3 intervention actions, role-specific queues, individualised study plans, reviews and historic cases |
| V2-09 | Integration audit, permission review, accessibility, responsive layout, persistence, performance and click/scroll tests; replace legacy only after approval |

## Architecture and API

All new code uses dependency-free browser/Node ES modules. UI must call the V2 read model and store, never embed independent numbers in markup.

- **model.mjs**: schema version, referential integrity, unique record IDs, validation and indexes.
- **demo-data.mjs**: deterministic fictional fixture, no real imports; 210 pupils in Years 7–13, 42 classes, 630 enrolments (3 per pupil), 21 courses, 21 tutor groups, 3 faculties, 3 Houses, 8 staff and 105 assessment definitions. Each course has two parallel classes, two units and a shared total-only, topic-based, question-based, diagnostic and draft assessment.
- **access.mjs**: additive teacher, tutor, faculty, House and leadership roles; assignment relationships determine scope. Heads of House and SLT can browse all academic classes, but House case visibility is restricted to their own House unless another responsibility grants access. Tutors see their tutees across subjects. Unknown scopes are empty. Faculty scope selects relevant subject enrolments, not every subject of every pupil.
- **analytics.mjs**: pure functions deriving data from a snapshot. Student, class, common-assessment and cohort selectors; histograms, five-number summaries, trends, question/topic/AO breakdowns; intervention counts.
- **store.mjs**: optional browser-local demo persistence; validated transaction writes for marks, exclusions, prediction/target edits; author, timestamp, before/after and exclusion reason; subscriptions; confirmed reset; no real authentication. read(staffId) supplies permission-filtered UI read models, and analytics() gives a fresh calculation instance for tests/internal use.

Example:

    import { createStore } from './store.mjs';
    const store = createStore({ storage: window.localStorage });
    const view = store.read('sam');
    const home = view.home('faculty');
    const tracker = view.classSummary('11-maths-1');
    const pupil = view.student('P121');
    store.subscribe(() => render());
    store.saveResult('sam','11-maths-A1','P121@11-maths',{
      status:'present', marks:{total:28}
    });
    // On render, obtain a fresh store.read('sam') snapshot.

The store validates a transaction before committing it and before notifying subscribers. A failed local-storage write leaves the in-memory state unchanged. A reload validates the saved schema; corrupt/incompatible data is rejected, not silently overwritten. Schema 2 loads a schema 1 synthetic demo snapshot only when no schema 2 save exists. Marks, interventions, notices, notes and existing audit entries are retained; for changed fictional grade scales, legacy target labels are mapped via their old illustrative threshold to the new illustrative scale and affected assessment boundaries use the new defaults. Unchanged-scale custom boundaries are retained. The schema 1 local-storage key remains untouched as a backup. This is not a real qualification-grade conversion. An old read model intentionally represents an old snapshot; recreate it on every subscribed state revision. The demo reference date is 2026-11-24 and may be advanced by demo leadership. Data and all role checks remain client-side; these APIs are **not security boundaries**.

## Relational data contract

- Student has one stable ID, year, House, tutor group and administrative tags. SOC/W1/W2/W3 are derived from intervention records, not stored as unrelated editable flags.
- Staff has multiple roles. Faculty.headIds, House.headIds, tutorGroup.tutorIds and class.teacherIds link to staff. Multiple roles combine, not replace one another.
- Subjects belong to faculties. Courses identify subject, year, academic year and grading scheme. Classes belong to a course, with one or more teachers. Enrolment links one student to one teaching class. The fixture uses one class per pupil/subject/year, with many subject enrolments per pupil; historical transfers and timetable membership periods will require an extension before real import.
- Unit belongs to course. An assessment definition belongs to a unit and course, is assigned to one or more classes of that same course, and contains ordered items with positive maximum marks and optional AO/topic tags. The maximum is derived from its items. Common assessment comparison uses the same definition/ID for all participating classes.
- Results belong to an assessment and enrolment pair; marks are raw numeric values keyed by item ID. Assessment assignment is checked. Target/prediction belongs to the enrolment, not the person globally.
- Notes reference author and enrolment; interventions reference enrolment (so one pupil can have different subject cases), owner and wave state; study plans link to a case. Notices/deadlines specify audience; audit is append-only by convention in the demo.
- Student information fields (including CAT predictors, exam/admission numbers, PTM/PTE) are synthetic or null. Actual school definitions, source ownership, access-arrangement fields and field-level access policies must be agreed before exposing real information. Do not infer policy or clinical information from tags.

## Statistical contract (all demo defaults, not approved JIS grading policy)

Raw values are retained at full precision; UI rounds only at display time. No chart or table may independently store generated summary data.

| Metric | Definition |
|---|---|
| Assessment percentage | 100 × sum of item marks / sum of item maximum marks; all items must be marked |
| Assessment grade | Highest boundary not exceeding that assessment percentage, using its selected scheme |
| Unit / overall student percentage | Weighted mean of eligible complete assessment percentages for unit / date range; default weight 1 (equal assessments, not equal marks) |
| Student overall grade | Overall percentage mapped to the course tracker scheme, never averaged letter grades |
| Class / course mean | Equal mean of eligible pupil overall percentages; report coverage alongside it |
| Latest / best / weakest / trend | Eligible complete results only, latest ordered by assessment date then ID; strongest/weakest by percentage, descriptive not claims of equivalent paper difficulty |
| Target gap | Current grade's ordered index minus minimum target grade's index; predicted gap is separate |
| On track | Current grade at/above target; null when current/target is unknown |
| Next grade | Difference in percentage points to next course tracker boundary; null if at highest grade/no result |
| Topic / question / AO % | Total marks earned / marks available among complete eligible scored rows; report denominators; no invented question detail for total-only tests |
| Quartiles | Type 7 linear interpolation at (n−1)p, including median; min/max whiskers, not Tukey outliers |
| Standard deviation | Population SD for selected cohort, denominator n |
| Histogram | 10-percentage-point bins, lower-inclusive/upper-exclusive, last bin includes 100 |
| Faculty/House/school | Group course-level means and grade distributions separately; count unique pupils separately from subject enrolments; no meaningless mixed-course overall mean |
| Intervention overview | Count active cases, distinct pupils, wave counts, referrals, due/overdue reviews using demo reference date; closed cases kept |

The default date window includes assessments dated up to the demo reference date (inclusive); date filters may narrow it. Course grade schemes are illustrative: KS3 internal and numerical IGCSE 9–1/U, letter-graded IGCSE A*–G/U, and A level A*–E/U. U is an explicit ungraded result, not missing evidence. Each course chooses its own scheme; targets, predictions, calculated grades and assessment boundary labels all follow it. The sample senior Science course is now A level rather than IB so the two-family demo does not misrepresent IB qualification grades. The allocation is fictional and is not a statement of JIS qualification policy. Custom assessment schemes must preserve the ordered grade labels of their course. Real exam grade boundaries differ by paper/session and must be configured through authorised workflows, never treated as predictions.

### Inclusion rules

- **0** is a valid mark.
- No result/missing is unentered; absent is distinct; present with incomplete items is incomplete.
- Excluded individual results retain recorded marks but are omitted from calculations; an underlying recorded percentage may be shown separately labelled excluded.
- Draft and diagnostic/whole-assessment-excluded data do not enter summaries, trends, target comparisons or cross-assessment topic summaries. Standalone analysis can show diagnostics with an explicit exclusion label; draft standalone analysis is restricted to teachers/HoF in the read model.
- Coverage exposes scored, absent, missing, incomplete and excluded counts. The eligible count is the roster/assessment opportunity denominator, not number of valid marks.
- Re-inclusion needs a reason and explicit confirmation; excluding a whole assessment additionally requires typing EXCLUDE. Marks are never deleted by exclusion. Common assessment exclusion changes all assigned classes; only the appropriate faculty lead can do it. The future markbook must preview the impact and record user confirmation.

## Access and production boundary

All role scopes are illustrative, not JIS policy. Teachers can edit results/predictions only for their teaching classes; faculty leaders can edit minimum targets for their faculty and manage shared assessment settings. House, tutor and SLT permissions allow relevant reading, not automatic mark editing. Intervention case/action selectors derive access from the current roles. V2-08 will add the actual intervention transition writes and audit rules. V2-03 will implement notice/deadline mutations, V2-05 will implement assessment creation, reuse, import and boundary/weight edits.

Production requires school-approved Google identity, server-side row/field authorisation, authoritative membership synchronisation, protected persistence, independent audit storage, data retention and governance, and a separate safeguarding route. Do not connect real systems during this demonstration.

## Acceptance tests

Run from repository root:

    node --test tests/*.test.cjs tests/v2-*.test.mjs

The tests must establish relational integrity, permissions and denial cases, exact grade thresholds, missing and zero handling, weighting, common assessment comparisons, exclusion safeguards, persistence/reset and the propagation of a mark edit through all future views' data selectors. V2-02 onwards must bind their UI to the selectors and add interaction tests. V2-01 did not change the interface. V2-02 introduces the default V2 interface.

## V2-02 — Design system and connected preview

The root and v2/index.html use the same hub.mjs controller and hub.css design system. workspace.mjs builds scoped projections from the V2 store; views.mjs renders the five priority destinations, shared table controls, role-aware global search, tooltips and detail drawers. Future modules and future class-analysis tabs are explicitly inactive. The prototype defaults to Sam Taylor (Teacher + HoF + Tutor), with real demo assignment scopes, not privilege-changing toggles. All visible values derive from the current store snapshot. Assigned teachers can edit a prediction as a small end-to-end demonstration; the full markbook, notices and intervention mutations remain in their roadmap passes. Use / or Ctrl/Cmd+K for search, Escape to close a drawer, and Reset demo data to restore the baseline. Scope switching changes filters, not underlying permissions. Tutor/House class slices show the selected members only, with explicit partial-class coverage. Native modal dialogs provide keyboard focus containment. Keep all data fictional; no production security is implemented.

## V2-03 — Home and Notices

Home distinguishes the selected academic cohort from the staff member's personal action queue across all their responsibilities. The queue links to the actual intervention record (workflow edits remain V2-08) and notice acknowledgement. The schedule is a single shared list, with overdue and due-today reminders. Notices include audience, author, publication/expiry, priority, pinning, optional HTTPS resource links, and optional acknowledgement. Briefings are grouped by Monday-based publication week and archived/expired notices remain searchable in the Notices archive; future publication is visible only to its publisher and leadership. Leadership can publish any audience; HoF/HoD can publish to their faculty, HsM to their House and its tutor groups, and tutors to their assigned groups. Authors can edit/archive within their assigned publishing scope; leadership oversees all. Leadership visibility is separate from recipient membership. Acknowledgements are per recipient and notice version; revising a notice requires deliberate confirmation and resets acknowledgements, retaining before/after records in the audit. Reporting schedule creation, edits and archive are leadership-only. Personal completion/reopening is allowed to recipients and does not represent external submission; changing a deadline requires confirmation and resets completion markers. All mutations go through the validated local store. Existing V2-02 local snapshots remain readable (optional fields default safely); Reset demo data loads the richer fictional fixture. No attachment uploads or actual SIMS submission are supported. No real school data.

## V2-04 — Class overview

The Classes index has year/faculty/search and below-target filters. Each class has a persistent quick selector, previous/next and a compact Student Information table. Column groups (identity, attainment, latest result, targets, support, extra detail) can be toggled independently, saved per fictional staff persona in browser preferences, and reset. Student name stays fixed during horizontal scrolling; headers stay visible during vertical scrolling. Filters combine tutor group, House, administrative flag, SOC, subject wave and target status. SOC is derived from the viewer's accessible active academic cases for the pupil across subjects; W1–W3 beside it indicate only the current subject. No case is inferred from grades. This is an illustrative SOC definition, not approved JIS policy. Closed cases do not trigger SOC. Grade sort follows course grade order rather than label text. Average grade is derived from the weighted overall percentage and the tracker scheme; latest grade uses its assessment-specific scheme. Next grade uses percentage points to the next boundary, with no value if unassessed or at the highest grade. Clicking average/latest/coverage opens contributing result records, with missing, absent, incomplete and excluded states. Teachers edit their class predictions and add/edit their own subject comments. Faculty leaders edit relevant minimum targets with UI confirmation. Notes are keyed to enrolment, retain original author/date and optional edited date, and are visible only under existing note permissions. All changes are validated and audited by the store; class summaries, profiles and Home recompute on revision. Administrative flags remain read-only; case transition writes remain V2-08. No actual student data. The full assessment tracker is V2-05.

## V2-05 — Assessment tracker

The Assessment tracker tab displays unit-filtered assessment columns and live overall/unit percentages and grades. Click an assessment heading for the entry grid. Assigned class teachers can type marks, use Tab/Enter/Shift+Enter, paste an Excel TSV block from a selected mark cell, or import CSV/TSV data matched by stable fictional Student ID. CSV templates can be copied/downloaded; item identifiers are in the headers. Blank imported cells leave marks unchanged; CLEAR explicitly removes a mark. A blank Status infers present when marks are entered. Absent/missing statuses clear marks on save only after separate confirmation if previous marks existed. Invalid, duplicate or out-of-scope import rows reject the whole preview. A preview is applied to the unsaved grid, and a separate explicit Save commits the entire validated batch atomically. No partial commit on error. Zero, missing, incomplete, absent and excluded remain distinct. Unsaved grid edits are guarded when leaving the panel and during browser navigation. No real school records may be imported.

Assessment setup supports total, topic and question modes; per-item marks, topic and optional AO labels; weights; curriculum units; assessment-specific grade boundaries preserving course grade labels; and reuse of a same-course visible assessment definition without copying marks, exclusions or publication state. Faculty leadership can add units and assign a common definition to multiple classes, while a class teacher can define a single-class assessment. Each class teacher enters only their class marks. Definitions start as drafts; publication is confirmed. Drafts do not count in summaries, and draft access is limited to the relevant teacher/faculty lead. Once any result exists, mode, items and class assignments are locked; use a new copy for structural revisions. Changes to published definition metadata, weights or boundaries require confirmation and a written reason. Custom boundaries create a distinct immutable scheme rather than modifying course/shared boundaries. Overall grades use the course tracker scale; individual assessment grades use their own boundaries. Whole-assessment inclusion is a separate guarded action, requiring affected class/pupil preview, reason, confirmation and typed EXCLUDE for exclusion. Individual exclusion is also separately confirmed with a reason. Marks are retained, including for excluded assessments, and all writes use the common store/audit. Future-date and incomplete data remain ineligible until the statistical rules are met. V2-06 will add dedicated analysis views using these real records. 

## V2-06 — Academic analysis

All five class tabs are enabled. Student analysis presents individual assessment percentages, cumulative weighted attainment (within the selected date/unit range), course target boundary, units, highlights and mark-level topic evidence. Class analysis presents overall grade distribution, equal-width 10-percentage-point histogram, five-number box plot, population SD, target status and coverage, plus standalone assessment and question/topic/AO breakdowns. Faculty analysis compares only accessible parallel classes on the selected course, with explicit common-assessment comparisons using a single shared assessment ID; other courses/years remain separate. A unit filter is local to the current course, while date filters apply to year/course comparisons. The final histogram bin includes 100%; grades and bins use unrounded values. Box-plot whiskers are min/max, quartiles use linear interpolation at (n−1)p. Diagnostic assessments can be examined separately but never enter the included summary trend or topic aggregation. Draft/future assessments do not enter analysis. Empty/missing results do not become zero. Every clickable grade/bin/target/coverage/topic/question/AO or comparison row resolves to exactly the contributing scoped records; student/assessment links open existing details. Browser print uses the current filtered analysis. No mixed-course averages, invented chart numbers, implied difficulty equivalence or automatic intervention flags. Calculations use the existing engine on the current validated snapshot, respecting teacher/faculty/tutor/House/leadership scopes. V2-07 develops full student profiles.

## V2-07 — Student directory and profiles

The Students destination is now a working directory with search, year, tutor-group, House, administrative/SOC flags, attainment and support filters. Its metrics count unique pupils in the selected cohort; subject-status counts use only enrolments in that scope. Counts of active cases and due reviews use the same records as Home and Intervention. Unknown target status is separate from below-target status; no combined grade or percentage is calculated across different courses. SOC is derived from visible active cases, not attainment. The four-tab wide profile opens directly from the directory, class register, search and intervention or analysis evidence. It retains the opening context, supports previous/next and a pupil selector (following the filtered/sorted directory when opened there), and preserves tab/subject selection when returning from nested details. Individual profiles explicitly show all records permitted by the viewer's combined responsibilities, including subject teachers, tutor and Head of House, rather than silently treating a directory's current display scope as access control.

- Overview: cross-subject grades, MTGs, predictions, grade gaps, coverage, flags, cases, comments, and subjects needing attention. Existing target/prediction editors retain faculty/teacher permissions.
- Assessment history: subject selector, shared cumulative weighted trend, topic evidence, published history with matching chart sequence, diagnostic and excluded states. Individual evidence displays item marks, retained excluded scores and assessment-specific grade boundaries without exposing classmates. Drafts and future results are omitted. Direct link opens the correct student in class analysis, changing to All my access only if needed.
- Comments: chronological subject comments with author/edit attribution, authorised add/edit actions and separate read-only pastoral academic notes. Pastoral notes are limited to the relevant tutor/House staff/leadership or the author with enrolment access, not ordinary subject access. No safeguarding or confidential content.
- Interventions: accessible active and closed cases, review due/overdue indicators, owner and direct case details. V2-08 adds the case-write workflows.

All calculations and permissions are reused from the existing snapshot, with directory, profile and subject evidence cached per workspace revision. Automated tests verify scope counts, filters, peer ordering, individual results, mark/target/prediction edits, comments, pastoral access and rendering. This remains fictional browser-local data only, not production security or a source for real school records.

## V2-08 — Intervention workflows

The intervention workflow is now editable from Home, the Intervention dashboard, class register and pupil profile. One active case is allowed per enrolment (pupil and subject); a new case can be opened after closure without deleting the historic record. SOC/wave indicators, active-case counts, pupil counts and review dates use the existing shared case selectors. Academic evidence is read directly from the assessment engine. No mark or grade automatically initiates a case.

- Wave 1: assigned class teacher records academic concern, strategies, specific plan, success measure and review date. A confirmed serious-concern referral can be made at creation. Standard Wave 2 requests record trigger, evidence, discussion and an assigned relevant faculty lead.
- Wave 2: the assigned faculty lead activates the plan, specifies further support and sends a request to a selected responsible Head of House. House responds with agreed action and explicit completion; the request stays outstanding until completed, even if the case escalates. Faculty or relevant House lead can request Wave 3, with evidence, reason and assigned leadership reviewer.
- Wave 3: assigned leadership reviewer activates and reviews the wider academic plan. Requested waves are distinct from activated waves. All previous plans and referral details remain on the same record. Legacy local demo cases without explicit referral metadata remain actionable by their relevant role.
- Review: the classroom teacher (Wave 1), faculty lead (Wave 2), or assigned leadership reviewer (Wave 3) records evaluation and chooses Continue, Revise or Resolved. Continue/revise requires a later review date. Revise requires a new plan. Closing requires confirmation, evaluation and no unfinished House request. Relevant staff, including tutors, can add attributed academic progress updates. Closure removes the case from active queues but preserves its complete history.
- Study plans: one shared individual plan per case, with measurable target, short assigned actions, owner, independent review date and review history. Authorised stage contributors can create/edit and become its owner. The plan owner reviews and chooses continue, revise or achieved; deliberately reopening an achieved plan requires confirmation. A plan review does not close the case. Closed cases are read-only.
- Personal action queues: referral, House response, case review and study-plan review are derived from current records, role, recipient and demo date. A case may generate multiple independent actions. Home and My actions link directly to the relevant action form. Academic cohort filters do not suppress personal actions. Case list supports referrals, waves, due, closed, House, tutor group and text filters.

All changes are validated, transactional, audited, locally persisted and refresh all connected views. A stale form is rejected. The current academic strategies and wave triggers are illustrative of the agreed academic support workflow, not a replacement for approved school policy. No actual SIMS entries, email notifications, attachments, parent communications or safeguarding case records are created. Real records must never be entered into this public fictional prototype. V2-09 will audit integration, accessibility, permissions, responsive layouts, performance and click/scroll efficiency.

## V2-09 — Integration and demonstration audit

V2 is a coherent fictional-data demo with all five priority destinations and their planned workflows. This pass fixes route and tab history, accessible deep links, stable class-tab positioning, explicit subject-enrolment vs unique-pupil counts, tooltip cleanup, form and grid discard confirmation, successful-save navigation, and cross-tab stale-write protection. Assessment read APIs now intersect requested records with authorised enrolments (including partial tutor access), while unpublished marks require teacher or faculty access. Weighted means remain within the contributing range, including perfect results with fractional weights. Cached directory and pupil detail projections avoid repeated calculation during search and nested navigation. Responsive tables, mobile controls, keyboard focus and print styles are refined. No real authentication, server-side persistence, live school integrations or security assurance is claimed.

### Demonstration sequence (fictional data only)

Use **Demo guide** in the footer to jump between four representative staff perspectives. All shortcuts use the same records and do not reset data. Use Reset demo data before the demonstration, if needed.

| Perspective | Suggested journey | What to demonstrate |
|---|---|---|
| Sam Taylor · faculty | Demo guide → Faculty lead → Year 11 Mathematics tracker → question-level assessment → enter 6, 10, 14 for Demo Student 121 → Save → Class analysis → same assessment → 90–100% bin | Assessment evidence, immediate connected grade/graph update, exclusion and draft safeguards |
| Jordan Evans · tutor | Demo guide → Tutor → filter tutees by attainment or support → open pupil → Assessment history and Comments | Cross-subject picture in a single profile; partial class access |
| Morgan Lee · House | Demo guide → Head of House → active cases / My actions → view academic context and plans | Distinct House membership, visible case records and assigned actions |
| Avery Reed · leadership | Demo guide → School leadership → Home action queue or reporting schedule → Wave 3 referral I004 | School-wide oversight and role-specific actions without changing teacher marks |

For a full handover demonstration: as Sam open I001 and request Wave 2 with a fictional reason and confirmation; activate as the relevant faculty lead, choose the assigned Head of House and set a review date; switch to that staff member to respond; refer to leadership if appropriate. Complete outstanding House actions, record review and resolve/close. Show the retained history and updated SOC and queues. This is a demonstration of the agreed workflow, not a replacement for formal school policy. Never enter real pupil information.

### Verification and remaining production gates

The full Node suite includes a cross-role scope matrix, rendered action/tooltip coverage, route round trips, partial-assessment permissions, numeric boundaries, storage conflict checks and a shared write/reload scenario. CI also serves both static entrypoints and runs a dependency-free real headless Chrome smoke test of the five pages, notices, grade/mark and case edits, chart evidence, navigation, unsaved confirmation, role shortcuts, local persistence and desktop/tablet/mobile overflow checks. Run locally with `node --test tests/*.test.cjs tests/v2-*.test.mjs` and `node tests/browser-smoke.mjs` (Node 22+ and Chrome/Chromium). Automated checks are not exhaustive visual, accessibility or security certification. Before any real school use: obtain school IT/data-governance approval, agree authoritative data sources and access policy, implement authenticated server-side record-level access and audit, secure storage and retention, test integration in a non-production environment, and conduct representative staff acceptance testing. The legacy demo stays archived and future module links stay inactive.

## JIS visual identity

The local school crest and campus photo come from the user-supplied images. All 16 badge crops come from the supplied House logos slide: only the visible logo artwork was cropped, never the underlying source images or PDF. House ring colours are sampled from the supplied colour reference, not academic warning colours. House names remain visible in directory, search and profile, while badges add quick visual recognition. The demo guide shows all 16 Houses.

Fresh/reset fictional snapshots populate all sixteen JIS Houses, retaining 210 pupils, the same class and tutor assignments and the original per-persona authorisations. For compatibility, stable demo IDs cedar, willow, oak map to Argus, Barbet, Blackeye respectively. Existing browser saves retain their previous assignments and edits; only presentation changes. Reset only if you want all 16 populated, as reset deletes local demo edits. Synthetic Heads of House are assigned multiple Houses solely to preserve existing demonstration coverage. No actual staff/pupil records are present. Confirm school approval for branding before broader sharing.

## Home dashboard refinement

Home is now scope-driven rather than a single class table for every staff role. Teaching/faculty views show priority classes with a direct Assessment tracker shortcut; Tutor shows priority tutees and direct support records; House shows distinct House groups; school/combined views show year-group summaries. Group and below-target counts open the appropriate filtered Students directory in the same scope. Class views count subject enrolments below minimum target; pastoral/school views count distinct pupils with at least one below-target subject. Unknown attainment/target is separate and group bars use the whole scoped group as denominator. No combined percentage or invented data is introduced. All personal intervention actions and acknowledgements stay independent of cohort selection; overdue actions and urgent notices appear first, with bounded previews and full queue links. The compact JIS welcome shows the selected role context, campus image and Respect / Inspire / Challenge; neutral data surfaces preserve semantic warning colours. Responsive layouts and shared typography are refined. All records remain fictional, and no permissions or calculation rules change.

## Class and student workspace refinement

The daily class register combines tutor group/flags into the pupil identity and grade/scored coverage into attainment; every original field remains available in Full detail or custom column groups. Search, quick All/Below MTG/Unknown/SOC filters and optional additional filters compose without altering the calculation engine. Chip counts describe the entire scoped class, and the register heading shows the filtered pupil count. The Classes directory has direct tracker links; each register links to the latest visible published assessment (not a draft/future record). Latest result links open that pupil’s individual subject history. Previous/next in a profile opened from a register follows its filtered and sorted pupil order, retains the class subject where authorised, and returns to the register on close. Directory navigation remains ordered by the visible directory. Profile overview uses a compact cross-subject table, subject status distribution and All/Below MTG/Unknown/Active support filters, not a mixed-course grade. Counts and filters respect the authorised profile records. Subject-level prediction, target, comment and intervention actions are still permission-gated; history includes the original raw marks, grade, result status, inclusion, weight and cumulative trend evidence. Mobile tables scroll locally; no data is hidden from the custom/detail views. No live school data or new permissions.

## Assessment tracker and analysis refinement

The tracker provides direct pupil-result links into the scoped mark grid, per-assessment scored coverage and missing/incomplete counts, and direct analysis for published assessments through the demo reference date. Mark entry retains explicit transactional save, import preview, clear confirmation and scope checks. It supports directional movement, row-major Tab/Shift+Tab, Enter/Shift+Enter, selection at the destination, Ctrl/Cmd+S, row/column focus, live unsaved result counts and Next unfinished (editable missing/incomplete/invalid rows). A selected pupil's row is focused without changing marks; read-only roles cannot edit. Local previews do not update analytics until committed. Blank, zero, absent, incomplete and excluded remain separate. Analysis puts target status and coverage follow-up first, then topic/question/AO rankings on a fixed 0–100% scale with earned/available marks and pupil counts. Missing evidence is not zero; observed low scores prompt review, not automatic intervention or claims of misconceptions. Histograms have frequency axes; grade bars show share of scored pupils. Evidence links open actual records and mark grid at the relevant pupil. Faculty comparisons prioritise classes with pupils below target while preserving same-course and common-assessment distinctions. The public demo remains fictional.

## Intervention workflow refinement

The intervention register shows active Wave 1–3 counts (a requested wave is not activated), scoped case/referral/House/study-review filters and a personal action queue across all assigned responsibilities. Case details identify each distinct handover, House request, case review and study-plan review with its actual assignee or eligible reviewers, using the same `createAccess` policy and existing pending-action selector. A case review date is not a separate House deadline. Study reviews have their own dates; completed plans and closed cases do not generate pending reviews, and plan review pauses during a referral handover. The current wave, responsibility cards and academic context are first; measurable targets, numbered study actions, latest evaluations and review events remain visible, with prior wave records and complete history expandable. Student support links directly to the case and its plan. No per-action completion tracking or inferred intervention impact is introduced; evaluations remain staff-recorded evidence. The prototype remains fictional, with existing mutations, authorisation and audit rules unchanged.


## Editable gradebook (PR21)

The class Assessment tracker now supports direct editing of total-only assessment results across multiple columns. MTG, prediction and the calculated overall or unit grade are visible alongside marks. Numeric marks (including zero), A/Absent and blank/Missing are distinct; topic/question and individually excluded results still open their dedicated detail grid. Draft, future and diagnostic results remain visibly labelled and do not contribute to overall attainment.

The main grid stages changes in memory, validates against each assessment's own maximum, previews grades using its own boundaries, and recalculates the eligible weighted summary using the existing analytics functions. One explicit save commits every changed result in a permission-checked, revision-checked transaction. Clearing recorded marks requires confirmation. Leaving or changing the gradebook is blocked until changes are saved or discarded. Existing audit and storage safeguards remain.

Keyboard navigation (Enter, arrows, Tab), Shift+arrow or Shift+click rectangular selection, and tab-separated block paste follow the visible register order. Paste cannot silently cross a structured or read-only result column; blank pasted cells leave marks unchanged and CLEAR explicitly clears. Name column and headers are sticky. Selection is visual in this pass; full range copy, fill and undo/redo are later work. PR22 simplifies creation and management; PR23 expands topic and question columns directly within the gradebook.


## Simplified assessment setup (PR22)

The default assessment form asks for a title, date, curriculum unit and maximum mark. Overall-mark assessments are ready for mark entry immediately by default; select Draft under Advanced settings to postpone inclusion. Only completed, published, included assessments on or before the reference date affect overall attainment.

Topic and question-level formats use structured rows for item label, maximum mark, topic and optional AO, with a live total. Advanced settings contain class assignment, weight and grade boundaries; boundary inputs can be expressed as percentage thresholds or equivalent raw marks, with percentages stored as before.

Each assessment header offers Settings to authorised staff, with edit, duplicate, publish (draft only), exclude/re-include, and delete (empty draft only). Duplicating copies configuration but never results, publication state or exclusion state. When results already exist, item identity/order and assignments remain locked; maximum-mark corrections require a reason and confirmation, and cannot reduce a maximum below any recorded mark in any assigned class. The original marks and audit records are retained.


## Expandable assessment columns (PR23)

Topic and question-level assessments are collapsed into a single calculated result column by default. Expand any assessment header to show its individual mark columns followed by the calculated total; several assessments can be expanded independently. New topic/QLA assessments open expanded in the main gradebook. The expansion preference is retained within the current session for each class.

Item entries and status changes use one unsaved draft per assessment and pupil, keyed by stable IDs rather than column positions. Collapse/re-expand preserves all edits (including invalid values), and a collapsed invalid result is explicitly flagged. An incomplete result displays its partial sum and entered-item count, not a final grade; the total, percentage and course grade become available when all items are entered. Entering zero is distinct from leaving a mark blank. For structured results use the status control to record absence or missing work; changing to either clears marks in the draft and clearing recorded marks still requires confirmation on save.

Paste operates on the visible editable mark columns, with validation against each individual item maximum; it cannot silently cross calculated totals or read-only cells. One atomic gradebook save handles total-only and structured assessments together. Permissions, exclusions, revision checks, published/included eligibility rules and the existing analytics engine are retained. Individual assessment detail drawers remain available for advanced operations.


## Gradebook bulk operations (PR24)

Select a rectangular range with Shift+arrow or Shift+click. Copy produces Excel-compatible tab-separated marks. Fill down copies the top selected row into lower selected rows; Clear cells removes selected marks. The operations validate the whole rectangle and refuse calculated totals or read-only cells instead of silently shifting values. Pasted blanks leave existing marks unchanged; CLEAR removes a mark. Fill down from an empty source clears the corresponding selected cells. Recorded marks are only cleared permanently after the existing save confirmation.

Undo and redo retain up to 100 unsaved operations, including individual entries, attendance changes, paste, fill, clearing and an entire imported batch. They survive assessment expansion/collapse but reset when saving, discarding or leaving the gradebook. Use Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z (or Ctrl+Y), Ctrl/Cmd+D and Delete for multi-cell selections, or the toolbar.

Export CSV includes saved results from the selected unit/class scope, including collapsed question/topic columns, stable enrolment and assessment/item identifiers, status and read-only context grades. Save before exporting to include new marks. To import, retain the Enrolment ID and relevant assessment headers, edit the data in Excel and upload CSV/TSV or paste its contents. Rows may be reordered and irrelevant columns removed; blank mark cells do not overwrite existing marks, CLEAR explicitly removes a mark, and explicit Absent/Missing status clears a result. Unknown, duplicate, mismatched or read-only edits and obsolete assessment headers are rejected before staging. Preview shows affected pupils and before/after results; applying the preview creates one undoable draft operation. Nothing is persisted until the existing atomic gradebook save succeeds. All existing permissions, exclusions, grade calculations and audit safeguards remain in force.


## Personal gradebook layouts (PR25)

Use the quick display selector to switch between editable raw marks, read-only percentages and read-only grades. Question/topic columns display item percentages in percentage mode and retain raw marks in grade mode (individual items do not have separate grade boundaries). Organise columns opens the personal layout panel, including grouping by curriculum unit, date periods (Sep–Dec, Jan–Mar, Apr–Aug), or assessment format; chronological/title/custom ordering; date, status and format filters; assessment visibility; summary-column choices; and compact or comfortable row density.

Grouped columns retain a calculated group summary even when collapsed. All eligible published and included evidence in a group remains in its calculation, regardless of whether particular assessments are hidden. Overall/unit attainment and CSV exchange continue to use the full selected unit/class scope rather than the visible columns. Display and grouping changes never modify assessment definitions, saved marks or the assessment evidence included in attainment.

Layout preferences persist locally by staff and class, and individual assessment expansion remains session-local. Reordering stays within the selected unit and group when applicable. Hidden unsaved results remain staged, including invalid entries, and the toolbar flags hidden changes. Show all assessments removes filters, unhides columns, expands groups and returns to raw marks; Reset personal layout restores the defaults. Undo/redo and saving remain available with hidden or collapsed results. Rectangular operations cannot include calculated summary columns. Changing class or unit still requires saving or discarding pending edits.


## Calculation policy and independent reporting grades (PR26)

### Calculated attainment

The assessment tracker continues to store raw marks and calculate grades using the course's ordered grade boundaries. Faculty and school leadership can set a faculty default or a course override in Calculation settings. The existing weighted-percentage method is the school default for legacy and new demo data. Other choices are equal assessment percentages, weighted total marks (percentage weights are assessment maxima multiplied by assessment weights), and the most recent complete assessment. A course may inherit its faculty policy and independently set the default weight for new assessments. Changing that default does not rewrite existing weights; edit an individual assessment to change its weight. Changes to calculation policy require a reason and confirmation and are recorded in the audit history.

The same selector is used in class and pupil summaries, group/unit summaries, live gradebook previews and cumulative analysis. Only complete, published, included results through the applicable evidence date contribute. Zero is a valid mark; missing, absent, incomplete and excluded work is not treated as zero. Assessment grades still use the assessment's own boundaries; overall attainment uses the course tracker boundaries. Changing a view layout cannot change the calculation.

### Reporting grades

The Reporting grades class tab shows applicable Reports or SIMS grades deadlines from the reporting schedule. The register follows class and pupil scope, period audience and the course's grade scale. The evidence cutoff is the earlier of the reporting deadline and the current demo date. Each pupil's MTG, calculated attainment, teacher prediction and independently entered report grade are distinguished.

Assigned teachers can save a report-grade draft or confirm submission. A differing grade (or a grade without calculated evidence) needs a reason at submission. Submission freezes the calculated percentage/grade, target, prediction, method, source, evidence cutoff and eligible/scored assessment references at that moment. Later marks, policy changes and predictions do not overwrite the submitted record. Relevant faculty/school leadership can reopen it to a draft with an audited reason. Archived deadlines remain readable but cannot accept changes; the event and audience of a deadline with report records cannot be changed. The workflow records fictional internal submissions only and is not a SIMS integration or parent-facing publication.

Existing synthetic schema-2 snapshots without report grades are accepted; the optional collection is initialized when needed. All report grades and calculation-policy edits use the existing transaction, revision, persistence, validation and audit mechanisms.


## Full-year gradebook audit (PR27)

The regression suite includes a deterministic, synthetic class with 30 pupils, 50 assessments (overall marks, topics and QLA), common assessments across parallel classes, and draft, diagnostic and future evidence. It is a test fixture only, not a change to the live demo dataset.

- CSV exports leave the status of unentered results blank, so teachers can fill marks in Excel without first changing each status. Explicit absence remains an intentional status; change it to Present before entering marks. CSV/TSV detection ignores tabs, commas and newlines inside quoted headers.
- Large gradebook saves use indexed result lookups inside the existing atomic, validated, audited transaction. A failed entry, permission check, stale revision, cross-tab storage conflict or storage error cannot commit a partial batch. Clearing marks in the single-result API now requires the same explicit confirmation as batch editing.
- Render and controller use the same cached overview for each unit within an immutable workspace snapshot. A new store revision creates a new workspace and fresh overview.
- The year audit checks a reordered 1,350-result import, rollback of a bad final entry, round-trip export, scoped permissions, exclusions, all four calculation methods, group and trend consistency, frozen report evidence, and persistence. Browser smoke covers the same larger register, keyboard range selection/fill/undo, invalid paste, unsaved navigation guards, QLA expansion and save, reload and responsive widths.

Manual acceptance checklist (fictional data only): create a total test, topic test and QLA; enter zero and blank marks; enter an absent result; expand/collapse assessments; paste a range; undo and redo; export/reimport by ID; switch to percentage/grade views; change a faculty or course policy as an authorised lead; submit a report grade; amend later assessment evidence and check the submitted grade is unchanged. Verify a parallel class and read-only user cannot modify results outside their scope.

Run the automated suite with `node --test tests/*.test.cjs tests/v2-*.test.mjs` and the browser checks with `node tests/browser-smoke.mjs` (Node 22 and Chromium). These checks validate the fictional prototype, not production security, SIMS integration or real pupil-data processing. Those require an authenticated backend, institutional approval, and deployment-specific acceptance testing.


## Responsive workspace foundations (PR28)

The top bar provides an **Auto / Standard / Compact** display selector, a desktop navigation toggle, and a reset control. Auto selects compact density when the available viewport is 1,280 CSS pixels wide or less, or 800 CSS pixels high or less. Standard and Compact may be selected explicitly. The sidebar becomes an icon rail by default in compact mode; the desktop toggle can expand or collapse it independently. At widths of 760 CSS pixels or less the sidebar becomes an off-canvas navigation panel, with a backdrop, accessible expanded state, inert background, keyboard focus containment and Escape to close. It automatically closes when navigating or leaving the mobile breakpoint.

Display preferences are local to the current fictional staff member, independently of gradebook layout settings and stored school records. Reset returns both density and navigation to Auto. Resizing or changing display mode updates presentation attributes without rerendering the active workspace: active inputs, unsaved gradebook marks, selected ranges, history and expanded columns remain intact. Layout controls are allowed while marks are staged; switching class, staff, scope or page still uses the existing unsaved-data guard.

The new screen-only `responsive-workspace.css` contains shared shell, spacing, responsive navigation and flexible work-area rules. Pages can opt into the fill layout via `data-workspace-fill="true"`, `workspace-fill-panel` and `workspace-fill-scroll`. The gradebook and reporting registers now use this contract instead of subtracting a fixed header allowance from the viewport. Tables expand into available space; short screens preserve a usable minimum table height and allow the outer workspace to scroll. Wide gradebooks use the available monitor width, with horizontal scrolling inside the table. The normal print stylesheet is unchanged.

Browser tests exercise 320×568, 390×844, 844×390, 768×1024, 1024×768, 1280×720, 1366×768, 1920×1080 and 2560×1440 with the full-year gradebook fixture; test table growth with viewport height, mobile navigation and resize, staff-specific preference persistence and unsaved marks/history through display changes. These are foundation tests, not the final all-pages responsive audit.

### Responsive roadmap

- PR29: Compact headers, on-demand help and collapsible secondary information/filters; keep identity, errors, urgent warnings and support flags accessible.
- PR30: Gradebook focus mode; consolidate tools and preserve working state.
- PR31: Responsive registers and single-assessment mobile mark entry.
- PR32: Expandable analysis, student profiles and detail drawers.
- PR33: Home and noticeboard responsive refinement.
- PR34: Comprehensive responsive and accessibility audit, including orientation, browser zoom and all roles/screens.


## Compact headers and on-demand help (PR29)

Page titles, class identity and primary actions remain visible. Page details (longer descriptions, course/teacher context) can be expanded; they default to open in Standard and closed in Compact mode. Shared disclosure components also provide compact class and directory summaries, the intervention wave breakdown, and advanced filters on the class index, student directory, intervention register and academic analysis pages. The primary search, result counts, reset controls and workflow actions remain outside the optional filter panels. Collapsed filter headings indicate active filters; collapsing a filter panel does not clear or change the selection.

Mark-entry guidance and keyboard shortcuts are collected into an on-demand gradebook help panel rather than repeated above and below the table. Reporting guidance and explanatory page notes are also available on demand. Gradebook save/discard controls, error messages, scope restrictions, read-only state, calculation policy, reporting deadline/cutoff, active SOC/support counts, student row flags, urgent notices and the fictional-data/safeguarding boundary remain available independently of disclosures.

Disclosures use native details/summary semantics, so touch and keyboard users do not depend on hover. Explicit open/closed choices are remembered for each fictional staff identity and workspace page/tab during the session, including after ordinary rerenders. Reset workspace display clears those choices. Resizing and toggling do not replace the gradebook DOM, mutate records or discard drafts; an automatic collapse also avoids hiding a currently focused control.

Regression tests cover disclosure defaults, markup escaping, active-filter counts, compact headers, responsive resizing, retaining unsaved marks and undo history, and keeping filters active through collapse. PR30 introduces the dedicated gradebook full-screen focus mode and consolidated tools; PR31 onward addresses mobile register entry, profiles/drawers and the dashboard.


## Gradebook full-screen focus mode (PR30)

Select **Full screen** on the Assessment tracker toolbar to maximise the existing spreadsheet within the browser window. Focus mode is application-level and does not require the browser Fullscreen API. It hides the global sidebar, top bar, normal class header and navigation tabs while retaining the class, staff and scope identity, assessment/unit selector, primary creation action, assessment count, fictional-data reminder and Exit focus control.

The compact toolbar opens one of four optional panels: Assessment (add unit, reuse assessment and calculation settings), Layout (display, grouping, visibility and filters), Tools (undo/redo, range operations and CSV exchange), and Help (mark entry and shortcuts). Select the same panel to close it, or press Escape; Escape with no panel open exits focus. Existing layout and disclosure controls remain available in Standard and Compact views. The save/discard bar follows the spreadsheet and stays sticky at the bottom of the focus workspace; errors, unsaved-hidden-result counts, scope restrictions, read-only notices and calculation policy are outside the optional panels. Short screens retain a usable scrolling table and bounded scrolling options panels.

The focus controller changes presentation attributes on the same workspace: it does not replace or reparent the gradebook, mutate records, clear the selected range, discard marks, reset undo/redo, or invalidate an existing import preview. Table scroll offsets are retained within the available scroll bounds. Focus persists through normal gradebook updates in the same staff/scope/class context, including assessment expansion and saves. Changing class, staff, scope or leaving the gradebook exits focus; existing unsaved-data and permission guards still apply. The mode is session-only and is not a new URL or a persistent data preference.

Regression tests cover the shared markup and focus context, exclusive panel toggling, full-year gradebook selection/history preservation, scroll offsets, responsive viewport changes and saves in focus mode. Next: PR31 responsive registers and single-assessment mobile mark entry.


## Responsive registers and single-assessment mark entry (PR31)

The class index, class register, student directory, intervention register and reporting grades register support Auto, Table and Cards views. Auto uses cards at widths up to 760 CSS pixels and tables on larger screens. Cards use the same scoped, filtered and sorted rows and authorised controls as the desktop tables. Identity and important status/attainment/support information remain prominent; secondary fields are under More details. Sort controls remain available in card view. Manual Table/Cards choices are remembered per register and staff identity for the session; changing presentation does not change filters, saved records or permissions. Printing retains tables.

In Assessment tracker, select **Single assessment** instead of Spreadsheet. Select any assessment in the current unit (including assessments hidden by the personal spreadsheet layout); for topic or question-level assessments, choose the item to enter. Each pupil has an appropriately sized mark input, live result preview and entry status; structured assessments also retain the overall result/status column. Numeric keyboards are requested on mobile; absence can be selected explicitly without typing a letter. The selected assessment and item are a temporary projection, not an alternative store or a change to spreadsheet preferences. Return to Spreadsheet to see the saved personal layout and expanded columns.

All marks use the existing validation, live calculation, exclusion and permission checks, draft buffer, history and atomic save transaction. Editing one assessment and switching to another retains pending edits, including invalid marks. A visible warning identifies changes outside the selected assessment/item. Save commits all pending changes in the gradebook unit together; changing unit or leaving the gradebook retains the existing unsaved-data guard. Range operations apply to the visible columns; CSV import/export retains the entire unit scope. The single-assessment view also works in full-screen focus mode. It uses a narrow table and sticky save/discard controls rather than horizontally scrolling the full-year spreadsheet.

Tests cover the temporary projection, unchanged personal preferences, item and status controls, read-only access, responsive card content and full-year browser workflows across phone and tablet sizes.

Next: PR32 — Expandable analysis, student profiles and detail drawers.


## Expandable analysis, profiles and detail drawers (PR32)

Analysis panels and student-profile sections provide an Expand / Restore control. Expanding a panel uses the full grid width, increases the available chart or evidence-table height and retains all current filters, accessible evidence links and underlying calculations. One panel per view is expanded at a time. The choice is session-local to the current staff/scope/class/tab or pupil detail; Escape restores the expanded panel.

Every detail drawer provides Full screen / Restore alongside Close. The existing modal grows to fill the browser viewport; its DOM, editable form fields, validation messages, mark-grid buffers and scroll offsets remain in place (within the new scroll bounds). Full screen persists while following links inside the same detail stack and resets when the drawer closes. Escape first restores an expanded panel, then the full-screen drawer, then uses the ordinary guarded close action. Close and Back continue to honour unsaved-data confirmation and existing access checks.

Student profiles retain the pupil name, house, tutor group and flags, with expandable Tutor & House contacts. At narrow widths, profile tables use the same cells arranged in labelled stacked rows rather than forcing horizontal scrolling. All assessment, attainment, target and intervention information and authorised links remain available. Explicit table roles retain accessible table semantics. Profile tabs scroll horizontally when needed, and analytics grids become single-column layouts. Print remains tabular; expansion controls are excluded.

Tests cover distinct panel identifiers, original evidence actions, responsive profile fields and drawer display state. Browser regressions cover expanded charts, evidence drilldown, dirty form preservation, mobile/tablet/desktop resizing, guarded close and profile expansion. The prototype continues to use fictional data and the existing scope and permission checks.

Next: PR33 — Home and noticeboard responsive refinement; PR34 — comprehensive responsive and accessibility audit.


## Home and noticeboard responsive refinement (PR33)

Home is now task-first: personal actions and reporting reminders precede the academic overview. Urgent active notices not in the visible action preview get their own prominent section, including urgent information that does not require acknowledgement. Overdue and due-today reporting counts remain visible; the preview keeps the existing date order and links to the full schedule. The first five personal actions retain the established ordering, with additional actions available under More outstanding actions. The existing queue counts and all-responsibilities scope are unchanged.

At a glance, role-specific cohort summaries and latest ordinary notices use the shared disclosure controls. Compact mode defaults secondary sections closed, retains headline counts and hides the decorative campus image. Standard mode defaults them open. Explicit choices are retained during the session and the existing display reset restores defaults. On narrow screens, dashboard preview tables use the same cells as labelled stacked rows.

The corkboard remains grouped by audience, with weekly dates on briefing papers. A priority section contains each matching active urgent or pending-acknowledgement notice once; all other matching notices and briefings retain their ordinary sections. The priority filter, persistent communication counts and reporting shortcut make important records easy to reach, even when viewing archived or scheduled notices. Compact mode shortens paper previews; Expand board uses a wider grid and longer previews without replacing the board DOM or resetting the filters. Expand notice opens the existing detail drawer. Acknowledgement remains personal and versioned, and publisher-only counts and controls retain existing access checks.

The reporting schedule now presents labelled stacked rows on phones, including the audience, date, event and status. Leadership oversight is explicitly distinguished from personal completion and still displays due/overdue status. No external reporting submission or change to the underlying communication model is introduced.

Regression coverage checks priority ordering, unique board records, audience access, acknowledgement updates, deadline counts, task-first layout, compact disclosure defaults, mobile schedule and board expansion across viewport sizes.

Next: PR34 — comprehensive responsive and accessibility audit, including all roles, pages, viewport sizes, orientations and zoom levels.


## Comprehensive responsive and accessibility audit (PR34)

The responsive cycle concludes with a separate Chromium matrix alongside the existing full workflow and data-integrity tests. Run `node tests/browser-responsive-audit.mjs` with Node 22 and Chrome/Chromium (or set CHROME_BIN). CI runs it as an independent job. It exercises the five main destinations and six class tabs, plus the gradebook focus and single-assessment views, at 320×568, 390×844, 844×390, 768×1024, 1024×768, 1280×720, 1366×768, 1920×1080 and 2560×1440. The effective CSS viewports 1024×576, 853×480 and 640×360 represent 125%, 150% and 200% reflow on a 1280×720 display; these do not simulate all actual browser zoom or pinch-zoom behaviours.

The separate role/scope pass traverses available staff identities and scopes on mobile. Representative drawers and forms are inspected at narrow, short and normal sizes and in expanded mode. Existing smoke tests additionally cover real assessment creation, bulk imports, saved reporting grades, interventions and mobile entry. The audit asserts viewport bounds, usable workspace dimensions, no duplicate IDs, reachable essential controls, labelled keyboard-scrollable regions, keyboard navigation, accessible global search and preservation of unsaved grades. It reports remaining potential control-name and outer-horizontal-scroll issues with their first observed context for follow-up. Wide spreadsheets may scroll within their table regions.

Shared improvements distinguish actual visible content from retained layout rectangles inside closed disclosures, restore focus to the corresponding visible record action when layouts change, and name scrollable regions. Short landscape and zoom-reflow views avoid stacked sticky gradebook controls consuming the entire working area; controls remain reachable through scrolling. Forms, options, toolbars and modal headings wrap more reliably. None of these changes modifies assessment, reporting or communication records.

### Manual acceptance checklist

- On a school laptop, tablet and phone, work through each destination and all class tabs as a classroom teacher, faculty leader, tutor, House leader and school leader. Use Standard, Compact, Auto, card/table, gradebook focus and expanded drawers.
- Use real browser zoom at 125%, 150% and 200%, rotate a device, and check iOS Safari and Android Chrome (the CI matrix is desktop Chromium). Verify that the workspace scrolls, controls do not overlap, and horizontal scrolling is limited to data regions that need it.
- Navigate with Tab/Shift+Tab, Enter, Space, Escape and gradebook keyboard shortcuts. Verify visible focus, meaningful names/status announcements with a screen reader, mobile navigation focus containment, access to collapsed filters, and usable chart evidence links.
- Enter an unsaved grade or form value, resize, expand/restore, and confirm the value remains. Confirm that an attempted navigation cannot discard it silently. Use fictional records only.
- Review colour contrast, text enlargement, touch target size, reduced-motion and high-contrast preferences manually.

This is targeted prototype regression coverage, not a claim of formal WCAG conformance or accessibility certification. A real-device/staff acceptance review is still required before deploying any live school system.

### Following the responsive cycle

Recommended next development area: end-to-end reporting workflows (centrally defined windows, bulk grade submission, subject comments, faculty moderation, leadership sign-off and completion dashboard). Maintain the shared responsive and accessibility contracts when adding features.


## Clean navigation rail (PR35)

The sidebar prioritises the five working destinations. Planned modules are grouped under one collapsed-by-default, keyboard-accessible Planned modules disclosure; they remain explicitly unavailable rather than acting as misleading navigation links. The disclosure state and navigation scroll position survive ordinary page renders during the session.

The school crest and brand stay fixed above an independent navigation scroll region. The ordinary collapsed rail fits common laptop and landscape viewport heights without a scrollbar. If a short viewport or expanded planned list genuinely requires scrolling, a thin burgundy-compatible thumb with a transparent track appears inside the navigation area. Standard, compact and mobile overlay navigation use the same markup; keyboard focus, wheel/touch scrolling, mobile focus containment, visible focus indicators and forced-colours support remain available. Decorative footer information is omitted on very short screens.

Browser regressions verify no ordinary rail overflow, persistent disclosure state, scrolling with the crest stationary, and keyboard operation of the disclosure and mobile menu.


## Collapsible top bar (PR36)

The global toolbar has a Collapse / Expand control, independent of the sidebar, workspace density and gradebook focus mode. Collapsing hides the full search field, scope and preview-staff selectors, display settings and reset button. A slim strip retains the navigation toggle, search icon, current preview identity and scope, and Expand control. On narrow screens the control uses a chevron and an accessible name. Expand restores the same controls and current selections.

The preference is stored locally per preview staff member with existing display preferences (older settings default to expanded). Reset workspace display restores the expanded bar. The app-level focus mode still hides the entire global header and restores the previous header setting when exiting. Switching the bar does not rerender the active page, change permissions, modify records or discard unsaved marks or history. Keyboard and mobile navigation remain accessible.

Tests cover preference compatibility, staff isolation, header height reduction, viewport bounds, keyboard expansion, mobile navigation, persistence after reload, and preservation of the same gradebook inputs, selection, drafts and undo history.


## Streamlined assessment tracker (PR37)

The normal assessment tracker now uses the same grouped toolbar as full-screen focus mode. Assessment, Layout, Tools and Help are exclusive on-demand panels rather than permanently visible rows. The unit selector, assessment creation action, grid/single-assessment switch, assessment count and full-screen toggle remain available. Escape closes an open panel before leaving focus mode. Panel changes preserve the active spreadsheet, draft values, range selection, undo history and scroll position.

The class header and tabs use tighter spacing on the gradebook only. Longer class context starts collapsed. The default compact grid uses smaller mark inputs and tighter row padding, shorter assessment metadata, a clickable assessment title for details, and compact action links. Draft, diagnostic and future evidence labels, coverage, calculation method and unsaved/error warnings remain accessible. Comfortable row density remains available through Layout.

Regression coverage measures the usable table area and visible pupil rows in the normal workspace at 1366×768, 1280×720 and 1024×768, in addition to the existing responsive and focus-mode matrix. These are representative CSS viewports, not a claim about a particular physical school monitor.


## Page zoom (PR38)

The existing footer contains **− / percentage / +** controls on every page. In full-screen gradebook focus mode, the same controls appear in the focus heading instead. Adjust the working content between 70% and 150% in 10-point steps. Select the percentage to restore 100%. Navigation, the top bar, footer and the normal zoom controls retain their size. The gradebook focus zoom controls compensate for content scaling so they also remain readable.

Zoom uses native CSS layout-aware scaling, not a transform that leaves unusable whitespace or an instruction to change the browser's global zoom. Personal zoom preferences are remembered per fictional staff member and page type (including each class tab; the same tab's setting applies to all classes). Settings are separate from school records and gradebook layouts. Reset workspace display clears the current staff member's page zoom preferences. Detail dialogs retain their existing sizing and full-screen controls; printing uses the normal unscaled layout.

Zoom updates the existing DOM without re-rendering the page or calling save/discard. Scroll offsets are retained within the new scroll bounds; mark values, selected ranges, pending edits and undo history remain in place. The controls have accessible names, normal keyboard button behaviour and disabled limits.

Tests cover preference validation, per-view/staff isolation, persistence after reload, physical mark row scaling and visible row capacity, responsive bounds, gradebook focus mode and draft preservation. The separate responsive audit also visits all main destinations and class tabs at 70% and 150% on desktop and phone widths.


## Compact gradebook toolbar flyouts (PR39)

The assessment tracker uses a single wrapping toolbar for the unit, assessment creation, grid/single view, raw marks/percentage/grade selector, Manage, Columns, Tools, Help and focus toggle. The calculation method and source now share the save/status bar rather than taking another permanent row.

All secondary panels start explicitly hidden in the markup. The selected panel opens in a bounded floating region over the existing spreadsheet, instead of increasing the height of the gradebook header. Manage contains assessment reuse, curriculum units and calculation settings; Columns contains personal layout and visibility; Tools contains range editing, undo/redo and CSV exchange; Help contains entry instructions and shortcuts. Close, Escape, selecting the same toolbar button or clicking outside dismisses the panel. One panel is open at a time, and its content is scrollable at small viewport heights and zoom levels.

The same gradebook DOM and controller remain in place. Switching panels does not clear staged marks, range selection, undo history, import contents or calculation warnings. Both root and V2 entrypoints load the dedicated toolbar styles. Tests check a single compact toolbar at 1260×514, unchanged table height when opening panels, accessible dismissal, draft integrity and mobile/focus-mode use.


## Collapsible assessment column headers (PR40)

The spreadsheet starts with compact assessment headings. The sticky Student header contains **Show details / Hide details**, which expands or collapses the optional metadata across all assessment columns together. Assessment titles, maximum marks, draft/diagnostic/future status and question/topic/group expansion controls remain visible. Expanded headings reveal dates, live scoring coverage, common-assessment labels, permitted Settings/Analyse actions and question/topic metadata. Assessment titles continue to open their details drawer in both states.

The preference belongs to the existing personal gradebook layout, per staff member and class; existing layouts default to collapsed details. It applies in normal and full-screen spreadsheet views, survives reloads, and resets with the personal layout. Single-assessment entry retains its existing narrow headings. Header disclosure is independent of question and group expansion, and does not change displayed assessment columns, calculation eligibility, saved results or scope.

The control toggles existing elements in place rather than recreating the grid. Pending marks, selection, history and scroll offsets (within new bounds) are preserved. Keyboard access uses a native button with aria-expanded; hidden details are explicitly removed from layout and focus order. Scroll padding follows the measured sticky header height. Regression tests compare the actual collapsed and expanded header heights, check draft preservation and verify persistence and responsive use.


## Gradebook ease of use (PR43)

- **Unsaved marks survive a refresh.** Staged gradebook entries are kept in this browser's local storage, per fictional staff member, class and unit, as they are typed. Reopening the gradebook restores them and shows a "Recovered N unsaved results" notice; they are still not saved until **Save** is pressed (or Ctrl/Cmd+S). A recovered entry is skipped if the saved result it was based on has since changed, so newer saved marks are never overwritten silently. Saving, discarding or **Reset demo data** removes the draft. The status line reads "draft kept on this device" while a draft exists.
- **Spreadsheet-style clicking.** The first mouse click on a mark selects the whole value, so typing replaces it; click the same cell again to place the caret and edit within it.
- **Clearer save button.** It shows the number of pending changes ("Save 3 changes").
- **Faster assessment creation.** New, duplicated and unit forms open with the title field focused: type a name, press Enter, and the cursor lands in the new assessment's first mark cell.
