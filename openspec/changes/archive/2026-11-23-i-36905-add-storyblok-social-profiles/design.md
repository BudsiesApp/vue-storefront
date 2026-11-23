# Design

## Context

The footer change (#36904) already dispatches `social-profiles/load` in the theme root's `App.vue` server prefetch. The footer and homepage Organization schema read the resulting `social-profiles/getProfiles` getter; the client receives the same normalized list at hydration. `social-profiles/load` already tags successful SSR output with `social_profile`, including an empty result. The footer's `components/social-profiles.vue` owns icon selection, list layout, count markup and link names. It already supports sizing and alignment, but its white SVG images and white focus outline suit dark footers.

## Goals / Non-Goals

**Goals:** Keep one source for profile data, link semantics and icon assets. Put Storyblok-specific style mapping and editor behavior at the block boundary. Keep footer callers, appearance and behavior unchanged.

**Non-goals:** No load, filtering, formatting or cache changes. No new dependency, layout framework, general-purpose theme override API, or Storyblok space changes.

## Decisions

### D1. Wrap the shared list instead of fetching or rebuilding it

Add `components/storyblok/SocialProfiles.vue` in the theme submodule, following the existing `Blok` pattern. Register `social_profiles` in `components/storyblok/index.ts` in `StoryblokComponentGroup.CORE` and the `vsf-storyblok` chunk. Apply `cssClasses`, `styles`, `layout-regular-component` and `display-property-handling` on its root and use `editor-block-icons`. The wrapper checks the same getter as the list to omit the entire root for an empty result, not just the list inside it; it does not add filtering or fetch. Footer and Organization schema continue to use the existing loader, cache tags, count formatter and order. Count mode never enters the storefront contract: Magento exports the number that the footer and block both render.

Follow `Button.vue` and `WebsiteRating.vue`: use a scoped `.storyblok-social-profiles.-editor-preview-mode` rule with `pointer-events: none` on the shared list root, away from the editor controls. `Blok` adds the modifier after mount, so it is absent from both the server render and the initial client render. The shared component does not need a preview prop or different link markup, and footer callers are unaffected.

### D2. Reuse the footer presentation with configurable color

Use one inline SVG path in `components/social-profiles.vue` for both footer and block. Change the white fill and stroke in the existing network SVG source to `currentColor`. The shared list reads `--social-profiles-color` for both the SVG and the link text; the count text and its `SfIcon` person icon inherit the link color. When the property is unset, network icons remain white and the link keeps its existing `--c-light-variant` color. Use webpack's `asset/source` for `?raw` imports; ordinary imports still use `asset/resource`. Only bundled local SVGs are inlined, never markup from Storyblok or Magento. The original icon files and attribution stay unchanged and are not duplicated.

Prepare the SVG strings identically on the server and client before passing them to `v-html`: trim surrounding whitespace and expand each self-closing `path` or `circle` into an explicit opening and closing tag. This matches the browser's `innerHTML` serialization, which Vue 2 compares with the client string during hydration. Round-trip all 12 prepared SVGs through `innerHTML` in a unit test to catch future asset edits that would break that equality.

The wrapper passes `iconSet`, maps the standard alignment to `--social-profiles-justify-items` for the grid and link contents and `--social-profiles-margin` for list placement, and sets `--social-profiles-icon-size` at the existing theme breakpoint. The shared grid, wrapping and count sizing do not change. In the wrapper's scoped styles, match the global `*:focus-visible` declarations on profile links to override the shared list's white outline without changing it for footers. The selected block color does not affect that outline.

### D3. Keep schema and renderer values paired

Add `storyblok/social_profiles.js` to `storyblok-components` using the existing nestable component metadata and standard Styles tab, including the existing alignment/display datasources. Put it in the Promotion group alongside `sharing` and the other marketing widgets (`component_group_uuid: a0ac402b-0fa2-407d-bd9d-68971ce9e217`). Sections and columns already accept nestable blocks; their schemas do not change.

Use static option values `circled` / `plain` for `icon_set` and `small` / `medium` / `large` for `desktop_size` and `mobile_size`. Mark `desktop_size` required and set `default_value: "medium"` so a new block starts with Medium selected. Keep `mobile_size` optional with no default so it inherits Desktop size. Map the presets to 16px, 32px and 42px at both breakpoints. Use `native-color-picker-fixed` for `color` and the existing typed color-picker shape. The wrapper sets `--social-profiles-color` to the selected color or `var(--c-text)` when empty.

Reuse the existing loader, list layout and styling options (rung 2), and add one block through the existing registry and schema extension points (rung 3). A single inline SVG renderer (rung 4) supports the exact selected color without modifying the files or maintaining a second icon path for the footer.

## Risks / Trade-offs

- An empty block is hard to select in the Visual Editor and gets no preview-only note. The published block contributes no spacing of its own. Container collapse is not handled: a section or column whose only child is this empty block may still show its own padding or background. This preserves container-owned styles without introducing an empty-child signal through `Blok.onComponentContentUpdate()` that could collapse the surrounding layout after SSR.
- The block inherits the footer's refresh behavior and its existing cache-tag limitations. It does not add a second refresh path or fix concurrent SSR tag assignment.
- During hydration, the existing Storyblok section renderer adds the `box` and `_item` classes and resets a Vue scoped style attribute on every nested block's root. These changes do not affect the Social Profiles block's links, counts, appearance or layout, or cause a hydration warning. Changing this shared renderer behavior is out of scope.
- Reuse the footer's viewport-based layout, which wraps only six profiles at narrow widths. Additional wrapping is out of scope. The list may overflow in narrow Storyblok grid columns, or in a padded full-width section at 320px if five profiles all show long counts such as `999.9K`. The six-profile fit guarantee applies to full-width placements. The block does not override editor CSS or spacing that causes overflow.

## Migration Plan

No existing story needs migration. Release the renderer before content starts using the new block schema. Applying the schema and propagating the theme change to other brand branches are outside this change. If reverting after placements have been published, remove those placements before rolling back to a renderer that does not recognize `social_profiles`.
