# Spec Delta

## ADDED Requirements

### Requirement: Evidenced credentials are mandatory attribution exclusions
Attribution capture SHALL exclude `password` and `direct-crm-ticket` independently of configured sensitive-key overrides. Matching SHALL ignore ASCII case and hyphen/underscore separators. Protected fields MUST NOT become acquisition signals. Existing filtering and explicit acquisition-list overrides for other fields SHALL remain authoritative.

#### Scenario: Fresh landing carries credentials and allowed context
- **WHEN** a new browser landing carries either or both protected fields alongside allowed UTMs, paid/affiliate/message identifiers or ordinary query data
- **THEN** the captured attribution MUST exclude protected fields and retain allowed context under existing normalization
- **AND** the current browser URL and route object MUST NOT be mutated by attribution filtering

#### Scenario: Configuration omits or attempts to acquire a credential
- **WHEN** configured sensitive keys omit the two fields, including an empty override, or an acquisition list includes a protected name
- **THEN** the protected field MUST still be removed before acquisition eligibility is evaluated
- **AND** explicit configuration behavior for other sensitive and acquisition names MUST remain unchanged

### Requirement: Prospective attribution state storage and forwarding share credential exclusion
Future attribution state, storage writes and outgoing attribution copies SHALL exclude protected fields, including landing/referrer URL query and query-shaped fragment representations. Clean copied state at real mutation ingress supplies storage and reporting, covering ordinary storage synchronization without introducing a historical storage sweep or changing touch lifecycle metadata.

#### Scenario: Referrer or alternate touch supplies a URL-carried credential
- **WHEN** a browser capture or alternate touch contains a protected named pair in a landing/referrer URL query or query-shaped fragment
- **THEN** its prospective attribution copy MUST exclude that pair, including repeated pairs and names encoded once in the URL
- **AND** allowed URL context and unrelated encoded pairs MUST remain usable

#### Scenario: A touch enters through state or storage synchronization
- **WHEN** an attribution touch is accepted through normal synchronization or a state mutation rather than the route capture helper
- **THEN** future attribution state/storage writes MUST exclude protected fields and named URL-query copies
- **AND** existing touch type, creation/expiry time and sent-state meaning MUST remain unchanged

#### Scenario: Outgoing data bypasses ordinary capture
- **WHEN** an existing cart event reports a touch loaded through normal state ingress, including a touch stored before this protection existed
- **THEN** the new outbound body MUST use the credential-free state copy without relying on a fresh landing or the backend filter
- **AND** this MUST NOT add a storage enumeration, cleanup command, new reporting trigger or historical-remediation claim

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
