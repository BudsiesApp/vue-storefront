# Spec Delta

## MODIFIED Requirements

### Requirement: Request service isolation

Each SSR application SHALL receive request services bound only to its render context. Navigation mapping fallbacks SHALL receive the redirect operation from the application handling that navigation, rather than retaining a prior application's operation.

#### Scenario: Consecutive requests differ
- **WHEN** consecutive SSR applications have different hosts, cookies, or user agents
- **THEN** each rendered result and request-service consumer observes only its own values

#### Scenario: Concurrent requests differ
- **WHEN** request services from two SSR applications are used concurrently
- **THEN** neither service reads or mutates the other application's request state

#### Scenario: Each application binds its own navigation redirect operation
- **WHEN** successive SSR applications initialize their URL mapping extension and a fallback requests a redirect
- **THEN** that application's request services record the redirect only in its own render context, without reusing an earlier application's operation

### Requirement: Explicit non-component context remains explicit

Server entrypoints, async-data loaders, resolvers, and mapping fallbacks that already receive a scoped context SHALL retain explicit narrow parameters rather than calling a component composable. URL-rewrite and Storyblok lowercase navigation fallbacks SHALL receive an optional explicit redirect callback from the current application's request services. When the callback is available, a matching fallback SHALL record its redirect before returning to navigation, without deferring redirect recording to queued page-data work or accepting a raw renderer context for that purpose. Callback availability SHALL select the redirect behavior independently of the execution environment. Without a callback, a matching URL rewrite SHALL return the existing client route data, while a matching Storyblok lowercase check SHALL return no route data and SHALL NOT record a redirect, on either server or browser. Browser behavior SHALL remain unchanged, and active SSR navigation and Category callers SHALL supply the request-service callback.

#### Scenario: Mapping fallback handles a server redirect
- **WHEN** a mapping fallback receives an explicit server redirect callback
- **THEN** it performs its redirect through that explicit boundary without Vue injection, a Vue instance, or access to the HTTP response

#### Scenario: URL-rewrite fallback records during navigation
- **WHEN** the URL-rewrite navigation fallback finds a rewrite and receives the current application's redirect callback
- **THEN** it calls that callback before completing, with the existing target path, query handling, and rewrite status, and returns no route data for the redirect

#### Scenario: Storyblok lowercase fallback records during navigation
- **WHEN** an uppercase path has a lowercase Storyblok story and the fallback receives the current application's redirect callback
- **THEN** it calls that callback with the lowercased URL and status 301 before completing, and returns no route data for the redirect

#### Scenario: Browser rewrite mapping remains route data
- **WHEN** the URL-rewrite fallback finds a rewrite in the browser without a server redirect callback
- **THEN** it returns the same client route data and query behavior as before rather than recording an SSR redirect

#### Scenario: Browser Storyblok lowercase behavior is unchanged
- **WHEN** an uppercase URL has a lowercase Storyblok story in the browser without a server redirect callback
- **THEN** the lowercase check returns no route data and does not request an SSR redirect

#### Scenario: Server fallback without a callback follows the explicit optional contract
- **WHEN** a fallback is invoked on the server without a redirect callback and finds a matching rewrite or lowercase Storyblok story
- **THEN** URL rewrite returns its existing client route data while Storyblok lowercase returns no route data
- **AND** neither fallback records a redirect or defers one to queued data loading

#### Scenario: Other Storyblok mapping behavior is retained
- **WHEN** the fallback handles an editor page or block selection, an existing lowercase story, or an uppercase path without a lowercase story
- **THEN** it preserves the existing route-data or no-result behavior without introducing a new redirect
