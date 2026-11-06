# Design

## Context

See `proposal.md` for motivation and the delta spec for the behavioral contract. This change refines the delivered inline upload; it does not change eligibility, loading, submission sequencing, or the final-submission guards.

- `order-item-actions.vue` mounts the injected `OrderItemPhotoUploadForm` inside the awaiting-artwork action and, once the form reported readiness, rewrote that action's message to the awaiting-photos sentence while still rendering it above the form's small button.
- `order-item.vue` nests the actions inside the name column beside the thumbnail, so the form is squeezed into that column on phones.
- The upload field is the configured `customization-option` → `image-upload-widget` → `m-artwork-upload` (FilePond with preview plugins). Multi-image mode already lays previews out as a native three-column list; the browse label is a literal string; FilePond sets its own root height and absolutely positions list items.
- `MSpinnerButton` wraps `SfButton` in a `div` and gates clicks with `aria-disabled`. `MExpandableSection` owns an uncontrolled open state. The form keeps its local collapsible technique so that its single open state stays authoritative.

## Goals / Non-Goals

**Goals:** One owner for the ready-state panel and one for the backend fallback; native previews with a bounded opt-in appearance; stable controls for zero to three photos; a full-card-width phone layout without a second form.

**Non-Goals:** A generic uploader framework, custom photo slots, a new file engine, cancel-during-upload (the existing abort only suppresses the completion callback and is not proven to cancel the network request, so the busy Cancel guard stays), a guessed email destination or contact link, and changes to shared customize/save/submit services, stores, or the upload transport.

## Decisions

### 1. The theme form owns the ready panel; the actions renderer owns the fallback

The form renders the header (`SfIcon` camera, translated title, the existing awaiting-photos sentence once, optional alternative action) and the opening `SfButton`. The actions renderer stays mounted for loading and hides the generic awaiting-artwork message and action only when the form is ready or submitted, using the original immutable API action instead of a rewritten copy. If the API action carries a link, it is passed into a form slot as a text alternative with its own props, handlers, and target; with no link nothing is invented. A modifier class on the renderer, set only while the panel is shown, stretches the container and draws the divider above the remaining actions.

*Alternative considered:* gating mounting on readiness. Rejected because the form loads its own data on mount.

### 2. One action instance placed with CSS

`order-item.vue` moves its single actions instance to be a sibling of the name column inside a grid. Wide screens keep the thumbnail column and place the actions under the name column. Items that have an awaiting-artwork action get a modifier that, at the existing 426px boundary, makes the actions span the card under the summary row and bounds the thumbnail at 72px. No viewport listener, duplicate instance, or `display: contents` is used, so selection, open state, and the submitted latch survive a resize.

### 3. Opt-in appearance through the existing image widget path

`CustomizationOption` gains an optional `imageUploadAppearance` that it passes as `appearance` to the image upload widget only; the widget forwards it to `m-artwork-upload` and adds a modifier for its own error space. Only the photo form sets `order-history`. A generic options object, global provide/inject, and unchecked attribute tunneling were rejected to keep the surface to one named value.

The appearance uses native FilePond options through a bound object that is empty by default (so no option, including `undefined`, reaches FilePond for other callers): a uniform `styleItemPanelAspectRatio` of 1, and a translated idle label built from fixed markup around escaped translated text. Styles are scoped to the modifier: a bordered stage on the FilePond wrapper, item widths from the same column and gap variables. The column count and browse band switch to two columns and a taller band when the uploader itself is 26rem wide or narrower (container query on the uploader), not by viewport.

### 4. Reserve space on the stage, not on FilePond

FilePond writes its own root height and positions items itself, so the reserve is a `min-block-size` on the stage that is derived from the same variables as the tiles: padding and border, the browse-label band (taller when the uploader is narrow and the label wraps), the reserved rows times the tile row height measured from the stage width via a container-size unit, and the native list's bottom margin less the tile margins it replaces, plus a small rounding allowance. Reserved rows are one in the three-column layout and two (or one for a configured maximum of one or two) in the two-column layout. This is only a layout floor: a larger configured limit grows the stage and nothing is sliced. The label stock `height: 0` is replaced by `auto` in the appearance so a wrapped label is measured. The opt-in also reserves one line for the timed max-files warning and the widget's validation text.

*Alternative considered:* fixed heights on FilePond. Rejected because they clip additional files.

### 5. Status, error, and Cancel stay in the composable

`useOrderItemPhotoUpload` additionally exposes `imageCount`, `isUploading` (the existing busy state), and `submissionError`. The error is set on a save or submit failure, cleared on retry and Cancel, and never clears the selection. The danger notification for save and submit failures is replaced by it (logging stays); load failures and the parent's refresh warning keep their notifications. The pending latch, validation, save-then-submit sequence, and final-submission state are unchanged. The form builds the status text from those values, with the priority error, submitting, uploading, then the count.

### 6. The form adapts to the width it gets

At just over 425px the order item still keeps the actions in the details column, so the panel can be about 260px wide, narrower than the Submit, Cancel and padding side by side. The form therefore sizes its own layout from its container instead of the viewport: the form root is a named inline-size container; the header puts the opening action in a third column only from 32rem, and Submit and Cancel stack at full width at 22rem and below. The scoped styles read custom properties with narrow-layout defaults, and a second unscoped style block holds the `@container` rules, which only set those properties, because the scoped style plugin does not rewrite `@container` selectors and a plain override would lose to the scoped specificity. The action row also wraps, so without container query support it still cannot clip. No viewport listener, remount, or second instance is involved, so state survives resizing.

*Alternative considered:* a wider viewport breakpoint. Rejected because the panel width depends on the column and page padding, not on the viewport alone.

### 7. Editor lifetime, focus, and accessibility

The editable field is mounted only while the form is open and not submitted, so Cancel followed by reopening rehydrates the restored saved photos instead of leaving stale native previews; it is never unmounted by an ordinary failure, and Cancel is blocked while busy. Item-specific ids connect the opening action (`aria-expanded`/`aria-controls`) to the body region, which is labelled by the heading. Setup-owned typed refs restore focus to the opening action after Cancel, move focus to the body on open, and move it to the confirmation after success if it still exists. The action row is Submit (`MSpinnerButton`, stable label and minimum width, both wrapper and inner button sized) and Cancel (`SfButton` secondary), with a status line above it that reserves its normal lines.

## Risks / Trade-offs

- The reserve is a CSS estimate of FilePond's layout (label band, list margin). → It was checked against rendered FilePond in an isolated in-memory fixture for zero to six photos at wide, 600, 540, 480, 426, 390, and 360px; a different font or a very long translated label could exceed the allowance and then only grows the stage.
- FilePond hides the browse label at the configured maximum and moves tiles up inside the stage. → This is native behavior; the controls below do not move.
- Container size units and queries need a current browser. → Without them the layout falls back to the narrow header, a wrapping action row, and no reserve; nothing is clipped.
- The generated count strings use interpolation that the extractor misses. → Added to the catalog explicitly.

## Migration Plan

No data migration. Rollback restores the previous ready message above the small button and the right-aligned controls.
