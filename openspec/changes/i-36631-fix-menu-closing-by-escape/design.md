# Design

## Context

`src/themes/petsies-capybara/components/organisms/o-header.vue` (Options API) wires each dropdown navigation item with `@mouseover`, `@mouseleave`, `@focusin`, `@focusout`, and `@keydown.esc`. The title `router-link` carries `aria-expanded`.

Visibility has two layers:

- **Inner layer.** `MMenu` passes `visible` to `SfMegaMenu`, which applies `v-show`.
- **Outer layer.** `MMenu`'s own root (`.m-menu`) defaults to `opacity: 0; visibility: hidden`. It is revealed only by the header's scoped rule `.sf-header-navigation-item { &:hover, &:focus-within { .m-menu { opacity: 1; visibility: visible } } }`.

The current Escape bug (see proposal.md, Why) comes from two re-open paths: `focusin` sets the open state again, and `:focus-within` reveals the menu whatever the state says. In addition, `mouseover` fires again every time the pointer crosses a child element, so a resting pointer re-arms hover state.

`budsies-theme` (Products, Educators) and `bulkorders-theme` (About, Products) use the same pattern. Their per-menu handlers also reset the other menu's state.

## Goals / Non-Goals

**Goals:**
- Follow the WAI-ARIA disclosure navigation pattern with top-level links: link plus toggle button.
- Use a shape that ports mechanically to the other menus on the Budsies and Bulk Orders theme branches.

**Non-Goals:**
- Arrow-key navigation, roving tabindex, or `role="menu"` / `menubar`. These are inappropriate for site navigation.
- Mobile sidebar menu changes. The desktop header is `display: none` below the desktop breakpoint.
- Making `MMenu`'s mouse-only close icon keyboard accessible.
- Restructuring `o-header.vue` into the Composition API.

## Decisions

### Toggle button markup
Inside each dropdown `SfHeaderNavigationItem`, place a `<button type="button" class="o-header__submenu-toggle">` between the title `router-link` and the menu component.

- **Name:** the button's accessible name is a translated label, for example `$t('Products submenu')`, as visually hidden text inside the button. A decorative chevron (`SfIcon`) gets `aria-hidden="true"`.
- **ARIA:** the button carries `:aria-expanded="String(isMainMenuOpen)"` and `aria-controls="o-header-products-menu"`. The menu component gets `id="o-header-products-menu"`, which falls through to the `.m-menu` root because Vue passes non-prop attributes to the root.
- **Title link:** remove `aria-expanded` from it.

*Alternative considered:* turning the title itself into a button. Rejected: the title must keep navigating to its page.

*Alternative considered:* `aria-haspopup`. Rejected: APG's disclosure navigation doesn't use it, and some screen readers would announce it as a menu.

### Titles without a destination page (Bulk Orders)
On `bulkorders-theme`, About and Products have no page of their own. Today each title is a focusable `div[role=menuitem]`. That role is invalid without a parent `menu`, and the old Escape handlers look for an `a` that doesn't exist. So the title itself becomes the disclosure `<button type="button">`, carrying `aria-expanded`, `aria-controls`, and the toggle handler. The setup-owned ref points at this button, and there is no separate toggle.

The button's user-agent styles (font, background, margin) are reset so it renders exactly like the old div. State, Escape, focus-out, and hover-dismiss logic are the same as for the other brands.

A visible title button also receives real mouse clicks, which the hidden 1px toggles on the other brands never do. The click handler tells them apart with `event.detail`: Enter and Space produce a click with `detail === 0`, while a pointer click has `detail > 0`. A pointer click only opens the menu the way hover does: it clears the hover dismissal and sets the hovered state. It never sets the keyboard-expanded state and never closes the menu, so pointer leave still closes it. Otherwise a click would toggle the keyboard state, and the menu would stay open after the mouse moved away.

*Alternative considered:* keeping the div and adding the hidden toggle next to it. Rejected: it adds a Tab stop that does nothing and keeps the invalid role.

### State model
Each menu has three pieces of state:

- `isHoveredMenu` (existing): pointer-driven.
- `isMainMenuExpanded`: keyboard-driven. It replaces `isFocusedMenu`.
- `isMainMenuHoverDismissed`: set when Escape closes a hover-opened menu, and cleared on `mouseleave`.

The open state is `isMainMenuOpen = (isHoveredMenu && !isMainMenuHoverDismissed) || isMainMenuExpanded`. This computed feeds the `MMenu` `visible` prop, the button's `aria-expanded`, and the overlay.

Handlers:

- **Removed:** `onMainMenuFocusIn` and the `@focusin` binding. Focus no longer opens the menu.
- **Toggle:** the button's `@click` (fired by both Enter and Space) inverts `isMainMenuExpanded`, keeping the existing cross-menu reset on Budsies and Bulk Orders.
- **Focus out:** `onMainMenuFocusOut` keeps the `relatedTarget` containment check and clears `isMainMenuExpanded` when focus leaves the item.
- **Pointer:** `onMainMenuMouseOver` returns early while `isMainMenuHoverDismissed` (and, as today, while `isMouseOverLocked`). A new `onMainMenuMouseLeave` clears `isHoveredMenu` and `isMainMenuHoverDismissed`.
- **Submenu click:** `onMainMenuClose` also clears `isMainMenuExpanded`.

*Alternative considered:* reusing `isMouseOverLocked` for hover dismissal. Rejected: it means "suppress hover until the close transition ends" and is cleared by `transitionend`, not by pointer leave.

### Document-level Escape listener
WCAG 1.4.13 requires dismissing hover-shown content without moving the pointer, and keyboard focus may be anywhere on the page at that time. So the per-item `@keydown.esc` handlers are replaced with one `keydown` listener on `document`, added in `mounted` and removed in `beforeDestroy`. Lifecycle hooks only run in the browser, so this is SSR-safe.

On Escape, for each open menu:

1. Note whether `document.activeElement` is inside that menu's navigation item.
2. Clear `isMainMenuExpanded`.
3. If `isHoveredMenu` is set, set `isMainMenuHoverDismissed`.
4. If focus was inside the item, focus the toggle button through a setup-owned typed template ref, following the project's template-ref rule. Don't use `querySelector`.

If no menu is open, the listener does nothing, so it doesn't interfere with Escape elsewhere (modals, the search panel).

*Alternative considered:* keeping `@keydown.esc` on the navigation item. Rejected: it can't dismiss a hover-opened menu while focus is outside the item.

### CSS
- Remove `&:focus-within` from the selector that reveals `.m-menu` / `.m-educators-menu`. Keep `&:hover`. Keep the Budsies `&:focus-within > *:not(.sf-mega-menu)` title color highlight, which is a focus style, not a reveal.
- Add `&._expanded` to the reveal rule, bound as `:class="{ _expanded: isMainMenuExpanded }"`, so keyboard expansion reveals the outer layer.
- Add `&._hover-dismissed:hover` to keep `.m-menu` hidden and suppress the `::after` underline. It must appear after the reveal rule (with equal or higher specificity).
- **Button:** by default use the visually-hidden technique (`position: absolute`, 1px clip, `overflow: hidden`), not `display: none`, so it stays focusable and announced. On `:focus-visible`, unclip it into a small chevron positioned absolutely next to the title, with the theme's focus ring. Absolute positioning prevents layout shift.

*Alternative considered:* removing the CSS reveal rules entirely and relying on `v-show`. Rejected: the outer `.m-menu` opacity/visibility transition is part of the current look, and the `:hover` rule also covers the server-rendered first paint.

### Gift card autocomplete
Add `autocomplete="name"` to the Sender name `SfInput`. `SfInput` has `inheritAttrs: false` and spreads `$attrs` into `inputAttributes`, so the attribute reaches the native `<input>`. Only `petsies-theme` changes; `budsies-theme` gets it through the regular merge.

### Testing
Add `src/themes/petsies-capybara/components/organisms/o-header.spec.ts`, using `@vue/test-utils` like `pages/MyAccount.spec.ts`, mounted with `attachTo: document.body` so focus checks work. Stub `@storefront-ui/vue` components and child menus, and provide a mock `$store` with `state.ui.searchpanel` and the `user/isLoggedIn` getter.

The spec asserts state, ARIA, classes, and focus:

- Focusing the title doesn't open the menu.
- Button click toggles `aria-expanded`.
- Escape from a submenu element closes the menu and focuses the button.
- Escape while hovered sets the hover-dismissed class, `mouseover` doesn't reopen, and `mouseleave` then `mouseover` reopens.
- `focusout` to outside collapses the menu.
- The document listener is removed on destroy.

CSS visibility and focus-visible rendering can't be checked in jsdom, so a manual keyboard and screen reader check covers them.

## Risks / Trade-offs

- [One extra Tab stop per dropdown for keyboard users] → This is the cost of the pattern. It's lighter than today, where every dropdown opens as you tab past it.
- [The focus-revealed chevron is a small new visual for keyboard users] → It appears only on keyboard focus and is positioned without layout shift. Styling follows the theme's existing focus ring.
- [The global Escape listener could swallow Escape meant for other UI] → It acts only when a header dropdown is open, and it doesn't call `preventDefault` / `stopPropagation`.
- [Brand branches diverge (cross-menu resets on Budsies and Bulk Orders)] → On each branch, port the behavior, not the diff, and re-run the same spec on each branch.

## Migration Plan

1. Implement and verify on `36631-fix-menu-closing-by-escape` (from `petsies-theme`): Products menu and gift card autocomplete.
2. The developer creates branches from `budsies-theme` and `bulkorders-theme`. Apply the header pattern to Products + Educators (Budsies) and About + Products (Bulk Orders).
3. Rollback: revert the theme commits. No data or config changes.
