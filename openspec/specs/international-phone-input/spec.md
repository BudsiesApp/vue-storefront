# international-phone-input Specification

## Purpose

Provide a reusable international phone field whose country-aware editing, validation and E.164 value can be used independently of checkout consent.

## Requirements

### Requirement: Phone input exposes an independent value and validity contract
The theme SHALL provide a reusable phone-input molecule with a country selector and national-number input. Its two-way value SHALL be an E.164 phone string or an empty string; it SHALL expose validity separately so a parent can enforce its own required rule. It SHALL preserve in-progress input for editing without presenting an invalid value as valid. The component SHALL know nothing about consent, SMS policy, Vuex or storage. Its controls SHALL have associated labels and validation feedback usable with keyboard navigation.

#### Scenario: Parent consumes a valid phone
- **WHEN** a user enters a valid phone for the selected country
- **THEN** the parent receives its E.164 value and a valid result

#### Scenario: Empty or invalid editing value
- **WHEN** the phone field is empty or contains a number invalid for the selected country
- **THEN** the parent receives an empty value and an invalid result while the editable national input remains visible
- **AND** the component itself does not impose checkout's Continue policy or access storage

### Requirement: Country selector includes international choices
The selector SHALL offer every supported phone country, display country names and calling codes in its opened options, sort by country name with United States first, and select United States by default. Its compact collapsed state SHALL show only the selected calling code prefixed with `+`. The selector and number input SHALL remain side by side on one line at mobile and desktop widths, with the number input using the remaining width. Country names SHALL include Ascension Island (`AC`), South Sudan (`SS`) and Tristan da Cunha (`TA`). National input SHALL use the selected country as the default for validation, not a US-only rule. A valid number identified as another country sharing that calling code SHALL be accepted without changing the selector; this rule applies to every shared calling code.

#### Scenario: New empty phone field
- **WHEN** the component opens without a value
- **THEN** United States is selected and the compact collapsed selector shows only `+1` beside the number input on the same line
- **AND** opening the selector shows `United States (+1)` first, followed by remaining countries sorted by name with their calling codes

#### Scenario: Collapsed presentation follows a country change
- **WHEN** the customer selects United Kingdom from the opened options
- **THEN** the collapsed selector shows only `+44` and remains on the same line as the number input
- **AND** reopening it still shows country names and calling codes, not code-only options

#### Scenario: Customer changes country
- **WHEN** the customer selects a different country and enters a valid national number for it
- **THEN** the component reports a valid E.164 number with that country's calling code

#### Scenario: National number belongs to another country sharing the calling code
- **WHEN** United States is selected and the customer enters the valid Canadian national number `416 555 0123` without a `+` prefix
- **THEN** the input is valid and its two-way value is `+14165550123`
- **AND** United States remains selected
- **AND** the same acceptance rule applies to other countries sharing a calling code

#### Scenario: Supported country lacks a name in the existing country resource
- **WHEN** the customer opens the country selector
- **THEN** Ascension Island (`AC`), South Sudan (`SS`) and Tristan da Cunha (`TA`) appear by name with their calling codes in the normal alphabetical order

### Requirement: International input and restored values resolve country consistently
The national-number input SHALL use `autocomplete="tel"`. For a value beginning with `+`, whether typed, pasted, browser-autofilled or supplied by the parent, country selection and removal of the calling code SHALL wait until parsing succeeds and the parsed number's `isPossible()` result is true. This defines "resolvable" for normalization; parser success alone is insufficient, and `isValid()` remains the separate validity check. While incomplete, the component SHALL preserve the text exactly as entered, including the `+` part, leave the country selector unchanged, and report an empty two-way value and invalid result. Once resolvable, the component SHALL select its identified country and display only its national number. If the resolved number does not identify a country, it SHALL keep the selected country when the calling code matches; otherwise it SHALL choose the main country for that calling code. The calling-code fallback SHALL NOT run on incomplete input. Invalid input SHALL remain editable and invalid until it can be validated.

#### Scenario: Incomplete international input preserves the edit
- **WHEN** the customer types an incomplete international number such as `+1 416` or `+1 212`
- **THEN** the text remains exactly as typed, including the `+` and calling code
- **AND** the country selector does not change and no calling-code fallback is applied
- **AND** the two-way value is empty and validity is false, so Contact Continue remains blocked while SMS is checked

#### Scenario: Shared calling code identifies Canada
- **WHEN** `+1 416 555 0123` is typed, pasted or autofilled
- **THEN** Canada is selected and the number input contains the national number without `+1`
- **AND** the two-way value is `+14165550123`

#### Scenario: Shared calling code identifies United States
- **WHEN** the complete valid number `+1 212 555 0123` is typed, pasted or autofilled
- **THEN** United States is selected and the number input excludes `+1`
- **AND** the two-way value is `+12125550123`

#### Scenario: Different international calling code
- **WHEN** the complete valid number `+44 20 7946 0018` is entered or supplied by the parent
- **THEN** the matching country is selected and the number input excludes `+44`

#### Scenario: Calling code without an identified country
- **WHEN** an international number such as `+1 555 555 5555` parses with `isPossible()` true and a recognized calling code but without an identified country
- **THEN** the component retains the selected country if it shares that calling code, otherwise it selects the code's main country
- **AND** it reports validity independently of that country-selection fallback using `isValid()`; this example remains invalid with an empty two-way value

#### Scenario: Parent restores or clears a value
- **WHEN** the parent supplies a saved E.164 phone
- **THEN** its country and national number display exactly as for direct international input
- **AND** a later empty parent value clears the national-number input

### Requirement: Parent-supplied billing prefills normalize without an edit
When a parent supplies a billing telephone, the phone input SHALL apply its existing country-resolution and validity rules without requiring a user edit. A valid formatted international prefill, or a national prefill valid for the selected country, SHALL provide a canonical E.164 value and valid result. The parent-value path SHALL emit an `input` change only when that valid canonical value differs from the supplied value; an already-canonical E.164 parent value SHALL report validity without emitting `input` or treating restoration as an edit. A reflected canonical value SHALL NOT produce a second input change or disturb the edit. An invalid or unparseable prefill SHALL stay visible and editable and report invalid validity; it SHALL NOT be treated as a valid previously emitted phone. The phone input SHALL remain independent of the parent's requiredness policy, consent, storage and submission. Existing saved E.164 values and subsequent clear operations SHALL keep their current behavior.

#### Scenario: Formatted prefill is immediately usable
- **WHEN** the parent supplies a valid international phone or a valid national phone for the selected country whose formatting differs from canonical E.164
- **THEN** the control displays its editable number, emits the different canonical E.164 value and reports valid validity without a user edit
- **AND** the reflected canonical value does not emit a second input change

#### Scenario: Unparseable prefill remains visible
- **WHEN** the parent supplies billing telephone text that cannot be parsed
- **THEN** that text remains editable with invalid validity rather than disappearing or inheriting a previous valid result

#### Scenario: Existing saved value and clear
- **WHEN** the parent supplies an E.164 phone and later clears it
- **THEN** the original country/national display behavior is preserved, validity is reported without an `input` change for the E.164 restore, and the later empty value clears the text and reports invalid validity
