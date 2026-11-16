# Spec Delta

## Purpose

Defines when the storefront may replace a server cart during synchronization and how it preserves an existing cart when a pull fails.

## ADDED Requirements

### Requirement: Preserve an existing cart when its pull fails without confirming absence

When a cart pull returns a response other than 200 or 404, the storefront MUST retain the stored cart reference and local items, MUST NOT create a replacement customer or guest cart because of that response, and MUST NOT record the pull as a successful synchronization. A later eligible synchronization MUST be able to attempt another pull with the current customer context or guest cart reference.

#### Scenario: Authenticated customer's cart pull fails

- **WHEN** an authenticated customer's cart pull returns an error other than 404
- **THEN** the storefront retains the stored cart reference and local items
- **THEN** the storefront does not request customer or guest cart creation as recovery from that error
- **THEN** a later eligible synchronization can attempt another pull of the customer's active cart

#### Scenario: Guest cart pull fails

- **WHEN** a guest's existing cart pull returns an error other than 404
- **THEN** the storefront retains the current cart reference and local items
- **THEN** the storefront does not request a replacement cart because of that error
- **THEN** a later eligible synchronization can attempt another pull using the stored guest cart reference

### Requirement: Preserve successful and missing-cart synchronization paths

The storefront SHALL reconcile cart contents after a successful pull. When a pull returns 404, the storefront SHALL use its existing cart initialization flow.

#### Scenario: Existing cart pulls successfully

- **WHEN** a cart pull succeeds
- **THEN** the storefront reconciles the returned cart contents with the local cart

#### Scenario: Pull returns 404

- **WHEN** a cart pull returns 404
- **THEN** the storefront clears the previous cart connection and follows its existing cart initialization flow
