# Functional audit — 29–30 October 2026

The implemented application was audited for backend failures, stalled loading,
data loss, concurrency problems, and actions whose results contradict reasonable
user expectations. Confirmed defects listed below were fixed and their affected
checks passed. Existing unrelated work in the checkout was preserved.

## Verification results

| Check | Result |
| --- | --- |
| Unit and database integration tests | **575 passed across 102 test files**, in separate domain runs |
| Desktop Chromium and mobile WebKit browser cases | **187 unique cases passed**, including targeted reruns after fixes |
| Additional mobile review stability runs | **3 passed** |
| Existing browser exclusions | **3 intentional mobile skips**: two guide journeys and one Direction transport-retry journey restricted to Chromium |
| Production build | Passed with Next.js 16.3.4 and webpack |
| TypeScript, ESLint, whitespace checks | Passed |
| Actual production-mode HTTPS smoke | Signup, guided arrival, dashboard reload/session persistence, Finance processing, and sign-out passed without browser exceptions |

These totals are the union of completed suite runs and focused reruns, not a
claim that one command ran the entire matrix. The default unit-only invocation
passed 408 tests and skipped 167 gated integration tests; those integration tests
were enabled and passed in the separate database runs above.

The browser total comprises 60 core cases, 65 workspace cases, 8 review cases,
34 application/network/Season cases, 14 expectation cases, 2 menu-focus cases,
and 4 owner Image Direction cases. Earlier failing assertions and actual defects
were resolved before the corresponding cases were counted as passed.

## Coverage

- Authentication, account navigation, personal settings, AI configuration,
  owner-only Image Direction access, and persistence across reloads.
- Dashboard lenses and a route walk covering 38 implemented pages across the
  application, checking native browser errors and HTTP server failures.
- Session start, pause, resume, stop, history, detail loading, time correction,
  cross-tab recovery, and Engineering project/evidence workflows.
- Finance accounts, transactions, recurring commitments, savings, opportunities,
  and deterministic financial calculations.
- Entrepreneurship audiences, explorations, records, conversations, evidence,
  offers, receipts, guide editing, and synthesis.
- Content workspaces, scripts, rich-text tables and images, thumbnails, and
  upload handling.
- Direction goals, experiments, decisions, completion, reviews, review conflicts,
  Season opening, preparation, recovery, and image/reference state transitions.
- Stalled or rejected requests, delayed save acknowledgments, retries after an
  uncertain response, concurrent writes, validation correction, and mobile
  interaction/focus behavior.

## Fixes and resulting behavior

### Requests finish or expose recovery

Added bounded requests and recoverable failure handling to authentication,
dashboard lenses, session mutations and details, workspace commands, record
search, document autosave, credentials, Image Direction, and AI interactions.
Ordinary requests generally use a 15-second deadline; uploads and model work
have longer operation-appropriate limits. Failed requests release controls and
preserve the information needed to retry.

A shared request-deadline utility fixes a reproduced mobile WebKit case where
combined native abort signals failed to end a stalled request. Failed session
detail loading also clears the failed drawer state; reopening details
revalidates cached information.

Tailwind now scans the source tree explicitly. Previously, accumulated generated
build directories could make local startup appear to hang. ESLint also excludes
generated output rather than treating it as application source.

### Saving preserves user work

- Project and evidence validation failures retain entered values for correction.
- A delayed document autosave no longer remounts the editor and replaces newer
  typing. Uncertain retries retain the original operation identity.
- Conversation retries preserve the original submitted payload and timestamp,
  preventing a retry from creating a second logical interaction.
- A delayed Image Direction response preserves newer intent and prompt edits.
  An unchanged draft still receives the server's normalized saved text. Save,
  publish, reload, and timeout recovery were verified on both browsers.
- Failed C.O.T.S. answers preserve a newer question already being composed.
- Reopening pending Nexo analysis reuses the request; a failed refresh does not
  leave old analysis displayed as current.

### Concurrent backend operations remain consistent

- First-time Season opening is created atomically. Eight deliberately competing
  requests now succeed while creating one opening record.
- Season image approval, banner, and crop mutations lock and recheck the Season
  and current identity before updating it. Database regressions cover closure
  and identity changes racing those writes.
- Confirmed transaction rollbacks wrapped in Prisma 7 raw-query metadata are
  recognized and retried within a fixed limit. Unknown connection failures are
  not automatically replayed. This fixes a reproduced review-finalization 500;
  the full review suite and three additional mobile runs passed afterward.
- Long assistant responses now fit the role-specific conversation-history
  validation used by the next question.

### Follow-up actions behave consistently

- Session history is available through the shared account menu.
- Mobile Safari can activate record-search Retry without the menu disappearing
  first. Deferred menu focus restoration no longer steals focus from a newly
  selected field or layer.
- Timer controls restore focus consistently on Safari, and rapid duration-wheel
  pointer interactions retain capture.
- Content image/table controls anchor to the actual editor canvas.
- Exploration Back links clear the navigation launcher. Phone users can access
  the existing direction, edit, and archive actions previously hidden by CSS.

These fixes reuse approved shared treatments; they do not introduce a visual
redesign.

## Environment and limits

Database tests used newly migrated, disposable PostgreSQL 17 databases and
disposable accounts. Browser runs used an isolated optimized build. Most of the
local HTTP matrix used development-mode auth configuration; a separate local
HTTPS smoke explicitly ran with `NODE_ENV=production` to verify secure auth and
session behavior. The user's existing application service and personal database
were not used for destructive tests.

Provider calls in connected AI/image browser journeys were controlled fixtures;
no paid image or text generation was performed. Real preparation/recovery
endpoints and database behavior were exercised separately. Live provider
availability, real generated artwork quality, production hosting configuration,
tablet-specific coverage, and large-scale load behavior were not verified by
this audit. A zero-defect guarantee is not implied by passing these checks.

## Evidence retained locally

The regression tests are in `e2e/` and alongside the affected services/utilities.
Local logs below include the final result for each verification group. Temporary
logs are supporting evidence, not permanent repository artifacts.

| Verification | Log |
| --- | --- |
| General unit/integration: 445 | `/tmp/become-audit-backend-final.log` |
| Entrepreneurship: 66 | `/tmp/become-audit-business-final.log` |
| Content: 43 | `/tmp/become-audit-content-final.log` |
| Reviews integration: 21 | `/tmp/become-audit-reviews-final.log` |
| Core browser baseline and corrected cases | `/tmp/become-core-validation-final.log`, `/tmp/become-core-validation-targeted.log` |
| Workspace baseline and focused corrections | `/tmp/become-workspace-validation-confirmed.log`, `/tmp/become-workspace-validation-timer-confirmed.log`, `/tmp/become-workspace-validation-native-proof.log`, `/tmp/become-workspace-validation-final-subset.log`, `/tmp/become-workspace-validation-lifecycle-final.log` |
| Reviews and stability reruns | `/tmp/become-workspace-validation-reviews-final2.log`, `/tmp/become-workspace-validation-review-repeat.log` |
| Application, Season, and recovery baseline/focused corrections | `/tmp/become-audit-final-browser.log`, `/tmp/become-audit-cots-confirmed.log`, `/tmp/become-audit-confirmed-browser.log`, `/tmp/become-core-validation-record-search-final.log` |
| User expectations: 14 | `/tmp/become-expectations-verified.log` |
| Owner Image Direction: 4 | `/tmp/become-image-owner-final.log` |
| Production HTTPS smoke | `/tmp/become-audit-https/verification.log` |
| Build, lint, types | `/tmp/become-audit-production-final.log`, `/tmp/become-audit-lint-final.log`, `/tmp/become-audit-types-final.log` |
