# Proposal

## Why

Visitors cannot stop automatically playing native videos that have no controls. Add an accessible play/pause button and remember the visitor's choice to address WCAG 2.2.2 for these videos, including Curator feed posts.

## What Changes

- Add a shared button for uploaded Storyblok Video blocks only when resolved autoplay is on and controls are off; add it to Homepage Intro videos and submit animations with their existing fixed playback configuration.
- Derive the button action from actual media state and persist only button clicks, using Storyblok asset identity, one loading-animation identifier, or one Curator feed container id.
- Restore choices after mount while preserving autoplay markup, responsive intro selection, lazy hydration, and submission progress behavior.
- Enhance Curator videos within Html blocks as posts arrive or are replaced, with feed-wide choices and cleanup when HTML changes or the block is destroyed.
- Share playback handling, translated labels, icons, focus styling, and contrast across Vue and third-party DOM; disable Storyblok preview pointer events and ignore saved choices there.

## Capabilities

### New Capabilities

- `video-playback-toggle`: Eligibility, real media state, accessible controls, per-video persistence, submit animator behavior, and Curator feed enhancement.

### Modified Capabilities

- `storyblok-video-source-selection`: Qualify Homepage Intro autoplay with post-mount visitor choices and extend editor interaction safety to playback buttons.

## Impact

Affected theme components are `Video.vue`, `HomepageIntroSection.vue`, `Html.vue`, and `m-submit-animator.vue`; the theme video resolver must preserve asset identity. Shared helpers, a composable, and a presentational component belong in the existing `src/modules/shared` module; the existing Budsies module registers the dedicated browser storage collection. The theme supplies global button styling and translation extraction into `resource/i18n/en-US.csv`.

No backend API, dependencies, Curator dashboard settings, provider embeds, slider/carousel behavior, or `m-addons-selector.vue` changes are needed. The photo pillow form's existing animator ref, visibility, and progress contract stay intact. Unit and static checks are implementation tasks; Curator acceptance checks require staging or production data where the widget loads.
