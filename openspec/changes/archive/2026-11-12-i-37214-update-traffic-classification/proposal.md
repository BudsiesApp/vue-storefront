# Proposal

## Why

Magento now classifies AppLovin identifiers, but the existing VSF UI acquisition-key lists omit `aleid` and `alart`, so an identifier-only initial landing cannot replace a retained Last Touch unless another acquisition signal is present. The operator's follow-up for #37214, “implement VSF side too”, approves closing this UI gap while retaining raw capture, existing touch/reporting semantics, and cache isolation.

## What Changes

- Extend both the acquisition-gate fallback and the shipped configuration template with the two documented AppLovin keys; keep explicit configured lists authoritative rather than introduce a union/override policy.
- Keep these identifiers in the existing filtered raw query payload, without client-side source/channel/platform classification or synthetic UTMs. Preserve First Touch while qualifying identifier-only initial landings for the existing Last Touch update path.
- Add the documented lowercase attribution-only keys to the existing SSR ignored-query list. Reuse clean-render/cache-key isolation and current-request redirect query reattachment rather than dropping IDs, caching visitor values, or adding redirect machinery.
- Add focused helper, real-template/fallback, action/reporting, and core cache/redirect regression coverage and a concise operational note for configuration, lifecycle, and server-side classification ownership.
- Coordinate with the existing same-name Magento change / PR #506. Its accepted classifier behavior is a dependency, not another runtime change in this UI addition.

## Capabilities

### New Capabilities

- `traffic-attribution-capture`: Add the canonical AppLovin acquisition/capture contract to the already implemented raw-touch module. The historical capability exists in archived #36653, but no canonical `openspec/specs/traffic-attribution-capture/spec.md` exists in this checkout; reuse that capability name without rebuilding or rewriting the unrelated archived baseline.

### Modified Capabilities

- `ssr-output-cache-isolation`: Include the two documented lowercase AppLovin tracking keys in existing query stripping, visitor-independent HTML, and request-specific redirect forwarding.

## Impact

- Repository: `BudsiesApp/vue-storefront`; branch `37214-update-traffic-classification` from `petsies-theme` at `428205e312cfa00439cd953b910bc1eaf5e55c4a`. Owners: the existing traffic-attribution helper, `config/local.json.template`, and `core/scripts/utils/page-cache-key.ts`; existing actions and transport are regression boundaries, not a new flow.
- Companion: `GorbunovStudio/budsies-store-m2`, existing branch/change/PR #506 with accepted AppLovin runtime head `3a3d760f31bd56c71d3fb6cd4559e5508bbcc51c`. Magento remains the classifier and persisted attribution source of truth.
- VSF API (`BudsiesApp/vue-storefront-api`, `budsies`) already forwards the complete request body to Magento; no adapter, endpoint, API branch, or payload change is needed. Theme and payment submodules need no code or pointer changes, although existing UI CI builds them with this app.
- Shared `petsies-theme` UI code serves Petsies, Budsies, Education, and Waggables. Bulk Orders uses `bulkorders-theme` and has the same missing lists; normal separately authorized brand propagation must carry/adapt these changes and verify that combination before claiming its rollout. This proposal does not merge branches or deploy brands.
- No new tracking service, pixel/conversion call, campaign change, storage schema/key, retention rule, session ID, router-wide capture, per-cart sent state, immediate reporting trigger, checkout behavior, dependency, CI change, production access/change, deployment, or historical reclassification.
