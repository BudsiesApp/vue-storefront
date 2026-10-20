# Tasks

## 1. Products toggle button markup (current branch `36631-fix-menu-closing-by-escape`)

- [x] 1.1 In `src/themes/petsies-capybara/components/organisms/o-header.vue`:
  - Remove `aria-expanded` from the Products title link.
  - Add a `<button type="button" class="o-header__submenu-toggle">` between the link and `MMenu`, with a setup-owned typed template ref, visually hidden text `$t('Products submenu')`, and an `aria-hidden` chevron icon.
  - Bind `aria-expanded` to the open state and set `aria-controls="o-header-products-menu"`.
  - Pass `id="o-header-products-menu"` to `MMenu`.

  Verify in the rendered HTML that the button follows the link, the `id` lands on the `.m-menu` root, and `aria-controls` matches it.
- [x] 1.2 Run `yarn update-i18n-files` and verify that the "Products submenu" key is present in the theme i18n files.

## 2. Menu state and handlers

- [x] 2.1 Replace `isFocusedMenu` with `isMainMenuExpanded`, add `isMainMenuHoverDismissed`, and add the `isMainMenuOpen` computed. Use `isMainMenuOpen` for `MMenu` `visible`, the button's `aria-expanded`, and the overlay. Remove `onMainMenuFocusIn` and the `@focusin` binding. Verify with `yarn lint` and the spec in 4.1.
- [x] 2.2 Add the button click handler that toggles `isMainMenuExpanded`. Make `onMainMenuFocusOut` clear `isMainMenuExpanded` when focus leaves the item, and make `onMainMenuClose` clear it too. Verify through the spec in 4.1.
- [x] 2.3 Replace the inline `@mouseleave` with `onMainMenuMouseLeave`, which clears `isHoveredMenu` and `isMainMenuHoverDismissed`. Make `onMainMenuMouseOver` return early while hover-dismissed. Verify through the spec in 4.1.
- [x] 2.4 Replace `@keydown.esc` / `onMainMenuEscapeKey` with a `document` `keydown` listener, added in `mounted` and removed in `beforeDestroy`.
  - It acts only when the menu is open.
  - It clears `isMainMenuExpanded`, and sets `isMainMenuHoverDismissed` if the menu is hovered.
  - It focuses the toggle button through its template ref only if focus was inside the navigation item.
  - It does not call `preventDefault` / `stopPropagation`.

  Verify through the spec in 4.1.

## 3. Styles

- [x] 3.1 In the scoped SCSS:
  - Remove `&:focus-within` from the `.m-menu` reveal rule and add `&._expanded`. Bind the `_expanded` and `_hover-dismissed` classes on the Products `SfHeaderNavigationItem`.
  - Add a `&._hover-dismissed:hover` override that keeps `.m-menu` hidden and suppresses the `::after` underline.

  Verify in the browser that keyboard expansion shows the menu, focusing the title doesn't, and Escape while hovering hides it.
- [x] 3.2 Style `.o-header__submenu-toggle`: visually hidden (clip technique, not `display: none`) by default; on `:focus-visible`, an absolutely positioned chevron next to the title with the theme focus ring. Verify in the browser that mouse users see no change, keyboard focus shows the chevron, and no header items shift.

## 4. Header tests

- [x] 4.1 Add `src/themes/petsies-capybara/components/organisms/o-header.spec.ts`. Mount with `attachTo: document.body` and stub `@storefront-ui/vue` components, `MMenu`, `ALogo`, the icon atoms, `MCtaButton`, `CurrencySelector`, and `$store`. Cover:
  - Focusing the title does not open the menu, and the link has no `aria-expanded`.
  - Button click toggles `aria-expanded`, and `aria-controls` matches the menu `id`.
  - Escape from a submenu element closes the menu and focuses the button.
  - Escape while hovered → `_hover-dismissed`; `mouseover` doesn't reopen; `mouseleave` then `mouseover` reopens.
  - `focusout` to outside collapses the menu.
  - Escape with no open menu does nothing.
  - The document listener is removed on destroy.

  Verify with `yarn test:unit src/themes/petsies-capybara/components/organisms/o-header.spec.ts`.

## 5. Gift card Sender name autocomplete

- [x] 5.1 Add `autocomplete="name"` to the Sender name `SfInput` (`name="customer_name"`) in `src/themes/petsies-capybara/components/organisms/o-gift-card-order-form.vue`. Leave the recipient inputs unchanged. Verify in the browser that the gift card page's `input[name="customer_name"]` has `autocomplete="name"` and the recipient inputs do not.

## 6. Manual verification on the current branch

- [ ] 6.1 On the local storefront at desktop width, keyboard only, check that:
  - Tab to Products → no dropdown.
  - Tab → the chevron button appears; Enter or Space → the dropdown opens.
  - Tab through the links, then Escape → it closes, focus is on the button, and it stays closed.
  - Tab past the last link → it closes.
  - Enter on the title navigates to the Products page.
- [ ] 6.2 With a screen reader (for example NVDA + Firefox or VoiceOver + Safari), confirm the announcements: "Products, link", then "Products submenu, button, collapsed/expanded".
- [ ] 6.3 With a mouse, confirm that hover open and close, clicking the title, clicking a submenu link, and the overlay are unchanged. With the pointer resting over the open menu, Escape closes it; moving the pointer out and back reopens it.

## 7. Ports to other theme branches (on branches the developer creates)

- [ ] 7.1 On the branch created from `budsies-theme`, apply the same pattern to Products and Educators: `isEducatorsMenuExpanded` / `isEducatorsMenuHoverDismissed`, an Educators toggle button with its own `id` / `aria-controls`, and the `.m-educators-menu` CSS. Keep the existing cross-menu resets. Port and pass the header spec, then repeat checks 6.1–6.3 for both menus.
- [ ] 7.2 On the branch created from `bulkorders-theme`, where About and Products have no page of their own, turn each title into the disclosure `<button>`, replacing `div[role=menuitem]`. Each title button keeps its current look and has `aria-expanded` / `aria-controls`; there is no separate toggle. Apply the same state, Escape, focus-out, and hover-dismiss behavior, using setup-owned refs instead of `$refs.aboutNavItem`. Port and pass the header spec, then repeat checks 6.1–6.3 for both menus.
