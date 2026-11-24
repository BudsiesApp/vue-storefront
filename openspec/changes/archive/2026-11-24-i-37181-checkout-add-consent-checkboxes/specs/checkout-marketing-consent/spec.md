# Spec Delta

## Purpose

Collect optional marketing choices in regular checkout and convey only the customer's applicable choices to Magento with the placed order.

## ADDED Requirements

### Requirement: Contact offers settings-driven optional choices
The regular Budsies, Petsies and Waggables checkout SHALL display optional email and SMS marketing checkboxes beneath the Contact name fields, without a block heading. They SHALL be unchecked without a matching saved selection. Email SHALL appear only with a non-empty `marketingConsent.emailConsentLabel`; SMS SHALL appear only with a non-empty `marketingConsent.smsConsentLabel` and `marketingConsent.smsEnabled` true. Unavailable settings SHALL produce no checkboxes. Administrator labels SHALL render as trusted HTML with usable links. The California Privacy Notice SHALL remain visible independently of consent availability. Guest and logged-in Contact flows SHALL use the same controls and policy.

#### Scenario: Initial Contact visit
- **WHEN** either a guest or a logged-in customer opens Contact with both labels and SMS enabled and no matching saved choice
- **THEN** both unchecked controls appear beneath the names with no new heading and no phone field
- **AND** the customer can continue without checking either control, subject to the existing Contact requirements

#### Scenario: Only one channel is offered
- **WHEN** the email label is non-empty and SMS is disabled or its label is empty
- **THEN** only email consent appears
- **AND** when instead the email label is empty and SMS is enabled with a non-empty label, only SMS consent appears

#### Scenario: Settings do not offer consent
- **WHEN** settings are unavailable or neither channel meets its display conditions
- **THEN** no consent control appears
- **AND** the California Privacy Notice remains visible

#### Scenario: Administrator label contains a link
- **WHEN** a customer activates an HTML link in a displayed consent label
- **THEN** the link works without changing the checkbox choice merely because the link was activated

### Requirement: SMS alone conditionally requires a valid phone
Contact SHALL show the reusable international phone field only while the offered SMS checkbox is checked. It SHALL prevent Continue for an empty or invalid phone while SMS is checked, showing an associated validation error. Unchecking SMS SHALL hide the field, remove that validation requirement, and retain the canonical phone for re-checking; an unfinished invalid edit need not survive hiding. The field SHALL accept a valid number for any supported country without a country-availability notice, including a valid national number belonging to another country sharing the selected calling code without changing that selection.

#### Scenario: SMS checked without a valid number
- **WHEN** the customer checks SMS and attempts Continue with an empty or invalid number
- **THEN** Contact stays active and displays a phone validation error

#### Scenario: Customer declines SMS instead
- **WHEN** the customer unchecks SMS after entering a valid phone
- **THEN** the phone field hides and does not block Continue
- **AND** re-checking SMS restores the retained phone

#### Scenario: Valid non-US phone
- **WHEN** the customer checks SMS and supplies a valid phone for a selected non-US country
- **THEN** the phone requirement permits Continue and no country notice appears

### Requirement: Consent controls form a reusable component
The email/SMS checkboxes and conditional phone field SHALL be provided by a self-contained, reusable consent-form component, rather than embedded in the Contact organism. The component SHALL read the consent labels and offered channels from the backend settings itself, render the offered checkboxes and the conditional phone field, track phone validity and show the phone error. Its value SHALL be a two-way binding of `{ emailConsent, smsConsent, phone }`, and it SHALL expose a `validate()` operation that shows the phone error and reports the value invalid when offered SMS is checked without a valid phone. It SHALL NOT know about the checkout: browser storage, the email association, the persisted customer phone, checkout navigation and order submission SHALL stay in the checkout code. Contact SHALL keep its existing placement and Continue behavior while consuming that component. The component SHALL be reusable later on Order Success without adding that page's integration or submission behavior in this change.

#### Scenario: Contact consumes the reusable consent form
- **WHEN** Contact renders the consent block beneath the name fields
- **THEN** the separate form displays the checkboxes offered by the backend settings and the conditional phone field, and updates Contact's bound value on each customer edit
- **AND** Contact validates the form through `validate()` on Continue and retains saving, email association, customer-phone persistence and checkout navigation
- **AND** the California Privacy Notice remains visible outside the reusable block

#### Scenario: Form is validated with checked SMS and no valid phone
- **WHEN** `validate()` is called while offered SMS is checked and the phone is empty or invalid
- **THEN** the form shows the phone error and reports the value invalid

#### Scenario: Form is used outside checkout
- **WHEN** the form is rendered with a bound value outside the checkout
- **THEN** it reads no saved checkout selection and writes no browser storage or customer data

### Requirement: Saved choices belong to the confirmed Contact email
The storefront SHALL save `{ email, emailConsent, smsConsent, phone }` in localStorage when Contact successfully continues after its existing login or registration requirements. The selection SHALL be separate from checkout personal details. It SHALL survive subsequent steps and reload for the same Contact email, compared case-insensitively. A draft started without an email SHALL preserve its choices and phone through the first email entry and adopt that email when confirmed. A later different Contact email SHALL NOT inherit either checked choice or the retained phone. Unchecked SMS SHALL retain the last phone in the saved selection without authorizing its transmission. Restoring or changing a choice SHALL NOT itself send a marketing-consent request.

#### Scenario: Restore the same email after reload
- **WHEN** Contact was continued with a selection and the customer reloads and reopens checkout using the same email, including a case-only variation
- **THEN** the offered choices and retained phone are restored
- **AND** restoration sends no consent request

#### Scenario: Return from another step
- **WHEN** the customer returns to Contact after proceeding to Shipping, Billing or Review
- **THEN** the choices and phone remain available for the same Contact email

#### Scenario: Email changes during Contact or account confirmation
- **WHEN** the current Contact email differs from a non-empty email already associated with the customer's draft or saved selection
- **THEN** both choices are unchecked and the previous phone is not inherited by that email
- **AND** continuing stores only the choices made for the confirmed new email

#### Scenario: Guest makes a choice before entering an email
- **WHEN** a guest checks consent before any Contact email is entered and then types the first email, including its successive keystrokes
- **THEN** the choices and phone are not reset by that initial email entry
- **AND** they become associated with the first email confirmed by the existing Contact flow

#### Scenario: Save an unchecked SMS choice
- **WHEN** the customer continues with SMS unchecked after previously entering a phone for the same email
- **THEN** the saved selection retains that phone for re-checking but does not authorize SMS or phone transmission

### Requirement: Placed orders and logout clear the checkout selection
The storefront SHALL clear the in-memory and persisted consent selection after any placed order, including Express Checkout, and after logout. This cleanup SHALL apply even when Contact is not mounted. A failed order attempt SHALL retain the selection for retry. Clearing the selection SHALL NOT remove the consent data already included in the placed order or introduce separate Success-page consent state.

#### Scenario: Regular order succeeds
- **WHEN** an order containing consent is placed
- **THEN** the saved and live selections clear and a later checkout starts unchecked
- **AND** the existing placed-order confirmation retains the order payload including its payment extra fields

#### Scenario: Express order succeeds without Contact mounted
- **WHEN** a customer with a saved selection places an Express Checkout order without mounting Contact
- **THEN** the saved selection clears
- **AND** the new confirmation contains the Express order without consent

#### Scenario: Logout before ordering
- **WHEN** the customer logs out with a draft or saved selection
- **THEN** neither choice nor phone can be restored from that selection for the next checkout

#### Scenario: Order attempt fails
- **WHEN** order placement fails without an order-placed event
- **THEN** the selection remains available for retry

### Requirement: Contact SMS phone uses existing last-used customer data
On successful Contact continuation with offered SMS checked and a valid phone, the storefront SHALL save its E.164 value as the existing last-used customer phone. Existing Shipping and Billing behavior SHALL fill an empty phone from that value, allow customer edits, and preserve non-empty phone fields and existing address validation rules. A changed last-used phone SHALL participate in the existing customer-data-change detection and event reporting, as it does when an address form saves a phone; this event is expected and is not a consent submission. No separate Contact-phone fallback or prefill SHALL be added.

#### Scenario: Last-used phone changes
- **WHEN** Contact continues with SMS checked and a valid phone different from the stored customer phone
- **THEN** the last-used customer phone becomes the Contact E.164 number
- **AND** the normal customer-data-change detection emits its existing event
- **AND** no marketing-consent request is sent before order placement

#### Scenario: Address phone is empty or already populated
- **WHEN** Shipping or Billing performs its existing last-used-data prefill after Contact saved the SMS phone
- **THEN** an empty phone field receives the last-used phone, while a non-empty phone is unchanged
- **AND** the customer can edit the address phone without altering the saved SMS consent phone

#### Scenario: SMS is not selected
- **WHEN** Contact continues with SMS unchecked or not offered
- **THEN** it does not save the retained consent phone as the last-used phone

### Requirement: Only regular checkout builds an applicable consent payload
Only the regular checkout SHALL add `addressInformation.paymentExtraFields.budsies_marketing_consent` to an order. The object SHALL contain `email` only for an offered email checkbox and `sms` only for an offered SMS checkbox. Each SHALL be a boolean, true only for a choice made for the order's Contact email, compared case-insensitively. A missing or mismatched selection SHALL NOT authorize either channel. `phone` SHALL appear only with `sms: true` and SHALL contain the valid consent phone in E.164, not a later shipping or billing phone. When neither channel is offered the object SHALL be absent. Unrelated payment extra fields SHALL be preserved. Express Checkout and Bulk Orders SHALL NOT add the object even when a selection exists. Consent SHALL travel with the existing order request, not through a separate subscription request.

#### Scenario: Both offered channels declined
- **WHEN** a regular order is prepared with both channels offered and neither checked
- **THEN** its consent object is `{ "email": false, "sms": false }` without a phone

#### Scenario: Both channels accepted for the order email
- **WHEN** a regular order is prepared for the matching selection email with both offered channels checked and a valid SMS phone
- **THEN** its consent object contains `email: true`, `sms: true` and the E.164 consent phone
- **AND** a case-only difference between the emails does not cancel consent

#### Scenario: Order email does not match
- **WHEN** a regular order is prepared for a different email than its saved selection
- **THEN** the offered channel keys are false and no phone is sent

#### Scenario: A channel is not offered
- **WHEN** a regular order is prepared while one checkbox is unavailable
- **THEN** that channel key is absent even if its saved choice was true
- **AND** no phone is sent when SMS is unavailable
- **AND** if neither channel is available the consent object is absent

#### Scenario: SMS unchecked with a retained phone
- **WHEN** a regular order is prepared with SMS offered but unchecked and a retained phone
- **THEN** `sms` is false and `phone` is absent

#### Scenario: Express Checkout or Bulk Orders
- **WHEN** an Express Checkout or Bulk Orders order is prepared with a saved consent selection present
- **THEN** it contains no `budsies_marketing_consent` object

### Requirement: Storefront release respects Magento support
The storefront consent-payload change MUST be released only after Magento #37178 supports the extension attribute. Once that support is live, consent processing SHALL NOT add an order-placement failure condition; Magento's consent normalization SHALL remain authoritative for declining invalid consent without failing an otherwise valid order.

#### Scenario: Consent processing after backend deployment
- **WHEN** an otherwise valid order with consent reaches Magento #37178
- **THEN** Magento records or declines the consent without rejecting the order because of consent data
