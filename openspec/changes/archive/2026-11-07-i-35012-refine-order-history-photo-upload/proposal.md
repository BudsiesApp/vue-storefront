# Proposal

## Why

The inline Order History photo upload works, but its ready state is a loose warning message above a small button, and its form is squeezed into the narrow column beside the item thumbnail on phones. Customers should see one clear "photos needed" panel with a stable, predictable upload form that fits the whole card on small screens.

## What Changes

- Present the ready state as one contained panel owned by the photo form: a centered camera icon beside the whole header text, the existing "waiting for your photos" prompt shown once, and a primary "Upload photos" action. The generic awaiting-artwork message and action are shown only while the form is loading, absent, ineligible, or failed to load.
- Keep the configured upload field and its native previews, adding one explicit Order History appearance for it: uniform square tiles, a themed dropzone, and reserved vertical space so the actions and status do not move while zero to three photos are selected. Every other caller of the field keeps its current look.
- Replace the right-aligned Cancel-first controls with a left-aligned Submit-first row (stacked and full width on small screens), a persistent status line above it (photo count, uploading, submitting, error), and no bulk Discard. Cancel keeps restoring the photos that were saved when the form was opened.
- Report save and submit failures inline in the status line instead of a danger notification. Load failures and the post-submit refresh warning keep their notifications.
- On small screens, place the whole actions block below the thumbnail summary at full card width for items that have an awaiting-artwork action, without rendering a second form.
- Show a real alternative awaiting-artwork action supplied by the API as a text alternative inside the panel; no contact link is invented.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `order-history-item-photo-upload`: Adds the contained ready-state panel, the opt-in field appearance with stable space, the Submit-first action row and status line, Cancel restoration, and small-screen placement requirements; changes the failure feedback of "One action saves and submits photos" from a notification to an inline message.

## Impact

- Order History item layout and actions renderer (`order-item.vue`, `order-item-actions.vue`).
- Theme photo form and composable, plus the customization option, image upload widget, and artwork uploader (opt-in appearance only).
- `en-US` translations for the new panel, status, and label strings.
- Unit coverage for the panel, status, actions renderer, order item placement, and opt-in appearance isolation.
- No dependency, API, store, shared customization-action, upload transport, or backend changes. Uploaded file types, size limit, image transform, value representations, and server event handling are unchanged. The previous change's manual integration task remains open and is not claimed by this change.
