# Character identity candidate

Status: **approved and integrated** on 16 October 2026. Route: `/character-reference-candidate`. Shared ownership and connected behavior are recorded in [RECOGNIZED_CHARACTER.md](RECOGNIZED_CHARACTER.md). The notes below describe the isolated preview and its measured research evidence.

## What is being reviewed

The owner requested removal of the separate identity-confirmation step on 16 October 2026. This revision starts immediately after a successful catalogue match and places a **small recognized-character row inside World & mood**. Name, source, adaptation/year and a single authentic show picture provide quiet reassurance. **Change character** and **Change version** remain available in the row.

There is no Yes/Confirm button, confirmation success state, large identity panel, carousel, reference selection or approval gate. The shared step indicator demonstrates **Character → World & mood → Summary**, with no Confirm stop. Connected onboarding now uses the same three preparation steps.

The existing `SeasonRitualLayout`, Gold Drift backdrop, `StepIndicator`, shared buttons and underline fields provide the surrounding flow. The compact recognition and version drawer have been promoted to `src/components/ui/recognized-character/`, with shared tokens, Storybook and metadata.

**Change version** retains the shared glass drawer with actual AniList editions grouped by medium, covers and release years. **Change character** opens a small shared drawer explicitly limited to the three recorded examples. It is not general search. Changing either keeps the user's setting and mood text and returns focus to the relevant action.

**Continue** immediately carries the current identity and local form values into a clearly labelled preview summary. It does not wait for an image or ask the user to confirm again. The summary only repeats the user's entries; it is not AI-generated research. Both correction actions remain available there, and Edit world & mood restores the entered fields. All state is tab-local and resets on refresh. No Season is saved or activated.

Only the first inspected **From the show** image for the chosen recorded edition is requested. Other catalogue editions show a neutral no-picture placeholder and remain usable. There is no Official character art section, upload management, local-storage selection, technical receipt, or simulated-state control.

## Identity pictures and generation references

This preview reads `report.json` and cached image bytes. It makes no catalogue, discovery, model or image-generation calls, writes no Season data and passes no pictures into generation. Continuing carries the displayed identity through local preview state; it is not reference approval.

The existing connected flow is separate. `importCharacterReference` verifies the selected catalogue identity/work against the saved Season and imports originals. `reviewLivingSourceImage` owns their later likeness approval. `currentImageReferences` filters for approved, non-retired originals matching the current identity and adaptation; `chooseImageReferences` requires at least one and carries up to two before the approved sheet or other continuity assets, with a maximum of four inputs. Those services and requirements are unchanged. Identity confirmation must not take over later artwork-reference curation.

## Earlier loading diagnosis and measurements (standalone revision)

The following measurements precede the compact inline revision. They are retained as diagnosis of the earlier standalone candidate and connected service, not new timing claims for this revision. Measurements on 16 October 2026 are single runs, not percentile/SLA or production claims. Browser timings use navigation start to visible identity and a decoded, rendered first picture.

| Measurement                                                                                      |              Cold / first run |            Warm repeat |
| ------------------------------------------------------------------------------------------------ | ----------------------------: | ---------------------: |
| Previous preview, already-running server: identity / picture                                     |                  378 / 508 ms |           111 / 124 ms |
| Revised preview, fresh webpack dev server and empty browser cache: identity / picture            |              3,784 / 5,751 ms |           522 / 543 ms |
| Real connected catalogue service, `getCharacterCandidate(anilist:45627)`, empty in-process cache |                        437 ms |                  <1 ms |
| Real connected gallery service, `characterCatalogueImages`, empty in-process cache               | 10,017 ms; primary image only | <1 ms; cached fallback |
| Primary AniList image byte download, no browser cache                                            |                        212 ms |                 138 ms |

The fresh server used isolated port 3026 without interrupting 3010. Its first page request logged 2.6 seconds of Next.js work and 158 ms application work; the image endpoint's first requests took about 1.58 seconds. A warm server/browser removes these cold compilation/download costs. The old and revised first runs have different server-cache conditions and must not be presented as a before/after speed ratio.

The live measurements execute the real catalogue-by-ID and gallery services, including their provider request budgets. They do not execute `lookupCharacter`, authentication or optional AI. No paid calls were made. The gallery returned one image after its ten-second provider deadline. Its warm cache stores that fallback; zero-time warm results do not prove gallery quality or general lookup speed.

Code inspection shows the connected `lookupCharacter` still waits for name lookup (potentially three catalogue requests), settings and optional AI resolution, then featured-character gallery discovery. Gallery discovery can make three sequential Jikan requests, each with a ten-second HTTP deadline. The connected client also lacks an overall lookup deadline. Thus the primary catalogue identity/image can be ready substantially before the current response is sent. Optional AI latency was not measured. The approved integration now uses catalogue-only initial recognition with a 15-second client deadline; gallery import happens when the identity is saved. Other lookup callers retain optional assistance and gallery enrichment.

The previous candidate's normal mode did not deliberately delay requests, but its simulated Loading references choice never completed, and the separate metadata fetch had no timeout. Both have been removed from the experience.

## Current loading behavior

- Name, source, edition and form controls render independently of the optional picture. No catalogue, discovery or AI call runs here.
- One inspected picture is requested via its existing fingerprint endpoint and private browser cache; the rest of the gallery is not downloaded for recognition.
- The image request and decode have an eight-second total deadline. Failure exposes Retry picture without blocking Continue. Empty editions use a neutral placeholder without a fetch or spinner.
- Changing character/edition aborts the pending request and revokes its temporary object URL; late results cannot replace the current character. Existing form values and keyboard focus are preserved.
- No selected image, approval or identity-confirmation record is stored.

## Trial implementation and result

The isolated CLI is `tools/official-reference-trial.ts`; implementation and benchmark fixtures live under `src/features/seasons/discovery/trial/official-references/`.

```sh
pnpm exec tsx tools/official-reference-trial.ts --run
pnpm exec tsx tools/official-reference-trial.ts --refresh
```

`--run` reuses the existing trial cache. `--refresh` explicitly re-fetches public sources. Request count is capped at 32; no more than three source or image requests run concurrently. Only the researched HTTPS hosts are eligible, redirects are rejected, requests have 12-second deadlines and response bodies are capped at 8 MB. Cached pages are trial receipts, not a production refresh policy. The runtime never reads a Tavily or Gemini key.

The trial verifies the AniList character/work relationship, actual source-page anchors and the inspected image fingerprints. It extracts lazy-load originals and `srcset` values. For Bandai, public episode metadata supplies the native filename; null episode-level years are permitted only with the adaptation year verified on the publisher/distributor source chain. Conflicting episode years remain excluded. Entity-encoded copyright text is normalized before its context check.

The fixture contains the images visually inspected during research. A new or changed image cannot pass just because it is on the same domain: changed fingerprints require another inspection. This is a finite supported corpus, **not automatic visual verification of arbitrary new characters**. Image content is decoded and native dimensions checked; no image is upscaled for the local preview. Thirteen locally generated WebP previews preserve original source URLs and native dimensions in receipts. The preview-serving endpoint accepts only a show-still image hash present in the report; no arbitrary file paths or URLs can be requested. The route and endpoints return 404 in production.

Fresh successful run on 15 October 2026:

| Benchmark        | Inspected assets | Live run |
| ---------------- | ---------------: | -------: |
| Levi, 2013 TV    |                4 |   4.46 s |
| Kaoruko, 2025 TV |                4 |   6.16 s |
| Okabe, 2011 TV   |                5 |   2.54 s |

All three gates passed in **13.15 s total**, with 25 public source/asset requests and zero cache hits. A subsequent warm run passed in **0.30 s**, with zero network requests and 25 cache hits. These are batch extraction timings, not connected onboarding or production performance claims.

## Verification

The revised browser suite passes **12 Chromium desktop / iPhone 13 WebKit checks**: inline identity, absence of a confirmation step, local World & mood → Summary → edit, form preservation during character/edition changes, original edition groups/covers/years, focus return, one-picture requests, non-blocking continuation during loading, eight-second timeout/retry, stale requests, malformed images and reduced motion. Typecheck and focused ESLint pass. Desktop (1440×1000) and phone (390×844) screenshots were inspected, including the phone's scrollable form. No horizontal overflow, framework overlay, console warnings or uncaught errors appeared. Browser plugin unavailable; the repository Playwright workflow was used.

The shared Safari `MenuItem` fix is preserved. Connected onboarding, its optional AI/gallery waterfall, image import and authentic-reference approval are unchanged. The historical timings above do not establish general lookup performance or new timings for this composition.

Present the working revision and ask exactly **“Do you like it?”**. Only after explicit visual approval should the compact recognition treatment and revised navigation be promoted to the shared library, Storybook/typed metadata and connected onboarding.
