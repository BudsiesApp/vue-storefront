# Tasks

## 1. Client Contracts and Mode Activation

- [x] 1.1 Restore `is_domestic` in the Rush add-on API interface, model, and factory conversion.
- [x] 1.2 Add the optional `WidgetOptions.isHolidayPeriod` contract and pass it only to the Production Time timeline without changing other widget props.

## 2. Holiday Delivery Location

- [x] 2.1 Implement an SSR-safe Holiday delivery-location composable using persisted shipping country, `detected_country` from request services, and configured default country in that order, including case-insensitive `US`, international countries, and reactive persisted-country updates.
- [x] 2.2 Add the US/international selector above Holiday Production Time options with a product-configuration-scoped manual override that does not mutate persisted shipping or checkout state.

## 3. Location and Phase Option Selection

- [x] 3.1 Adjust Production Time customization preparation to retain shared-SKU location variants needed for manual switching while preserving their original option-value IDs, SKUs, names, and prices.
- [x] 3.2 Derive Holiday-visible values and presentation metadata from matching `isDomestic` records after preparation removes records without available slots and retain the existing turnaround ordering.
- [x] 3.3 Reconcile a selected upgrade to Standard when the initial or manually changed location hides it while retaining valid restored selections.

## 4. Holiday Card Presentation

- [x] 4.1 Add the card's Holiday presentation using the API-provided `is_in_time_for_christmas` value, existing option price, and no duration, calculated ship date, or location qualifier.
- [x] 4.2 Show `Only {slotsLeft} holiday slots left` for finite Holiday inventory, keep `Always Available` for options without a finite count, and keep regular sold-out and slot behavior unchanged.
- [x] 4.3 Add the new customer-facing strings through the project i18n workflow and verify `yarn update-i18n-files` completes with the expected English translation entries.
- [x] 4.4 Apply the approved one-card and two-card responsive layouts for Holiday mode so the selector and every visible option remain readable and operable at the existing mobile and desktop breakpoints.

## 5. Verification

- [x] 5.1 Run `yarn type-check` and lint for all changed files and confirm that regular Standard/Rush/Super Rush ordering, fastest-available, sold-out, price, and selection behavior remain unchanged.
