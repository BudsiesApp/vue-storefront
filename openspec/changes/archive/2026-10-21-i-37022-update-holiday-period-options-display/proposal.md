# Proposal

## Why

Normal production durations and calculated ship dates are unreliable during the Christmas production period. The storefront needs a location-aware Holiday presentation that communicates whether each available option is expected in time for Christmas without changing normal Production Time behavior.

## What Changes

- Add a Holiday Period mode to the Production Time timeline, activated by a new optional value in `WidgetOptions`.
- Restore `isDomestic` in the Rush add-on client contract and use it to show only the Rush option applicable to the selected US or international location.
- Resolve the initial location from the previously selected shipping country, then the `detected_country` cookie, then the configured default country, and allow the customer to switch between US and international delivery.
- In Holiday Period mode, replace duration and ship-date text with “In time for Christmas” or “After Christmas”, hide unavailable options and Super Rush, and show the Holiday Rush slot message as “Only {count} holiday slots left”.
- Preserve Standard as the default for a new configuration, retain a valid saved selection, and leave the existing Production Time display unchanged outside Holiday Period mode.
- Continue rendering Magento's location-specific `shipment_promise_template` on cart items without client-side reconstruction.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `production-time-option-presentation`: Add location-aware Holiday Period option filtering, promise presentation, location selection, and Holiday slot messaging while preserving regular-mode and cart-promise behavior.

## Impact

- Rush add-on API response parsing and client model.
- Production Time customization data preparation and timeline/card presentation.
- Location resolution using persisted customer data, request cookies, and the configured default country.
- Production Time option preparation, responsive Holiday states, and unchanged cart promise behavior.
- Assumes the API returns `isDomestic` for Rush add-ons and Magento continues to provide the cart item's resolved shipment promise.
