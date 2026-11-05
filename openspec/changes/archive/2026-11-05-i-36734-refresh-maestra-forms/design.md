# Design

## Context

See `proposal.md` for motivation and scope and the two delta specs for the behavior contract. The source requirements are `tasks/i-36734-refresh-maestra-forms/task.md`; its verified browser observations and solution steps 1–4 are the implementation baseline.

The reviewed diffs are main `git diff petsies-theme...HEAD -- src/modules` and theme `git diff origin/petsies-theme...HEAD`, on `36734-refresh-maestra-forms`. Main already contains MaestraModule, the shared page event/helper, the tracker and page-mixin emissions. The theme already has story-ready producers/consumers, form-ready aggregation, and several page emitters. Modify those paths together.

Relevant current behavior verified in source:

- `components/index.ts` exports a component map and `add(key, component, options)` with duplicate rejection unless `force` is set. Its `block`, description roots, `block_reference`, `grid`, `column`, and `page_section` entries are hydration-blocker objects, not factories.
- All module default imports and all active theme registrations except `remind_me_about_budsies` use `vsf-storyblok`. The two Affirm registrations are in `src/modules/payment-affirm/components/storyblok/index.ts` and use `vsf-affirm-storyblok-components`; leave that registration file unchanged.
- Theme `mixins/story.ts` emits after fetching or immediately for cached mount. Its product-description override reads mutable SKU inputs for the completion payload, and MBlockStory has no slug watcher. The module `components/StoryblokMixin.ts` emits after mounted work or route fetch completion without a group wait or request binding.
- The tracker watches the aggregate ready boolean and deduplicates by tracking key alone. A reset that leaves that boolean true can be missed; dependency changes with the same key also need a new completion cycle.
- `core/client-entry.ts` resolves page components and their asyncData before display; story fetching and nested async imports have later boundaries. The task's verified chunk/microtask behavior supports the existing nextTick/timer approach without block counting.
- MaestraModule already imports EventBus explicitly, exits on the server, reads `url/getPrevRoute.fullPath`, checks the SDK method, and catches/logs errors. URL state initializes the previous route to `{}`. Theme `registerClientModules()` already uses `registerModule(MaestraModule)`.

## Goals / Non-Goals

**Goals:** Make the existing explicit page contract reliable across cached stories, slow first chunk loading, request races and reused page instances. Keep fetching in existing Vuex actions and preserve SSR fetching, hydration behavior and editor bridge behavior.

**Non-Goals:** The exclusions in `proposal.md` apply. No central registry of page participants, new dependency, runtime configuration, or generalized readiness framework is needed.

## Decisions

### 1. Group the existing registry and load its factories (task step 1)

Export `StoryblokComponentGroup` with `DEFAULT = 'default'` and `CORE = 'core'`, and export `loadStoryblokComponentGroup(group)` from `components/index.ts` and the module public index. `CORE` means “components required to render Storyblok content (layout and content blocks, including `html`); bundled in the `vsf-storyblok` chunk.” These names describe the rendering contract without coupling it to Maestra.

Keep membership beside the existing component map in the same file. Type the existing options as optional `force` and optional string `group`; omitted groups become DEFAULT. Apply membership only for accepted registrations, so a skipped duplicate cannot change it and a forced replacement uses its replacement options. Register all module defaults, including wrapper entries, as CORE; add the CORE option to each theme registration whose import names `vsf-storyblok`. Do not add a separate registration helper or public metadata-query API.

The loader filters by membership, calls function entries and awaits them with Promise.all. Its `typeof entry === 'function'` check prevents calling actual hydration-blocker objects. Other groups' factories are never invoked. It needs no independent memoization: webpack already shares pending chunk downloads and resolves loaded chunks. The loader itself keeps ordinary promise rejection; the render-wait helper (decision 2) logs a rejection and continues, so a failed chunk cannot strand page readiness. Add no retry/timeout policy.

The grouping rule and registration regression protect future layout/content additions. Loading every registry entry would fetch unrelated chunks and attempt to call wrapper objects; those are the concrete failures the group filter and function check prevent.

### 2. Make each story completion request-bound (task step 2)

Rename the local component event to `story-rendered`, with a `string[]` producer payload. Rename the existing tracker callback and payload symbols to `onStoryRendered` and `StoryRenderedPayload`; retain its ability to consume a single string or array. The event rename communicates that request completion alone is insufficient. Update all existing producers and listeners together; do not emit both names.

Use theme `loadStory()` as the shared load/finally boundary, with a per-instance incrementing load identifier. Components override `fetchStory()`, which captures its slug inputs and returns the full slugs of that request. Capture product SKU and backup SKU before any await, including the fallback dispatch: a stale primary response must never choose the newer product's backup. The report contains the captured primary slug plus the captured backup slug when that fallback was selected. Cached fallback content follows the same rule.

Add `helpers/wait-for-storyblok-content-render.function.ts` in `src/modules/vsf-storyblok-module`, exporting `waitForStoryblokContentRender(): Promise<void>` through the module public index. It awaits the CORE group loader, then Vue nextTick, then a zero-delay timer. Both story mixins call this helper so the render-wait sequence has one implementation; request identifiers and stale checks remain in each mixin. Its callers retain the existing client-lifecycle boundary. A group-load rejection is logged with the `storyblok` tag and the wait continues with the render flush and timer turn.

For the current request, finalization is:

1. Settle the existing story dispatch or cached lookup; finalize in `finally` so a missing story or rejected request cannot strand readiness.
2. If the component renders story content after the load, await `waitForStoryblokContentRender()`. Decide from the rendered state (`showStory`), not from the request result: a failed primary request can still leave a cached product-description backup on screen, which needs the chunk wait. With the chunk present, the task's verified remaining rendering work drains before that helper resolves.
3. If nothing renders (a missing story, or a failed request without rendered fallback content), notify immediately without loading the group.
4. Recheck the load identifier before work and after asynchronous waits, then emit the captured slugs. The identifier prevents an older request, chunk wait or timer from marking a newer story rendered.

MBlockStory watches its effective slug; MCategoryDescriptionStory reloads on its effective category path; MProductDescriptionStory watches both primary and backup inputs. Each effective input change starts one cycle, including cached lookup. Avoid adding overlapping watchers that dispatch/report twice for one change.

Apply the same snapshot/identifier/finally sequence to module StoryblokMixin's mounted and route-path-change work. Snapshot its current fixed path or normalized route full slug and preview inputs before awaiting token or story dispatch. Preserve draft/preview fetching and the bridge's current input/published/change handling. A cached mounted story uses one completion cycle rather than a cached notification plus a second fetch notification. That boundary schedules its single page event via the existing shared helper; no page caller adds another unconditional emission. The mixin's components are route pages with no parent listener, so it emits no local `story-rendered`. `beforeDestroy` invalidates the load identifier, so a request or render wait that finishes after the page is destroyed cannot emit `PAGE_RENDERED` onto the destination page. Keep serverPrefetch fetching, with browser render waits and page reporting confined to client lifecycle work.

### 3. Retain the tracker and reset the complete input combination (task step 3)

Keep `useStoryblokReadinessTracker`: it still tracks Storyblok dependencies, so renaming the composable would add migration work without clarifying its purpose. Its tracking key remains the explicit own-data input; undefined blocks readiness, and mounted state remains a separate prerequisite.

Following the operator's 2026-11-05 decision, changing the key or dependency values resets emission state and re-evaluates both readiness indicators from current state: own data is ready when the key is defined, and each dependency is ready when that same full slug has reported story-rendered. Keep reports for slugs that remain dependencies, including across a key change; drop reports only when their slugs stop being dependencies, so a reintroduced slug needs a new report. Evaluate the actual input combination and readiness state, not only transitions of an aggregate boolean; this handles empty dependency lists, same-SKU description changes and revisiting an earlier SKU. No component is remounted or given a :key binding to force a repeated report. Notifications for unrelated full slugs do not satisfy current dependencies; the request identifiers from decision 2 prevent obsolete responses from impersonating current reports.

Use existing product-description full-slug helper for matching. Category matching retains the molecule's existing `category-descriptions/${url_path.replace('/', '_')}` rule; do not broaden URL normalization as part of this task. Build conditional dependencies from the same predicates that render their story components.

Add `theme:helpers/use-form-page-readiness.ts`, exporting `useFormPageReadiness(trackingKey, storyDependencies, onReady)` with the same ref/callback input types as the existing tracker. It reuses `useStoryblokReadinessTracker` for the page's own story dependencies and returns `onStoryRendered` plus `onFormReady`. Both ForeversCustomizeLater and OrderItemCustomize use it: page story events call the former, and the selected form's form-ready calls the latter (the creation-wizard layout calls it from hook:mounted). The composable accepts either completion order and calls onReady once when the mounted page has a defined own-data key, its own stories are ready, and the form has reported. Key changes clear form and completion state; its page stories follow the reset semantics above. A later form-ready permits one more completion for newly ready form content, using the current page-story readiness from the underlying tracker. An empty own-story list completes from the defined key, mounted state and form signal. This shares the identical combination logic without synthetic story dependencies or duplicated page state.

### 4. Page/route audit and exact wiring (task step 3)

Paths below are relative to `src/themes/petsies-capybara` unless prefixed with `src/modules/`. The audit covered all files in `pages/`, all route entries and redirects in `router/index.js`, and the shared forms used by those routes. Every row identifies the content source and its resulting wiring; there are no remaining page-discovery tasks.

| Page and route coverage | Storyblok content found | Implementation wiring |
| --- | --- | --- |
| `src/modules/vsf-storyblok-module/pages/StoryblokPage.vue`: `storyblok-page`, plus `storyblok-single-component-visual-editor-mode` | `sb-render` renders the page story. The module mapping fallback supplies landing/home routes; `/home/` redirects to `/`. | Correct the inherited StoryblokMixin boundary using decision 2, including cached mount and route reuse. |
| `src/modules/vsf-storyblok-module/pages/StoryblokBlock.vue`: `storyblok-block` | `sb-render` renders the block story for block preview mapping. | Same inherited StoryblokMixin boundary. |
| `pages/Product.vue`: all nine Product route entries (`virtual-product`, `bundle-product`, `simple-product`, `downloadable-product`, `grouped-product`, `configurable-product`, `plushToyAccessory-product`, `petsiesStarProduct-product`, `product`) | MProductDescriptionStory receives current SKU and parent SKU fallback. | Add tracker in setup using `useStore()` for current product, key = loaded SKU, primary full-slug dependency, listener = onStoryRendered; its payload covers fallback. Reused product instances reset and emit for the next SKU. |
| `pages/Category.vue`: `category` and its aliases | Conditional MCategoryDescriptionStory; `showCategoryDescription` requires a nonempty category and url_path. | Key = current category ID from the store as a string, set together with the description slug when the category record loads. Do not wait for products or add a pageDataReady flag. Wait for the normalized category slug only when the component renders. Replace the two early emitPageRendered calls with this readiness boundary. |
| `pages/DetailedCart.vue`: `detailed-cart` | `cart_shipping_handling` MBlockStory is inside `v-if="totalItems"`. | Key = `'cart'` only when existing mounted/cart-loaded state is ready. Include `blocks/cart_shipping_handling` only for a nonempty cart, and listen for its report. Removing the last item drops this dependency and permits one more page event; this is accepted because the page content changes to the empty-cart view. Replace the direct emission in the isLoading watcher; retain CART_VIEWED behavior. |
| `pages/CustomizableProduct.vue`: every route using this page (pillows, socks, masks, keychains, blankets, figurines, bobbleheads, pajamas, tumblers, shirts, portraits and huggables) | FormWithImagesGallery renders a dynamic product description with parent fallback; VerticalStepsForm and PhrasePillowForm render SKU-derived top/bottom stories. | Retain page forwarding from form-ready. Update the three forms' event listeners/trackers, key = SKU, and list only rendered description or top/bottom slugs. A changed description must re-complete with the same SKU. |
| `pages/PlushieProduct.vue`: `forevers-create`, `golf-covers-create` and their redirects | Conditional top MBlockStory selects `petsies_creation_page_top` or `golf_cover_creation_page_top`. | Retain type key and conditional top dependency; update event listener. Decision 2 supplies cached slug-change reports for the reused component. |
| `pages/GiftCards.vue`: `gift-cards` and gift-box redirects | Conditional MProductDescriptionStory receives the gift-card SKU. | Add a `setup()` using `useStoryblokReadinessTracker`: key = the current gift-card SKU from the store (`GiftCard` or the Amasty gift-card SKU), dependency = its product-description slug. The order form is a static child, so page mount implies form mount and no separate form signal is used. The previous hand-written local flags are removed. |
| `pages/ForeversCustomizeLater.vue`: `forevers-customize-later` | A top MBlockStory is supplied in the gallery form's description slot; the gallery form also renders its product-description story outside that slot. | Use useFormPageReadiness with the selected loaded SKU, the top-story dependency and the form-ready signal for the description, following decision 3's reset semantics. |
| `pages/OrderItemCustomize.vue`: `forevers-customize`, `golf-head-covers-customize`, `printed-product-customize` | Conditional Forevers/Golf top MBlockStory; selected FormWithImagesGallery can render a description, and the other reporting layouts have top/bottom stories. | Use useFormPageReadiness with a key for the current order item/SKU/layout/type after showForm's product/draft/alteration gates, the conditional top dependency, and the selected form's signal as specified in decision 3. The selected form has no :key binding. Printed-product has no top dependency. |
| `pages/Static.vue` | AStatic renders default/Magento CMS HTML, without Storyblok components. No Static route is declared in the inspected theme router. | Keep its existing defaultContent/updateDefaultContent then emitPageRenderedEvent behavior unchanged. |

Shared form templates also contain MOrderSubmitAgreement; PhrasePillowFormLastStep contains a fixed bottom block and CreationWizardFormLastStep a quantity-notes modal block. These are reached through the form pages already listed, not additional page routes. Preserve the task's specified page boundaries (description or top/bottom, and type-keyed top for PlushieProduct); do not introduce per-block or implicit participant tracking.

Other inspected pages have no Storyblok render source requiring new page wiring: `Checkout.vue` (including its configured checkout steps and success component), `CrossSells.vue`, `CartRecovery.vue`, `Authorization/Auth.vue`, `Authorization/SignIn.vue`, `Authorization/SignUp.vue`, `MyAccount.vue`, `MyAccount/AddressBook.vue`, `MyAccount/AddressesList.vue`, `MyAccount/AddressAdd.vue`, `MyAccount/AddressEdit.vue`, `PasswordReset.vue`, `OrderItemsBulkCustomize.vue` (its bulk/item customization forms render customization controls), `ExtraChargePurchase.vue`, `OrderItemDeliverablesDownload.vue`, `OrderPrintoutsDownload.vue`, `TaxIdRequest.vue`, `OrderUpdateAddress.vue`, and `Error.vue`. The account routes to the profile and order-history organisms likewise introduce no Storyblok component. `Typography.vue` and `CustomizationSystemWidgetsTest.vue` render UI examples/customization controls; neither is used by a route entry (the latter has an unused lazy import). `pages/DetailedCart/*` are cart child components, not further page routes. Redirect-only entries render no content independently.

### 5. Preserve the Maestra consumer and shared event (task step 4)

Keep `PAGE_RENDERED` and `emitPageRenderedEvent()` in `src/modules/shared` unchanged: server early return, Vue nextTick, then setTimeout(0) emission through imported EventBus. Keep the theme's plain Maestra registration. The module consumes no app-scoped head/request/Additional Content service, so it does not require an application-module registration change.

Retain MaestraModule's existing listener and guard order/behavior. Each guard addresses an observed boundary: isServer prevents access to window during SSR; no previous fullPath suppresses an unnecessary initial refresh that resets SSR widgets; missing SDK/callable-method checks handle blocked or not-yet-injected GTM; try/catch with `Logger.error(error, 'maestra')()` contains SDK exceptions and leaves later events usable. Keep PopMechanic as the method receiver when calling update. No SDK polling, alternate API, route watcher or Storyblok import belongs here.

### 6. Review follow-up (2026-11-05)

After code review, the implementation was corrected and this design updated to match: StoryblokMixin invalidates pending loads on destroy and no longer emits a local `story-rendered`; the render wait depends on rendered content and survives a group-load failure; GiftCards uses the shared tracker. Clean-ups: an unused `onMounted` import in the gallery form and the obsolete commented-out `ciLink`/`tile` registrations were removed. Hard-load content changes (BL-3) were checked on the socks creation page: switching designs updates the route query, so the previous route is set and Maestra refreshes once after the new container renders.

## Risks / Trade-offs

- Core chunk downloads are the render prerequisite, and group membership must remain accurate → assert actual default/theme registrations, especially HTML and the layout chain; leave unrelated chunks in DEFAULT.
- Existing widget state is reset by each legitimate update → deduplicate each completed input combination and accept a second emission only when page/form content inputs actually change, as specified by the task.
- A request may become stale during any wait → bind dispatch arguments, fallback choice and notification to the captured request and recheck the identifier after waits.
- SSR and editor preview share story fetching → preserve those paths and isolate browser reporting; add no new DOM traversal or renderer-context access.
- Unit tests cannot reproduce Maestra's actual DOM replacement behavior → use the task's manual call-count and throttled-chunk checks in addition to the Jest scenarios mapped in tasks.md.

## Migration Plan

Implement main and theme changes as one coordinated feature update; the event rename cannot be released with old consumers. No content migration, configuration change or new dependency is required. Validate from the main repository with its existing Jest configuration, which includes both main module tests and theme specs, plus local type-check and lint. Revert the coordinated feature changes together if rollback is needed; no data migration is involved.
