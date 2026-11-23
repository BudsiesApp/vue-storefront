# Proposal

## Why

Content editors can show the brand's Magento-managed social profiles and follower counts only in the storefront footer. Let them place the same profiles on Storyblok pages, including light or dark sections, without duplicating data or asking a developer to add each placement.

## What Changes

- Add a nestable **Social Profiles** block for sections and columns, with a per-instance icon set, color and desktop/mobile icon sizes, plus the standard Storyblok Styles options.
- Show the active Store View's links, counts and visibility in the same order as the footer. Reuse the existing server-rendered data and Magento refresh path without adding a profile request or storing profile data in Storyblok.
- Use the storefront's standard keyboard focus outline, independent of the selected block color, and prevent profile clicks from opening links in the Visual Editor. Reuse the footer's wrapping behavior in full-width placements and omit the block when there are no shown profiles.
- Preserve footer appearance and behavior, page sharing and the visible rendering of existing Storyblok content. Wrapping beyond the footer's behavior is out of scope, including narrow grid columns and the five-profile case with long counts in a padded full-width section at 320px. Applying the schema to Storyblok spaces and changing how the existing section renderer updates nested block roots during hydration are also out of scope.

## Capabilities

### New Capabilities

- `storyblok-social-profiles`: Editor placement and styling, profile parity with the footer, and storefront rendering of the Social Profiles block.

### Modified Capabilities

None.

## Impact

- `vue-storefront` / `src/themes/petsies-capybara` theme submodule: add a Storyblok renderer and use one inline SVG path in the shared list for colored block icons and white footer icons. Use the list's existing options for icon set, sizing, alignment and margin. Neither footer callers nor the existing profile data flow change.
- `vue-storefront` build: allow raw imports of the existing icon SVGs for recoloring, while keeping ordinary asset imports unchanged.
- `storyblok-components`: add a nestable `social_profiles` schema.
- No changes to the Magento configuration, indexer, Vue Storefront API, or Storyblok content already in use.
