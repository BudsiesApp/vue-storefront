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
- **THEN** submission is not attempted, a translated error notification is shown, and the form retains the selected photos for retry

#### Scenario: Submit fails
- **WHEN** saving succeeds but submission fails at transport level or returns a per-item error
- **THEN** a translated error notification is shown and the form retains its full image selection for retry

### Requirement: Feedback and refreshed order state

After successful submission the storefront SHALL show a translated success notification and then refresh the displayed order data. The form SHALL disappear when refreshed data no longer contains the awaiting-artwork action. A failed refresh SHALL show the generic translated error notification and retain the form and selected photos.

#### Scenario: Successful submission and refresh
- **WHEN** saving, submission, and order refresh succeed
- **THEN** a success notification is shown and the item displays the refreshed progress and available actions
- **AND** the upload form disappears because the awaiting-artwork action is absent

#### Scenario: Order refresh fails after successful submission
- **WHEN** the item has been submitted successfully but refreshing the order fails
- **THEN** the generic translated error notification is shown
- **AND** the form and selected photos remain available after the pending operation ends

### Requirement: Other order behavior remains compatible

The storefront SHALL preserve other available actions and alteration forms.

#### Scenario: Other actions coexist
- **WHEN** an inline photo form replaces an awaiting-artwork message
- **THEN** other actions retain their existing messages, URLs, handlers, and disabled states
- **AND** alteration forms retain their existing behavior

