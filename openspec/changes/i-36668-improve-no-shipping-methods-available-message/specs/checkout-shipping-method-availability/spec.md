## ADDED Requirements

### Requirement: Shipping-method synchronization exposes an error state
The storefront SHALL retain the existing shipping-method synchronization flag and SHALL expose whether the most recent shipping-method synchronization failed.

#### Scenario: Synchronization starts
- **WHEN** checkout starts synchronizing shipping methods
- **THEN** the synchronization flag is active
- **AND** the synchronization-error flag is cleared

#### Scenario: Synchronization fails
- **WHEN** a shipping-method synchronization returns an unsuccessful result or throws an error
- **THEN** the synchronization-error flag is active
- **AND** backend-sourced shipping methods and the selected shipping carrier and method are cleared

#### Scenario: Synchronization succeeds
- **WHEN** a shipping-method synchronization completes successfully
- **THEN** the synchronization-error flag is inactive

### Requirement: Shipping methods display the applicable lookup result
The `o-shipping` component SHALL display exactly one of the loading, error, empty, or available-method states according to the synchronization flags and shipping-method list.

#### Scenario: Shipping methods are loading
- **WHEN** the shipping-method synchronization flag is active
- **THEN** `o-shipping` displays a visible loading indicator
- **AND** it does not display the error or no-methods-available message

#### Scenario: Shipping-method synchronization has failed
- **WHEN** the synchronization-error flag is active and shipping methods are not loading
- **THEN** `o-shipping` displays `Error while loading shipping methods`
- **AND** it displays a localized compact Retry control
- **AND** it disables Continue to payment
- **AND** it does not display the no-methods-available message

#### Scenario: No shipping methods are available
- **WHEN** shipping methods are not loading, the synchronization-error flag is inactive, and the shipping-method list is empty
- **THEN** `o-shipping` displays `No shipping methods are available for this address.`

#### Scenario: Shipping methods are available
- **WHEN** shipping methods are not loading, the synchronization-error flag is inactive, and the shipping-method list contains one or more methods
- **THEN** `o-shipping` retains its existing shipping-method rendering
- **AND** it does not display loading, error, or no-methods-available feedback

### Requirement: Customers can retry failed shipping-method lookups
The storefront SHALL let customers retry a failed shipping-method lookup for the address displayed in the shipping form without advancing checkout.

#### Scenario: Customer retries a failed lookup
- **WHEN** a customer activates Retry after a shipping-method synchronization failure
- **THEN** the storefront starts a forced shipping-method synchronization for the address displayed in the shipping form
- **AND** `o-shipping` displays its loading indicator while that synchronization is active
- **AND** checkout does not advance

#### Scenario: Retried lookup fails
- **WHEN** a retried shipping-method synchronization fails
- **THEN** `o-shipping` displays the error feedback and compact Retry control again

#### Scenario: Retried lookup succeeds
- **WHEN** a retried shipping-method synchronization succeeds
- **THEN** `o-shipping` displays the returned shipping methods, or the no-methods-available message when none are returned
- **AND** checkout does not advance

### Requirement: Shipping-method lookups use the displayed address
Every shipping-method lookup started from the shipping step SHALL use the address currently displayed in the shipping form.

#### Scenario: Guest edits the address and retries
- **WHEN** a guest changes the ZIP/postcode or street after a failed lookup and activates Retry
- **THEN** the lookup uses the displayed ZIP/postcode and street

#### Scenario: Signed-in customer ships to the default address and retries
- **WHEN** a signed-in customer ships to their default address and activates Retry after a failed lookup
- **THEN** the lookup uses the displayed default address

#### Scenario: Customer changes the ZIP/postcode
- **WHEN** a customer changes the ZIP/postcode and leaves the field
- **THEN** the lookup uses the displayed ZIP/postcode

#### Scenario: Customer changes the country
- **WHEN** a customer changes the country
- **THEN** the lookup uses the displayed country and the remaining displayed address fields

### Requirement: The latest lookup controls shipping-method state
The storefront SHALL display the methods, selection, error, and loading state of the most recently started shipping-method lookup.

#### Scenario: An earlier lookup finishes last
- **WHEN** two lookups overlap and the earlier one completes after the later one
- **THEN** the displayed methods, selection, and error state reflect the later lookup

#### Scenario: An earlier lookup finishes first
- **WHEN** two lookups overlap and the earlier one completes while the later one is pending
- **THEN** the loading indicator remains visible
- **AND** Continue to payment remains disabled

### Requirement: Continue to payment confirms shipping methods for the submitted address
Checkout SHALL advance from the shipping step only after a shipping-method lookup for the submitted address succeeds and the selected shipping method is available.

#### Scenario: Lookup succeeds with the selected method
- **WHEN** a customer activates Continue to payment and the lookup returns the selected shipping method
- **THEN** checkout advances to payment

#### Scenario: Lookup fails
- **WHEN** a customer activates Continue to payment and the lookup fails
- **THEN** checkout stays on the shipping step
- **AND** `o-shipping` displays the error feedback and compact Retry control

#### Scenario: Lookup returns no methods
- **WHEN** a customer activates Continue to payment and the lookup returns no shipping methods
- **THEN** checkout stays on the shipping step
- **AND** `o-shipping` displays `No shipping methods are available for this address.`

#### Scenario: Selected method is no longer available
- **WHEN** a customer activates Continue to payment and the lookup no longer returns the selected shipping method
- **THEN** checkout stays on the shipping step
- **AND** `o-shipping` displays the updated shipping methods

#### Scenario: Address changes while the final lookup is pending
- **WHEN** a customer has activated Continue to payment and the shipping-method lookup for the submitted address is pending
- **THEN** the shipping address fields and the default-address option cannot be changed
- **AND** checkout advances only if the displayed address still equals the address that lookup checked

#### Scenario: Submission is in progress
- **WHEN** a customer has activated Continue to payment and checkout has neither advanced nor stopped on the shipping step
- **THEN** Continue to payment is disabled for the whole submission, including form and address validation and the totals synchronization that follows the shipping-method lookup
- **AND** activating it again does not start another submission

### Requirement: Order placement requires a valid shipping method
On the order-review step of a cart with physical items, checkout SHALL NOT initiate payment or order placement unless shipping-method synchronization is neither pending nor failed and the selected shipping carrier and method are among the available shipping methods. Virtual carts SHALL keep their existing order-placement behavior.

#### Scenario: Lookup on the review step fails
- **WHEN** a shipping-method lookup started on the order-review step (for example by applying a coupon) fails and coupon, payment-method, and totals synchronization have finished
- **THEN** the place-order button and the PayPal button are disabled
- **AND** activating order placement does not initiate payment or emit order placement
- **AND** the review step explains that the selected shipping method is no longer available and offers to edit shipping

#### Scenario: Lookup on the review step returns no methods
- **WHEN** a shipping-method lookup started on the order-review step returns no shipping methods
- **THEN** the place-order button and the PayPal button are disabled
- **AND** the review step explains that the selected shipping method is no longer available and offers to edit shipping

#### Scenario: Lookup on the review step is pending
- **WHEN** a shipping-method lookup is pending on the order-review step
- **THEN** the place-order button and the PayPal button are disabled

#### Scenario: Payment completes after the shipping method became invalid
- **WHEN** a payment component reports success while the shipping method is not valid
- **THEN** order placement is not emitted
- **AND** the place-order controls leave the in-progress state

#### Scenario: Valid shipping method
- **WHEN** shipping-method synchronization is neither pending nor failed and the selected shipping method is available
- **THEN** order placement follows its existing conditions

#### Scenario: Virtual cart
- **WHEN** the cart contains only virtual items
- **THEN** order placement does not depend on shipping-method state
