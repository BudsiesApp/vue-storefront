# video-playback-toggle Specification

## Purpose

Let visitors pause and resume automatically playing native videos without controls and remember their choices across visits, including loading animations and Curator feeds.

## Requirements

### Requirement: Configuration determines button eligibility
The storefront SHALL provide a playback button only for native video configured to autoplay without native controls. Homepage Intro videos and submit animations SHALL retain their fixed autoplay, muted, looping, inline configuration; every supported Curator feed video SHALL receive the button because Curator initiates playback itself.

#### Scenario: Uploaded video option combinations
- **WHEN** an uploaded Storyblok Video block resolves autoplay and controls options
- **THEN** only autoplay on with controls off produces a button
- **AND** autoplay off with controls off receives no additional checks, warnings, error logging, or fallback controls

#### Scenario: Embedded sources
- **WHEN** Video, slider, or carousel content uses an embedded provider
- **THEN** no new playback button is added and existing provider behavior remains unchanged

#### Scenario: Fixed autoplay surfaces
- **WHEN** Homepage Intro has an applicable uploaded video or a submit animation is shown
- **THEN** a playback button is available alongside that video, regardless of Homepage Intro selector playback options

### Requirement: Button state reflects actual media playback
The button SHALL offer Pause while its video plays and Play while paused or ended, following actual media state and playback events. Activation SHALL pause or resume the video; activating Play on an ended non-looping video SHALL restart it from the beginning.

#### Scenario: Playback changes outside the button
- **WHEN** media plays, pauses, or ends independently of the button
- **THEN** the displayed action reflects the resulting real media state
- **AND** no visitor preference is saved by those events

#### Scenario: Autoplay is blocked
- **WHEN** the browser leaves an autoplay video paused
- **THEN** the button offers Play and its activation starts playback as a user gesture

#### Scenario: Completed video is restarted
- **WHEN** a non-looping video ends and the visitor activates Play
- **THEN** playback restarts from the beginning and the action follows the resulting playback state

### Requirement: Visitor choices persist at the required identity scope
The storefront SHALL store `paused` or `playing` only upon button activation in a dedicated localStorage collection through the project storage abstraction. Storyblok keys SHALL use asset id with filename as the fallback, submit animations SHALL share one constant identifier, and Curator videos SHALL share their feed container id; resolved CDN URLs SHALL NOT determine keys.

#### Scenario: Storyblok identity and responsive selection
- **WHEN** the visitor pauses a Storyblok asset, reloads, changes the asset's delivery CDN, or switches between different desktop and mobile intro assets
- **THEN** the choice follows the asset id, or filename when id is absent, and each distinct responsive asset retains its own choice

#### Scenario: Loading animation identity
- **WHEN** a loading animation is paused and a later submission or page visit uses any loading-animation file
- **THEN** the shared loading-animation choice applies even if the file was renamed or replaced

#### Scenario: No preference exists
- **WHEN** a video has no saved visitor choice
- **THEN** it follows its configured playback behavior regardless of the visitor's reduced-motion preference

### Requirement: Restoration preserves server markup and current identity
The storefront SHALL retain configured autoplay in server markup and SHALL apply saved choices only after mount. Initial button markup SHALL depend solely on SSR-available configuration, with the same initial action on server and client; subsequent media state SHALL update it after mount. A saved paused choice SHALL pause the applicable video, subject to pending-read validity.

#### Scenario: Server-rendered autoplay video hydrates
- **WHEN** a Video block or hidden submit animator hydrates with a saved paused choice
- **THEN** its server and initial client button markup match, autoplay remains in the video markup, and it pauses after mount and preference loading
- **AND** the paused video shows a video frame rather than its poster
- **AND** a visibility-hydrated Video block can play briefly before hydration

#### Scenario: Responsive intro changes source
- **WHEN** the intro selects a video after mount or changes its responsive asset
- **THEN** the selected asset's saved choice is applied when its element exists and the action reflects the new source's real state
- **AND** the button's initial existence does not depend on the client-selected URL or an element ref

#### Scenario: Restoration finishes after a newer selection or click
- **WHEN** a preference read completes and the visitor activated the button, or the binding was replaced or disposed, after that read started
- **THEN** the pending read is ignored

### Requirement: Shared accessible presentation and preview safety
Every new control SHALL be a real `button` with type `button`, keyboard activation, visible focus, contrasting presentation over light and dark frames, and an action label translated as `Pause video` or `Play video`. Vue and Curator controls SHALL share appearance, labels, and icons. Storyblok preview controls SHALL remain visible for eligible videos with pointer events disabled, and saved preferences SHALL NOT be read, applied, or saved in preview.

#### Scenario: Keyboard and localized actions
- **WHEN** a visitor tabs to a control and activates it with Enter or Space
- **THEN** playback toggles and its localized accessible action updates with actual state
- **AND** focus remains visible over both light and dark video frames

#### Scenario: Preview ignores saved preferences
- **WHEN** eligible Storyblok video or Curator content appears in editor preview with a saved paused preference
- **THEN** its configured playback is not overridden by the saved choice, its button remains visible with pointer events disabled, and no preference is read, applied, or saved

### Requirement: Submission progress remains independent
Pausing a submit animation SHALL affect only its video. Existing hidden-from-page-load autoplay, submission-only visibility, progress bar, step texts, and the form's animator invocation contract SHALL remain unchanged.

#### Scenario: Pause during submission
- **WHEN** a visitor pauses the visible photo pillow submit animation
- **THEN** the video pauses while the progress bar and step texts keep advancing through the existing progress operation

### Requirement: Curator enhancement follows feed lifecycle
Within an Html block's script container, the storefront SHALL attach exactly one button to every video inside `.crt-video-container` under a container whose id starts with `curator-feed-`, including subsequently added or re-rendered posts. The button SHALL sit above Curator's overlay and SHALL prevent default action and event propagation on activation; Curator's original play span, popup player, and dashboard configuration SHALL remain unchanged.

#### Scenario: Initial and changing feed posts
- **WHEN** Curator inserts, re-renders, or repeatedly exposes a qualifying video
- **THEN** each current qualifying video has exactly one storefront button and newly inserted videos acquire the feed's choice

#### Scenario: Feed button and post clicks
- **WHEN** a visitor activates a feed video button and then clicks elsewhere on its post
- **THEN** button activation toggles playback without opening the popup and the other post click retains Curator's popup behavior

#### Scenario: HTML replacement and teardown
- **WHEN** the Html block clears or replaces its HTML or is destroyed
- **THEN** enhancement observation is disconnected and the enhancer is marked disposed so pending reads do nothing
- **AND** listeners on removed Curator elements go away with those elements

#### Scenario: No recognized Curator markup
- **WHEN** an Html block contains no matching feed video markup, including after a Curator markup change
- **THEN** the enhancement does nothing, logs no errors or warnings, and leaves the widget working as before

### Requirement: Curator preferences operate per feed
Pausing a Curator video SHALL pause all videos in that feed and persist that feed's choice. A saved paused choice SHALL immediately counter subsequent automatic play events, without depending on Curator's playback delay; button-initiated Play SHALL allow playback and store playing. Different feed ids SHALL retain independent choices.

#### Scenario: Pause persists across feed reloads and additions
- **WHEN** a feed is paused and subsequently reloaded or extended with more posts
- **THEN** all its videos are paused once its saved choice is loaded, and subsequent automatic play attempts are paused synchronously
- **AND** resuming through the button stores playing and allows playback

#### Scenario: Curator starts before asynchronous restoration completes
- **WHEN** a feed automatically starts a video while its saved choice is still loading
- **THEN** completing a paused-choice read pauses already playing videos, and later automatic play events use the loaded choice immediately
- **AND** a newer button choice takes precedence over the pending read

#### Scenario: Separate feeds retain independent choices
- **WHEN** one feed is paused and another feed is visited
- **THEN** the second feed uses only its own container id's choice
