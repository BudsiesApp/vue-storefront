# Design

## Context

See `proposal.md` for motivation and the delta specs for behavior. The four consumers mix Vue-owned videos with Curator-owned DOM, so this change needs a shared playback boundary and a separate DOM adapter.

`Video.vue` uses `resolveVideoData()`; its asset result currently retains only the normalized URL, losing the source id and filename. Homepage Intro selects one normalized source after mount using a desktop media query. Both it and `Html.vue` extend `Blok`; the latter currently accesses `this.$refs['script-container']` and re-executes scripts after inserting HTML. `MSubmitAnimator` already renders its autoplay video while hidden and exposes `runProgress()` to the photo pillow form.

`StorageManager` collections require registration and return asynchronous `getItem()` / `setItem()` promises. The existing Budsies module is registered from the theme's `config/modules.ts` and already initializes storage and consumes shared helpers. `App.vue` loads `css/main.scss` globally. Jest discovers shared module tests under `test/unit` and theme tests next to their source.

## Goals / Non-Goals

**Goals:** Keep browser media state outside SSR and Vuex; reuse the same playback rules for Vue refs and Curator elements; make asynchronous restoration compatible with synchronous media events and source replacement.

**Non-Goals:** Add API calls, backend state, dependencies, authentication coupling, cross-tab synchronization, reduced-motion policy, mute controls, or new handling of editor misconfiguration. Preserve the submission invocation contract and Html's existing script execution semantics.

## Decisions

### 1. Use existing shared and Budsies module boundaries

Place framework-independent playback in `src/modules/shared/helpers/video-playback.ts`, Vue lifecycle integration in `src/modules/shared/composables/use-video-playback-toggle.ts`, and the presentational control in `src/modules/shared/components/video-playback-button.vue`. These additions meet the required shared implementation across CMS and non-CMS consumers; a new storefront module would add registration without a separate domain responsibility.

Register `StorageManager.init(VIDEO_PLAYBACK_COLLECTION)` for the `videoPlayback` collection inside the existing `BudsiesModule` client branch (`src/modules/budsies/index.ts`), using the collection constant exported by the shared helper and the existing storage localization defaults. This provides registration before theme components mount without binding the non-Storyblok animator to the Storyblok module; the `!isServer` branch prevents browser storage initialization on the server and needs no app-scoped registration service.

### 2. Separate persistent identity from delivery URLs

Extend `ResolvedAssetVideoData` with `assetId` and `assetFilename`, copied from the selector while leaving `assetUrl` normalized by `resolveStoryblokAssetUrl()`. Build namespaced keys `asset:id:<id>` or `asset:filename:<filename>` using id presence, `animation:loading_animation` from a constant defined in `m-submit-animator.vue`, and `curator:<container-id>`; keeping raw identity out of URL attributes avoids both CDN-dependent preferences and new asset sinks.

The shared key builder accepts only structural identity fields, so it does not import a Storyblok module into the shared layer. Homepage Intro pairs its selected asset identity with its existing normalized URL; existing SSR, client, and editor asset output continues through the public Storyblok helpers rather than adding a URL rewrite path.

### 3. Put media behavior and asynchronous choices in a framework-independent helper

The helper binds an `HTMLVideoElement`, reports `paused || ended` immediately and on `play`, `pause`, and `ended`, exposes a user toggle and disposal, and reads/writes `paused | playing` through the dedicated collection. Media events update presentation only; button activation determines the requested choice, invokes `pause()` or `play()` directly in the gesture (resetting `currentTime` for an ended video), and schedules persistence, so blocked autoplay is represented accurately and an awaited storage call cannot consume the playback gesture.

Load preferences asynchronously when a binding or feed session starts, apply paused with `pause()`, and apply saved playing by allowing the existing autoplay configuration rather than forcing a new startup policy. Ignore a pending preference read if the visitor activated the button, or the binding was replaced or disposed, after that read started; this prevents stale restoration from reversing newer intent or touching obsolete media. Writes are plain `setItem()` calls with no sequencing.

For a source with no choice, perform no playback override; no reduced-motion query participates. Vuex and TaskQueue are unnecessary because these operations control local media and browser preferences, without backend requests or shared application state.

### 4. Use setup-owned refs and a configuration-only render predicate

`useVideoPlaybackToggle` accepts a setup-owned `Ref<HTMLVideoElement | null>`, the reactive key, reactive autoplay/controls configuration, and preview status; it returns `isPaused`, `toggle()`, and `isEnabled`. Derive `isEnabled` only from configured native-source presence, autoplay, and controls; initialize `isPaused` to true on both server and client, bind only after mount, and rebind when the key or element changes, so media and storage never determine initial markup. Changing the animator's `animationUrl` retains its key and element and needs no rebinding.

Add `setup()` to the three Vue consumers while retaining their existing Options API layout/progress logic and `Blok` inheritance. Move intro responsive source selection and its media-query subscription into setup so URL and identity change together; return the values still needed by existing layout calculations, and leave `runProgress()` and the parent form ref untouched rather than converting unrelated logic.

Render the intro button when either configured responsive asset is playable, outside the `activeVideoUrl` conditional video element; SSR-derived desktop/mobile classes hide it at breakpoints without a configured asset. This makes its existence identical during SSR and initial hydration, including a mobile-image-only configuration, while retaining the current client-only video creation.

### 5. Share presentation between Vue and plain DOM

Add `src/modules/shared/helpers/video-playback-button.ts` for the action's label key and inline icon definitions used by both renderers; use a play triangle and pause bars with decorative icons hidden from accessibility. The Vue component renders only the button, receives playback state, and emits activation, because the Curator DOM cannot mount that component but must use identical presentation.

Obtain `const i18n = useI18n()` in the Vue button and Html setup and translate with literal `i18n.t('Pause video')` / `i18n.t('Play video')` calls, passing the resulting action-label callback to the DOM enhancer. This preserves app-scoped service access and matches the existing extractor's literal-call pattern when it writes `resource/i18n/en-US.csv`; translating a dynamically selected key alone would not extract the new phrases.

Add `theme/css/components/video-playback-button.scss` and import it from the globally loaded `theme/css/main.scss`; both renderers use `video-playback-toggle` and its icon classes, never Curator's `crt-` namespace. Use a solid dark background, white icon, contrasting border, and a visible focus ring, with placement above media/Curator overlays; component scoped styles position the Vue button, including placing the intro button above its content layer where that layer could intercept it.

### 6. Keep preview state and browser access explicit

Initialize a setup-owned preview ref after mount using the public `isStoryblokPreview()` helper, consistent with `Blok`, before starting playback restoration or the Html enhancer. Apply only `-editor-preview-mode` pointer rules to the button in preview; preview bindings still observe actual media state but neither read nor apply nor save preferences.

Use `!isServer` at browser lifecycle entry points, preventing access to storage, `window`, `document`, and `MutationObserver` during SSR. Empty video refs stop binding/toggling because intro video creation is conditional and replaced refs may be cleared; empty script-container refs stop DOM work because the block may not yet be mounted or may already be destroyed. Pending reads follow decision 3.

### 7. Enhance Curator through a scoped DOM adapter

Add `theme/helpers/enhance-curator-videos.ts`, invoked with a typed script container, translated presentation, and preview status from Html setup. Move Html's script-container lifecycle into setup with `Ref<HTMLElement | null>`, removing the changed `$refs` access; observe before executing replacement scripts and scan the current subtree so both immediate and later widget output is covered without changing how snippets execute.

Observe subtree child-list changes and select only `[id^="curator-feed-"] .crt-video-container video`; attach a plain button inside its nearest video container and use only the `data-video-playback-toggle` marker to skip duplicates. Each enhancer instance keeps an in-memory choice per feed id and its pending read state; it needs no tracked video set or per-video disposers because current videos can be queried from the feed container.

A click derives the desired action from its own video's real state, queries the feed container's marked videos at click time, and applies that choice across them, with `stopPropagation()` and `preventDefault()` on the button event. Feed-level state is necessary because signed media URLs and rotating posts cannot identify a persistent per-post preference; Curator's original span and popup stay outside this adapter.

Before Html clears/replaces content or destroys the block, disconnect the observer and mark the enhancer disposed so its pending reads do nothing; listeners on removed Curator elements go away with those elements. No matching markup simply yields an empty scan without diagnostics or widget changes.

### 8. Make Curator play enforcement synchronous

Start the asynchronous feed choice read at feed discovery, independently of native play events, and let each play handler synchronously consult the feed's in-memory choice. If that choice is paused, call `pause()` immediately; when loading completes, query the feed container's current marked videos and reconcile them as well, which closes the race where Curator played before storage resolved without awaiting inside its handler or relying on its 200 ms timer.

Update the feed's in-memory playing choice before calling `play()` on the videos selected by the click, so their resulting play events permit the requested playback without a per-video origin flag. Newly discovered posts immediately receive the feed's loaded choice, and pending reads follow decision 3.

## Risks / Trade-offs

- Visibility hydration and asynchronous storage allow brief playback before restoration → accepted Option A behavior; retain autoplay markup and apply the choice at binding/read completion.
- Curator DOM compatibility and local data limitations → restrict matching to the required markup and validate its real overlays and lifecycle where staging/production feed data loads.
- Responsive layout and overlay stacking can conceal controls → verify both breakpoints, mobile image fallback, light/dark frames, and keyboard focus in the acceptance pass.

## Verification ownership

Each scenario has one primary automated owner below; integration checks exercise consumer wiring without repeating helper cases. Real autoplay policy, visual contrast, hydration warnings, and actual Curator overlays also need the manual acceptance pass in `tasks.md`.

| Test file | Concrete cases / primary scenario coverage |
|---|---|
| `src/modules/shared/test/unit/helpers/video-playback.spec.ts` | Media event state without writes; blocked autoplay and gesture timing; ended restart; asset id precedence/filename fallback/CDN-independent keys; asynchronous storage values, no-choice playback behavior, and pending-read invalidation after activation, binding replacement, or disposal. Covers Playback changes outside the button, Autoplay is blocked, Completed video is restarted, identity rules of Storyblok identity and responsive selection, No preference exists, and Restoration finishes after a newer selection or click. |
| `src/modules/shared/test/unit/composables/use-video-playback-toggle.spec.ts` | Mounted harness binds a late ref, rebinds on key or element replacement, applies the selected key's saved choice, and detaches on unmount; SSR rendering and initial hydration preserve autoplay/button markup without storage or DOM access before mount. Covers Server-rendered autoplay video hydrates and Responsive intro changes source. |
| `src/modules/shared/test/unit/components/video-playback-button.spec.ts` | Actual button/type, injected translated action labels, icon changes, and activation event. Covers automated semantics of Keyboard and localized actions; native keyboard behavior and contrast are manual checks. |
| `theme/helpers/enhance-curator-videos.spec.ts` | Observer fixture inserts/re-renders posts without duplicates; click isolation and untouched original span/popup; feed-wide pause/resume uses the current marked videos, including added posts and excluding removed posts; later auto-play enforcement; deferred preference read reconciles early play without overriding a click; other feed independence; HTML replacement/destroy disconnects observation and invalidates pending reads; missing/changed markup no-op. Covers all Curator-specific scenarios. |
| `theme/components/storyblok/video-playback-toggle.spec.ts` | Consumer wiring matrix for uploaded autoplay/controls and embeds, intro fixed options and responsive availability classes; preview pointer rules cover Vue and Curator buttons and avoid preference access. Exercise actual public asset normalization only at the Homepage Intro URL computation moved into setup: canonical and legacy Storyblok origins are absent from emitted `src`, and unrelated URLs remain unchanged. Covers Uploaded video option combinations, Embedded sources, Fixed autoplay surfaces, Preview ignores saved preferences, the modified source-selection consumer wiring, and continued storyblok-asset-delivery compliance for the moved computation. |
| `theme/components/molecules/m-submit-animator.spec.ts` | Pause only the video while `runProgress()` advances steps/bar; retain hidden autoplay behavior and existing public method; remount to restore the shared choice and change animation filename while keeping that choice. Covers Loading animation identity and Pause during submission. |
| Existing `theme/helpers/resolve-video-data.function.spec.ts` | Update exact result expectations and verify selector asset id/filename are preserved alongside the normalized URL, without changing embed or option defaults. Covers the data contract supporting Storyblok identity and responsive selection. |

## Migration Plan

Deploy the shared module changes and theme submodule changes together through the existing release process; there is no schema migration, backfill, CMS edit, or Curator dashboard update. Rollback restores the previous application/theme versions; unused collection entries can remain because old code does not read them.
