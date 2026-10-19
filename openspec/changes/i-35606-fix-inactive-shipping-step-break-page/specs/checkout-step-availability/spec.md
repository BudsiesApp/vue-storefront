# Spec Delta

## Purpose

Checkout keeps its visible cart and active navigation step consistent when cart contents change during an open session, including changes made in another browser tab.

## ADDED Requirements

### Requirement: Active Checkout step remains available after cart changes
Checkout SHALL activate Contact and update the URL hash to identify Contact whenever the cart changes between virtual-only and non-virtual contents, regardless of the previously active step.

#### Scenario: Shipping disappears while active
- **WHEN** Checkout is on Shipping and a cart update from another tab makes the cart virtual-only
- **THEN** Shipping is removed from the available steps
- **AND** Contact becomes the active step
- **AND** the URL hash identifies Contact

#### Scenario: Shipping reappears while Payment is active
- **WHEN** Checkout is on Payment for a virtual-only cart and a cart update from another tab adds a physical item
- **THEN** Shipping appears in the available steps
- **AND** Contact becomes the active step
- **AND** the URL hash identifies Contact, allowing the customer to review the newly required shipping step

### Requirement: Checkout renders synchronized cart contents across step changes
Checkout SHALL display the latest synchronized cart items when cart virtuality changes, including while it reconciles an unavailable active step.

#### Scenario: Physical cart becomes virtual-only
- **WHEN** another tab replaces a physical cart with virtual-only items while Checkout is on Shipping
- **THEN** Checkout displays the replacement virtual items without a render failure

#### Scenario: Virtual-only cart gains a physical item
- **WHEN** another tab replaces a virtual-only cart with a cart containing a physical item while Checkout is on Payment
- **THEN** Checkout displays the replacement cart items without a render failure

### Requirement: Unavailable step does not break Checkout rendering
Checkout SHALL render safely while an active step has no match in the available steps.

#### Scenario: Review-step status is evaluated during a transient mismatch
- **WHEN** the active step is temporarily absent from the available steps during a cart update
- **THEN** Checkout does not treat that step as Review
- **AND** the page continues rendering until a valid step is active
