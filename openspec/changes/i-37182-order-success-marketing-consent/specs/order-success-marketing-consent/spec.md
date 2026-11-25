# Order Success Marketing Consent Delta

## Purpose

Offer customers the marketing channels not already accepted with their placed order, including a first consent point after Express Checkout.

## ADDED Requirements

### Requirement: Success offers only remaining order channels
After a regular or Express Checkout order, the Petsies Success page SHALL show the subscription form below "You'll receive your confirmation email soon!" and above the numbered sections. It SHALL offer only channels currently offered by marketing settings that were not already accepted in the placed order's `addressInformation.paymentExtraFields.budsies_marketing_consent`. Only a key strictly equal to `true` SHALL mean that channel was accepted; a missing consent object or key SHALL mean not accepted. Both choices SHALL initially be unchecked. Email SHALL require a non-empty administrator email label; SMS SHALL require SMS enabled and a non-empty administrator SMS label. Labels SHALL render as trusted HTML with working links. No form SHALL render without an order id, without the order email, or without a remaining channel. The form SHALL NOT read or restore the cleared checkout selection or persist another Success-page selection.

#### Scenario: Regular order without accepted channels
- **WHEN** a regular order has email and SMS false and both channels are offered
- **THEN** both unchecked channels appear at the specified Success-page position

#### Scenario: One channel already accepted
- **WHEN** the placed order has email true and SMS false or absent
- **THEN** only the currently offered SMS channel appears, with its phone field
- **AND** with SMS true and email false or absent, only the currently offered email channel appears, without a phone field

#### Scenario: Express Checkout order
- **WHEN** an Express Checkout order has no consent object
- **THEN** every currently offered channel appears unchecked, regardless of any previous checkout selection

#### Scenario: Nothing eligible to render
- **WHEN** all offered channels were already accepted, settings offer neither channel, or the order id or email is missing
- **THEN** the subscription form does not render

#### Scenario: SMS unavailable or unlabelled
- **WHEN** SMS is disabled or its label is empty or whitespace-only
- **THEN** neither the SMS checkbox nor the phone field appears
- **AND** the email checkbox appears only if its label is non-empty and the order has not accepted it

### Requirement: Form presents the order identity and billing phone
The form SHALL present, in order, "Get The Latest Deals & Updates", "Sign up for early access to sales, updates on products and holiday deadlines.", "We'll send emails to {email}.", the remaining checkboxes, the phone field when SMS is displayed, "Subscribe", and the California Privacy Notice links. The email SHALL be read-only text from the placed order, not an editable field. The phone SHALL be visible whenever SMS is displayed, even when unchecked, and SHALL prefill only from the placed order's billing telephone. A valid prefill SHALL normalize to E.164 without requiring an edit. An unparseable prefill SHALL remain displayed, editable and invalid. The form SHALL use the existing Privacy Policy Links content contributions. New text SHALL be localizable. The form SHALL use an uncolored background, an order-item-style border, and centered heading, description and acknowledgment. Subscribe SHALL use primary styling, be right-aligned on desktop and full-width on mobile, with a visibly distinct disabled state and no horizontal overflow.

#### Scenario: SMS offered with billing phone
- **WHEN** a customer reaches Success with SMS eligible and a formatted valid billing phone
- **THEN** the phone is visible while SMS is unchecked and displays the billing phone in the international phone control
- **AND** checking SMS can submit its E.164 value without editing the prefill

#### Scenario: Invalid billing phone
- **WHEN** the billing telephone cannot be parsed
- **THEN** its text remains editable and the phone has invalid validity
- **AND** selecting SMS and submitting shows a phone error until it is corrected

#### Scenario: Order email cannot change
- **WHEN** the form appears on desktop or mobile
- **THEN** it displays the placed order email as text, the specified content order and the California Privacy Notice links, without an email input

### Requirement: Subscribe validates and transmits only applicable choices
Subscribe SHALL be disabled when no displayed checkbox is checked or a request is in progress. Submission in either condition SHALL send nothing and SHALL NOT show a no-selection validation error. With SMS checked, submission SHALL require a valid phone and show the associated phone error without sending a request for an empty or invalid phone; native browser validation SHALL NOT prevent that custom validation from running. With SMS unchecked or hidden, phone validity SHALL NOT block submission and phone SHALL NOT be transmitted. A request SHALL preserve the Magento order id from the confirmation as a positive integer number or canonical positive decimal string, and contain the order email, an explicit boolean choice for each displayed channel only (`emailConsent`, `smsConsent`), and `phone` in E.164 only when SMS is checked. It SHALL use the new marketing-subscription endpoint without adding a customer-token parameter. During the request the checkboxes, phone controls and button SHALL be disabled. The request store SHALL correspond to the order's Magento store for Petsies and for Budsies when the shared form is mounted there.

#### Scenario: No selection or pending request
- **WHEN** neither shown checkbox is checked, or a subscription request is already pending
- **THEN** Subscribe is disabled and repeated submit attempts send nothing
- **AND** while pending the checkboxes and phone controls are disabled

#### Scenario: Checked SMS requires a valid phone
- **WHEN** SMS is checked and the customer activates Subscribe with an empty or invalid phone
- **THEN** the form's associated phone error appears and the phone receives focus, without native browser validation intercepting the form submission
- **AND** no request is sent

#### Scenario: Magento confirmation supplies a string id
- **WHEN** the placed-order confirmation contains `magentoOrderId: "123"` and the customer submits valid consent
- **THEN** the form accepts that id and sends `orderId: "123"` to the API without coercion

#### Scenario: Email-only subscription with invalid retained phone
- **WHEN** both channels are shown, email alone is checked and the phone is invalid
- **THEN** the request contains `emailConsent: true`, `smsConsent: false`, the order id and email, and no phone

#### Scenario: Hidden choices are omitted
- **WHEN** email was accepted with the order and the customer checks the remaining SMS channel with a valid non-US phone
- **THEN** the request contains `smsConsent: true` and the E.164 phone, and omits `emailConsent`
- **AND** when instead SMS was already accepted, an email request omits both `smsConsent` and `phone`

### Requirement: Subscription response controls acknowledgment and retry
A successful result code of `200`, regardless of its result value, SHALL replace the editable form with "Thank you! Your subscription preferences have been saved.". A failed request SHALL show the existing "Something went wrong" error notification, preserve the form's choices and editable phone, and re-enable its controls for retry. Reloading Success SHALL NOT cause a new error or automatic consent submission; restoring the Success page or form after reload is not required.

#### Scenario: Backend acknowledges the request
- **WHEN** the subscription response has result code `200`, including a false result
- **THEN** the success message replaces the editable form and no second submission is offered

#### Scenario: Backend or transport fails
- **WHEN** submission rejects or returns a non-200 result code
- **THEN** "Something went wrong" is notified and the same form values remain available for retry

#### Scenario: Page reload
- **WHEN** the customer reloads after reaching Success
- **THEN** the new feature produces no error and no automatic subscription request, without requiring the previous form to be restored
