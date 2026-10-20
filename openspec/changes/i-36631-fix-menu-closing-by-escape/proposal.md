# Proposal

## Why

Issue #36631 (ADA accessibility claim) requires header submenus to be fully operable from the keyboard. Two problems remain:

- **Escape doesn't close a dropdown when focus is inside it.** The handler moves focus back to the menu title, and the title's `focusin` handler plus the `:focus-within` CSS rule immediately reopen the dropdown. This fails WCAG 1.4.13 (Content on Hover or Focus), which requires such content to be dismissible.
- **The pattern itself is off.** Opening on focus, and putting `aria-expanded` on a link that navigates, doesn't follow the W3C WAI-ARIA disclosure navigation pattern for menus whose titles are also links. Keyboard users get each dropdown popping open as they tab past, and screen readers announce a "link, expanded" that Enter doesn't toggle.

Separately, the gift card Sender name field lacks an `autocomplete` hint, which accessibility audits flag for inputs that collect the user's own personal data (WCAG 1.3.5 Identify Input Purpose).

## What Changes

- Each desktop header menu that owns a dropdown keeps its title as a plain link. Focusing the title no longer opens the dropdown, and the link no longer carries `aria-expanded`.
- A disclosure toggle button follows each title in the tab order:
  - It is visually hidden until it receives keyboard focus, so the header looks the same for mouse users.
  - It exposes `aria-expanded` and `aria-controls`, and Enter or Space toggles the dropdown.
  - Submenu links can only be reached with Tab while the dropdown is expanded.
- Escape closes an open dropdown. If focus was inside the menu, it returns to the toggle button. The dropdown stays closed until the user presses the button again.
- Escape also closes a dropdown opened by hover while the pointer rests over it. It stays closed until the pointer leaves the menu and enters it again.
- Moving focus out of the navigation item closes a dropdown that was opened from the keyboard.
- Mouse behavior is unchanged: hover opens, pointer leave closes, clicking the title navigates, clicking a submenu link closes.
- The gift card order form's Sender name input (`customer_name`) gets `autocomplete="name"`. Recipient fields are not changed.

Rollout: implement first on the current theme branch (`36631-fix-menu-closing-by-escape`, based on `petsies-theme`), which covers the Petsies **Products** menu and the gift card form. The gift card change is made only on `petsies-theme`, because that branch is merged into `budsies-theme`. The header change will then be ported, on separate branches created by the developer, to every brand theme branch with the same dropdown behavior: `budsies-theme` (Products, Educators) and `bulkorders-theme` (About, Products).

## Capabilities

### New Capabilities
- `header-menu-escape-dismissal`: Keyboard access to desktop header dropdown menus. Covers the title link, the disclosure toggle button, Escape dismissal and focus return, focus-exit closing, and preserved mouse behavior.
- `gift-card-sender-autocomplete`: Autofill purpose hint on the gift card Sender name field.

### Modified Capabilities
<!-- None: there are no existing header-navigation or gift-card specs. -->

## Impact

- `src/themes/petsies-capybara/components/organisms/o-header.vue`: toggle button markup and ARIA, menu state and handlers (open on focus is removed; a document-level Escape listener is added), and the scoped CSS that reveals `.m-menu` / `.m-educators-menu`.
- `src/themes/petsies-capybara/components/molecules/m-menu.vue` (and `m-educators-menu.vue` when porting): receives an `id` for `aria-controls`. It falls through to the root element, so the component code may not need to change.
- `src/themes/petsies-capybara/i18n/`: new label for each toggle button (for example "Products submenu").
- `src/themes/petsies-capybara/components/organisms/o-gift-card-order-form.vue`: one attribute on the Sender name `SfInput`. `SfInput` already forwards `$attrs` to the native `<input>`.
- New unit spec `src/themes/petsies-capybara/components/organisms/o-header.spec.ts`.
- Follow-up ports to `budsies-theme` and `bulkorders-theme`. `budsies-education-theme` and `waggables-theme` are out of scope for this change.
- No API, store, routing, or SSR changes. The button renders on the server as collapsed, and the document listener is registered only in the browser.
