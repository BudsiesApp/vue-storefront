# Spec Delta

## Purpose

Refresh Maestra embedded forms and personalization widgets after client navigation has rendered its destination while preserving initial-load behavior and storefront error isolation.

## ADDED Requirements

### Requirement: Rendered destinations refresh Maestra once

In the browser, the Maestra module SHALL listen to `PAGE_RENDERED` and call only the documented `window.PopMechanic.update()` API once per emission when a previous route exists and the API is callable. It SHALL have no knowledge of Storyblok. Route changes themselves SHALL NOT trigger refreshes. Existing unrelated Maestra behavior SHALL remain intact.

#### Scenario: Navigation from a page without embeds
- **WHEN** client navigation renders a page with embeds and emits `PAGE_RENDERED` with a previous route present
- **THEN** the listener calls `update()` once and the destination's forms and widgets initialize without a hard reload

#### Scenario: Navigation between pages with embeds
- **WHEN** successive destinations finish rendering and each emits one page event
- **THEN** each destination receives one refresh after rendering, without early or duplicate refreshes that reset widget state

#### Scenario: Destination has no embed containers
- **WHEN** a rendered destination without Maestra containers emits a page event
- **THEN** the same guarded refresh behavior produces no storefront errors or visible regressions

#### Scenario: Route changes before content renders
- **WHEN** the route changes but the destination has not emitted its page event
- **THEN** the module does not refresh in response to the route change

### Requirement: Initial and server rendering do not refresh Maestra

The module SHALL skip refresh when the existing previous-route getter has no full path and SHALL register no page-event listener on the server. SSR containers SHALL retain Maestra's normal initialization on initial load.

#### Scenario: Initial browser load
- **WHEN** the initial page emits its rendered event with no previous route
- **THEN** no `update()` call occurs and Maestra initializes the SSR containers normally

#### Scenario: Initial below-the-fold hydration
- **WHEN** a lazily hydrated Storyblok embed enters view after a hard load
- **THEN** this integration adds no refresh call and the verified normal Maestra restoration behavior remains intact

#### Scenario: Server registration
- **WHEN** the Maestra module executes during SSR
- **THEN** it returns before accessing browser globals or registering a page-event listener

### Requirement: Missing or failing Maestra cannot break page events

The browser listener SHALL skip missing `PopMechanic` and missing or non-function `update` values. Errors thrown by `update()` SHALL be logged through the existing logger with the `maestra` tag without propagating or preventing subsequent page events from working. It SHALL NOT use undocumented SDK members.

#### Scenario: Maestra is blocked or unavailable
- **WHEN** a page event arrives without `PopMechanic`, without `update`, or with a non-function `update`
- **THEN** the listener returns without an error

#### Scenario: Update throws
- **WHEN** a callable `update()` throws during a page event
- **THEN** the error is logged under `maestra`, nothing propagates, and a later page event can call `update()` successfully
