# Proposal

## Why

Budsies Order History currently shows an exact estimated shipment date for holiday-linked items instead of their holiday delivery promise. Magento now supplies each item's holiday name, allowing the storefront to present that promise without calculating eligibility itself.

## What Changes

- Replace the whole estimated-shipment-date line with translated `In time for {holidayName}` when the item's own API holiday name is non-empty and `orderHistory.displayHolidayPromise` is exactly `true`.
- Preserve the existing shipment-section and estimate visibility rules, actual shipment dates, tracking, and available actions. Nonholiday items and configurations with the option off or absent keep the existing localized estimate.
- Add the per-brand `ORDER_HISTORY_DISPLAY_HOLIDAY_PROMISE` option to `config/local.json.template`, Docker Compose, `.env.example`, and build CI, defaulting repository-managed environments to `false`. Leave `config/default.json` unchanged.
- Add the placeholder-based translation to the shared theme; do not hardcode Christmas or translate the API-supplied name.
- Keep a still-unshipped item's otherwise visible promise after the holiday has passed while the API still supplies its name; do not add frontend expiry or missed-promise wording (D9).

## Capabilities

### New Capabilities

- `order-history-holiday-delivery-promise`: Item-specific holiday promise presentation in Order History, preserving existing shipment behavior and controlled through per-brand configuration.

### Modified Capabilities

None. Existing cart promises, production-time options, photo upload, and reorder requirements remain unchanged.

## Impact

- App: `src/modules/orders-history/types/order-item-extension-attributes.ts`, `components/order-item-extended-info.vue`, `components/order-item-shipment-info.vue`, and focused unit tests in that module.
- Configuration: `config/local.json.template`, `docker-compose.yml`, `.env.example`, `.github/workflows/test_vsf1.yml`.
- Theme submodule (`src/themes/petsies-capybara`, repository `vsf-capybara`): `resource/i18n/en-US.csv`; app and theme changes target the existing `petsies-theme`-based task branches.
- Magento #37191 and the VSF API are read-only dependencies, not changed repositories: both order endpoints already carry the optional `extension_attributes.shipping_holiday_name` unchanged.
- Release prerequisite outside this repository: every deployment must supply the new boolean environment variable before building the unquoted template; only Budsies enables it in production. Per D10, end-to-end verification instead uses the local Petsies storefront with the option on and then off; this is testing only, not another-brand rollout. Other-brand production rollout, email templates, eligibility calculation, scheduling, and production verification are out of scope.
