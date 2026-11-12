# Spec Delta

## Purpose

Install prepared Storefront UI release packages reproducibly across maintained storefronts while preserving source compilation and existing component, style and runtime imports.

## ADDED Requirements

### Requirement: Release asset dependencies across maintained app lines
The maintained `petsies-theme` and `bulkorders-theme` app lines SHALL reference prepared public GitHub release assets for `@storefront-ui/shared` and `@storefront-ui/vue` in their manifests and Yarn 4 lockfiles. Direct, indirect and workspace lock entries MUST contain no GitPkg dependency URLs, with Vue's shared dependency resolving to the same shared asset as the app.

#### Scenario: Cache-empty immutable installation
- **WHEN** either maintained app line installs its committed dependency graph with Yarn 4.17.1, empty dependency caches and GitPkg unavailable
- **THEN** installation succeeds immutably from prepared release assets without source-repository preparation or entry-file generation
- **AND** the direct and indirect shared dependencies resolve to the same asset

### Requirement: Initial source compatibility
The initial migration SHALL preserve shared sources at `3ff374628936ba579a9bbb2a634c6c3ce9db6ac5`, Vue sources at `b345b9cb261dabf1c105f4e6007fe7332ec8b6a4`, existing package names, versions and runtime dependency identities, apart from documented packaging and dependency-transport changes.

#### Scenario: Dependency update is inspected
- **WHEN** the migrated manifests, lockfiles and release provenance are compared with the initial dependency pins
- **THEN** they identify the same respective source commits and package versions, and unrelated dependencies are not upgraded as part of the transport change

### Requirement: Application-side source compilation remains supported
The normal VSF application build SHALL continue compiling Storefront UI Vue components and styles from package sources. Existing root exports, style imports and deep runtime imports MUST remain compatible without replacing Storefront UI with standalone precompiled library output.

#### Scenario: Maintained brand builds and checks
- **WHEN** the candidate is validated with Petsies, Budsies, Budsies Education and Waggables themes on the main app line, and Bulk Orders on its app line
- **THEN** maintained unit tests, configuration checks, lint and client/server/service-worker builds pass with the published packages

#### Scenario: Storefront UI renders
- **WHEN** representative Storefront UI components render and hydrate in the maintained storefront combinations
- **THEN** their existing styling and interaction remain available without migration-related missing-export, missing-source or compilation errors

### Requirement: Traceable dependency maintenance
Maintenance documentation SHALL explain how to select published package assets, verify their source commits and checksums, update both app-line manifests and lockfiles, and retain release URLs consumed by historical application revisions.

#### Scenario: Maintainer updates a package revision
- **WHEN** a maintainer follows the documented update procedure
- **THEN** both maintained app lines can consume the new prepared assets without introducing GitPkg URLs, changing the package manager, or deleting historical releases
