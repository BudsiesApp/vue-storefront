# Proposal

## Why

VSF installation currently depends on a live GitPkg service to extract Storefront UI packages. Redmine [#37220](https://redmine.gorbunov.studio/issues/37220) replaces that service with prepared, traceable GitHub release assets without upgrading the library or changing storefront behavior.

## What Changes

- Replace direct shared/Vue dependency URLs and their Yarn 4 lock entries with the assets published by `BudsiesApp/storefront-ui`.
- Resolve Vue's indirect shared dependency to the same shared asset as the application.
- Apply the transport migration to both maintained app lines, `petsies-theme` and `bulkorders-theme`, without changing their intentional differences.
- Preserve source compilation, existing component/style/deep imports, package identities, and all five maintained brand combinations.
- Document dependency updates, provenance/checksum inspection, and historical asset retention.

## Capabilities

### New Capabilities

- `storefront-ui-package-consumption`: immutable installation and normal application compilation of prepared Storefront UI release packages across maintained brands.

### Modified Capabilities

None. Existing Vue runtime and cross-repository CI-selection requirements remain unchanged.

## Impact

`package.json`, `yarn.lock`, focused dependency-contract checks and maintenance documentation in `BudsiesApp/vue-storefront`. Companion publication changes live in `BudsiesApp/storefront-ui`; the API/Amazon Pay migration has separate changes under the same OpenSpec change name. CI consumes unchanged `BudsiesApp/vsf-capybara` themes and `BudsiesApp/vsf-payment-braintree`; no submodule-pointer or source change is planned there. No package-manager migration, library upgrade, customer behavior change, deployment, or GitPkg removal.
