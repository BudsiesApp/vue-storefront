# Proposal

## Why

The #37214 browser investigation retained a synthetic `password` in attribution, and the Maestra follow-up established that `direct-crm-ticket` is authentication material omitted by current filters. Both also remain significant to SSR rendering/cache keys and original-request URL diagnostics. Epic [#37233](https://redmine.gorbunov.studio/issues/37233) approves focused prospective protection without breaking current-user authentication or cart restoration.

## What Changes

- Make the two evidenced credential names mandatory exclusions from attribution capture, future state/storage writes and outbound copies within the operator-approved plain-query/bounded-route interpretation, including referrer/landing URL carriers and real state/storage ingress paths.
- Apply operator input-12/P9: preserve ambiguous allowed plain-query values and acknowledge narrower R1/R2 protection for an excluded relative-route interpretation. Do not omit fragments or add an R5 exception. R3 shared-output/diagnostic and R4/R6 outcomes remain unchanged.
- Keep configurable filtering/acquisition behavior for other fields; retain allowed UTMs, paid/affiliate/message context and existing First/Last/reporting semantics.
- Extend existing clean-render/cache/current-request redirect isolation for those names, including equivalent casing/encoding, and protect the identified SSR request-URL/credential-bearing error diagnostics. Do not strip the browser URL or change authentication consumers.
- Prove fresh/cached HTML isolation with two synthetic visitors, current-request redirect/browser continuity, real state/storage ingress exclusion and existing authentication/recovery compatibility.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `traffic-attribution-capture`: Mandatory named-field exclusion within the approved URL interpretation, exact ambiguous-value preservation and safe diagnostics at existing prospective boundaries, retaining lifecycle and allowed context.
- `ssr-output-cache-isolation`: Named credential isolation from clean SSR HTML/cache representations and diagnostic views while retaining only the current request's necessary browser/redirect context.

## Impact

- Child [#37235](https://redmine.gorbunov.studio/issues/37235); branch `37235-protect-attribution-credentials`, from updated `origin/petsies-theme` `dd5d6b3ee116e2c675d28b52e5eb370f8941c82b`.
- Owners: shared app attribution helpers/state/storage/submission boundaries; `core/scripts/utils/page-cache-key.ts`, SSR request/response diagnostic call sites and focused tests. Reuse existing output-cache and redirect pipeline, not a new cache/auth/redaction subsystem.
- Magento child #37234 independently protects direct backend submissions. No VSF API, theme/payment code or pointer change, schema, provider authentication integration, acquisition policy or new reporting trigger is needed.
- Both children apply P9's same fragment boundary and accepted limitation. This contract revision does not accept the tentative implementation or close bug-review F1.1. P7's independent state producer remains; no new parser, metadata protocol or redundant downstream sanitizer is selected.
- UI CI builds the app with dynamically selected theme/payment branches; record actual combinations in implementation/review. Separate Bulk Orders app propagation and all brand releases remain later work. Preserve the existing local payment-submodule difference.
- No dependency on Maestra attribution Epic #37230. No historical storage/database cleanup, real credential replay, notification, production access, merge/deployment or delivered #37214 archive changes.
