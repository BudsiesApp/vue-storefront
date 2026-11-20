# Storefront request services delta

## MODIFIED Requirements

### Requirement: Cache tags remain a separate request-local capability
The general request service MUST NOT expose cache tags. New code MUST NOT add cache-tag access through `$ssrContext` or `Vue.prototype`, except that the social-profile Vuex load action SHALL use the existing `Vue.prototype.$cacheTags` like the rush-upgrade action. Cache-tag isolation between concurrent renders is not guaranteed for that action.

#### Scenario: Existing cache-tag-only call site is reviewed
- **WHEN** the migration encounters an existing cache-tag-only `$ssrContext` or `Vue.prototype.$cacheTags` consumer
- **THEN** the call site remains assigned to the dependent cache-tag change rather than receiving a partial generic request-service replacement

#### Scenario: Social-profile load uses legacy tagging without expanding request services
- **WHEN** the social-profile Vuex action loads profiles in SSR and the existing prototype tag set is available
- **THEN** the action adds `social_profile` on success or `no-cache` on failure through that set
- **AND** the general request service does not receive cache-tag operations
