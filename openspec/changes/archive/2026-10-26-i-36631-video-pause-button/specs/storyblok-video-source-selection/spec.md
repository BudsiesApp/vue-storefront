# Spec Delta

## MODIFIED Requirements

### Requirement: Stable Homepage Intro playback and fallback
The Homepage Intro Section SHALL configure applicable asset video to autoplay muted, looped, inline, without controls, SHALL allow the visitor's playback button choice to override playback after client mount, and SHALL keep the configured responsive image rendered beneath the video as its loading and failure fallback.

#### Scenario: Selector playback options differ
- **WHEN** an applicable Homepage Intro asset selector disables autoplay, muted, or loop or enables controls
- **THEN** the system ignores those options and configures the hero video with autoplay, muted, loop, inline, and no controls

#### Scenario: Video media is not yet available
- **WHEN** the applicable video has not produced a frame or cannot play
- **THEN** the responsive image remains visible beneath the transparent video surface without readiness-state handling

#### Scenario: Responsive video defines an aspect ratio
- **WHEN** an applicable Homepage Intro asset selector provides an aspect ratio
- **THEN** the media container uses that ratio and clips the video overlay so the fallback image does not appear at fractional-pixel edges

#### Scenario: Visitor has paused the applicable asset
- **WHEN** the mounted intro loads the applicable asset's saved paused choice
- **THEN** the video pauses while its fixed autoplay configuration and responsive image fallback remain intact

### Requirement: Storyblok editor interaction safety
The system SHALL prevent pointer interaction with selector-backed asset and embedded video surfaces and playback buttons while their Storyblok components are rendered in editor-preview mode and SHALL keep Homepage Intro content above its non-interactive background media.

#### Scenario: Selector video appears in editor preview
- **WHEN** an author previews a selector-backed Video block in the Storyblok editor
- **THEN** pointer interaction with its video surface and any playback button is disabled

#### Scenario: Homepage Intro video appears in editor preview
- **WHEN** an author previews a Homepage Intro Section with selector-backed background video in the Storyblok editor
- **THEN** pointer interaction with its background video, CTA, and playback button is disabled and its content remains above the video
