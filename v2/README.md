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

The store validates a transaction before committing it and before notifying subscribers. A failed local-storage write leaves the in-memory state unchanged. A reload validates the saved schema; corrupt/incompatible data is rejected, not silently overwritten. An old read model intentionally represents an old snapshot; recreate it on every subscribed state revision. The demo reference date is 2026-11-24 and may be advanced by demo leadership. Data and all role checks remain client-side; these APIs are **not security boundaries**.

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

The default date window includes assessments dated up to the demo reference date (inclusive); date filters may narrow it. Course grade schemes are illustrative, including KS3 attainment descriptors, IGCSE 9–1/U, A level A*–E/U and IB 7–1. Custom assessment schemes must preserve the ordered grade labels of their course. Real exam grade boundaries differ by paper/session and must be configured through authorised workflows, never treated as predictions.

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
