# Character reference source trial

Status: live trial completed on 15 October 2026; **quality gate failed**. No new selector or source provider is integrated into onboarding. See the results below.

## Purpose and approval gates

Keep AniList identity and adaptation records. Test whether official-site discovery can substantially improve the single catalogue portrait before building a new selector/gallery. The owner approved this staged plan on 15 October 2026. A successful source trial authorizes a separate working UI candidate, not shared-library promotion or connected onboarding integration. Present that candidate with exactly “Do you like it?” and wait for visual approval.

Benchmarks: Levi Ackerman (AniList character 45627 / anime 16498), Okabe Rintarou (35252 / 9253), Kaoruko Waguri (268676 / 181444). These relationships and official-site links were retrieved from AniList on 15 October 2026. The runner revalidates them rather than assuming equal IDs across catalogues.

## Run

1. Create a free Tavily API key at https://app.tavily.com. Disable pay-as-you-go/paid usage in the provider dashboard and check sufficient free credits remain. The local request cap cannot control the provider's billing configuration or other applications using that account.
2. Put `TAVILY_API_KEY` in the ignored `.env` or `.env.local` file. Never paste it into chat, commit it, or use a `NEXT_PUBLIC_` variable. An existing Gemini/OpenAI key is not a Tavily key.
3. Check without network activity:

   ```sh
   pnpm exec tsx tools/character-source-trial.ts --check
   ```

4. Run:

   ```sh
   pnpm exec tsx tools/character-source-trial.ts --run
   ```

The trial uses only the fixed AniList and Tavily endpoints. Six basic searches per character, at most 18 search dispatches for this trial directory. Automatic parameter selection and advanced search are disabled. Three searches seek character art; three seek source stills, including Japanese queries. Only catalogue-linked official-site domains are included; social/search/aggregator domains are excluded. Result pages must belong to those domains. Only page-bound images are collected; top-level unbound image results are ignored. No images or external source pages are fetched automatically by the runner. Image descriptions, query groups and domain affiliation are discovery clues, not verification.

JSON receipts and the report live under the ignored `.data/become/character-source-trial-v1/` directory, separate from Season records and media. A request reservation is written **before** dispatch, failures count against the cap, and rerunning reuses successful/failed/reserved receipts without another search for that slot. Do not delete this directory to retry casually: doing so would reset the local budget. Access/rate/credit errors stop the run. No background retries, AI calls, generation, uploads, account changes or reference imports occur. Cache measurements are local receipt reads, not a claim about production UI latency.

A directory lock blocks overlapping processes. If a process is killed, inspect that it has stopped before removing **only** the `running.lock` directory. Leave receipts in place; interrupted reservations remain spent/unknown, never silently replayed.

## Evaluate before proceeding

The report intentionally stays `AWAITING_VISUAL_REVIEW`; it cannot certify identity from a query or an AI caption. Inspect each candidate in its actual source page, checking that the asset appears there and actually depicts the selected character and adaptation. Reject tiny previews, logos, crops/alternate URLs of the same image, manga from another adaptation, fan art, generated images and uncertain provenance. Group by actual verified type, not which query found it. Verify source-site ownership/context too; catalogue external links can become stale.

Record a reviewed manifest with source page, asset URL, kind (official art / source still), dimensions, identity/adaptation check and rejection reasons. For each character require at least four distinct usable references, covering **both** groups, with no incorrect identities/adaptations. Aim for six to eight, but never fill slots with weaker material. Compare cold run timings/failures and a second run's cached timing. Per-search provider usage, request ID and elapsed time are in receipts. A timeout may have consumed a credit even without a usage response; treat each reserved dispatch as spent.

If a character fails the threshold or the result is not a substantial improvement, report the failure and stop before full integration. Passing requires human visual inspection; raw result counts are not a pass.

After a pass, build the separate version drawer/grouped reference-gallery candidate, with loading, unavailable sources, selected-reference preservation and manual uploads. The approved shared `CharacterConfirmation`, drawer, forms and upload components remain authoritative until the new candidate is approved. After approval, promote presentation, metadata, Storybook and usage docs before connected integration. At that stage split catalogue, optional AI assistance and image discovery, remove the retired Jikan path, include selected adaptation in image requests/cache keys, and import only up to two explicitly chosen authentic references. Existing likeness review and approved Season snapshots remain required.

## Live trial result — 15 October 2026

The supplied key was saved only to the ignored, owner-readable `.env`. The read-only usage endpoint reported 1,500 included credits remaining before dispatch. The trial made exactly 18 basic searches; search receipts reported 18 credits in total. No advanced searches, regeneration or image-provider calls occurred. A subsequent usage check still showed zero account usage (apparently delayed accounting), so the receipt total is the immediate usage evidence. No billing settings were changed.

| Benchmark / selected adaptation                            | Raw distinct HTTPS page-bound assets | Median search time | Result                                                                                                                                    |
| ---------------------------------------------------------- | -----------------------------------: | -----------------: | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Levi / Attack on Titan, TV 2013                            |                                   98 |             5.89 s | Not certified: results mix logos, merchandise, later-season visuals and film imagery. Not 98 useful pictures of Levi.                     |
| Okabe / Steins;Gate, TV 2011                               |                                    0 |             3.78 s | Failed: official search results use HTTP; HTTPS certificate verification fails on both official host variants.                            |
| Kaoruko / The Fragrant Flower Blooms With Dignity, TV 2025 |                                   41 |             3.18 s | Not certified: the source page mixes six characters, backgrounds and promotional visuals; no four-reference/both-groups pass established. |

All 18 search requests succeeded at the API level, but several returned no pages. Across all searches, latency ranged from 0.92 s to 12.80 s. The sequential cold batch took 96.49 s; re-reading saved receipts took 10 ms with **zero** further search calls. This measures the trial and local receipt reuse, not onboarding response time or gallery rendering.

The trial stops at the first unmet universal requirement: Okabe has no safely deliverable results, so the requirement of at least four usable references in both groups for **every** benchmark cannot pass. Levi and Kaoruko are not given invented accepted-image counts; their raw candidates remain unverified. The remaining images were not all visually graded after that failure. UI, sprites, merchandise and other adaptations must not be labelled approved references just to reach a target count.

Source-context checks:

- [Attack on Titan character page](https://shingeki.tv/season1/character/) and [episode 15](https://shingeki.tv/season1/story/episode_15.php) are accessible over HTTPS. The search provider's character-page images are mostly interface assets, despite relevant character text. Search discovery does not guarantee extraction of the actual character or episode artwork.
- The catalogue links `www.steinsgate.tv`. Both `https://www.steinsgate.tv/character/` and `https://steinsgate.tv/character/` fail hostname/certificate verification from this environment. We did not bypass TLS validation or downgrade image delivery to HTTP. Search returned HTTP source pages, not secure usable reference candidates.
- [Kaoruko's official character page](https://kaoruhana-anime.com/character/) associates `img_main_chara_2.png` and `img_sub_chara_2.png` with the named `Kaoruko Waguri / 和栗薫子` section. The same page contains the other five characters, demonstrating why matching the domain/page alone is insufficient. These are two context-associated art assets, not a certified four-image gallery or proof of show-still coverage.

Reproducible private artifacts: `.data/become/character-source-trial-v1/report-cold.json`, `report.json` (warm), `review.json`, individual `search-0..5.json` receipts and the fetched source HTML under `context/`. They contain no API key. Their URLs/snippets remain evidence, never application instructions.

**Decision:** do not integrate Tavily as the gallery provider or spend more trial credits under this plan. The original recommendation was a hypothesis and this trial did not demonstrate the required improvement. A possible next direction is direct extraction of character-bound art and episode assets from verified source pages, with a source-availability fallback and cached reviewed references. This needs its own feasibility check, especially for inaccessible legacy sites; it is not an implemented or proven alternative. The planned selector/gallery preview and promotion remain pending this source-quality decision.

## Evidence

- [Jikan maintainer discontinuation notice](https://github.com/jikan-me/jikan-rest/issues/613): the retired public endpoint is still in the existing application gallery path. It is not replaced by this isolated trial.
- [Tavily Search API](https://docs.tavily.com/documentation/api-reference/endpoint/search): domain restriction, basic search, images attached to source results, usage reporting. Search results are untrusted evidence.
- [Tavily credits and pricing](https://docs.tavily.com/documentation/api-credits): free allowance and basic-search credits; check current provider settings before dispatch.
- [AniList character](https://docs.anilist.co/reference/object/character) and [media](https://docs.anilist.co/reference/object/media): identity, linked adaptations and external sites.
