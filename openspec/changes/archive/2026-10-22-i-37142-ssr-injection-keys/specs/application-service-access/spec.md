# Spec Delta

## ADDED Requirements

### Requirement: Cross-context injection contract
The store, router, route, i18n, request services, and Additional Content injection keys SHALL retain the same symbol identity across separate SSR render contexts. Consumers SHALL resolve values from the application in which they render, regardless of the context that loaded their component.

#### Scenario: Key modules are evaluated independently
- **WHEN** the three injection-key modules are loaded in two separate module registries
- **THEN** each store, router, route, i18n, request services, and Additional Content key is the same symbol in both registries

#### Scenario: A component from another render context renders in the current application
- **WHEN** a component loaded in one SSR render context renders under the providers of another SSR application
- **THEN** its injected store, router, route, i18n, request services, and Additional Content resolve to the current application's provided values
- **AND** the render does not fail with `Missing application service provider` because the component originated in another context

