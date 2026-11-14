# Proposal

## Why

Epic [#37233](https://redmine.gorbunov.studio/issues/37233) approves a two-name data-minimization policy for fresh attribution capture and actual shared-output/diagnostic paths. Inputs 26/27/P15 expressly exempt saved touches, including their ordinary reporting and existing TaskQueue task-body diagnostic. The operator requires reconsidering the whole VSF PR, not retaining earlier safeguards because they once passed review. `direct-crm-ticket` is not a Budsies login credential and no local ticket-login exposure is established.

## What Changes

- Keep mandatory `password`/`direct-crm-ticket` exclusion once in fresh route-query/referrer capture, independently of sensitive-key overrides. Preserve allowed values and the live browser URL. Remove the UI fragment parser: no remaining fresh URL carrier supplies a fragment; P9 remains unchanged at Magento's full-URL HTTP intake.
- Remove saved-touch loading/cross-tab sanitization, the touch-copy sanitizer and privacy-only downstream cloning/subscriber changes. Existing state, storage and queued reporting consume values unchanged; old selected fields may persist/report unchanged.
- Remove redundant protected-name additions to configurable shipped/fallback sensitive lists: one mandatory predicate already establishes the floor under every configuration. Preserve existing other-key overrides and all released Maestra acquisition support.
- Retain the existing SSR clean-render/cache/request-local redirect extension for the two names and filter the explicit request-URL fields at actual SSR diagnostic producers. Remove blanket error suppression and exception-hook request replacement; no real producer/consumer evidence justifies them.
- Remove TaskQueue `logResponse`/type/test changes and unsupported storage/report-error suppression. Do not reintroduce legacy protection through diagnostics or invent a response-error confidentiality contract.
- Align tests/docs with fresh-input-only protection, unchanged saved-data reuse, allowed context, current-user/auth/recovery compatibility and the remaining real shared-output paths.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `traffic-attribution-capture`: Fresh two-name capture/referrer exclusion, allowed-value preservation and explicit saved-touch exemption, with existing lifecycle/reporting unchanged and no invented fragment intake.
- `ssr-output-cache-isolation`: Two-name shared-render/cache isolation, current-request redirects and removal from explicit SSR diagnostic URL fields, without a new cache/diagnostic subsystem.

## Impact

- Child [#37235](https://redmine.gorbunov.studio/issues/37235), branch `37235-protect-attribution-credentials`, PR #576. Whole PR reviewed against Git-verified current `petsies-theme` target `23b8139ac86ae216df4629594609257fea763951`, an ancestor of published head `9a4364a33393e5f3f7f0c61c76264c299c6d4494`.
- Final owners: the fresh capture helper, small shared name/URL-pair utility, existing page-cache splitter, explicit server/response URL-log arguments, focused tests and README. Restore ordinary storage/TaskQueue code; no schema, protocol, dependency, framework or theme/payment/API feature change.
- Magento #37234 filters all fresh HTTP submissions, including a body reported unchanged from old browser storage. No client-side historical cleanup is required to achieve that independent boundary.
- Preserve canonical/released Maestra specs, all nonprivacy target changes, local payment-submodule difference and configuration. No archive, push, merge, release, historical operation, real credential replay or production action is part of this revision.
