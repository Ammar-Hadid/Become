# Authentic character references: a better alternative

Researched 15 October 2026. **Recommendation: extract from verified official character/episode pages and licensed distributor previews, then cache a reviewed, adaptation-specific gallery.** AniList remains the identity source. Search is a discovery fallback, not the gallery or proof of authenticity.

This is a research result, not feature implementation. No application/UI/AI settings were changed, no new credentials were requested, no paid calls were made, and no additional Tavily credits were used. The earlier failed Tavily trial remains a valid historical result; it is not rewritten as a pass.

## Why this improves on a provider swap

The previous trial had two distinct problems: search relevance and asset extraction. On Attack on Titan's official page, the real character artwork is in `data-original`, while `src` points at a clear GIF. Episode pages do the same for the full stills. A search response that lists `src` images can produce interface graphics even when its source page is correct. Direct, structure-aware extraction retrieves those actual assets. On the Kaoruko page, each named character has its own section containing standing art and face art; reading section context prevents importing the other five characters. [Official Attack on Titan character page](https://shingeki.tv/season1/character/), [episode 15](https://shingeki.tv/season1/story/episode_15.php), [official Kaoruko character page](https://kaoruhana-anime.com/character/).

For legacy sites, the catalogue's single official-site link is insufficient. KADOKAWA's **actual 2011 TV adaptation page** links to licensed distributors, including Bandai Channel. Bandai's page contains a named Okabe portrait and loads episode metadata from a public JSON file. The public page's own image template combines each episode's `thumnail1file_txt` with its CDN path. The native episode images retrieved in this research are 1920×1080, whereas the page displays 240×135 variants. These are published preview images, not frames extracted from a video player or a login bypass. [Rights-holder adaptation page](https://kadokawa-animation.jp/lineup/steinsgate), [Bandai title page](https://www.b-ch.com/titles/2985/), [public episode metadata](https://www.b-ch.com/json/titles/2985.json).

## Actual inspection result

The following is a **manually discovered, manually visually inspected feasibility sample**. It is not a timed production pipeline, a universal coverage guarantee, a licence grant or the owner's required likeness approval. There is no application extractor yet.

| Character / exact adaptation                               | Accepted distinct source assets in this sample  | Native sizes                                                | Result                                                                                                                                                          |
| ---------------------------------------------------------- | ----------------------------------------------- | ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Levi / Attack on Titan, TV 2013                            | 1 official character panel + 3 show stills      | 836×842 art; 560×315 stills                                 | Four-source-image feasibility pass. Stills are authentic but lower resolution than the other shows; preserve native size and prefer clearer art for generation. |
| Kaoruko / The Fragrant Flower Blooms With Dignity, TV 2025 | 2 official art assets + 2 show stills           | 400×1150 standing art; 360×1150 face panel; 1200×675 stills | Four-source-image feasibility pass. The face panel contains several expressions, but counts as one asset.                                                       |
| Okabe / Steins;Gate, TV 2011                               | 1 official publisher key visual + 4 show stills | 684×1000 art; 1920×1080 stills                              | Five-source-image feasibility pass through publisher/distributor fallback. Additional named portrait is only 67×88 and was rejected.                            |

Each accepted image was fetched over verified HTTPS, opened for inspection, matched to source context and the selected TV adaptation, and counted once. Different-character previews, distant figures and duplicates were excluded rather than counted toward the target. The owner still chooses up to two references and performs the existing likeness review before generation.

### Exact accepted source links

**Levi**

- [Official character page](https://shingeki.tv/season1/character/) → [`chara_detail_rivai.png`](https://shingeki.tv/season1/character/img/chara_detail_rivai.png). The image's Japanese alt text explicitly names Levi; it contains standing art, face art and source labels.
- [Episode 15](https://shingeki.tv/season1/story/episode_15.php) → [`15_cut_01.jpg`](https://shingeki.tv/season1/story/img/15/15_cut_01.jpg), Levi wearing cleaning gear.
- [Episode 14](https://shingeki.tv/season1/story/episode_14.php) → [`14_cut_04.jpg`](https://shingeki.tv/season1/story/img/14/14_cut_04.jpg), Levi beside Eren. This depicts a confrontational source scene; the eventual gallery should still respect the selected visual boundaries.
- [Episode 22](https://shingeki.tv/season1/story/episode_22.php) → [`22_cut_02.jpg`](https://shingeki.tv/season1/story/img/22/22_cut_02.jpg), Levi in his green cloak.

**Kaoruko**

- [Named character section](https://kaoruhana-anime.com/character/) → [`img_main_chara_2.png`](https://kaoruhana-anime.com/assets/img/chara/img_main_chara_2.png) and [`img_sub_chara_2.png`](https://kaoruhana-anime.com/assets/img/chara/img_sub_chara_2.png).
- [Episode 1](https://kaoruhana-anime.com/story/?id=1) → [classroom profile still](https://kaoruhana-anime.com/story/SYS/CONTENTS/story_4079_photo_1751276525484413907) and [cake-shop still](https://kaoruhana-anime.com/story/SYS/CONTENTS/story_4079_photo_1751276526133735614). Two other previews showed boys and were rejected.

**Okabe**

- [KADOKAWA's 2011 adaptation listing](https://kadokawa-animation.jp/lineup/steinsgate) → [official key visual](https://kadokawa-animation.jp/wp-content/uploads/2026/04/4007601.jpg). This is ensemble art, not an isolated portrait; source stills offer better face detail.
- [Bandai episode 1](https://www.b-ch.com/titles/2985/001) → [`2985001a.jpg`](https://image2.b-ch.com/ttl2/2985/2985001a.jpg).
- [Bandai episode 2](https://www.b-ch.com/titles/2985/002) → [`2985002a.jpg`](https://image2.b-ch.com/ttl2/2985/2985002a.jpg).
- [Bandai episode 3](https://www.b-ch.com/titles/2985/003) → [`2985003a.jpg`](https://image2.b-ch.com/ttl2/2985/2985003a.jpg).
- [Bandai episode 5](https://www.b-ch.com/titles/2985/005) → [`2985005a.jpg`](https://image2.b-ch.com/ttl2/2985/2985005a.jpg). Episode 4 and 6 previews depict other characters and were rejected.

KADOKAWA also offers a [newly drawn 15th anniversary ensemble visual](https://kadokawa-animation.jp/pickup/549) for the 2011 TV series. Its 1000×707 HTTPS asset was inspected. Label it **2026 anniversary art for the 2011 TV adaptation**, rather than pretending it is a 2011 production still. It is additional evidence and not needed for the five-image count above.

## Timing and cost: what was actually measured

- Attack on Titan episode 15 HTML: approximately **0.96 s** in one fetch.
- Kaoruko episode 1 HTML: approximately **2.44 s** in one fetch.
- Bandai Steins;Gate title HTML: approximately **1.97 s** in one fetch.
- Inspected native asset fetches were generally **0.62–2.49 s each**, with up to three requests in parallel.
- These known-page measurements exclude initial source discovery, visual grading and UI rendering. They cannot be advertised as end-to-end onboarding latency. The earlier Tavily batch's 96.49 s across 18 sequential searches is a different workload.
- Direct public-page research incurred **zero search API charges**. Production would still have ordinary hosting/cache/bandwidth and source-adapter maintenance costs. The paid search route need not be part of the common path.

Local evidence and inspected files: `.data/become/character-source-alternatives/`. `reviewed-manifest.json` records accepted source/asset links, exact adaptation IDs and explicit lack of owner approval; `assets.json`, `additional-levi.json`, `okabe-assets.json`, original HTML/JSON and contact sheets support reproduction. Media stays out of the shared library and public asset tree.

## Recommended architecture for implementation

1. **Identity first.** Return AniList candidates and selected work promptly, independently of image collection and optional Gemini disambiguation. Do not make Gemini a prerequisite for the first catalogue result.
2. **Exact adaptation key.** Resolve by character ID + selected work ID/medium, not just character name or franchise. Preserve work year, official-source chain and source asset receipt.
3. **Verified sources first.** Check that work's official character/episode pages. When unavailable, follow publisher/broadcaster/distributor links tied to that actual adaptation. Do not trust an entire domain or use the movie/sequel as a substitute.
4. **Extract the actual asset.** Handle `data-original`, `data-src`, `srcset`, source-linked CSS assets and public episode metadata. Use native originals, not upscaled thumbnails. Source-specific selectors/fixtures are preferable to a generic unbounded crawler. Treat fetched text as evidence, never instructions.
5. **Filter and select.** Require the character in source context and actual image; reject logos, other characters, tiny images and alternate-size duplicates. Record art versus show-still provenance separately. Machine ranking may assist later, but cannot confer authentic-reference or likeness approval.
6. **Cache reviewed results.** Where storage is permitted, maintain a source gallery for that exact adaptation and lightweight previews. Reuse approved Season references; refresh discovery separately. Serve the first available result immediately, progressively add the gallery and cancel/ignore results after a version change. Existing pack reviews remain owner-scoped and revision-bound.
7. **Discovery fallback only.** If official sources are unknown, optionally use Google Images through SerpApi to locate source pages. Its [free plan currently lists 250 searches/month](https://serpapi.com/pricing) and its [image API supports site/size filters](https://serpapi.com/google-images-api). There is no need to configure another key for the already verified examples. Free-plan eligibility/terms and source storage permissions need checking before connected integration; search still does not certify images.
8. **Truthful gaps.** If an unsupported character lacks enough verified material, show the authentic available images and upload action. Never silently fill the gallery with fan art, generated likenesses or a different adaptation.

The **maintenance tradeoff is real**: publishers use different markup, some sites are stale, and more characters mean more source coverage. This approach is a verified better source strategy for these three examples, not a claim that three handwritten source profiles cover all anime. Keep the number of supported source families small initially and expose partial/unavailable states.

## Alternatives rejected or deferred

The separate [API comparison](CHARACTER_REFERENCE_API_ALTERNATIVES.md) contains official documentation and bounded live checks:

- **SerpApi**: best optional free discovery trial, not the authority for gallery acceptance.
- **Serper**: useful free trial, but a $50 paid minimum with six-month credit expiry is poorly matched to quarterly personal use.
- **Brave**: storage-rights requirements complicate persisting search results and provenance; not a drop-in saved-reference source.
- **Danbooru**: official-art tags span adaptations and include poor/uncertain sources; its screenshot policy conflicts with expecting complete episode galleries.
- **Tenrai**: correctly identifies Steins;Gate 2011, but all 24 sampled episodes currently return null image URLs. It did not repair this specific legacy-source gap.
- **Jikan-Edge**: can restore MAL gallery availability but not prove official-only per-image adaptation provenance.

## Next bounded step

Implement an isolated extraction trial for these three source chains, using the inspected manifest as a fixture to verify character/medium/episode association, deduplication, image dimensions and failure handling. Test cold/warm behavior, cancelled version changes and a source outage; compare against the retired Jikan path and the failed Tavily result. Broaden the character sample before treating this as general coverage.

Then build the already planned standalone selector/gallery preview: compact version summary, shared selection drawer, separate official-art/still groups, up to two selected references, manual upload and honest loading/partial/failure states. Ask exactly “Do you like it?” after the working preview is rendered. Only after explicit visual approval should the shared component, Storybook, typed metadata and connected onboarding change. This research does not bypass that gate.

## Follow-up: isolated implementation

The owner authorized a trial on 15 October 2026. The automated fixed-corpus extraction now passes all three benchmark gates: 4 Levi, 4 Kaoruko and 5 Okabe references. The fresh run took 13.15 s / 25 public requests; the warm run took 0.30 s / zero requests. It verifies the research-inspected fingerprints and cannot automatically approve arbitrary new images. A separate working selector/gallery is at `/character-reference-candidate`; [candidate contract and verification](../design/CHARACTER_REFERENCES_CANDIDATE.md). No connected onboarding or shared-library promotion has occurred; visual approval is pending.
