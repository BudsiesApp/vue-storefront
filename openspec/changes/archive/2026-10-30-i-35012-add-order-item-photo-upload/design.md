# Design

## Context

See `proposal.md` for motivation and the delta spec for the behavioral contract.

- `order-item.vue` already injects `AlterationProductForm`, provided by the account orders organism. Its actions renderer shows the unknown blocking `awaiting_artwork` action without a URL as a message.
- `customization-option` passes `optionData.maxValuesCount` to the existing image widget, which supports saved files, additions, removals, and single-image values.
- The full order-item customization form checks AWAITING_CUSTOMIZATION and includes other fields, so it does not fit an artwork-only form.
- `useCustomizeAction` already saves, checks per-item errors, submits, and resets its pending flag. The account list renders orders committed by the existing `FETCH_ORDERS_HISTORY` action.

## Goals / Non-Goals

**Goals:** Add the inline upload by composing the existing widget, draft loading, and submission behavior with per-item data.

**Non-Goals:** Shared transport, store, and existing customization-page changes are outside this task. Send-later upload-method handling and backend re-export remain API responsibilities.

## Decisions

### 1. Keep one theme form and one composable

| New element | Requirement and simpler alternative considered |
| --- | --- |
| `theme/components/customization-system/forms/order-item-photo-upload-form.vue` | Renders the single upload field, validation observer, and existing spinner submit button. Reusing the full customization form would inherit its status restriction and unrelated fields. |
| `theme/helpers/use-order-item-photo-upload.ts` | Owns loading, selection state, busy state, and submission feedback. Keeping this reusable asynchronous logic inside the component would conflict with the composable layering rule. |

Provide/inject `OrderItemPhotoUploadForm` from `o-my-account-orders-history.vue` to `order-item.vue`, following `AlterationProductForm`, because the existing widget and submission composable are theme-owned. No new helper or additional loading component is needed.

### 2. Replace only the awaiting-artwork message once ready

Add `AWAITING_ARTWORK = 'awaiting_artwork'` to the action-code enum. Mount the injected form only when that action is present, key the form by `item.item_id`, and consume its `ready-changed` boolean event to omit only that action from the immutable list passed to `order-item-actions` when the form is ready.

Keep the original message until readiness; this preserves the fallback during loading or for ineligible products. A new handler in the generic action renderer was considered, but it would mix inline form loading with unrelated action rendering.

### 3. Load eligible data on client mount

Start loading in `onMounted`, which does not run during SSR. Load the product with `product/loadProduct({ parentSku: item.product.sku, setCurrent: false })` and keep its result locally; `useProductPage` was considered but changes the shared current product and emits page events, which is unsuitable for multiple order items.

Apply the eligibility rule and first-match order defined in the spec using `customization.optionData?.displayWidget === WidgetType.IMAGE_UPLOAD` and the enum's hyphenated `customize-later-completion` value. No SKU allowlist or additional product/status gate is required because the API action and customization configuration provide the needed eligibility information.

Only after finding an eligible customization, load the draft with the existing `fetchOrderItemCustomizationsState(item.item_id.toString())`, as `useDraftOrderItem` does. Its immediate setup watcher would start loading before client mount in this component, so use the service directly within the mounted loader rather than introduce a child solely to host that watcher.

A missing product or failed draft lookup keeps readiness false and shows the translated lookup error; requiring both data objects prevents replacing the working email fallback with an unusable form. Order History's existing navigation destroys the item on logout, so the keyed component's lifetime owns this local data.

### 4. Seed only the selected customization

Use `useCustomizationState` for the field value and updates, with only the selected customization's draft entry. Gating `customization-option` does not defer the owning composable's `onMounted` initial-state hook, so the asynchronously loaded entry must be seeded once with `mergeCustomizationState` before rendering the option.

Use an empty array when that draft entry is absent, and pass only the selected customization's current state to submission. Preserve the widget's scalar/array representation and configured image count; it already retains existing files when adding new ones, so no separate image merger is needed.

### 5. Reuse submission and normal refresh unchanged

Pass the image-only state and loaded draft refs to the existing `useCustomizeAction` unchanged. It provides the existing save-before-submit sequence and error checks without another API integration.

After `confirmCustomization()` succeeds, mark the submission final with a separate `isSubmitted` flag, end the pending state, and replace the form controls with a translated submitted confirmation; the success toast is not shown, to avoid duplicating that confirmation. The existing `submitted` event makes the order-item actions hide the awaiting-artwork prompt and dispatch `FETCH_ORDERS_HISTORY_ACTION` with `{ filters: { excludeAlterationProducts: true } }` as background synchronization. The existing getters update the rendered list and the action's disappearance removes the form, so no reload event chain or navigation is needed.

Catch save and submit failures with the generic translated error notification and retain the form and selected photos. A refresh failure is not a submission failure: log it and show a non-blocking translated notice that the photos were submitted but the order status could not be refreshed. The submitted confirmation stays and the form stays locked even while the refresh is slow, fails, or still returns AWAITING_ARTWORK; no awaitable callback or retry workflow is added.

Use `useStore()` and `useI18n()` from `core/application-services`. New strings are “Submit photos”, “Your photos have been submitted.”, “Something went wrong. Please try again.”, and “We could not load photo upload. Please try again later.”; translate them with `t()` and reuse translated “OK”.

### 6. Keep the submission guards

| Guard | Reachable failure prevented |
| --- | --- |
| Widget busy state | Saving before photo uploads finish processing. |
| Validation plus a nonempty image selection | Sending invalid values or requesting review without images when the field is configured as optional. |
| Local pending latch set before awaiting validation and released after a failure | Double activation during asynchronous validation or submission. |
| Separate submitted flag set after a successful save and submit | Resubmission while the order refresh is slow, fails, or returns a stale awaiting-artwork action. |
| Disable editing while that operation is pending | Changing the selected image list after the save payload has been captured. |

Use a setup-owned typed `ValidationObserver` ref to validate the field; a parent or child refs-map traversal is unnecessary for this single field.

## Risks / Trade-offs

- Separate Magento support missing → Release after the API contract in the proposal is available; request failures retain the selected images.
- Existing photos already fill the configured limit → Use the existing field's removal/replacement controls without raising the product limit.

## Migration Plan

No storefront data migration is required. Rollback restores the existing email-message behavior without changing saved photos or backend state.
