# Proposal

## Why

The shared storefront preserves Maestra click-marker raw context but misses identifier-only return acquisition and omits the documented key from SSR clean rendering/cache isolation. Epic [#37230](https://redmine.gorbunov.studio/issues/37230) approves closing these gaps while Magento remains the only classifier and the current visitor retains their own browser/redirect context.

## What Changes

- Add `m-message-click-id` to both shipped and fallback acquisition defaults, retaining explicit replacement overrides and treating blank normalized marker values as absent for this gate.
- Preserve First Touch and allow a different marker-only initial return landing to replace Last Touch through the existing client-only lifecycle; retain raw allowed values and cart-event queued reporting.
- Add only documented lowercase `m-message-click-id` to the existing SSR ignored-query/clean-render/current-request redirect mechanism.
- Prove synthetic acquisition, state/reporting continuity and shared-output/redirect isolation; document marker/channel/provenance limits without a historical-remediation claim.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `traffic-attribution-capture`: Recognize the documented click marker under existing defaults/overrides and initial-landing/reporting contracts.
- `ssr-output-cache-isolation`: Isolate the documented lowercase tracking key while preserving only the current request's encoded redirect/browser context.

## Impact

- Child [#37232](https://redmine.gorbunov.studio/issues/37232); branch `37232-maestra-message-attribution`, independent from updated `origin/petsies-theme` `dd5d6b3ee` containing delivered #37214.
- Runtime owners: capture helper, `config/local.json.template`, `core/scripts/utils/page-cache-key.ts`; focused tests and attribution README. No state/transport/cache replacement or API/theme/payment feature change.
- Accepted sibling Magento #37231 behavior must precede expanded UI publication, not specification/implementation start. Existing API forwards the body unchanged.
- App CI selects theme/payment branches dynamically; record actual combinations later, preserving the existing local payment difference. Bulk Orders propagation and every production rollout remain separately authorized.
- No standalone key-marker support, inferred aliases, credential-policy changes, historical scan/repair, provider replay, merge/deployment or dependency on privacy Epic #37233. Its branches and active changes remain untouched.
