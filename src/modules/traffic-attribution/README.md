# Traffic attribution

On initial client synchronization the module captures the landing origin/path and filtered raw query values.
An unexpired First Touch is retained; a different acquisition landing replaces Last Touch as unsent. Acquisition
includes `aleid` and `alart` in both the shipped `trafficAttribution.acquisitionClickIdKeys` template and the
helper fallback. An explicitly configured list replaces the fallback, so custom lists must include these keys
if AppLovin identifier-only landings should qualify. Sensitive query keys remain excluded.

The existing cart-created and cart-connected events trigger queued raw-touch reporting, First Touch before a
different Last Touch; a touch is marked sent only on successful submission. Capture is initial-client-only,
not a route-wide or immediate reporting trigger. Magento owns source/channel/platform classification.

`password` and `direct-crm-ticket` (case-insensitive, ignoring hyphens and underscores) are always excluded
from fresh route query maps and referrer query pairs, even with custom sensitive-key configuration. Stored
touches and cross-tab updates are reused unchanged and may retain these fields; no storage sweep occurs.
Magento filters a reported touch as a fresh HTTP submission. Current browser queries and authentication and
cart-recovery consumers are unchanged. Budsies does not use `direct-crm-ticket` for login.

Magento's full-URL HTTP input retains the approved P9 fragment interpretation, including exact ambiguous
plain-query value preservation; fresh UI capture uses origin/path, structured query and browser referrer.

The SSR output cache ignores the documented lowercase AppLovin keys in its clean render URL and shared cache
key. Existing redirect handling appends only the current request's original encoded ignored pairs, without
overriding destination keys. The browser retains its own query for client capture. Existing exact-name cache
matching and case-insensitive acquisition matching remain distinct.
The two protected names are also excluded from shared render URLs and cache keys; redirect handling retains
only the current request's own pairs. Explicit SSR request-URL diagnostics filter the two names; existing
exception and old stored-touch task-body diagnostics retain their ordinary behavior.

This shared app requires the accepted Magento AppLovin classifier before release. The separate Bulk Orders app
requires its own later propagation and verification. Synthetic UI checks do not establish identifier-only
production storefront capture, recover previously unrecorded clicks, or authorize historical reclassification.
# Maestra message-click context

The shipped and fallback acquisition lists include `m-message-click-id`; a nonblank value can qualify an initial returning landing. Names are matched case-insensitively and allowed raw values remain unchanged. Explicit configured acquisition arrays replace the defaults, including when empty. `m-message-key-id` alone does not qualify, and the marker does not imply a channel, authorize access or prove a verified send.

Capture remains client-only on initial synchronization; existing First Touch, Last Touch and cart-event queued reporting semantics apply. The shared SSR cache strips only exact lowercase `m-message-click-id` using the existing clean-render and current-request redirect mechanism. Other case variants retain the existing exact-name cache behavior. Browser URLs and each visitor's own encoded redirect pairs remain available to that visitor.

Magento classification acceptance precedes expanded UI publication, not UI implementation. Brand propagation, provider actions, historical operations and production releases require separate authorization; synthetic tests are not provider-send counts.
