## Context

See `proposal.md` for motivation and `specs/educators-navigation/spec.md` for required behavior.

The Budsies theme renders Educators submenu entries from separate local arrays: the desktop dropdown uses `m-educators-menu.vue`, while the mobile section is part of `m-menu.vue`. The top-level desktop and mobile Educators links already target `/teachers/`. Existing header code owns hover, focus, Escape-key, and close behavior and does not derive that behavior from the submenu item count.

The mobile Classroom Budsies entry currently points to the Classroom Selfies product route. Although this differs from desktop and appears inconsistent with earlier task intent, the current change requires existing destinations to remain unchanged.

## Goals / Non-Goals

**Goals:**

- Add the same first submenu entry to the existing desktop and mobile Educators item arrays.
- Reuse the existing `/teachers/` internal route form and existing menu-item rendering so styling and interactions remain consistent.
- Add the label through the established localization workflow.

**Non-Goals:**

- Refactor the duplicated desktop and mobile menu data into a shared abstraction.
- Change header hover, focus, keyboard, touch, or close-event logic.
- Correct or otherwise alter either classroom product destination.
- Modify navigation in another storefront theme.

## Decisions

### Add a local item to each existing menu array

Insert `{ label: this.$t('Education Program'), url: '/teachers/' }` before the classroom entries in both menu components.

This follows the existing ownership model and keeps the implementation to the two rendering surfaces that require the item. A shared menu-data module was considered, but it would broaden a small content change and create refactoring risk without improving the requested behavior.

### Use the relative `/teachers/` route

Use the same relative destination as the existing top-level Educators links. This preserves client-side routing and allows the active Budsies host to determine the absolute URL.

An absolute `https://www.budsies.com/teachers/` URL was considered, but it would be inconsistent with the current internal links and could bypass normal router behavior.

### Leave interaction code unchanged

The existing list loop automatically renders additional entries with the same markup, click-close behavior, focusability, and styling. No header state or event-handler changes are needed.

Adding special-case markup was considered, but it would duplicate established rendering and introduce unnecessary behavioral differences.

### Preserve the current mobile Classroom Budsies destination

Do not include the observed destination mismatch in this change. Correcting it would violate the explicit requirement to keep existing destinations unchanged and should be handled as separate work if desired.

## Risks / Trade-offs

- [Desktop and mobile arrays can drift] -> Add the same item and ordering to both arrays and validate both rendered menus.
- [A new translation key can be omitted from generated locale files] -> Run the established i18n update command and verify the English catalogue contains "Education Program".
- [Menu interaction could regress despite a data-only change] -> Exercise mouse, touch, Tab, Shift+Tab, Enter, and Escape flows on the affected menus.
- [The known mobile Classroom Budsies destination remains inconsistent] -> Keep it explicitly out of scope and avoid touching the existing entry.

## Migration Plan

No data migration or staged rollout is required. Deploy with the Budsies theme changes and roll back by reverting the two menu-array additions and generated locale entry.