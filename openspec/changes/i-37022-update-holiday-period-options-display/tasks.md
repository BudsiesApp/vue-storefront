# Tasks

## 1. Client Contracts and Mode Activation

- [ ] 1.1 Restore `is_domestic` in the Rush add-on API interface, model, and factory conversion, and verify focused unit tests accept numeric API values and produce booleans.
- [ ] 1.2 Add the optional `WidgetOptions.isHolidayPeriod` contract and pass it only to the Production Time timeline, and verify a component/composable test covers true, false, and absent values without changing other widget props.

## 2. Holiday Delivery Location

- [x] 2.1 Implement an SSR-safe Holiday delivery-location composable using persisted shipping country, `detected_country` from request services, and configured default country in that order, and verify unit tests cover each fallback, case-insensitive `US`, international countries, and reactive persisted-country updates.
- [ ] 2.2 Add the US/international selector above Holiday Production Time options with a product-configuration-scoped manual override, and verify component tests show it only in Holiday mode and confirm both choices update the selected location without mutating persisted shipping or checkout state.

## 3. Location and Phase Option Selection

- [ ] 3.1 Adjust Production Time customization preparation to retain all API-matched location variants needed for manual switching while preserving their original option-value IDs, SKUs, names, and prices, and verify helper tests cover domestic and international values plus the synthetic Standard value.
- [ ] 3.2 Derive Holiday-visible values from matching `isDomestic` records after preparation removes records without available slots, retain the existing turnaround ordering, and verify timeline tests cover both locations and available-option states.
- [ ] 3.3 Reconcile a selected upgrade to Standard when a location change hides it while retaining valid restored selections, and verify tests assert the emitted underlying option-value IDs for both retained and reset selections.

## 4. Holiday Card Presentation

- [ ] 4.1 Add the card's Holiday presentation using the API-provided `is_in_time_for_christmas` value, existing option price, and no duration, calculated ship date, or location qualifier, and verify component tests cover “In time for Christmas”, “After Christmas”, and unchanged regular-mode formatting.
- [ ] 4.2 Show `Only {slotsLeft} holiday slots left` for finite Holiday Rush inventory, omit slot text for Holiday Standard, and keep regular sold-out and slot behavior unchanged; verify focused card tests cover each case.
- [x] 4.3 Add the new customer-facing strings through the project i18n workflow and verify `yarn update-i18n-files` completes with the expected English translation entries.
- [ ] 4.4 Apply the approved one-card and two-card responsive layouts for Holiday mode and verify the selector and every visible option remain readable and operable at the existing mobile and desktop breakpoints.

## 5. Cart and Regression Verification

- [ ] 5.1 Add regression coverage proving cart items continue to render Magento's `shipment_promise_template` unchanged, including a location-specific Holiday template returned after estimated shipments are refreshed.
- [ ] 5.2 Run the focused Holiday and regular Production Time unit suites, `yarn type-check`, and lint for all changed files; verify they pass and that regular Standard/Rush/Super Rush ordering, fastest-available, sold-out, price, and selection behavior remain unchanged.
