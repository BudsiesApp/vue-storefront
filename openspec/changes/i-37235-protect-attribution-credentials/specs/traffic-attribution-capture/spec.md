# Spec Delta

## ADDED Requirements

### Requirement: Evidenced credentials are mandatory attribution exclusions
Attribution capture SHALL exclude named `password` and `direct-crm-ticket` entries independently of configured sensitive-key overrides. URL carriers SHALL use the bounded fragment interpretation below, not exclusion under every intended relative-route meaning. Matching SHALL ignore ASCII case and hyphen/underscore separators. Protected fields MUST NOT become acquisition signals. Existing filtering and acquisition-list overrides for other fields SHALL remain authoritative.

#### Scenario: Fresh landing carries credentials and allowed context
- **WHEN** a new browser landing carries either or both protected fields alongside allowed UTMs, paid/affiliate/message identifiers or ordinary query data
- **THEN** the captured attribution MUST exclude protected fields and retain allowed context under existing normalization
- **AND** the current browser URL and route object MUST NOT be mutated by attribution filtering

#### Scenario: Configuration omits or attempts to acquire a credential
- **WHEN** configured sensitive keys omit the two fields, including an empty override, or an acquisition list includes a protected name
- **THEN** the protected field MUST still be removed before acquisition eligibility is evaluated
- **AND** explicit configuration behavior for other sensitive and acquisition names MUST remain unchanged

### Requirement: Prospective attribution state storage and forwarding share credential exclusion
Future attribution state, storage writes and outgoing copies SHALL exclude protected fields within the approved query/bounded-fragment interpretation and preserve allowed ambiguous values. Independent state copies at real mutation ingress SHALL supply storage and reporting, including ordinary synchronization, without a historical sweep or touch-lifecycle change. Protection SHALL NOT depend on fresh capture or a broader backend interpretation.

#### Scenario: Referrer or alternate touch supplies a URL-carried credential
- **WHEN** a browser capture or alternate touch contains a protected named pair in a landing/referrer URL query or fragment pair list selected by the approved interpretation
- **THEN** its prospective attribution copy MUST exclude that pair, including repeated pairs and names encoded once in the URL
- **AND** allowed URL context and unrelated encoded pairs MUST remain usable

#### Scenario: A touch enters through state or storage synchronization
- **WHEN** an attribution touch is accepted through normal synchronization or a state mutation rather than the route capture helper
- **THEN** future attribution state/storage writes MUST exclude protected entries and recognized URL pairs under the approved bounded interpretation
- **AND** existing touch type, creation/expiry time and sent-state meaning MUST remain unchanged

#### Scenario: Outgoing data bypasses ordinary capture
- **WHEN** an existing cart event reports a touch loaded through normal state ingress, including a touch stored before this protection existed
- **THEN** the new outbound body MUST use the independent state copy filtered under the approved interpretation, including preserved ambiguous allowed values, without relying on a fresh landing or the backend filter
- **AND** this MUST NOT add a storage enumeration, cleanup command, new reporting trigger or historical-remediation claim

### Requirement: Fragment interpretation preserves ambiguous plain-query values
Select fragment form from literal delimiters before decoding names. A leading `/` SHALL mark a route; filter only its suffix after the first `?`, if present. Otherwise, a `?` before the first `=` (or with no `=`) SHALL mark a relative route. Remaining fragments containing `=` SHALL be plain query pairs; other fragments SHALL remain unchanged. Only the selected pair list SHALL be filtered; route prefixes and allowed values SHALL NOT be rescanned or omitted.

#### Scenario: A protected plain-fragment value contains a question mark
- **WHEN** a touch URL contains `#password=synthetic?tail&keep=a%2Bb` or the corresponding `direct-crm-ticket` pair
- **THEN** its attribution copy MUST retain `#keep=a%2Bb` and exclude the whole protected pair, including the value's literal `?tail`
- **AND** caller-owned touch/URL values and allowed pair bytes MUST remain unchanged

#### Scenario: An explicit route path contains equals
- **WHEN** a touch URL contains `#/page=one?password=synthetic&keep=a%2Bb` or the corresponding ticket pair
- **THEN** its attribution copy MUST contain `#/page=one?keep=a%2Bb`, preserving the route path while excluding the protected suffix pair

#### Scenario: An unambiguous relative route has a protected suffix
- **WHEN** a touch URL contains `#route?password=synthetic&keep=a%2Bb` or the corresponding ticket pair
- **THEN** its attribution copy MUST contain `#route?keep=a%2Bb`
- **AND** explicit routes without a query suffix and ordinary fragments such as `#reviews` MUST remain unchanged

#### Scenario: The operator-selected ambiguous URL is preserved exactly through future copies
- **WHEN** ordinary synchronization or cross-tab ingress supplies `https://example.test/page?utm_source=allowed#route=one?password=synthetic&keep=x` in either touch URL field
- **THEN** its state, future storage and reported attribution copies MUST retain exactly `https://example.test/page?utm_source=allowed#route=one?password=synthetic&keep=x`
- **AND** corresponding `direct-crm-ticket` and equivalent-name text inside the allowed `route` value MUST receive the same preservation
- **AND** no guarantee SHALL be claimed for a sender intending the excluded relative route `route=one` with a credential suffix; no fragment omission or touch rejection is permitted to hide that limitation
- **AND** touch metadata, caller inputs and live browser/authentication/recovery context MUST remain unchanged

#### Scenario: Encoded delimiter text remains allowed data
- **WHEN** an allowed fragment value contains encoded delimiter text such as `#route=one%3Fpassword%3Dsynthetic&keep=x`
- **THEN** that value MUST remain unchanged without repeated decoding, recursive value scanning or reinterpretation as another query

### Requirement: Attribution diagnostics do not disclose protected credential values
Attribution capture, storage and reporting diagnostics SHALL NOT serialize protected fields, their named URL representations, or arbitrary rejected touch/error objects that can carry those values. Failures SHALL retain nonblocking behavior and an operation-identifying diagnostic without exposing credential material.

#### Scenario: Storage or reporting rejects a credential-bearing object
- **WHEN** a synthetic attribution storage/read/report failure contains a protected value in its rejected object or free-form message
- **THEN** the attribution diagnostic MUST identify the failed operation without disclosing that value or the rejected payload
- **AND** existing unsent-on-failure, duplicate/in-flight suppression and cart/checkout continuity MUST remain effective

### Requirement: Attribution protection leaves authentication recovery and reporting contracts intact
Attribution protection SHALL preserve current-user browser/authentication and abandoned-cart restoration inputs, allowed raw/UTM context, retained First Touch, initial-landing Last Touch eligibility and queued cart-event reporting. It MUST NOT introduce new authentication, credential interpretation, marker classification or route-wide acquisition behavior.

#### Scenario: Existing authentication consumer uses the current route
- **WHEN** the existing client-side authentication/redirect consumer runs after neutral SSR hydration or a current-request redirect
- **THEN** it MUST receive its own required route context unchanged by attribution filtering
- **AND** synthetic compatibility proof MUST NOT be presented as validation of a real provider authentication ticket

#### Scenario: Existing restoration consumer uses the recovery route
- **WHEN** a synthetic cart-restoration journey supplies its existing recovery route and optional promo instruction alongside protected query fields
- **THEN** the existing recovery API input and authorization flow MUST remain unchanged while attribution excludes the protected fields

#### Scenario: Allowed attribution reaches Magento through a real cart event
- **WHEN** a synthetic browser with retained First Touch receives a new eligible landing containing allowed attribution and protected fields, then triggers an existing cart event
- **THEN** Magento MUST receive the allowed credential-free raw body under the existing First-before-Last ordering, success-only sent flags and backend classification ownership
