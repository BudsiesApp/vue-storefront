# Tasks

Implementation checklist only: this proposal session does not run application checks. Paths beginning `theme/` mean `src/themes/petsies-capybara/`, the theme git submodule. Scenario ownership and exact unit cases are in `design.md` → Verification ownership.

## 1. Shared playback and persistence

- [x] 1.1 Add `src/modules/shared/helpers/video-playback.ts` with the dedicated collection constant, namespaced identity builders, asynchronous preference sessions, actual media-state binding, user-gesture toggle, and disposal; add `src/modules/shared/test/unit/helpers/video-playback.spec.ts` for the helper cases in the design and verify its targeted Jest run passes.
- [x] 1.2 Initialize the collection in the existing `!isServer` branch of `src/modules/budsies/index.ts`; verify registration precedes consumer mounting and SSR does not initialize/access this browser collection using the mounted/SSR integration fixture in the composable suite.
- [x] 1.3 Add `src/modules/shared/composables/use-video-playback-toggle.ts` with the typed video ref, reactive key, autoplay/controls configuration, preview status, and config-only `isEnabled`; add the composable test suite from the design and verify late refs, key/element replacement, initial-state/SSR/hydration behavior, and teardown in its targeted Jest run.

## 2. Presentation and Vue consumers

- [x] 2.1 Add the shared `video-playback-button.ts` presentation definitions and `video-playback-button.vue`, using `useI18n()` and literal `i18n.t()` calls, plus global `theme/css/components/video-playback-button.scss` imported from `theme/css/main.scss`; verify the button unit suite covers accessible semantics, action labels/icons, and activation.
- [x] 2.2 Preserve `assetId` and `assetFilename` in `theme/helpers/resolve-video-data.function.ts`; update exact expectations and identity assertions in its existing spec and verify the resolver suite passes with existing embed/default behavior intact.
- [x] 2.3 Integrate the composable, typed video ref, and button in `theme/components/storyblok/Video.vue`; verify the consumer suite's four-option matrix and embedded-source exclusion.
- [x] 2.4 Integrate setup-owned responsive selection/ref and button in `HomepageIntroSection.vue`; verify its consumer fixture uses each selected asset's identity, ignores selector playback flags, retains image fallback, and applies configuration-derived responsive classes even when mobile video is absent.
- [x] 2.5 Integrate the composable/button and component-defined `loading_animation` constant in `m-submit-animator.vue`; add its suite and verify progress continues while paused, filename replacement retains the shared choice, remount restores it, and the existing `runProgress()` public method and hidden autoplay behavior are retained without changing the form.
- [x] 2.6 Add preview pointer rules and setup-owned preview initialization before restoration in Storyblok consumers; finish `theme/components/storyblok/video-playback-toggle.spec.ts` with preview and Homepage Intro asset-output regression cases from the design, verifying visible buttons with pointer events disabled, no preference access, canonical and legacy Storyblok origins absent from emitted intro `src`, and unrelated URLs unchanged.

## 3. Curator enhancement and Html lifecycle

- [x] 3.1 Add `theme/helpers/enhance-curator-videos.ts` using the shared helper/presentation, in-memory choice and pending read state per feed, marker-based duplicate prevention, live queries of marked videos for feed-wide clicks, click isolation, and synchronous automatic-play enforcement; implement the Curator suite cases from the design and verify initial/additional/re-rendered posts, current feed membership, persistence races, feed independence, and missing-markup no-op behavior.
- [x] 3.2 Move Html's script-container ref and lifecycle into setup, retain `Blok`, root classes/styles/editor icons, and snippet execution, attach observation before scripts run, and disconnect the observer/mark the enhancer disposed before HTML clear/replacement and destroy; verify the Curator suite mounts Html for replacement/teardown, checking observation stops and pending reads do nothing for the disposed enhancer.

## 4. Translation and automated validation

- [x] 4.1 Run `yarn update-i18n-files`; verify `theme/resource/i18n/en-US.csv` includes both `Pause video` and `Play video` and review its generated diff.
- [x] 4.2 Run `yarn test:unit src/modules/shared/test/unit/helpers/video-playback.spec.ts`, `yarn test:unit src/modules/shared/test/unit/composables/use-video-playback-toggle.spec.ts`, and `yarn test:unit src/modules/shared/test/unit/components/video-playback-button.spec.ts`; record passing shared-layer results.
- [x] 4.3 Run `yarn test:unit src/themes/petsies-capybara/helpers/resolve-video-data.function.spec.ts`, `yarn test:unit src/themes/petsies-capybara/helpers/enhance-curator-videos.spec.ts`, `yarn test:unit src/themes/petsies-capybara/components/storyblok/video-playback-toggle.spec.ts`, and `yarn test:unit src/themes/petsies-capybara/components/molecules/m-submit-animator.spec.ts`; record passing theme integration results.
- [x] 4.4 Run `yarn lint` and `yarn type-check`; resolve change-related failures and record passing results.

## 5. Manual acceptance

Run checks 5.1–5.9 on the storefront test environment. Use staging or production data where the Curator widget loads for 5.10–5.12; local Curator fixtures provide unit coverage only.

- [ ] 5.1 Acceptance 1: Homepage Intro shows the button; pause, reload, and resume, verifying pause persistence and resumed playback.
- [ ] 5.2 Acceptance 2: Set different choices for desktop and mobile intro files, cross the breakpoint in both directions, and verify each file restores its own choice.
- [ ] 5.3 Acceptance 3: Repeat pause/reload/resume on an uploaded Video block configured autoplay on and controls off; verify the button and persistence.
- [ ] 5.4 Acceptance 4: Visit controls-on Video blocks and embedded Video sources and verify no added button.
- [ ] 5.5 Acceptance 5: Block autoplay in the browser, verify Play is shown, and activate it to verify playback starts as a user gesture.
- [ ] 5.6 Acceptance 6: In Storyblok preview, verify eligible buttons remain visible with pointer events disabled and saved choices are not read, applied, or saved.
- [ ] 5.7 Acceptance 7: Fully reload pages containing these videos in a visible tab, including the intro's image-only responsive breakpoint, and verify no hydration mismatch warnings.
- [ ] 5.8 Acceptance 8: Tab to the buttons, activate with Enter and Space, verify action labels update, and inspect visible focus and icon contrast over light and dark frames.
- [ ] 5.9 Acceptance 9: Submit the photo pillow form, pause the animator, verify progress bar/step texts keep advancing, and verify the choice on the next submission and after reload.
- [ ] 5.10 Acceptance 10: On the real home Curator feed, verify one button per video post, button activation does not open its popup, the button sits above overlays, and another post click still opens the popup.
- [ ] 5.11 Acceptance 11: Pause a Curator video, verify all feed videos pause, reload, and verify they remain paused after restoration; cause additional/re-rendered posts and verify one button and the feed choice for each.
- [ ] 5.12 Acceptance 12: Visit another real Curator feed, set a different choice, and revisit both feeds to verify independent persistence by container id.
