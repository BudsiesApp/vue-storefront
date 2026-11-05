## 1. Navigation Items

- [x] 1.1 Add the localized "Education Program" item with destination `/teachers/` before the classroom entries in the desktop Educators item array, and verify the existing classroom item definitions are unchanged.
- [x] 1.2 Add the same first item to the mobile Educators item array, and verify the existing mobile classroom destinations remain unchanged.

## 2. Localization

- [x] 2.1 Run `yarn update-i18n-files` and verify the Budsies English locale catalogue contains the "Education Program" key without unrelated manual translation edits.

## 3. Validation

- [x] 3.1 Run focused lint and type-check validation for the changed theme components and verify no new diagnostics are introduced.
- [x] 3.2 Verify on desktop that Educators remains linked to `/teachers/`, hover and focus open the dropdown, Education Program appears first and navigates to `/teachers/`, both classroom links retain their destinations, and Escape and focus-exit behavior still work.
- [x] 3.3 Verify on mobile that Education Program appears before both classroom links, all three entries are reachable by touch and keyboard, selecting each entry closes or navigates as before, and the Educators title still links to `/teachers/`.
- [x] 3.4 Verify the navigation contents of Petsies, Stuffed Animal Pros, and Waggables are unchanged.