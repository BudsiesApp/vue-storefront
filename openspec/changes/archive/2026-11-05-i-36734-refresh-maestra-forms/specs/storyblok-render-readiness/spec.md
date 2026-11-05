# Spec Delta

## Purpose

Provide a reliable Storyblok rendering boundary that lets each storefront page announce completion after its own data and explicitly declared story content are ready.

## ADDED Requirements

### Requirement: Storyblok component registrations have groups

The registry SHALL accept an optional group alongside the existing force option. Registrations without a group SHALL belong to the default group. A dedicated exported core group SHALL identify components required to render Storyblok content, including layout and HTML blocks, bundled in `vsf-storyblok`. Existing duplicate and forced replacement behavior SHALL remain compatible.

#### Scenario: Registration omits a group
- **WHEN** a component is registered without a group
- **THEN** it belongs to the default group

#### Scenario: Registration specifies a group
- **WHEN** a component is registered with the core group
- **THEN** it belongs to that group

#### Scenario: Registration replaces an existing key
- **WHEN** a duplicate registration is attempted without force and then with force
- **THEN** the first attempt preserves the existing component and group, and the forced attempt applies the replacement component and its supplied or default group

#### Scenario: Components can render nested Storyblok content
- **WHEN** the module defaults and theme components are registered
- **THEN** `page`, `debug`, `tile`, `html`, `page_section`, `grid`, `column`, `block`, `block_reference`, `category_description`, and `product_description` belong to the core group
- **AND** every theme registration using `vsf-storyblok` belongs to the core group, as must future registrations that render or contain Storyblok child content or HTML
- **AND** the Affirm components and `remind_me_about_budsies` remain in the default group

### Requirement: Component group loading waits only for the selected group

The registry SHALL provide a loader that invokes every factory in the selected group and resolves after all invoked factories load. It SHALL skip non-function registry entries, including hydration-blocker objects, and SHALL NOT invoke factories belonging to other groups. This contract SHALL have no dependency on Maestra.

#### Scenario: Core group contains factories and hydration wrappers
- **WHEN** the core group is loaded while one of its factories is pending
- **THEN** each core factory is invoked, hydration-wrapper objects are skipped, and loading stays pending until all invoked factories resolve

#### Scenario: Other groups have separate chunks
- **WHEN** the core group is loaded
- **THEN** neither Affirm factories nor the `remind_me_about_budsies` factory is invoked, and their separate chunks are not requested by this loader

### Requirement: Story rendering notifications belong to the completed request

Story components SHALL replace `story-ready` with `story-rendered`, carrying the full slug or slugs captured for the completed load. Product descriptions SHALL include the primary slug and the captured backup slug when fallback is used. When the component renders story content after the load, including a cached backup rendered after a failed primary request, notification SHALL wait for the core group and a subsequent render flush and timer turn. When no content renders, such as a missing story or a failed request without rendered fallback content, notification SHALL complete without waiting for the component chunk. A core-group loading failure SHALL be logged and SHALL NOT prevent the notification. Only the latest load on that component SHALL notify, including when an earlier load becomes superseded during rendering waits.

#### Scenario: First component chunk is delayed
- **WHEN** a story with content finishes loading but core group loading remains pending
- **THEN** no `story-rendered` notification occurs until the group resolves and the subsequent render flush and timer turn complete
- **AND** the story's HTML embed containers exist before readiness can trigger the page refresh

#### Scenario: Story is missing
- **WHEN** the active story load completes without content
- **THEN** `story-rendered` reports that load's slug without waiting for the core group

#### Scenario: Story request fails
- **WHEN** the active story request rejects and no content renders
- **THEN** its completion still reports `story-rendered` without waiting for the core group, allowing the page to finish readiness

#### Scenario: Primary description fails while a cached backup renders
- **WHEN** a product description's primary request rejects while its cached backup content is rendered
- **THEN** the notification waits for the core group and rendering turn before reporting the captured primary slug

#### Scenario: Core group fails to load
- **WHEN** loading the core component group rejects
- **THEN** the error is logged and the notification still completes after the rendering turn

#### Scenario: Story is cached on mount
- **WHEN** a component mounts with cached story content
- **THEN** it follows the same core-group and rendering wait before notifying once for that load

#### Scenario: Requests finish out of order
- **WHEN** load A is delayed, load B starts on the same component, and A then completes
- **THEN** A emits nothing and B's completion reports B's captured slug

#### Scenario: Superseded load was waiting for rendering
- **WHEN** a newer load starts while the older load awaits the core group or rendering turn
- **THEN** the older load emits neither a story notification nor a page readiness event when its wait finishes

#### Scenario: Product description uses a backup
- **WHEN** a product description requires its backup and its product or backup input changes while loading
- **THEN** that load uses the primary and backup captured when it started, never the newer input values
- **AND** only the latest load reports its captured primary slug and, if used, backup slug

### Requirement: Reused story components report changed slugs

Changes to story slug inputs SHALL start a new load and rendering notification cycle even when the new story is cached. This SHALL cover block slugs, product and backup SKUs, category story paths, and route-driven page stories.

#### Scenario: Block story slug changes
- **WHEN** a reused block component receives a different slug
- **THEN** it loads that slug and reports the new full slug after the appropriate rendering boundary

#### Scenario: Changed block story is cached
- **WHEN** a reused block switches to a cached story
- **THEN** it still waits for the core group and render turn and reports the new slug

#### Scenario: Description inputs change
- **WHEN** a reused description component receives a changed product SKU, backup SKU, or category path
- **THEN** it starts a new request-bound completion cycle for those inputs

#### Scenario: Storyblok route path changes
- **WHEN** a route-driven Storyblok page instance is reused for a different path
- **THEN** the destination story uses the same request binding and core-group rendering boundary before notifying page readiness

### Requirement: Page readiness is reset for changed inputs

The readiness helper SHALL combine two indicators: own data is loaded when the page/form tracking key is defined, and each rendered story dependency is ready when its full slug has reported story-rendered. Readiness SHALL emit once per mounted, ready combination of key and dependencies. Changing either input SHALL reset emission state and re-evaluate both indicators from current state, allowing a later emission even when the key is unchanged or returns to an earlier value. Reports for full slugs that remain dependencies SHALL continue to count immediately, including across key changes. Reports SHALL be dropped only for slugs that stop being dependencies. Components SHALL NOT be remounted or given a :key binding to force repeated reports. Stories whose components are absent because of conditional rendering SHALL NOT be dependencies.

#### Scenario: Own data is not available
- **WHEN** the tracking key is undefined or the helper's component has not mounted
- **THEN** story notifications alone do not emit readiness

#### Scenario: All active dependencies render
- **WHEN** the component is mounted, its key is defined, and every declared full slug has reported
- **THEN** readiness emits once, and duplicate reports do not emit again for that combination

#### Scenario: Payload includes unrelated slugs
- **WHEN** a single-slug or multi-slug notification includes slugs absent from current dependencies
- **THEN** only matching full slugs contribute to readiness

#### Scenario: Tracking key changes
- **WHEN** a completed key changes to another defined key or returns to a previously completed key while its reported story dependencies remain unchanged
- **THEN** emission state resets, the earlier reports still count, and readiness emits once for the new key without remounting or requiring another story report

#### Scenario: Dependencies change while the key stays the same
- **WHEN** a customization changes a description slug without changing the product key
- **THEN** emission state resets, reports for unchanged dependencies still count, and reports for removed slugs are dropped
- **AND** readiness emits once again after newly added dependencies report

#### Scenario: Removed dependency is reintroduced
- **WHEN** a reported full slug stops being a dependency and is later added again
- **THEN** its earlier report no longer counts and readiness waits for a new report for that slug

#### Scenario: Empty dependency list stays ready across keys
- **WHEN** a mounted helper with no rendered story dependencies receives a new defined key
- **THEN** it emits once for that key even if the aggregate ready boolean never becomes false between changes

#### Scenario: Conditional story is absent
- **WHEN** a page does not render a conditional story component
- **THEN** that slug is excluded, its report is dropped, and readiness completes from the remaining inputs using their retained reports

### Requirement: Pages explicitly combine their rendered content

Each page below SHALL emit `PAGE_RENDERED` through the shared deferred page-event boundary after its named own-data and story/form inputs are ready. A navigation SHALL produce one emission after those inputs settle; a genuine later key or story-dependency change SHALL permit one additional emission. Pages SHALL wait for nested stories instead of emitting early and refreshing again when a story finishes.

#### Scenario: Ordinary product page
- **WHEN** a product is loaded and its primary or fallback description has reported `story-rendered`
- **THEN** Product emits once for that SKU, including when product-to-product navigation reuses the page instance

#### Scenario: Category page
- **WHEN** the current category record loads into the store with its ID and description slug
- **THEN** Category waits for its rendered category description's full slug, including missing or failed completion, before emitting once
- **AND** readiness does not wait for products
- **AND** a category without a rendered description completes without that dependency

#### Scenario: Nonempty cart page
- **WHEN** cart page state is ready and the shipping/handling story is rendered
- **THEN** DetailedCart waits for `blocks/cart_shipping_handling`, including missing or failed completion, before emitting once

#### Scenario: Empty cart page
- **WHEN** cart page state is ready and no shipping/handling story component is rendered
- **THEN** DetailedCart emits once without waiting for that slug

#### Scenario: Customizable product page
- **WHEN** the selected product form has its SKU and its rendered description or top/bottom stories ready
- **THEN** the form emits `form-ready` from corrected story notifications and CustomizableProduct emits one page event
- **AND** a description dependency changed by customization can produce one further form and page event after it renders

#### Scenario: Forevers and Golf creation pages
- **WHEN** PlushieProduct switches between Forevers and Golf with both top stories cached
- **THEN** it waits for the current type's top story and emits once for each navigation without waiting forever

#### Scenario: Gift card page
- **WHEN** the gift card product is available and its rendered description reports completion
- **THEN** GiftCards emits once after both inputs are ready, including a missing or failed description

#### Scenario: Forevers customize later page
- **WHEN** ForeversCustomizeLater has its selected product and mounted form
- **THEN** it waits for both the slotted `blocks/petsies_creation_page_top` story and the form's description readiness before emitting once
- **AND** changing the selected SKU with the same top-story slug retains that slug's earlier report and emits once for the new key when the form is ready, without remounting or requiring a repeated top-story report

#### Scenario: Existing order item customization page
- **WHEN** OrderItemCustomize has the current product, draft and required alteration data, and its selected form is rendered
- **THEN** it waits for its conditional Forevers/Golf top story and the selected form's description or top/bottom readiness when that form renders those stories
- **AND** the creation-wizard layout uses its mounted form boundary, while the printed-product layout does not wait for an absent top story

#### Scenario: Static content page
- **WHEN** Static finishes updating its default content
- **THEN** its existing deferred page event remains unchanged

#### Scenario: Storyblok page or block route
- **WHEN** the current page or block story finishes its request-bound rendering boundary
- **THEN** its page emits once, including cached mount, missing/failed completion, and route reuse
- **AND** a page destroyed before its request or rendering wait finishes emits nothing
