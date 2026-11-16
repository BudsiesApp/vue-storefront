# Proposal

## Why

Maestra embeds remain empty after SPA navigation unless the storefront calls `PopMechanic.update()` after the destination content renders. The existing feature emits too early or misses pages; repeated refreshes reset every widget and lose its state, so each page must explicitly wait for its own data and Storyblok content before emitting once.

## What Changes

- Extend the existing Storyblok registry with optional component groups and a group loader so story completion can wait for the `vsf-storyblok` chunk without loading unrelated chunks.
- Replace component-level `story-ready` with request-bound `story-rendered` notifications. Handle cached, missing, failed, changed-slug, and superseded requests consistently in the theme story mixin and module page mixin through one shared render-wait helper.
- Correct the existing readiness tracker and page/form wiring, add ordinary Product readiness, and include the additional Storyblok pages found during the route audit: ForeversCustomizeLater and OrderItemCustomize, using one shared form/page combination composable.
- Preserve `PAGE_RENDERED`, its deferred emission helper, initial-load suppression, and the browser-only Maestra listener; verify all documented API guards and failure isolation.
- Add Jest regression coverage and a manual navigation/counting checklist for the reviewed failures.

## Capabilities

### New Capabilities

- `storyblok-render-readiness`: Component groups and loading, per-request story rendering notifications, explicit readiness tracking, and page/form wiring across the main repository and theme.
- `maestra-page-refresh`: One documented Maestra refresh per rendered destination, with initial-load suppression and SSR/SDK failure safety.

### Modified Capabilities

None. The existing Storyblok capabilities cover assets, coupons, rich-text pricing, and video selection; the EventBus capability covers the facade and listener lifecycle. Their requirements do not define or change the page-readiness contract introduced here.

## Impact

- Main repository: `src/modules/vsf-storyblok-module` registry, public exports, shared render-wait helper, `components/StoryblokMixin.ts`, and the existing readiness composable; regression coverage for `src/modules/maestra`.
- Theme submodule: Storyblok registrations, story mixins/molecules, the three existing reporting customization forms, the shared form/page combination composable, and the pages listed in the design audit. Keep the existing plain `registerModule(MaestraModule)` registration.
- This updates the implementation already on branch `36734-refresh-maestra-forms` in both repositories, based on main `7c90e6f0` and theme `6c06a560`; it does not replace the feature from scratch. All specifications remain in this main repository.
- The internal component event rename requires producers and consumers to change together. No new package dependencies, runtime configuration, backend endpoints, CMS block types, or Maestra SDK members are introduced.
- Excluded: route-change refreshes, central implicit readiness registration, per-block mount counting, a dedicated Maestra Storyblok block, and undocumented SDK APIs. Existing Maestra behavior from related work remains intact.
