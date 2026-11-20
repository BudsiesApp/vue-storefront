# Proposal

## Why

Follower counts show prospective customers that the brand is established. Content managers can now maintain social profiles and counts in Magento; the Petsies storefront should reflect those changes instead of shipping its own list of links.

## What Changes

- Render the active store's eligible social profiles and optional compact counts in the Petsies footer, using the supplied circled SVGs in place of the sprite. A small filled person icon identifies each visible count. A zero count leaves the link visible without the number or its icon. Keep the rest of the footer unchanged.
- Share one server-rendered profile list with the homepage Organization schema. Use the existing tag flow to invalidate pages after reindexing, including pages that previously had no visible profiles. When the load fails, render the page without social links and mark it `no-cache` using the same shared mechanism as rush upgrades.
- Place the social list in a reusable theme component that supports both SVG sets. Remove the hardcoded Petsies list without a fallback; the production profiles must be ready before release.

## Capabilities

### New Capabilities

- `storefront-social-profiles`: Display Magento-managed social links and counts in the footer and use the same links in Organization structured data.

### Modified Capabilities

- `storefront-request-services`: Allow only the social-profile Vuex load action to use the legacy prototype cache tags, like rush upgrades. Keep the general request service unchanged.

## Impact

- Storefront app: a standard registered Vuex module following settings and rush upgrades, with ordinary `TaskQueue.execute()` and cache tagging inside the action. No change to TaskQueue or the SSR response handler. Unadapted theme branches keep their current behavior.
- Petsies theme submodule: normal module registration in `config/modules.ts`, application prefetch, reusable social list, responsive footer, Organization schema, theme translations and SVG assets.
- Vue Storefront API: one read-only Budsies extension endpoint over the store's existing `social_profile` index; no change to the generic catalog API. Release it before or together with the storefront.
- No Magento changes, Storyblok integration, social-network API calls, follower synchronization or adaptations of other theme branches. Entering production profiles is content work, not part of this implementation.
