# International Phone Input Delta

## ADDED Requirements

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
