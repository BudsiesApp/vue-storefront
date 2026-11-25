# Checkout Marketing Consent Delta

## MODIFIED Requirements

### Requirement: Consent controls form a reusable component
The email/SMS checkboxes and phone field SHALL be provided by a self-contained, reusable consent-form component, rather than embedded in the Contact organism. The component SHALL read the consent labels and offered channels from the backend settings itself. A caller SHALL be able to restrict the displayed channels, but SHALL NOT enable a channel unavailable in settings. A caller SHALL also be able to keep the phone visible whenever SMS is displayed, independently of whether it is checked. Without these optional inputs it SHALL render every offered checkbox and show the phone only while SMS is checked, preserving Contact behavior. The component SHALL track phone validity and show a phone error only when displayed SMS is checked and validation fails. Its value SHALL remain a two-way binding of `{ emailConsent, smsConsent, phone }`, and it SHALL expose a `validate()` operation that shows the phone error and reports the value invalid when displayed SMS is checked without a valid phone. Phone requiredness SHALL depend on checked displayed SMS, not on visibility alone. It SHALL NOT know about the checkout or Success-page policy: browser storage, the email association, the persisted customer phone, navigation, already-accepted order channels and submission SHALL stay in the caller. Contact SHALL keep its existing placement and Continue behavior while consuming that component.

#### Scenario: Contact consumes the reusable consent form
- **WHEN** Contact renders the consent block beneath the name fields without optional presentation inputs
- **THEN** the separate form displays the checkboxes offered by the backend settings and the conditional phone field, and updates Contact's bound value on each customer edit
- **AND** Contact validates the form through `validate()` on Continue and retains saving, email association, customer-phone persistence and checkout navigation
- **AND** the California Privacy Notice remains visible outside the reusable block

#### Scenario: Form is validated with checked SMS and no valid phone
- **WHEN** `validate()` is called while displayed SMS is checked and the phone is empty or invalid
- **THEN** the form shows the phone error and reports the value invalid

#### Scenario: Form is used outside checkout
- **WHEN** the form is rendered with a bound value outside the checkout
- **THEN** it reads no saved checkout selection and writes no browser storage or customer data

#### Scenario: Contact restores an already-canonical phone
- **WHEN** Contact restores a saved selection with SMS checked and an E.164 phone
- **THEN** the phone displays and reports validity without emitting a value change merely for restoration
- **AND** the restore does not mark the Contact draft edited or invalidate the existing saved/in-memory selection

#### Scenario: Caller restricts channels
- **WHEN** a caller restricts display to SMS but settings do not offer SMS
- **THEN** no SMS control or phone appears, and the restriction does not enable that unavailable channel
- **AND** channels excluded by the caller never affect phone requiredness

#### Scenario: Caller keeps the phone visible
- **WHEN** a caller requests an always-visible phone and displayed SMS is unchecked
- **THEN** the phone is visible but not required, and `validate()` succeeds even if it is empty or invalid
- **AND** unchecking SMS after a failed validation removes the visible phone error without hiding the phone
