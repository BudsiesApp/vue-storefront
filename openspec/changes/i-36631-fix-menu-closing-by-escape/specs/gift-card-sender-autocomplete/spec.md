# Spec Delta

## Purpose

Identifies the input purpose of the gift card Sender name field, so browsers and assistive technologies can autofill the purchaser's name.

## ADDED Requirements

### Requirement: Sender name field declares the name autofill purpose
The Sender name input on the gift card order form SHALL expose `autocomplete="name"` on the native input element.

#### Scenario: Gift card form is rendered
- **WHEN** a customer opens the gift card page
- **THEN** the Sender name input (`name="customer_name"`) has the attribute `autocomplete="name"`

### Requirement: Recipient fields keep their current autofill behavior
The gift card recipient fields SHALL NOT receive new `autocomplete` attributes from this change, because they collect a third party's data rather than the customer's own.

#### Scenario: Recipient inputs are rendered
- **WHEN** a customer opens the gift card page
- **THEN** the recipient name and recipient email inputs render with the same attributes as before this change
