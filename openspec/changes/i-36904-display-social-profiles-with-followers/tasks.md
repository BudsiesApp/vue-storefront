# Tasks

## 1. Load and normalize profile data

- [x] 1.1 In the Vue Storefront API repository, add `GET /api/ext/budsies/social-profiles` using the existing Budsies extension, the configured `social_profile` alias, and the standard response envelope (D1). Use `yarn test:unit` to cover the searched index name, returned profile fields, `[]` on no hits, and HTTP 500 on a search error without `code`.
- [x] 1.2 Normalize the hits in a `for...of` loop (D2) without rechecking Magento's exported URL or count data. Unit-test disabled and unknown profiles, unchanged configured URLs, tied positions, and profiles kept without counts for `0` and `null`. Verify truncation at the K/M/B boundaries shown in the spec.
- [x] 1.3 Define a plain namespaced Vuex module under `src/modules/social-profiles/store/` with a `StorefrontModule` entry registered only through `registerModule` in the Petsies theme's `config/modules.ts`, like settings and rush upgrades (D1). Dispatch once in root SSR prefetch; the action makes a silent `TaskQueue.execute()` GET to the Budsies endpoint, checks the status code, normalizes the successful result without a shape check, and logs failures without triggering the settings redirect. Core TaskQueue and its tests stay unchanged; the request has no feature-specific deadline. Test the action's single GET and normalized commit. App code and app-side tests must not import new theme files or require registration from unadapted themes.

## 2. Render the social list and structured data

- [x] 2.1 Use the reusable theme component and i18n entries (D3). Check both supplied SVG sets resolve for all six networks with attribution intact; verify an empty list has no social markup. Check that a visible positive count appears verbatim with its noun in the link's accessible name, and a count omitted at intake (including zero) leaves neither visible count text nor a count noun in the name. The name still includes the brand, network and new-tab notice.
- [x] 2.2 Use the existing Petsies desktop and mobile placements for the social list, with no PNG sprite (D3). Inspect the development storefront in a browser on desktop and at 320px with six counted links: check placement, icon sizes, count color, no overflow, visible focus in visual order, and no unrelated footer layout changes. Also verify a profile with an exported `0` still links but shows no count. Where available, retain the local Magento fixture with all six networks, a hidden count, a zero count, a disabled profile, and counts near the format boundaries.
- [x] 2.3 Use the exported URLs of shown profiles for homepage Organization `sameAs`, regardless of count visibility, make JSON-LD safe for catalog values, and remove the hardcoded list and its remaining imports (D2). Verify matching ordered links and schema in the initial homepage HTML, omitted `sameAs` for empty data, no browser refetch or hydration mismatch, and unchanged schema placement.

## 3. Apply SSR cache policy

- [x] 3.1 Register `social_profile` in both SSR configuration tag lists. Write profile cache tags only in the action through `Vue.prototype.$cacheTags`, like rush upgrades (D4). Test `social_profile` on empty and nonempty success, and that rejection and a non-200 result code each commit an empty list and add `no-cache` without rejecting the action.

The Migration Plan in `design.md` is the source for release instructions; no separate deployment deliverable is needed for implementation.
