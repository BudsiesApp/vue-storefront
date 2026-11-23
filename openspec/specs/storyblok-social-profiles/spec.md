# storyblok-social-profiles Specification

## Purpose
Let content editors surface the active storefront's Magento-managed social profiles and follower counts in Storyblok without maintaining a second copy of the data.

## Requirements

### Requirement: Editors can place a Social Profiles block

The system SHALL provide a nestable Storyblok block named `social_profiles`, displayed as **Social Profiles** in the Promotion group. Editors SHALL be able to add, move, reorder and remove it in page sections and columns without developer changes for each placement. The block SHALL provide the standard **Styles** tab with CSS classes, Alignment, Spacing settings and Display options, and SHALL honor those options. The block SHALL NOT expose per-profile fields or page-sharing actions. Existing Storyblok content, including `sharing` blocks, SHALL render and behave as before without migration.

#### Scenario: An editor places the block among other content
- **WHEN** an editor adds the block from the Promotion group to a section or column, reorders it, moves it or removes it
- **THEN** the page reflects the block's saved placement or removal without code changes
- **AND** the block honors the standard CSS classes, spacing and mobile/desktop display settings

#### Scenario: A page already uses the sharing block
- **WHEN** existing content renders with the `sharing` block
- **THEN** it still offers its existing page-sharing actions without a content migration
- **AND** any Social Profiles block instead links only to the brand's profiles

### Requirement: Profiles match the active Store View footer

The block SHALL show the same Magento-managed destination URLs, network order, formatted counts and profile/count visibility as the active Store View's footer. Storyblok SHALL store no profile URLs, counts or visibility settings. After Magento reindexes changes and the existing profile-cache invalidation path refreshes the page, the block and footer SHALL show the changes on the same next page load without editing the story. The block SHALL use the exported count regardless of whether Magento manages it manually or automatically. If there are no shown profiles, the published block SHALL render neither content nor empty block spacing.

#### Scenario: Magento hides a profile or count
- **WHEN** one profile is hidden in Magento and a second profile is visible with its count hidden
- **THEN** the block omits the hidden profile and shows the second profile link without a count or person icon, matching the footer

#### Scenario: An indexed profile change refreshes a cached page
- **WHEN** Magento changes a URL, order, visibility or count, including a count switched from manual to automatic, and the result is reindexed and the existing cache tag invalidated
- **THEN** the next page load shows the same updated links and counts in the block and footer without a Storyblok edit

#### Scenario: No profiles are shown
- **WHEN** a published page contains the block but the active Store View has no shown profiles
- **THEN** the block contributes no links, wrapper, margin or padding, even if spacing values are configured for it
- **AND** any background and spacing owned by its containing section or column are unaffected

### Requirement: Presentation is configurable per block

Each block SHALL offer the footer's **Circled** and **Plain** icon sets, defaulting to Circled when unset. The optional **Color** SHALL apply one color to the network icons, count text and person icons, defaulting to the theme text color when unset. It SHALL NOT affect the focus outline. The existing icon files SHALL remain unchanged and SHALL NOT be duplicated for recoloring; their Font Awesome attribution SHALL be preserved.

**Desktop size** SHALL be required and start with **Medium** selected on a new block. **Mobile size** SHALL be optional. Both SHALL offer **Small** (16px), **Medium** (32px) and **Large** (42px). When no Mobile size is selected, the mobile network icons SHALL use the selected Desktop size. Size options SHALL NOT resize the count text or the person icon. The standard alignment SHALL place the list left, center or right on desktop and mobile, defaulting to left. Profiles SHALL stay evenly spaced and wrap as in the footer, which wraps only six profiles. In a full-width placement, all six links with visible counts SHALL fit at a 320px viewport without horizontal scrolling for every mobile size. Additional wrapping is not required; the list may overflow in narrow Storyblok grid columns or when five profiles all show long counts in a padded full-width section at 320px.

The only extension to the shared `social-profiles.vue` SHALL be color support. It SHALL use the same inline SVG path for block and footer network icons and accept color through `--social-profiles-color`, defaulting to white for network icons when that property is unset. The block SHALL use the existing `iconSet` prop and the `--social-profiles-icon-size`, `--social-profiles-justify-items` and `--social-profiles-margin` properties for icon set, size, alignment and margin.

#### Scenario: A block uses its default appearance settings
- **WHEN** an editor adds a block without changing its appearance settings
- **THEN** Desktop size is already set to Medium with Mobile size empty, and circled icons use the theme text color and are 32px on desktop and mobile
- **AND** the list is left-aligned

#### Scenario: An editor styles profiles for light and dark sections
- **WHEN** an editor chooses Plain icons, a dark color on a light section or a light color on a dark section, and a different size for each breakpoint
- **THEN** the plain icons, count text and person icons use the selected color and are visible against that background
- **AND** only the network icons use the applicable Desktop or Mobile size

#### Scenario: Six counted profiles fit in a full-width mobile placement
- **WHEN** a full-width block has six visible counts on a 320px viewport and the editor selects any size up to Large on mobile, explicitly or by inheritance
- **THEN** all six links and counts wrap as in the footer and are visible without horizontal scrolling
- **AND** the icons stay evenly spaced and the rows follow the selected left, center or right alignment

### Requirement: Published profile links are accessible and preview clicks do not navigate

Each displayed profile on a published page SHALL provide one keyboard focus stop in display order, with the site's global focus-visible outline around the icon and any visible count. The link SHALL open in a new tab and keep the footer's translated accessible name: brand, network, visible count with its noun (`subscribers` for YouTube and `followers` for the other networks) and a new-tab notice. An omitted count SHALL NOT be announced. The network and person icons SHALL be decorative. In the Storyblok Visual Editor, clicking a displayed profile SHALL NOT open it.

#### Scenario: A visitor tabs through profiles
- **WHEN** a visitor tabs through the block on a published page with a mix of shown and hidden counts
- **THEN** each link receives focus once in display order and the site's global focus-visible outline encloses the full link, regardless of the block's selected color
- **AND** the accessible name includes the count and its noun only for profiles with a visible count

#### Scenario: An editor clicks a profile in preview
- **WHEN** an editor clicks a profile in the Storyblok Visual Editor
- **THEN** the profile does not open

### Requirement: Published content is present in the server render and footers stay unchanged

Server-rendered HTML SHALL contain the block's profile links and any visible counts. Hydration SHALL preserve the block's profile links, visible counts and appearance without making another profile request, logging a hydration warning or causing a layout shift. The existing Storyblok section renderer MAY change classes and attributes on the block's root during hydration, provided those guarantees still hold. All storefront footers SHALL retain the appearance and behavior they had before the block was added.

#### Scenario: The browser hydrates a page with the block and footer
- **WHEN** a published page with shown profiles and the block is server-rendered and then hydrated
- **THEN** the block's links and visible counts are present in the initial HTML and unchanged after hydration, and the block's appearance does not change
- **AND** the block causes no hydration warning, layout shift or additional profile request
- **AND** the footer retains its existing icon set, colors, sizes, placement and accessible link behavior
