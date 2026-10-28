# Proposal

## Why

Issue #37162 records digital portraits whose download requests retain the stored `budsies-qa-photos/` prefix and fail, although their filename-only original URLs succeeded in the saved investigation. Customers need the correct full-size portrait and visible feedback when a download fails, with another attempt possible without reloading.

## What Changes

- Resolve the two evidenced portrait storage forms (the exact QA-photo prefix followed by a filename, and a filename alone) consistently for preview, download, and the existing related-product image parameter.
- Download the original image through the configured QA-photo handler, preserving successful download behavior and the existing suggested filename.
- Show an established localized error notification for unsuccessful HTTP responses or network failures and leave Download usable for another attempt.
- Preserve the authenticated route, token-bearing deliverables fetch contract, related-product behavior for existing prefixed records, and shared artwork-download behavior.

## Capabilities

### New Capabilities

- `digital-portrait-downloads`: Original portrait selection, preview/download consistency, recoverable download errors, and preservation of existing access and download contracts.

### Modified Capabilities

None. The local capability inventory has no digital-portrait delivery contract. Existing application-service and order-history feedback requirements remain unchanged; Storyblok asset delivery concerns a different source of assets.

## Impact

- Implementation belongs in the separate `src/themes/petsies-capybara` repository: `pages/OrderItemDeliverablesDownload.vue` and focused page/shared-downloader regression tests. Planning artifacts belong in this UI repository's `openspec/`.
- Preserve `helpers/use-image-download.ts`, its `OrderPrintoutsDownload.vue` consumer, and the global `ImageHandlerService` contract. No dependency addition or API change is needed.
- No stored-data migration, runtime configuration change, MakerWare/Magento change, storage-permission change, delivery-event replay, status repair, customer email, or page redesign is included.
- Saved evidence comes from the local ticket files `task-management/tickets/37162-digital-portrait-downloads/issue.md` and `issue-source.json`; it is not a fresh production observation. Desktop/mobile authenticated acceptance for the example portraits belongs after deployment, outside implementation completion.
