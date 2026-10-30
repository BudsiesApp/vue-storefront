# Proposal

## Why

Customers whose order items are awaiting artwork currently see a request to check their email. Eligible products should let customers upload the missing photos directly in the order item block and send the item for review in one action.

## What Changes

- Add inline photo upload for items with the `awaiting_artwork` available action and an unlocked image-upload customization available in `customize-later-completion`; retain the existing message otherwise.
- Reuse the existing customization widget, image limits, draft state, and `useCustomizeAction` to submit only the selected image customization, preserving its existing photos alongside newly uploaded photos.
- Report success or failure through translated notifications and refresh the displayed orders after submission.

## Capabilities

### New Capabilities

- `order-history-item-photo-upload`: Eligibility, photo-only state, one-step submission, feedback, and refresh for inline Order History uploads.

### Modified Capabilities

None. Existing reorder feedback and alteration pricing requirements remain unchanged.

## Impact

- Order History's item integration, a theme-owned form and composable, and the account orders component's dependency provision.
- Reuse the existing draft service, `useCustomizeAction`, and orders refresh action unchanged.
- Theme translations and focused unit coverage. No dependency additions, routes, store or transport rework, other action changes, customization-page changes, or API implementation changes.
- Depends on the separately delivered Magento contract: existing state/save and submit endpoints accept AWAITING_ARTWORK, state saves upsert only the supplied customization, and submission with images moves the item to REVIEW. No handling is added for send-later upload methods or backend re-export.
