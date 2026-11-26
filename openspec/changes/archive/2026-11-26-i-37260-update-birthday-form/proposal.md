# Proposal

## Why

The order-success birthday form currently offers impossible dates and sends no order identifier. Restricting its days and supplying the order's ID and email prevents invalid birthday submissions and prepares the request for Magento's order verification in #37259.

## What Changes

- Offer only days belonging to the selected month, allowing February 29 because no year is collected; keep days 1–31 whenever no month is selected, including after choosing the `MM` placeholder again.
- Clear a selected day that becomes invalid after a month change and show the existing required-field error instead of submitting it.
- Pass the success page's order entity ID and order email into the form and include them in its existing Vuex/TaskQueue request.
- Export a shared days-in-month helper from the app's `budsies` module.
- Preserve existing labels, desktop layout, submission feedback, request disabling, and repeat entry; align select validation errors with the name field and address form using the components' built-in error output, and arrange mobile fields in two rows.
- Cover the shared helper, action request contract, and form behavior with unit tests.

## Capabilities

### New Capabilities

- `order-success-birthday-sharing`: Valid birthday selection and order-linked birthday submissions on the order-success page.

### Modified Capabilities

None.

## Impact

- App repository: `src/modules/budsies` helper, public export, action payload type, and unit tests.
- Theme submodule (`src/themes/petsies-capybara`): `components/organisms/OOrderSuccess/m-share-birthday-form.vue`, its adjacent tests, and the birthday-form bindings in `components/organisms/o-order-success.vue`.
- The theme implementation is limited to the checked-out branch based on `petsies-theme`. Porting to Budsies, Budsies Education, and Waggables is separate and includes the select error template and SCSS edits for error alignment and mobile layout; preserve their labels and other styles. Budsies and Budsies Education have six extra SCSS lines in this component.
- Keep `POST /budsies/share/artists`, its existing `email` body field, and add numeric `orderId`. No VSF API or Magento code changes, dependencies, or new user-facing strings.
- Bulk Orders, the special-story form, existing invalid artist cleanup, and Maestra delivery are out of scope.
