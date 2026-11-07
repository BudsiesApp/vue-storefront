# order-history-item-photo-upload Specification

## Purpose

Allow customers to provide missing artwork directly within eligible Order History items while preserving their saved photos and other customization data.

## Requirements

### Requirement: Inline upload eligibility

The storefront SHALL offer inline photo upload only when the item has the `awaiting_artwork` available action and its product has a customization whose widget is image upload, whose lock is false, and whose flow availability includes `customize-later-completion`. The progress tracker's status SHALL NOT determine this eligibility. If multiple customizations match, the storefront SHALL use the first in the product's customization order.

#### Scenario: Eligible item
- **WHEN** the item has the awaiting-artwork action, an eligible product customization, and its draft state has loaded
- **THEN** the order item block displays one photo upload field and one submit action
- **AND** the existing awaiting-artwork email message is replaced by this form

#### Scenario: Tracker status differs from plushie status
- **WHEN** an otherwise eligible item has a progress-tracker status of REVIEW
- **THEN** inline upload is still offered

#### Scenario: Product is not eligible
- **WHEN** the item has the awaiting-artwork action but its product has no image-upload customization, only locked image-upload customizations, or no image-upload customization explicitly available in the completion flow
- **THEN** the existing email message remains and no inline upload is offered
- **AND** missing or empty flow availability does not grant completion-flow access

#### Scenario: Item lacks the action
- **WHEN** the item's product is eligible but the item lacks the awaiting-artwork action
- **THEN** inline upload is absent and no photo-specific product or draft lookup is initiated

#### Scenario: Multiple eligible image customizations
- **WHEN** the product has more than one eligible image-upload customization
- **THEN** only the first is displayed and included in the photo submission

#### Scenario: Data cannot be loaded
- **WHEN** a required product or draft lookup fails or returns no usable data
- **THEN** the email message remains, the form is absent, and a translated error notification is shown

#### Scenario: Server rendering
- **WHEN** Order History is server-rendered
- **THEN** the inline feature does not load private draft data or display the upload form

### Requirement: Photo-only state preserves the selected image list

The storefront SHALL initialize the upload field with the selected customization's saved photos. Saving SHALL send only that customization and its complete current image value, preserving retained saved photos alongside new photos; unrelated draft customizations SHALL be omitted. The existing upload field SHALL enforce the customization's image count setting, including a limit of one.

#### Scenario: Existing and new photos
- **WHEN** a customer adds photos to an image customization with saved photos
- **THEN** the existing photos are visible before editing
- **AND** saving sends the saved photos still selected plus the newly processed photos
- **AND** no email, upload-method, or other customization is sent

#### Scenario: Photo removal
- **WHEN** a customer removes a photo using the existing upload field
- **THEN** the submitted full value excludes that photo and retains the other selected photos

#### Scenario: Product allows only one image
- **WHEN** the customization allows one image
- **THEN** the field uses the existing single-image upload behavior and does not allow two selected photos

#### Scenario: Product allows several images
- **WHEN** the customization permits several images
- **THEN** the existing field enforces that configured count across saved and newly uploaded photos

#### Scenario: Multiple items have different products
- **WHEN** two eligible items with different products are displayed together
- **THEN** each field uses its own product's customization, image limit, and draft photos
- **AND** editing one item does not alter the other item's state

### Requirement: One action saves and submits photos

The storefront SHALL save the image-only state through the existing order-item states endpoint and then submit that item through the existing submit-requests endpoint using one customer action. It SHALL submit only after a successful save, keep editing disabled during submission, and prevent submission while uploads are pending, the field is invalid, or no photos are selected.

#### Scenario: Save then submit
- **WHEN** the customer submits a valid photo selection
- **THEN** the state save completes before submission is requested for the same order item
- **AND** the existing endpoint payload and per-item result contracts are retained

#### Scenario: Pending upload or invalid selection
- **WHEN** uploads are still processing, validation fails, or the selection is empty
- **THEN** no save or submit request is sent

#### Scenario: Repeated activation
- **WHEN** the customer activates submit again while the operation is pending
- **THEN** only one save-and-submit sequence runs for that item

#### Scenario: Save fails
- **WHEN** the save request fails at transport level or returns a per-item error
- **THEN** submission is not attempted, a translated inline error is shown in the form's status line without an error notification, and the form retains the selected photos for retry
- **AND** the inline error is cleared when the customer retries or cancels

#### Scenario: Submit fails
- **WHEN** saving succeeds but submission fails at transport level or returns a per-item error
- **THEN** a translated inline error is shown in the form's status line without an error notification, and the form retains its full image selection for retry
- **AND** the order data is not refreshed

### Requirement: Feedback and refreshed order state

After successful submission the storefront SHALL treat the submission as final, replacing the form controls with a translated submitted confirmation and preventing resubmission, while refreshing the displayed order data in the background. The form SHALL disappear when refreshed data no longer contains the awaiting-artwork action. A failed refresh SHALL be logged and SHALL show a non-blocking translated notice instead of restoring the controls.

#### Scenario: Successful submission and refresh
- **WHEN** saving, submission, and order refresh succeed
- **THEN** the submitted confirmation replaces the upload, edit, cancel, and submit controls and the awaiting-artwork prompt is not shown beside it, while the refresh is pending
- **AND** the item then displays the refreshed progress and available actions
- **AND** the upload form disappears because the awaiting-artwork action is absent

#### Scenario: Slow refresh or stale awaiting-artwork action
- **WHEN** the item has been submitted successfully and the refresh is slow or still returns the awaiting-artwork action
- **THEN** the submitted confirmation remains, no pending spinner is shown, and no upload, edit, cancel, or submit control is available
- **AND** no further save or submit request can be sent for that item

#### Scenario: Order refresh fails after successful submission
- **WHEN** the item has been submitted successfully but refreshing the order fails
- **THEN** the error is logged and a non-blocking translated notice states that the photos were submitted, the order status could not be refreshed, and the page should be refreshed for the latest status
- **AND** the submitted confirmation remains and the pending state has ended

### Requirement: Other order behavior remains compatible

The storefront SHALL preserve other available actions and alteration forms.

#### Scenario: Other actions coexist
- **WHEN** an inline photo form replaces an awaiting-artwork message
- **THEN** other actions retain their existing messages, URLs, handlers, and disabled states
- **AND** alteration forms retain their existing behavior

### Requirement: Contained photo panel owns the ready state

Once the inline form is ready, the storefront SHALL present one contained panel with a header, the awaiting-photos prompt, and an opening action, and SHALL NOT show the generic awaiting-artwork message or action beside it. Before the form is ready, or when it is ineligible or failed to load, the existing message and action SHALL remain.

#### Scenario: Ready panel
- **WHEN** an eligible item's form has loaded
- **THEN** the item shows one panel with a camera icon vertically centered beside the whole header text, the translated awaiting-photos prompt once, and a primary "Upload photos" action
- **AND** the generic awaiting-artwork message and action are not shown

#### Scenario: Fallback remains
- **WHEN** the form is loading, the product is ineligible, the lookup failed, or the form is unavailable
- **THEN** the awaiting-artwork message and action from the order data remain visible and no panel is shown

#### Scenario: Alternative action from the order data
- **WHEN** the awaiting-artwork action from the order data carries a link and the panel is ready
- **THEN** that action keeps its label, destination, and new-tab behavior and is shown in the panel as a text alternative before submission
- **AND** no contact link is invented when the order data supplies none

#### Scenario: Other actions remain
- **WHEN** the panel is shown
- **THEN** other blocking messages, Re-order, Contact Support, and download actions keep their messages, links, handlers, and disabled states, with a divider separating the panel from the remaining actions

### Requirement: Configured upload field in the panel

Opening the panel SHALL show the one configured upload field with its configured label, description, and hint, using the existing native file previews and browse control. The field SHALL keep the existing accepted file types, size limit, image transformation, image count limit, and value representation, and its Order History appearance SHALL NOT apply to image upload fields elsewhere.

#### Scenario: Configured field
- **WHEN** the customer opens the panel
- **THEN** one upload field with the configured label, description, hint, limits, and saved photos is shown
- **AND** no empty numbered photo slots, second file picker, or additional photo-count requirement is shown

#### Scenario: More photos than the reserved space
- **WHEN** the configured limit allows more than three photos, or is unlimited, and the customer selects a fourth
- **THEN** the field accepts it and grows to show every photo without clipping or discarding any

#### Scenario: Single-image limit
- **WHEN** the configured limit is one photo
- **THEN** the field keeps the single-image behavior, reserves one photo tile, and does not allow two selected photos

#### Scenario: Other upload fields
- **WHEN** an image upload field is used outside the Order History panel
- **THEN** its appearance, label, and behavior are unchanged

### Requirement: Stable space for zero to three photos

The upload field SHALL reserve room for a browse area plus a row of three photos on wide screens and two rows of two photos on small screens, so that selecting zero to three photos does not move the status line or actions below it.

#### Scenario: Zero to three photos
- **WHEN** the customer has zero, one, two, or three photos selected
- **THEN** the status line and the Submit and Cancel actions keep their position

#### Scenario: No blank space for absent messages
- **WHEN** no upload-limit warning or field validation message is present
- **THEN** no blank height or margin is reserved for them between the upload field and the status line, and the status line and the actions are separated by one normal gap

#### Scenario: Real messages take the room they need
- **WHEN** an upload-limit warning, a field validation message, or a longer status message appears
- **THEN** it is shown, announced politely, and wraps as needed, moving the controls below it only by the room it takes

#### Scenario: Reserved space is only a floor
- **WHEN** the selection needs more room than the reserved space
- **THEN** the field grows instead of clipping its photos or its browse control

### Requirement: Submit-first actions and status line

The panel SHALL show a persistent status line above one action row that lists Submit photos first and Cancel second, left-aligned on wide screens and stacked at full width on small screens, without a bulk discard action. The status line SHALL report, in this order of priority, a save or submit failure, an in-progress submission, an in-progress upload, and otherwise the singular or plural count of selected photos or a prompt to choose photos.

#### Scenario: Action order and layout
- **WHEN** the panel is open
- **THEN** Submit photos precedes Cancel, the label of Submit photos does not change while submitting, and no Discard action is shown

#### Scenario: Status wording
- **WHEN** the customer has no, one, or several photos selected, is uploading, or is submitting
- **THEN** the status line shows a choose-photos prompt, "1 photo selected", "N photos selected", an uploading message, or a submitting message respectively
- **AND** it never states that three photos are required

#### Scenario: Narrow available width
- **WHEN** the panel is narrower than its header, upload field, or action row need side by side, including in the details column of an item on a screen just wider than a phone
- **THEN** the opening action moves to its own full-width row below the header text, the upload field uses two columns, and Submit photos and Cancel stack at full width with Submit photos first
- **AND** no control or native browse affordance is clipped or causes horizontal scrolling, and the camera icon stays vertically centered against the whole header text

#### Scenario: Validation message ownership
- **WHEN** the upload field reports a validation or file error
- **THEN** that message stays with the field and is not repeated in the status line

### Requirement: Cancel restores saved photos

Cancel SHALL close the open panel, discard unsaved changes, and restore the photos that were saved when the form was loaded, including saved photos the customer removed and new photos the customer added. Cancel SHALL be unavailable while an upload or submission is in progress.

#### Scenario: Cancel after changes
- **WHEN** the customer adds new photos, removes saved photos, and cancels
- **THEN** the panel closes, any inline error is cleared, and reopening it shows exactly the photos that were saved
- **AND** focus returns to the opening action

#### Scenario: Cancel while busy
- **WHEN** an upload or submission is in progress
- **THEN** Cancel is unavailable and the panel stays open

### Requirement: Order item layout keeps one panel at full card width

An item that has the awaiting-artwork action SHALL render its actions, including the photo panel, as one block below the thumbnail and name summary at full card width on small screens, and in the details column on wide screens. The layout SHALL NOT render a second form or lose the customer's selection, open state, or submitted state when the screen is resized.

#### Scenario: Small screen
- **WHEN** an item with the awaiting-artwork action is shown on a phone-width screen
- **THEN** the thumbnail and name form a summary row and the actions block spans the full card width beneath it

#### Scenario: Resize
- **WHEN** the screen is resized while the panel is open
- **THEN** the same panel remains with its photos and state

#### Scenario: Other items
- **WHEN** an item has no awaiting-artwork action
- **THEN** its actions keep their existing placement, and item details and alteration forms are unchanged
