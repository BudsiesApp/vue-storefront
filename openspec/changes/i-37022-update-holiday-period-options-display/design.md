# Design

## Context

See [proposal.md](./proposal.md) for motivation. Production Time option values are prepared by `updateProductProductionTimeCustomizationData`, while Rush metadata is loaded into the Budsies Vuex module and joined to option values by SKU. The timeline widget then derives ordering, availability, and card data; the card currently derives duration and ship date from `turnaroundTime`.

The raw Rush response previously exposed `isDomestic`, and the client previously filtered upgrades by a supplied shipping country. That field and filtering were removed during the timeline redesign. The current request services can read `detected_country` during SSR and in the browser, and persisted customer data already exposes the last shipping country. Cart items independently render Magento's `shipment_promise_template`.

This design assumes that, during Holiday Period mode, the API returns the location variants needed for the three phases, each tagged with `isDomestic`. This includes the location-appropriate Standard representation as well as Rush upgrades. API `is_in_time_for_christmas` is the source of the Christmas promise; Rush API text remains the option name.

## Goals / Non-Goals

**Goals:**

- Keep Holiday location resolution SSR-safe and reactive to persisted customer data.
- Keep both location variants available in client state so a manual location change does not require another API request.
- Separate location/phase filtering from normal Production Time rendering.
- Preserve the actual option-value identity and price used by customization and checkout.

**Non-Goals:**

- Applying the operational minimum to Holiday Rush slot inventory; the client displays the API-provided customer-facing count.
- Sending the product-page location selector to Magento or replacing the checkout shipping address as the order's source of truth.
- Rebuilding the cart shipment promise on the client.
- Changing Magento or MakerWare in this repository.

## Decisions

### Activate Holiday rendering with an optional widget flag

Add `isHolidayPeriod?: boolean` to `WidgetOptions` and pass it to the Production Time timeline as an explicit prop. An absent or false value selects the existing presentation, making activation a data/configuration change and preserving current products by default.

An alternative is to infer Holiday mode from option text, SKUs, or dates. Those signals are fragile and would duplicate Magento's ownership of Holiday timing.

### Restore location metadata without changing option identity

Add numeric `is_domestic` to `RushAddonApiResponse` and normalize it to a boolean `RushAddon.isDomestic` property in the factory. Likewise, normalize optional `is_in_time_for_christmas` to `RushAddon.isInTimeForChristmas`. Continue identifying non-Standard upgrades by SKU and matching them to the existing customization option values. Domestic and international Holiday records may share a SKU; `isDomestic` distinguishes their presentation metadata without changing the underlying option-value identity.

The client will retain every returned Holiday location variant rather than collapsing them or creating domestic/international field groups. Customization preparation uses SKU membership only to retain the original option value and does not copy text from an arbitrary location variant. The selected location filters Rush records before the widget builds its SKU dictionary, resolves the applicable Standard record, and applies the location-specific text and terms. This avoids duplicate option values and ensures a visible Rush card still submits its original option-value ID.

An alternative is one Rush object containing parallel domestic and international fields. That duplicates most of the Rush contract and makes selection identity ambiguous when the variants use different products.

### Resolve location in a focused composable

Create a Holiday delivery-location composable used by the timeline widget. It will derive the automatic location in this order:

1. `persisted-customer-data` shipping country;
2. `detected_country` through `useRequestServices().getCookie()`;
3. the current store view's configured default country.

Country code `US` maps to domestic; every other country maps to international. A component-owned manual override takes precedence after the customer uses the selector and lasts for the current product configuration. It will not overwrite the persisted shipping country because “international” is a category, not a real country, and it will not update quote or checkout state.

Using request services instead of reading `document.cookie` keeps server and browser access behind the established application boundary. A process-global reactive value was rejected because it could leak state across SSR requests.

### Filter and reconcile the visible selection in the timeline

Keep all API-matched option values with available slots in the prepared customization. Multiple Holiday records may therefore retain one shared option value when they use the same SKU. In Holiday mode, the timeline derives its visible list and presentation metadata from location-matching Rush records and uses the existing turnaround ordering. Standard is resolved from the matching location record.

Keeping the original values is required for immediate manual switching; destructively filtering them while preparing the product would make the other location impossible to restore. When a location switch hides the selected upgrade, the widget emits Standard as the replacement. Valid restored selections remain untouched.

Outside Holiday mode, the current sorting, sold-out display, fastest-available calculation, and selection behavior remain on the existing path.

### Give the card a mode-specific presentation

Pass Holiday mode and the API `is_in_time_for_christmas` value into the card. In regular mode, retain duration and calculated ship date. In Holiday mode, render the corresponding localized promise; omit duration, ship date, and location qualifiers. Continue deriving price from the customization option value.

For an available Holiday Rush record with a finite count, show the localized message `Only {slotsLeft} holiday slots left`. Do not show a slot message for Standard. An option with zero slots is excluded by the timeline instead of rendered as sold out.

An alternative is a separate Holiday card component. The card structure, icon, price, and selection treatment remain shared, so a mode branch avoids duplicating most of the component and responsive styles.

### Leave cart promise rendering unchanged

`cart-item-shipment-promise` will continue to render Magento's `shipment_promise_template`. Checkout shipping submission already refreshes estimated shipments, so the client must not derive the cart promise from the product-page manual override or Holiday card labels.

## Risks / Trade-offs

- [Holiday Standard is not tagged per location by the API] → Confirm the API contract supplies a location-tagged Standard representation before activating `isHolidayPeriod`; otherwise the client cannot select the correct simultaneous Standard promise.
- [The client deploys before `isDomestic` is present] → Deploy the compatible API response first, then the client, and enable the widget flag last.
- [Persisted shipping country loads after the first render] → Keep automatic location reactive; the widget updates when synchronization completes, while request-cookie/default resolution provides an SSR-safe initial value.
- [A manual location switch hides the current Rush selection] → Reconcile to Standard immediately so hidden data cannot remain selected or be submitted.
- [Malformed API data provides multiple matching Holiday Rush records] → Apply deterministic ordering and display only the first applicable Rush record while reporting the contract violation through existing client error reporting if available.
- [Holiday-specific branches alter regular behavior] → Gate all new filtering and card formatting behind `isHolidayPeriod` so regular mode stays on its existing path.

## Migration Plan

1. Deploy the API response that includes location-tagged Holiday records and `isDomestic`.
2. Deploy the client support with Holiday mode disabled by default.
3. Populate `displayWidgetOptions.isHolidayPeriod` for Production Time customizations that participate in the Holiday period.
4. Roll back presentation independently by removing or disabling the widget flag; regular-mode rendering remains available.
