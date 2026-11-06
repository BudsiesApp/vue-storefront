# Spec Delta

## ADDED Requirements

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

## MODIFIED Requirements

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
