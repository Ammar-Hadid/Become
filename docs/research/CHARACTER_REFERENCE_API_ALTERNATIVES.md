# Character reference API alternatives

Research checked 15 October 2026. This is a provider comparison, not a passed source-quality trial. No credentials, search credits, accounts, image downloads or application changes were used. Public documentation and a small read-only Danbooru metadata sample were inspected.

## Recommendation

Prefer source-specific extraction from verified character and episode pages, followed by a reviewed adaptation-bound reference cache. Use a search API only to discover additional source pages when needed. Changing the search vendor does not establish character identity, adaptation, authenticity or image usability.

If direct extraction needs a search fallback, **SerpApi's free Google Images allowance** is the most straightforward next comparison: it supports `site:` queries and minimum-size filters, and returns original image and source-page metadata. **Serper's free trial** is another reasonable comparison, but its paid minimum is poorly matched to one person's quarterly use. Neither is proven against Become's three-character benchmark.

## Search API comparison

| Candidate             | Verified capabilities and cost                                                                                                                                                                 | Fit and limits                                                                                                                                                                                                                                 |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SerpApi Google Images | Google Images queries support `site:`, image-size/aspect filters and structured image results. Free plan currently lists 250 searches/month; paid entry is $25/month for 1,000 searches.       | Useful discovery trial without a subscription at this scale. Search results still require source-page and adaptation verification; there is no documented official-anime-only filter. Free-plan throughput is 50 searches/hour.                |
| Serper Images         | Returns image URL, dimensions, thumbnail and referring page/domain. Offers 2,500 free queries without a card. Paid top-up starts at $50 for 50,000 queries; purchased credits last six months. | Low marginal cost but excessive minimum purchase for quarterly personal use. Its advertised 1–2 second response is vendor marketing, not a Become measurement. Source verification remains necessary.                                          |
| Brave Images          | Image-specific independent index, up to 200 results, source-page URL, original image URL, dimensions and thumbnail. $5/1,000 requests with $5 monthly credits.                                 | Potentially useful discovery, but official docs require a plan expressly granting storage rights to retain API results. This is a material fit issue for saved provenance/reference caches. Does not certify official art or exact adaptation. |

Primary sources: [SerpApi Google Images](https://serpapi.com/google-images-api), [image result fields](https://serpapi.com/images-results), [SerpApi pricing](https://serpapi.com/pricing); [Serper features, sample and pricing](https://serper.dev/); [Brave image reference](https://api-dashboard.search.brave.com/api-reference/images/image_search), [Brave pricing and storage FAQ](https://brave.com/search/api/), [Brave activation prerequisites](https://api-dashboard.search.brave.com/documentation/quickstart).

Serper's terms preserve third-party ownership, prohibit source/attribution misrepresentation and do not warrant result accuracy. An API subscription is not permission to reuse the underlying artwork. Before implementing any persistent source store, check the applicable service and source-site terms for that actual use. [Serper terms](https://serper.dev/terms), [Brave storage/copyright FAQ](https://brave.com/search/api/).

## Tagged imageboards are not a reliable primary provider

Danbooru's own `official_art` definition distinguishes commissioned/official work from fan art drawn in the official style. That is helpful discovery metadata, but tags and source fields are editable, and the same character tag spans adaptations. Its `anime_screenshot` definition says random anime screenshots generally violate its upload rules, so expecting a complete still gallery conflicts with the site's purpose. [Official-art definition](https://danbooru.donmai.us/wiki_pages/official_art), [anime-screenshot definition](https://danbooru.donmai.us/wiki_pages/anime_screenshot), [API documentation](https://danbooru.donmai.us/wiki_pages/help:api), [maintained source model](https://github.com/danbooru/danbooru/blob/master/app/models/post.rb).

Read-only metadata samples illustrate the limitations:

| Search                                                 | Observed result; no visual approval implied                                                                                                                           |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Levi + official art + general rating, first 3 posts    | One WIT social post and two collaboration sprites measuring 86×90 and 44×85.                                                                                          |
| Okabe + official art + general rating, first 3 posts   | All source URLs point at **Steins;Gate 0** product art, not the requested 2011 TV adaptation.                                                                         |
| Kaoruko + official art + general rating, first 3 posts | Social promotion, one `file://` source, and merchandise-related source account.                                                                                       |
| Anime screenshots + character + general rating         | One Levi end-card linked to an HTTP source marked `bad_link`; zero Okabe and Kaoruko records. These queries are limited observations, not exhaustive coverage proofs. |

Reproduction uses public `GET /posts.json?tags=...&limit=3&only=id,source,image_width,image_height,tag_string_copyright,tag_string_character,tag_string_meta`. Character tags were `levi_(shingeki_no_kyojin)`, `okabe_rintarou`, `waguri_kaoruko`; combine with `official_art rating:g` or `anime_screenshot rating:g`. [Levi sample query](https://danbooru.donmai.us/posts.json?tags=levi_%28shingeki_no_kyojin%29%20official_art%20rating%3Ag&limit=3), [Okabe sample query](https://danbooru.donmai.us/posts.json?tags=okabe_rintarou%20official_art%20rating%3Ag&limit=3), [Kaoruko sample query](https://danbooru.donmai.us/posts.json?tags=waguri_kaoruko%20official_art%20rating%3Ag&limit=3).

The board can help locate an original publisher post, but must not become a provenance shortcut or automatic still provider. Safety filtering also needs explicit general-rating selection; an arbitrary character search is inappropriate.

## Jikan replacements solve availability, not provenance

**Tenrai** offers character pictures keyed by MAL character ID. Its documented schema exposes image URLs, not an official/source-still classification or per-image adaptation provenance. The July changelog also documents episode cover images sourced through Crunchyroll where available; such a cover is adaptation-associated but may depict another character or scenery. These are discovery inputs, not four automatically acceptable references. Public rate limits are 120/minute and 4/second; it remains labelled beta. [Tenrai OpenAPI](https://api.tenrai.org/documentation/openapi.json), [Tenrai changelog](https://api.tenrai.org/changelog).

**Jikan-Edge** serves public MyAnimeList data with a new camelCase schema, no authentication, cached/stale responses, and MIT self-hosting. The hosted API documents 60/minute sustained and 30/10-second burst limits. It might restore catalogue-gallery availability, but its own purpose does not establish official-only images or exact-adaptation stills. Self-hosting adds operational work; its docs warn that some uncached parsing exceeds Cloudflare's free CPU budget. [Jikan-Edge documentation](https://jikan.lucashdo.com/docs).

## Next quality check

Keep the existing gate: at least four distinct usable references per benchmark, including both official character art and actual show stills; exact adaptation; traceable source; no incorrect images. Prove those conditions through actual inspected images before committing to any replacement. Direct extraction and any optional search fallback must share this gate. Do not count raw search results, character tags, episode association or provider confidence as a pass.

The independent source-site investigation should decide whether direct official extraction meets that gate for Levi (2013 TV), Okabe (2011 TV) and Kaoruko (2025 TV). This comparison does not claim that it has already passed.

### Bounded Tenrai check: Steins;Gate episode covers

A read-only public API check on 15 October 2026 verified [MAL 9253 through Tenrai](https://api.tenrai.org/v1/anime/9253): title `Steins;Gate`, type `TV`, year `2011`, airing April–September 2011. The [episode endpoint](https://api.tenrai.org/v1/anime/9253/episodes) returned all 24 episodes on one page (`has_next_page: false`). **Every `data[].images.jpg.image_url` was null**. There are therefore no episode-cover asset URLs to sample for this adaptation through this endpoint today. No images were fetched, and no result was visually approved.

The documented Crunchyroll-cover capability does not recover Okabe's missing show-still group in this observed case. This is a source-coverage failure, not proof that Tenrai's episode covers are unavailable for every anime. Keep the separate rights-holder/distributor investigation as the next route for Steins;Gate 2011.
