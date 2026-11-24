# Spec Delta

## Purpose

Carry generic order payment extension data through the VSF API to Magento's place-order request without coupling the adapter to a particular business field.

## ADDED Requirements

### Requirement: VSF API forwards payment extra fields on every order route
The VSF API SHALL pass an order's `addressInformation.paymentExtraFields` unchanged as `paymentMethod.extension_attributes` in the Magento place-order call. This SHALL apply to authenticated customer `PUT /V1/carts/mine/order`, guest `PUT /V1/guest-carts/:cartId/order` and admin `PUT /V1/carts/:cartId/order` requests. It SHALL remain generic, without interpreting, normalizing or adding `budsies_marketing_consent` or any other business-specific key, and SHALL preserve the existing payment method and additional data.

#### Scenario: Authenticated customer order
- **WHEN** an authenticated order includes a payment extra-fields object
- **THEN** the mine-order request contains that unchanged object under `paymentMethod.extension_attributes`
- **AND** payment method and additional data retain their existing values

#### Scenario: Guest order
- **WHEN** a guest order includes a payment extra-fields object
- **THEN** the guest-cart order request contains that unchanged object under `paymentMethod.extension_attributes`

#### Scenario: Admin order
- **WHEN** an admin order includes a payment extra-fields object
- **THEN** the admin cart-order request contains that unchanged object under `paymentMethod.extension_attributes`

### Requirement: Orders without extra fields retain the old Magento request
An order without `addressInformation.paymentExtraFields` SHALL produce the same Magento payment request as before this change, with no new `extension_attributes` property. The generic forwarding change SHALL be independently deployable without storefront consent or Magento #37178 being live.

#### Scenario: Existing order shape on every route
- **WHEN** an authenticated, guest or admin order has no payment extra fields
- **THEN** its Magento order body contains the existing payment method and additional data only
- **AND** the adapter does not add an empty consent or extension-attributes object
