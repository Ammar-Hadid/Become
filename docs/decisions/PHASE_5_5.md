# Phase 5.5 — COTS discovery, curation and Season arrival

Implementation authorized on 10 September 2026. Astra owns backend, providers,
storage and security. Frontend implementation and visual direction were delegated
to the real `gpt-5.6-sol` subagent with `xhigh` reasoning, verified from its runtime
record. The user's final proactive-opening amendment supersedes the earlier
invitation-card proposal. No confetti or new motion dependency is used.

## Product behavior

- The first eligible exact normal Home entry enters the current unopened Season
  ritual immediately. Active timers and timer mutations, dirty forms, competing
  dialogs, interaction already begun, hidden pages, and deep links prevent entry.
  `Not now` stores `openingDeferredAt` independently of the draft version. It
  prevents further automatic entry for that Season; Direction still offers resume.
- Four ritual stages remain. COTS uses Identity → Images → Words inside stage 3,
  followed by the real saved poster preview in stage 4. Empty media is valid.
- The user explicitly selects Anime, TV show, Movie, Game, Book, Comic, or Public
  figure / real-life person. The registry adapts work/context fields and derives
  subject kind. Public figures require no fictional source work. Fan art is valid.
- `Use this identity` creates the deliberate saved identity. Typing alone does
  not unlock personalization or replace the current collection. Category/work
  changes create immutable contexts; genuinely new subjects create a new identity
  and preserve earlier collections. A selected Wikidata entity reference is stored
  as disambiguation metadata; it is not independent factual verification.
- Selection persists candidate metadata; confirmation imports only selected
  images. READY, pending, failed and selected remain distinct. A desired poster is
  separate from the currently committed poster. `Begin with current poster`
  clears the pending choice so its eventual arrival cannot replace that poster.
- Later personalization reuses the collection, manual forms and shared menus.
  Image uses own crop, poster, secondary/loading/cadence roles and retirement.
  Reuse across identities/Seasons references existing owned bytes.
- Contextual presence is confined to Home, Direction, opening and Season cadence.
  Daily text and weekly secondary imagery are deterministic in Amsterdam time.
  Loader art uses a READY authenticated local derivative after a real delay;
  missing, unsuitable or failed assets retain ordinary loading affordances.

## Enabled routing profiles

Adapters are implemented, but an adapter with missing credentials or entitlement
returns `SETUP_REQUIRED`. Subsequent sources remain available. No account,
subscription, API key, paid top-up or external worker is created automatically.

| Category      | Image order                                     | Quote/dialogue/text order                           |
| ------------- | ----------------------------------------------- | --------------------------------------------------- |
| Anime         | Zerochan → SerpApi Google Images → Brave Images | Wikiquote → Animechan                               |
| TV            | SerpApi → Brave                                 | Wikiquote work/season pages → Clip.Cafe             |
| Movie         | SerpApi → Brave                                 | Wikiquote film pages → Clip.Cafe                    |
| Game          | SerpApi → Brave → Zerochan                      | Wikiquote → community source review                 |
| Book          | SerpApi → Brave → Commons                       | Wikiquote → edition-specific Wikisource passages    |
| Comic         | SerpApi → Brave → Zerochan                      | Wikiquote comic/run pages → community source review |
| Public figure | Commons → SerpApi → Brave                       | Wikiquote → STANDS4 Quotes.net                      |

Zerochan provides useful character/fan-art tagging; SerpApi provides broad
character-centric coverage. Brave adds an independent index; Commons provides
particularly useful public-person file descriptions and license metadata. A work
poster, actor, cover, cosplay or game screenshot is not assumed to depict the
selected character. Users review relevance and source facts before keeping items.

Wikiquote preserves source revisions and distinguishes speaker turns. Short labels
such as `Arthur` and `Walter` are retained as unresolved identity matches and stay
out of automatic rotation. Explicit nested character citations are supported.
TV season links are taken from actual returned work pages. Movie extraction
requires film-category evidence to avoid returning novel text for a Movie identity.
Unsupported layouts remain reviewable source links. Book passages need an explicit
edition/chapter and remain passages with no invented speaker.

## Setup, costs and result depth

Prices below are the researched September 2026 advertised baseline, not purchased
entitlements. Confirm the account's actual terms, taxes and retention permission.
Keys are server-only `.env` values and must never use `NEXT_PUBLIC_` prefixes.

| Provider                   | Required setup and starting cost                                                                                                                                | Depth and enforced limits                                                                                                                                    | Persistence / coverage limits                                                                                                                                     |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Wikimedia interfaces       | No key or fee; identified User-Agent                                                                                                                            | Shared 40 requests/minute; Commons 20/page, Wikiquote 12 extracted items/page with pinned revision and bounded linked seasons, Wikisource 10 paragraphs/page | Preserve revision, source and file-specific license. Community attribution is not verification. Unsupported layouts and missing editions can yield links only.    |
| Zerochan                   | Real account username in `COTS_ZEROCHAN_USERNAME`; no fabricated identity                                                                                       | 20/page, 50 requests/minute in Become; canonical tag evidence required; item detail resolves on import                                                       | Rich anime/fan-art coverage, uneven Game/Comic coverage. File access does not grant repost rights. Optional `COTS_ZEROCHAN_TAGS_JSON` maps confirmed tags.        |
| SerpApi                    | `COTS_SERPAPI_API_KEY`; free advertised 250 searches/month; optional Starter $25/month for 1,000                                                                | `ijn` plus documented next page; 50/hour and 250 or 1,000 per conservative 31-day window                                                                     | Search result storage does not license original images. Set `COTS_SERPAPI_PLAN=starter` only with approved subscription and sufficient spending ceiling.          |
| Brave                      | `COTS_BRAVE_SEARCH_API_KEY`, `COTS_BRAVE_STORAGE_ALLOWED=true`, approved nonzero budget                                                                         | Finite batch up to 100; no invented offset; app cap at most 1,000/31 days and $5/1,000 baseline budget calculation                                           | Storage-enabled entitlement and its actual price must be confirmed; advertised search pricing alone does not establish retention permission.                      |
| Animechan                  | Free endpoint; no paid activation implemented                                                                                                                   | Five results/page; conservative 5/hour and 90/day in Become                                                                                                  | Exact character/work filter. Catalog gaps are real; no episode or translation verification. No generated replacement quotations.                                  |
| Clip.Cafe                  | `COTS_CLIPCAFE_API_KEY`, confirmed API/retention entitlement, `COTS_CLIPCAFE_RETENTION_ALLOWED=true`, actual inclusive cost in `COTS_CLIPCAFE_MONTHLY_COST_USD` | 10 clips/page via `from`, 8/minute and 1,800/31 days in Become                                                                                               | Advertised PRO baseline $5 + VAT requires account/API confirmation. Parse explicit target speaker turns; other listed characters are not assigned the transcript. |
| STANDS4                    | `COTS_STANDS4_UID`, `COTS_STANDS4_TOKEN_ID`, `COTS_STANDS4_RETENTION_ALLOWED=true`                                                                              | Finite author query; 90/day in Become                                                                                                                        | Free advertised tier subject to retention/attribution confirmation. Provider author match is not an original-source verification.                                 |
| Game/Comic community pages | No automated transcript access enabled                                                                                                                          | Source links only, no fabricated pagination or extracted candidates                                                                                          | Fandom automated access requires permission. The independent full-text fallback is intentionally unavailable until access is established.                         |

Provider documentation: [Wikimedia API](https://www.mediawiki.org/wiki/API:Main_page),
[Zerochan API](https://www.zerochan.net/api), [SerpApi pricing](https://serpapi.com/pricing),
[SerpApi images](https://serpapi.com/google-images-api),
[Brave Images](https://api-dashboard.search.brave.com/app/documentation/image-search),
[Animechan](https://animechan.io/), [Clip.Cafe API](https://clip.cafe/api/),
[STANDS4 quotes](https://www.quotes.net/quotes_api.php),
[Wikisource API](https://en.wikisource.org/w/api.php),
[Fandom terms](https://www.fandom.com/terms-of-use-2025-10-14).

IGDB, TMDB, Project Gutenberg, The One API and API Ninjas are not silently enabled
or installed. The approved proposal kept those optional or blocked. Manual uploads,
offline source details and existing imported media work without provider credentials.

`COTS_ENABLED_PROVIDERS` can restrict sources. Disabling a provider blocks future
discovery/import; it does not require the provider to display already saved media.
Omit `wikidata` from an explicit list to disable identity assistance while keeping
manual identity confirmation available.
`COTS_MONTHLY_SPEND_LIMIT_USD` defaults to zero. Paid plan commitments are counted
before chargeable fallback requests. Persisted request reservations and cooldowns
survive restarts; 429 observes Retry-After. These are app guardrails, not control of
an independently purchased subscription or a guarantee about a provider's billing.

## Contracts, storage and recovery

- Transport lives under `/api/direction/cots`; feature services own behavior.
  GET returns the collection, reusable owned library, or resumable job references.
  POST supports identity/suggestions/discovery, selection/confirmation/import/retry,
  preflight, manual text, usage preferences/reuse and opening deferral. Manual
  image upload has a bounded multipart endpoint. All routes require current user;
  mutations enforce same origin, schema validation and owner-scoped references.
- Identity revision, immutable discovery-context revision, selection revision and
  broad Season draft version are separate. Curation does not increment opening
  autosave version. Draft saves reconcile identity-owned fields. Context changes
  invalidate signed discovery cursors but preserve confirmed old-context imports.
- Durable selections carry complete source snapshots. Imports have 60-second leases,
  owner-wide maximum two concurrent jobs, stable planned file keys, retry state and
  commit revalidation. Duplicate import calls and confirmation retries are idempotent.
  The authenticated application shell drives jobs while open and resumes them on
  return/lease expiry. It is not an always-running background worker after tab closure.
- Only candidate-bound server URLs enter the downloader. HTTPS/443 only; no embedded
  credentials, private/reserved addresses or forwarded cookies/API secrets. Validate
  every DNS answer, pin the selected IP while verifying original TLS hostname, and
  repeat checks after each of at most three redirects. Bound time and bytes, verify
  actual image format, normalize with Sharp and strip metadata.
- Original input limit 6 MiB, decoded limit 12 MP, normalized WebP limit 3 MiB.
  Local preview derivatives fit 480×600 with usable transparency retained. Files
  live beneath the existing private media root; authenticated routes serve originals
  and `?size=preview`. PostgreSQL stores logical keys and provenance, not image blobs.
- Same-owner normalized content hashes reuse bytes. Selection snapshots preserve
  distinct acquisition sources even when media converges. Season-owned uses keep
  focal point and retirement independent. Historical snapshots retain referenced
  files. Retirement is not permanent deletion; destructive deletion is not exposed.
- Explicit discovery performs bounded cleanup: at most 100 unselected expired
  candidates, and up to three FAILED prepared files older than seven days when no
  media record references them. Failed selection/source records remain retryable.
  Active/uncertain jobs and committed media are preserved. No broad orphan scan or
  automatic deletion of real user's historical media is performed.
- Default capacity is 24 active images / 48 active text items per identity,
  configurable independently of browsing depth. Search caches are bounded and short;
  selected source snapshots remain durable under the enabled provider's terms.
- Text wording kind, extracted form and evidence are separate. Selection never
  verifies attribution. Passages, paraphrases, unresolved matches and source links
  cannot silently become exact character quotations; source links are not selectable.

## Verification and remaining activation checks

Additive local migrations preserve legacy categories as unconfirmed, backfill owned
uses without copying image bytes, and retain existing featured choices and history.
Existing data was checked through hashes of its original columns; no real user was
used as a mutation fixture. Database tests use exact disposable local users.

Automated coverage includes ownership, independent revisions, category changes,
cross-identity reuse, duplicate confirmations/workers, pending-poster preflight,
prepared-file recovery/cleanup, manual media, provider response parsing, revision
pagination, private-address/DNS/redirect defenses and streamed byte limits.

Final verification: whole-repository ESLint passed; the full Vitest run with Season
and COTS integration enabled passed 192 tests (54 unrelated opt-in integration tests
skipped). Both Chromium COTS journeys passed, covering immediate arrival, persisted
deferral with a just-typed note, seven category choices, manual image/text curation,
preview, later collection controls, Home query/hash preservation, dialog/timer input,
pending timer mutation and active timer. Exact disposable-account cleanup completed.
The production `next build --webpack` passed, including TypeScript and all 43 static
pages. Default Turbopack build was blocked by sandbox denial of a subprocess's local
port; no compiler configuration was changed to work around it. Next regenerated its
own development type paths after the local server restart.

Live public Wikiquote checks returned 3 Levi, 31 Arthur Morgan, 22 Batman and 115
Walter candidates from the inspected revisions. These are parser counts, not
quality guarantees: all Levi/Walter matches and 30 Arthur matches used shortened
speaker names and remain explicitly unresolved. Animechan's free Ginko query
returned five candidates; this is not a guarantee of coverage for Levi or other names.
Authenticated SerpApi, Brave, Zerochan, Clip.Cafe and STANDS4 acceptance still requires
the user's credentials/entitlements. First/next-page quality and import feasibility
for those accounts must be measured after activation; fixture tests do not claim
live access. No VPS, dependency installation, commit, push or deployment occurred.
