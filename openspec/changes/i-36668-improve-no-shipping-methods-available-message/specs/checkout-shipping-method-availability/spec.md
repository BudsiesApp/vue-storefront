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
- **AND** it does not display the no-methods-available message

#### Scenario: No shipping methods are available
- **WHEN** shipping methods are not loading, the synchronization-error flag is inactive, and the shipping-method list is empty
- **THEN** `o-shipping` displays `No shipping methods are available for this address.`

#### Scenario: Shipping methods are available
- **WHEN** shipping methods are not loading, the synchronization-error flag is inactive, and the shipping-method list contains one or more methods
- **THEN** `o-shipping` retains its existing shipping-method rendering
- **AND** it does not display loading, error, or no-methods-available feedback
