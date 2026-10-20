# Spec Delta

## Purpose

Defines how keyboard and screen reader users open, navigate, and dismiss desktop header dropdown menus whose titles are also links, following the disclosure navigation pattern, while mouse behavior stays unchanged.

## ADDED Requirements

### Requirement: Menu title link does not open its dropdown on focus
Each desktop header menu that owns a dropdown and whose title links to its own page SHALL keep that title as a link. Moving keyboard focus to the title SHALL NOT open the dropdown, and the title link SHALL NOT expose an expanded or collapsed state.

#### Scenario: Keyboard user tabs to the Products title
- **WHEN** a keyboard user moves focus to the Products title
- **THEN** the Products dropdown stays closed
- **AND** the title is exposed as a link without `aria-expanded`

#### Scenario: Keyboard user activates the Products title
- **WHEN** focus is on the Products title and the user presses Enter
- **THEN** the storefront navigates to the Products page

### Requirement: Menu titles without a destination page are the disclosure button
When a desktop header menu's title has no page of its own (for example, About and Products on Bulk Orders), the title itself SHALL be the disclosure button. It SHALL look the same as before, expose `aria-expanded` and `aria-controls`, and toggle the dropdown with Enter or Space. Moving keyboard focus to it SHALL NOT open the dropdown. Such a menu SHALL NOT have a separate toggle button, and the title SHALL NOT use the `menuitem` role.

#### Scenario: Keyboard user tabs to a title without a page
- **WHEN** a keyboard user moves focus to the Bulk Orders About title
- **THEN** the About dropdown stays closed
- **AND** the title is announced as a button in the collapsed state

#### Scenario: Keyboard user expands a title-button menu
- **WHEN** focus is on the Bulk Orders About title and the user presses Enter or Space
- **THEN** the About dropdown opens, the title reports `aria-expanded="true"`, and the next Tab moves focus to the first submenu link

#### Scenario: Mouse user clicks a title without a page
- **WHEN** a mouse user hovers over the Bulk Orders About title and clicks it
- **THEN** the About dropdown stays open, and a mouse click never closes it
- **AND** the dropdown closes when the pointer leaves the navigation item, as with hover

#### Scenario: Mouse user clicks a title after dismissing it with Escape
- **WHEN** a hover-opened Bulk Orders About dropdown has been closed with Escape, and the user clicks the About title without moving the pointer away
- **THEN** the About dropdown opens and closes when the pointer leaves the navigation item

### Requirement: A disclosure toggle button controls the dropdown
Each menu whose title is a link SHALL provide a toggle button placed directly after its title in the tab order and before the submenu links. For menus whose title is the disclosure button, the requirements below that refer to the toggle button apply to the title button.
- The button's accessible name SHALL identify the submenu (for example, "Products submenu").
- It SHALL expose `aria-expanded` matching the dropdown state, and `aria-controls` referencing the dropdown element.
- Pressing Enter or Space on the button SHALL toggle the dropdown.
- While the dropdown is collapsed, its submenu links SHALL NOT be reachable with Tab.

#### Scenario: Keyboard user expands the dropdown
- **WHEN** focus is on the Products toggle button and the user presses Enter or Space
- **THEN** the Products dropdown opens
- **AND** the button reports `aria-expanded="true"`
- **AND** the next Tab moves focus to the first submenu link

#### Scenario: Keyboard user collapses the dropdown with the button
- **WHEN** the Products dropdown is expanded, focus is on its toggle button, and the user presses Enter or Space
- **THEN** the dropdown closes and the button reports `aria-expanded="false"`

#### Scenario: Keyboard user skips a collapsed menu
- **WHEN** the Products dropdown is collapsed and the user tabs from the toggle button
- **THEN** focus moves to the next header item after the Products menu, skipping the submenu links

### Requirement: The toggle button is visible only on keyboard focus
The toggle button SHALL be visually hidden while it doesn't have keyboard focus, so the header looks unchanged for mouse users. When it receives keyboard focus it SHALL become visible with a visible focus indicator, without shifting the header layout. While hidden, the button SHALL stay available to assistive technology.

#### Scenario: Mouse user views the header
- **WHEN** a mouse user views or hovers over the header
- **THEN** no toggle button is visible and the header looks the same as before this change

#### Scenario: Keyboard user focuses the toggle button
- **WHEN** a keyboard user tabs from the Products title to its toggle button
- **THEN** the toggle button is visible with a focus indicator
- **AND** the positions of the other header items do not change

### Requirement: Escape closes the header dropdown
Pressing Escape while a header dropdown is open SHALL close it.
- If focus was on the toggle button or inside the dropdown, focus SHALL move to the toggle button. A dropdown closed this way SHALL stay closed until the user activates the toggle button again.
- If the dropdown was opened by hover, it SHALL close without the pointer moving, and stay closed until the pointer leaves the navigation item and enters it again.

#### Scenario: Escape pressed inside the dropdown
- **WHEN** a keyboard user has expanded the Products dropdown, tabbed to a submenu link, and presses Escape
- **THEN** the dropdown closes
- **AND** focus moves to the Products toggle button
- **AND** the button reports `aria-expanded="false"`
- **AND** the dropdown stays closed while focus remains on the button

#### Scenario: Escape pressed on the toggle button
- **WHEN** the Products dropdown is expanded, focus is on its toggle button, and the user presses Escape
- **THEN** the dropdown closes and focus stays on the toggle button

#### Scenario: Escape pressed while the pointer rests over the menu
- **WHEN** the pointer rests over the Products menu, its dropdown is open, and the user presses Escape
- **THEN** the dropdown closes even though the pointer has not moved
- **AND** small pointer movements within the navigation item do not reopen it

#### Scenario: Pointer reopens after Escape
- **WHEN** a hover-opened dropdown has been closed with Escape, and the pointer leaves the navigation item and enters it again
- **THEN** the dropdown opens as it normally does on hover

### Requirement: Focus leaving the menu closes a keyboard-opened dropdown
When a dropdown was opened with the toggle button and focus moves outside the navigation item, the dropdown SHALL close.

#### Scenario: Tabbing past the last submenu link
- **WHEN** the Products dropdown is expanded and the user tabs past its last submenu link
- **THEN** the dropdown closes and focus moves to the next header item

#### Scenario: Shift+Tab out of the menu
- **WHEN** the Products dropdown is expanded and the user moves focus before the Products title with Shift+Tab
- **THEN** the dropdown closes

### Requirement: Pointer interactions are preserved
The change SHALL NOT alter header dropdown behavior for pointer users.
- Hovering over the navigation item opens the dropdown, and moving the pointer away closes it.
- Clicking the title navigates to its page.
- Clicking a submenu link navigates and closes the dropdown.
- The page overlay is shown exactly when a dropdown is open.
- The visual styling of titles and dropdowns does not change.

#### Scenario: Mouse user hovers and leaves
- **WHEN** a mouse user hovers over Products and then moves the pointer away, without pressing Escape
- **THEN** the dropdown and overlay open and close as before this change

#### Scenario: Mouse user activates a submenu link
- **WHEN** a mouse user clicks a submenu link
- **THEN** navigation and the existing close-after-click behavior are unchanged

### Requirement: All header dropdowns in a brand theme behave the same
Every desktop header menu with a dropdown in a brand theme that has one SHALL follow the requirements above.

#### Scenario: Other brand menus
- **WHEN** a keyboard or pointer user uses Educators on Budsies, or About on Bulk Orders
- **THEN** that menu behaves as specified for Products
