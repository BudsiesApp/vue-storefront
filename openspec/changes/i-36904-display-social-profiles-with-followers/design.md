# Design

## Context

`components/organisms/o-footer.vue` currently mounts separate desktop and mobile link groups from `interfaces/social-services.ts` and a PNG sprite. The root `App.vue` owns SSR prefetch, and its `components/atoms/a-organization-schema.vue` independently reads the same hardcoded list on the homepage. Magento already exports one `social_profile` document per Website/network into each of that Website's Store View catalog indexes. There are six supported networks and Magento enforces one profile per Website and network.

## Goals / Non-Goals

- Keep catalog access and profile selection behind one Vuex action, with the visual list and JSON-LD reading the same hydrated result.
- Use the same action-level cache tagging as rush upgrades and the existing SSR cache policy without changing cache keys or adding a cache or service.
- Limit adoption to the Petsies theme in this change. Keep the shared app independent of theme files, so branches without the new component or store registration still build.

## Decisions

### D1. Load profiles like settings and rush upgrades

Follow the `BackendSettings` and `BudsiesModule` registration pattern. Export a `SocialProfilesModule` and its namespaced action and getter identifiers from `src/modules/social-profiles/index.ts`; the module registers the Vuex module from `store/index.ts` under its shared store-name constant. Add `registerModule(SocialProfilesModule)` beside `registerModule(BackendSettings)` in the Petsies theme's `config/modules.ts`. Do not construct the store through a custom factory, register it in `initTheme`, or inject callbacks or renderer context.

Follow `backend-settings/fetchSettings` and `budsies/loadProductsRushAddons`: the action in `store/actions.ts` resolves `${config.budsies.endpoint}/social-profiles` with `processURLAddress` and awaits a silent JSON GET through unmodified `TaskQueue.execute()`. On result code 200, normalize `task.result` and commit it through a mutation; the endpoint guarantees a profile array, so the action does not check its shape. On a rejected task or non-200 result code, log the failure, commit an empty list, mark `no-cache` (D4), and settle normally so the optional profile load cannot enter the settings error-page path. Do not add a feature-specific deadline, cancellation, or retry.

Dispatch once from the theme root's `serverPrefetch`, concurrently with settings and before children render. The footer and Organization schema read the same namespaced Vuex getter through computed properties; the browser restores the state before mount and neither consumer fetches the data. The single SSR caller does not need the rush loader's pending-promise bookkeeping.

In the Vue Storefront API repository, add `GET /api/ext/budsies/social-profiles` in `src/api/extensions/budsies/index.js`, using the same search and success response pattern as `/plushies/products-rush-upgrades`. Use the existing OpenSearch client and `adjustIndexName(config.opensearch.index, 'social_profile')`. Each brand/Store View deployment selects its configured base index. Search once with `allow_partial_search_results: false` and a fixed size of 50 (Magento currently permits at most six profiles per Website). Return only `id`, `network`, `is_enabled`, `profile_url`, `subscribers_count`, `display_subscribers`, and `position` from the hits, without revalidating Magento's exported values. Return success via `apiStatus(res, profiles)`, including `[]` on no hits. On a search error, log its type and status and return a generic message in the standard error envelope with an explicit HTTP 500 via `apiStatus`. Do not pass `error.code` to `apiStatus`: OpenSearch errors can omit it, causing `apiStatus` to default to 200. Do not add an API response cache for this route.

The existing loader, extension router, search client and response envelope are reused (rungs 2–3). The small endpoint (rung 4) is needed because the generic catalog search returns unwrapped JSON; it keeps the rush-upgrade loader pattern without changing Magento, the generic catalog API, or shared TaskQueue behavior.

### D2. One normalized list for links, counts and Organization URLs

Normalize the hits in a single `for...of` loop. Skip disabled profiles and networks the storefront does not support. The Magento admin save path requires a valid absolute HTTP(S) destination for an enabled profile. Use `profile_url` as exported, without checking its presence, format or protocol. Data written around Magento validation is out of scope. Order the collected profiles by numeric `position` then `id` using Magento's exported fields.

Use the exported `subscribers_count` directly: Magento supplies a non-negative integer or `null` and already applies the count display flag. Do not check the flag, type, or sign again. Normalize `0` and `null` to an omitted count (`null`) without dropping the profile. For K/M/B choose the unit using the input count, truncate to tenths before composing the number and suffix, and emit no fractional digit when the tenth is zero. Serialize formatted text or `null` for both renders.

Keep `a-organization-schema.vue` homepage-only; derive optional `sameAs` by mapping the ordered URL field. Escape literal `<` at the JSON-LD serialization sink (as `\u003c` in JSON), because URLs now come from outside the theme and the existing component emits raw script text. Keep the rest of the Organization and WebSite schema unchanged.

### D3. Component-owned social styling

Add the reusable component under the theme's `components/`. Select `circled` or `plain` by prop and use static imports of the supplied local assets, keyed by the social-network enum, with both sets included by the build. Use the files unchanged as image URLs, with an empty alt attribute. Render nothing for an empty list, and use one link for each icon and optional count. Get the brand from the active Store View and use translatable name templates with and without the count so translators can place the count, noun and new-tab notice naturally. Keep the visible count string verbatim in the accessible name. Use the count-free template when the normalized count is `null`, including a raw count of zero. A single count noun per network is sufficient; singular wording for one is not in scope.

Use the component in `o-footer.vue`'s existing desktop and mobile placements. Use breakpoint CSS to hide the inactive instance completely, not viewport-dependent JS, so SSR and hydration agree and only one instance is focusable at a time. The component encapsulates its responsive icon sizes, count color and spacing; keep counts under icons and allow the social group to fit or wrap within its available width. Expose `--social-profiles-icon-size` for other themes to override, with defaults of 30px on mobile and 42px on desktop. Reserve icon dimensions before images load; size the mobile image to its box and the desktop image 2px larger, clipped with the same `-1px` offset as the sprite. Preserve visible keyboard focus on the link rather than only the decorative image. Remove `interfaces/social-services.ts` and `assets/footer-socials.png` after both consumers have switched.

### D4. Tag in the Vuex action, like rush upgrades

In the load action, use the existing `Vue.prototype.$cacheTags` when present, as rush upgrades do. Add `social_profile` on success even for an empty list, and add `no-cache` when the load fails. Do not record load outcome in Vuex solely for tagging or add a check in the SSR response handler. This is a narrow exception to the general restriction on new prototype cache-tag access; do not expose tags through `$ssrContext` or the general request service.

Register `social_profile` in `server.availableCacheTags` in `config/default.json` and `config/local.json.template` (the deployment template replaces the default array). Use the existing explicit and wildcard invalidation handling and the `no-cache` write rule, which applies whether output-cache tagging is on or off. No key or invalidation algorithm changes are needed.

## Risks / Trade-offs

- No profiles means no social links, by design. Prepare and reindex Petsies and Waggables content before their rollout rather than preserving the old data in code.
- The action writes cache tags and `no-cache` through the shared Vue prototype. Under concurrent SSR, the tag set can belong to a different render, so a page can miss its profile tag or a failed response can be stored despite the mark; another render can receive the mark instead. No request-isolation work is included.
- Like settings and rush upgrades, SSR waits for the load. A stalled request can hold the page until the existing transport, proxy or browser times out; only an observed failure takes the fallback path. The browser does not retry during hydration.
- Each deployment uses one `DEFAULT_STORE_CODE` with `storeViews.multistore` and `users.tokenInHeader` disabled. The action runs only on the server, where tasks receive no user or cart token. Revisit the loader if these deployment assumptions change; this change adds no special request handling for those configurations.
- The profile endpoint adds no API result cache. Magento's cache queue must still invalidate the storefront output cache. The checked-in API template leaves API output caching and forwarding off; the API only forwards from its enabled cache handler. Use the existing direct storefront route when forwarding is off. Verify actual eviction and refreshed content, not just a successful invalidation HTTP status.

## Migration Plan

1. Have the content owner enter and confirm the intended production profiles for `petsies_site` and `waggables_site` in Magento, and run the `vsbridge_budsies_social_profile_indexer` reindex. Confirm the intended links, order and count visibility are available from the affected Store View indexes; do not release the storefront if either brand's profiles are not ready.
2. Release the Vue Storefront API endpoint before or together with the storefront. Ensure each affected deployment points to its paired API and that the endpoint returns the expected list for the configured index before the new storefront takes traffic.
3. Verify that Magento's `social_profile` invalidation evicts cached storefront HTML for both brands' Store Views. If it does not, correct the existing invalidation route in deployment settings and verify eviction before go-live. Release with the storefront tag configuration and purge pre-change SSR HTML using the normal deployment cache purge; old pages lack the new dependency tag.
4. If rollback is needed, restore the previous storefront release and purge its SSR pages again before removing the API endpoint. Indexed Magento profiles can stay in place.
