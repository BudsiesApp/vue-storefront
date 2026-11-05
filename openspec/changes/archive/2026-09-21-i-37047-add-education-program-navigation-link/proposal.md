## Why

Customers do not consistently recognize that the top-level Educators label links to the Education Program page. Adding an explicit submenu item makes the page discoverable while preserving access to the existing classroom product links.

## What Changes

- Add an "Education Program" item as the first entry in the Budsies desktop Educators dropdown.
- Add the same item before the classroom product links in the Budsies mobile Educators section.
- Route the new item to `/teachers/`, matching the existing top-level Educators destination.
- Preserve the current top-level Educators links, submenu interaction behavior, styling, and existing classroom entry destinations.
- Leave navigation on Petsies, Stuffed Animal Pros, and Waggables unchanged.
- Exclude correction of the pre-existing mobile Classroom Budsies destination mismatch from this change.

## Capabilities

### New Capabilities

- `educators-navigation`: Defines the Budsies Educators navigation contents, ordering, destinations, and interaction preservation across desktop and mobile.

### Modified Capabilities

None.

## Impact

- Affects the Budsies theme desktop Educators menu and mobile Products menu data.
- Adds a new translatable navigation label to the theme locale catalogue.
- Does not change APIs, dependencies, routes, or navigation behavior in other storefront themes.