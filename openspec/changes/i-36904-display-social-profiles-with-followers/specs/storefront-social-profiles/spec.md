# Storefront social profiles

## Purpose

Show prospective customers the brand's social presence and audience using the profiles and counts that content managers maintain in Magento.

## ADDED Requirements

### Requirement: Store-specific social profiles

The Petsies storefront SHALL use only the active Store View's `social_profile` catalog data. It SHALL show a profile when `is_enabled` is true and the network is `youtube`, `facebook`, `instagram`, `x`, `pinterest`, or `tiktok`. The storefront SHALL use the destination Magento exports without checking its presence, format or protocol, and SHALL order profiles by ascending `position`, then ascending `id`. The storefront MUST NOT fall back to hardcoded links or call social-network APIs.

#### Scenario: Store View and order determine the links
- **WHEN** the active Store View's catalog contains several profiles with distinct or tied positions
- **THEN** the footer links to that Store View's eligible profiles in ascending position and, for ties, ascending ID order

#### Scenario: Ineligible profiles do not make links
- **WHEN** the catalog contains a disabled profile or a profile on an unknown network alongside eligible profiles
- **THEN** the footer skips those profiles and still displays the eligible ones

#### Scenario: No eligible profiles
- **WHEN** no profiles are eligible, including when the catalog returns an empty list
- **THEN** the footer has no social block, heading or space reserved for it

### Requirement: Store-scoped profile endpoint

The Vue Storefront API SHALL expose `GET /api/ext/budsies/social-profiles` using only the deployment's configured Store View `social_profile` index. The endpoint SHALL return the standard `{code, result}` envelope with a profile array on success, including `[]` when the index has no profiles, without revalidating Magento's indexed values. A failed read MUST return a non-success response rather than an empty success. The storefront SHALL check the status code using the same TaskQueue contract as the rush-upgrade loader and use the successful result without a separate shape check.

#### Scenario: Only the configured store supplies the list
- **WHEN** the configured Store View and another Store View contain different profiles
- **THEN** the endpoint returns only documents from the configured Store View

#### Scenario: An empty index is distinct from a search failure
- **WHEN** the configured index exists and has no profiles
- **THEN** the endpoint returns HTTP 200 with `{code: 200, result: []}`
- **AND** when the search fails instead, the endpoint returns a non-success HTTP status in the standard envelope

### Requirement: Optional compact social counts

Each shown profile SHALL display the count exported by Magento when it is above zero. Each visible count SHALL have a small filled single-person icon to the left, aligned with the digits and in the same color. Every network, including YouTube, SHALL use that icon. The storefront SHALL rely on Magento to apply count visibility and validate the value. A displayed count below 1,000 SHALL be displayed in full. For counts from 1,000, the largest applicable unit among K (thousands), M (millions), and B (billions) SHALL be used; the result SHALL be rounded down to at most one decimal place without a trailing `.0`. The format SHALL be identical across locales and on the server and browser.

#### Scenario: Omitted counts leave the profile link
- **WHEN** Magento exports a count of `0` or `null` for an eligible profile
- **THEN** the link remains visible without either the count or its person icon, and its URL remains in homepage Organization `sameAs`

#### Scenario: The person icon identifies every shown count
- **WHEN** an Instagram follower count and a YouTube subscriber count are shown
- **THEN** the same small filled person icon appears immediately to the left of each number, aligned with and matching the color of the digits

#### Scenario: Counts are not overstated at unit boundaries
- **WHEN** shown profiles have counts of `999`, `1000`, `1250`, `999999`, `1000000`, `2549000`, `1000000000` or `1200000000`
- **THEN** the respective text is `999`, `1K`, `1.2K`, `999.9K`, `1M`, `2.5M`, `1B` or `1.2B`, unchanged by locale or hydration

### Requirement: Responsive and reusable social list

The reusable theme social-profile component SHALL render the active store's eligible profiles with either supplied SVG icon set, selected by its caller, without depending on footer markup. The component SHALL encapsulate its spacing and sizing and expose `--social-profiles-icon-size` and `--social-profiles-justify-items` for other themes to override. The Petsies footer SHALL use the circled set at the existing placements and default sizes: the full 30px icon on mobile and a 44px icon centered in a 42px clipping box on desktop. Counts SHALL appear beside or below their icon in the footer's existing text colors. Every link SHALL be as wide as the widest link, so the network icons are evenly spaced whatever the count lengths. The supplied icons MUST NOT be altered and their Font Awesome attribution comments SHALL be preserved. Footer links, newsletter, brands and legal content SHALL retain their layout and behavior.

#### Scenario: Six profiles at the narrowest supported width
- **WHEN** six eligible profiles with visible counts, including longer labels, are displayed at 320px viewport width
- **THEN** all six links and their count icons are visible without horizontal scrolling in the existing mobile social placement
- **AND** the list is centered; below 390px, six profiles form two rows of three evenly spaced links

#### Scenario: Even spacing with different count lengths
- **WHEN** the shown profiles have counts of different lengths, such as `1K` and `999.9K`, or some have no count
- **THEN** every link is as wide as the widest one and the network icons are evenly spaced

#### Scenario: Petsies retains its desktop placement
- **WHEN** Petsies displays eligible profiles on desktop
- **THEN** the social list remains in the existing desktop footer placement, with the circled network icons at their existing size and the count rows clear of the newsletter form
- **AND** the other footer sections retain their layout and behavior

#### Scenario: Another theme selects an icon size
- **WHEN** a caller sets `--social-profiles-icon-size`
- **THEN** the network icon box uses that size on mobile and desktop, with the desktop image retaining its 1px clipping offset on each side, while the person icon scales with the count text

#### Scenario: Another theme aligns the links in their columns
- **WHEN** a caller sets `--social-profiles-justify-items`, for example to `start`
- **THEN** each link, with its network icon and count, is aligned that way within its equal-width column on mobile and desktop, and the network icons stay evenly spaced; without it, links are centered

### Requirement: Accessible social links

Each shown profile SHALL have one operable link per visible layout, with the network icon and any visible count and its person icon inside the link. Both icons SHALL be decorative. Links SHALL open in a new tab with `rel="noopener noreferrer"`, be reachable in visual order by keyboard, and show a visible focus outline around the whole link. The accessible name SHALL contain the brand, the network label, any visible count verbatim with its noun (`subscribers` for YouTube; `followers` for the others), and a new-tab announcement. User-facing wording SHALL use theme translations. Network labels SHALL be YouTube, Facebook, Instagram, X, Pinterest and TikTok; X MUST NOT appear as Twitter.

#### Scenario: Keyboard and assistive technology identify the same link
- **WHEN** a visitor tabs through visible profiles whose Instagram and YouTube counts are `214K` and `1.2K`, respectively
- **THEN** each receives focus once in display order, the outline surrounds the network icon and count row, and its accessible name includes the brand, network, `214K followers` or `1.2K subscribers`, and the new-tab announcement
- **AND** neither icon adds an announcement or a separate focus stop, and no hidden or empty social link receives focus

#### Scenario: An undisplayed count is not announced
- **WHEN** a profile's count is zero, hidden or unavailable
- **THEN** the accessible name announces the brand, network and new-tab behavior without count text or a count noun

### Requirement: Shared server-rendered profiles and structured data

The footer and the homepage Organization schema SHALL read the same profile result, using at most one profile catalog request per render. Server-rendered HTML SHALL contain the links and eligible counts, and the browser SHALL hydrate that result without another profile request, a markup mismatch or layout shift caused by the feature. Organization `sameAs` SHALL contain exactly the shown URLs in the same order and SHALL be omitted when the shared result has no shown profiles. The schema's existing homepage-only placement SHALL remain unchanged.

#### Scenario: Homepage hydration uses the catalog result already rendered
- **WHEN** a homepage with the footer renders and hydrates with eligible profiles
- **THEN** both the footer and Organization `sameAs` contain the same ordered URLs in the server-rendered HTML, and the browser reuses the result without a second profile request or changing the initial social markup

#### Scenario: No URLs in structured data for an empty list
- **WHEN** the homepage has no eligible profiles
- **THEN** the Organization schema is still present where it otherwise would be, without a `sameAs` property

### Requirement: Profile changes refresh cached pages

The profile loader SHALL mark a successful load with the base `social_profile` cache tag through the existing shared action-level tagging mechanism, even when no links are shown. After Magento reindexes a profile change and invalidates that tag through the configured path, the next page load SHALL use updated profiles and counts rather than previously tagged output. Correct assignment of cache tags to individual concurrent renders is not guaranteed by the shared mechanism.

#### Scenario: First visible profile appears after invalidation
- **WHEN** a page with no eligible profiles has been cached and a first profile is added or enabled, reindexed and invalidated
- **THEN** the next page load renders the new link, including its count if eligible

#### Scenario: An existing link or count changes
- **WHEN** a previously cached profile's URL, order, count or visibility changes and the result is reindexed and invalidated
- **THEN** the next page load displays the updated list and the homepage schema matches it

### Requirement: Profile load failure does not fail the page

When the profile loader observes a failed request, it SHALL log the failure, render the normal page without social links, a social block or Organization `sameAs`, and mark it `no-cache` through the existing shared action-level tagging mechanism. A profile load failure MUST NOT cause a redirect to the error page. A response carrying `no-cache` MUST NOT be written to the SSR output cache, but the shared mechanism does not guarantee that the mark reaches the failing render during concurrent SSR. The loader awaits the request without a feature-specific deadline.

#### Scenario: Failed backend request leaves the rest of the page usable
- **WHEN** the profile request reports failure on a fresh homepage render without a competing SSR request
- **THEN** the storefront logs the failure and renders the page normally without a social block or `sameAs`
- **AND** the failed result is not written to SSR output cache and the next fresh render can load recovered data
