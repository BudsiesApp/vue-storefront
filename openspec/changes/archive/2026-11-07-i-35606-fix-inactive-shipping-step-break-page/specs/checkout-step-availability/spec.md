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

#### Scenario: Checkout continues after a virtuality change
- **WHEN** Checkout has returned to Contact after a cart virtuality change
- **AND** the customer submits Contact
- **THEN** Checkout activates the next available step

### Requirement: URL hash cannot activate an unavailable step
Checkout SHALL NOT activate a step named by the URL hash when that step is not available. It SHALL activate Contact instead and replace the current history entry so the hash identifies Contact.

#### Scenario: Browser Back restores an unavailable Shipping hash
- **WHEN** Checkout returned to Contact because the cart became virtual-only
- **AND** the customer presses the browser Back button to an entry whose hash identifies Shipping
- **THEN** Shipping remains absent from the available steps
- **AND** Contact remains the active step
- **AND** the URL hash identifies Contact
- **AND** the customer can continue Checkout from Contact

### Requirement: Section activation preserves the Checkout URL
Checkout SHALL change only the URL hash when it activates a section, keeping the path and query string and without requesting a new document.

#### Scenario: Virtuality change on a Checkout URL with query parameters
- **WHEN** Checkout was opened through client-side navigation at a URL with a query string
- **AND** a cart update from another tab changes cart virtuality
- **THEN** the URL keeps its path and query string and its hash identifies Contact
- **AND** no document request is made
- **AND** Checkout remains open with Contact active

### Requirement: Checkout URL identifies the active step
Checkout SHALL identify Contact in the URL hash when it opens, without adding a history entry. The cart SHALL NOT keep a Checkout section hash after Checkout redirects a document request to it.

#### Scenario: Customer opens Checkout from the cart
- **WHEN** the customer opens Checkout from the cart
- **THEN** Contact is active and the URL hash identifies Contact
- **AND** pressing the browser Back button returns to the cart

#### Scenario: Customer reloads Checkout
- **WHEN** the customer reloads Checkout while its URL hash identifies a section
- **THEN** the customer lands on the cart
- **AND** the cart URL has no Checkout section hash

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
