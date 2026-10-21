# Proposal

## Why

#37129: Customers need the offer's actual deadline in their local timezone. Magento #37128 supplies the complete UTC timestamp.

## What Changes

Format `offer_expiration_date` with native Intl in the shared composable. Show local date, year, time, and a short timezone label in the existing translated message.

## Capabilities

### New Capabilities

- `cart-offer-deadline-presentation`: Browser-local offer deadline display.

### Modified Capabilities

None.

## Impact

Update `useEstimatedShipment`, its nullable field type, and one composable test. Both cart consumers inherit the change. Deploy after Magento #37128; shipment promises and eligibility remain unchanged.
