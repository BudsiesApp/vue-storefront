# Spec Delta

## ADDED Requirements

### Requirement: Selected names are mandatory fresh attribution exclusions
Fresh route-query and referrer-query capture SHALL exclude named `password` and `direct-crm-ticket` entries independently of configured sensitive-key overrides, before acquisition eligibility. Matching SHALL ignore ASCII case and hyphen/underscore separators. Other filtering/acquisition overrides and allowed context SHALL remain intact; stored touches are exempt from recleaning. No new full-URL or fragment intake SHALL be introduced.

#### Scenario: Fresh landing carries selected fields and allowed context
- **WHEN** a new browser landing carries either or both selected names alongside allowed UTMs, paid/affiliate/message identifiers or ordinary query data
- **THEN** actual capture MUST exclude the selected entries while preserving allowed context under existing normalization and origin/path-only landing URL policy
- **AND** the current browser URL and caller-owned route MUST remain unchanged

#### Scenario: Configuration omits or attempts to acquire a selected name
- **WHEN** configured sensitive keys omit either selected name, including an empty override, or acquisition keys include it
- **THEN** the mandatory capture predicate MUST remove it before acquisition eligibility without depending on duplicate configurable defaults
- **AND** existing custom filtering/acquisition behavior for other names and released Maestra support MUST remain unchanged

#### Scenario: Fresh referrer supplies a URL-carried selected field
- **WHEN** fresh capture obtains a referrer URL containing a selected named pair in its supported query representation
- **THEN** its attribution URL copy MUST exclude that pair, including repeated pairs and once-encoded names, while preserving allowed pair bytes/encoding and caller/browser context
- **AND** no second state, storage or reporting sanitizer SHALL be required for the fresh result

### Requirement: Ordinary stored-touch reuse is outside recleaning scope
State, storage and reporting SHALL consume their supplied values without repeated filtering. Previously stored touches MAY retain selected entries and URL carriers when loaded, synchronized across tabs, persisted or reported. Existing touch identity, expiry, sent flags, First/Last ordering and reporting semantics SHALL remain intact. No legacy admission, purge, version marker or custom storage protocol SHALL be introduced.

#### Scenario: Stored touches are restored or synchronized across tabs
- **WHEN** ordinary synchronization or a cross-tab event loads an old saved touch containing either selected name
- **THEN** its attribution values MUST pass through unchanged under existing storage/lifecycle rules, without a sanitized working clone or rewrite

#### Scenario: A cart event reports an old saved touch
- **WHEN** an existing cart event reports an eligible unsent old touch
- **THEN** its browser-side body MAY contain the unchanged saved values and MUST retain existing ordering, duplicate/in-flight and success-only sent-state behavior
- **AND** normal Magento HTTP intake MUST independently filter the received fresh request, without requiring client-side saved-touch cleanup
- **AND** the existing TaskQueue execution task-object/body diagnostic is covered by the same old-value exemption, not a reason to sanitize or suppress it or add new logging

### Requirement: Fresh capture does not invent fragment processing
VSF SHALL keep origin/path-only landing capture and structured route-query normalization. Browser referrer generation already strips fragments and HTTP SSR requests do not carry them. This change SHALL NOT introduce a fragment parser or alternate URL/touch input to recreate withdrawn saved-data coverage. P9's full-URL interpretation SHALL remain at Magento's fresh HTTP intake; live browser URLs and allowed values SHALL remain unchanged.

#### Scenario: A live landing contains the operator-selected fragment
- **WHEN** the browser opens `https://example.test/page?utm_source=allowed#route=one?password=synthetic&keep=x` or the corresponding ticket/equivalent-name variant
- **THEN** its live browser/authentication context MUST remain unchanged and attribution MUST retain its existing origin/path-only landing and normalized allowed query, without a new fragment acquisition path
- **AND** Magento's separate fresh full-URL input MUST retain P9's exact ambiguous-value preservation, established exclusions and accepted relative-route limitation

#### Scenario: Exempt stored URLs contain fragment pairs
- **WHEN** saved state or a cross-tab event supplies any old URL fragment, including P9's exact selected string
- **THEN** existing VSF state/storage/reporting MUST retain it unchanged without a fragment filter, omission or recursive value scan

### Requirement: Fresh attribution protection preserves existing consumers and reporting
Fresh protection SHALL preserve native browser/authentication/recovery inputs, allowed raw/UTM data, First/Last semantics and existing queued cart-event reporting. It SHALL NOT introduce ticket login, new acquisition/classification, route-wide capture or unsupported error-suppression policy. Downstream code SHALL rely on the fresh producer without duplicating its filter; old values retain their explicit exemption.

#### Scenario: Existing authentication and restoration consumers keep their inputs
- **WHEN** the actual auth redirect helper or recovery component consumes its current route after clean hydration or a current-request redirect
- **THEN** its query/recovery-key/promo inputs and authorization behavior MUST remain unchanged
- **AND** synthetic/mocked compatibility MUST NOT be claimed as proof of real ticket login, provider-ticket validity or local exposure

#### Scenario: Fresh captured data reaches Magento on the existing cart event
- **WHEN** an eligible fresh landing with allowed context and selected fields is captured and an existing cart event reports it
- **THEN** the normal state/storage/queued body MUST retain the captured allowed data without another filter, preserve First-before-Last/success-only reporting and leave backend classification to Magento

#### Scenario: Unsupported diagnostic guards are not retained as legacy protection
- **WHEN** diagnostics process ordinary storage failures or HTTP result/error data without an established fresh selected-value producer/path
- **THEN** this change MUST preserve existing diagnostic detail rather than add a TaskQueue logging option, generic redaction or blanket suppression based only on arbitrary injected error strings
- **AND** a concrete fresh request URL reaching SSR diagnostics MUST still receive the separately specified URL-field protection
