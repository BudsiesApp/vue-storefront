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

### Requirement: Explicit immutable preview consumption
Both maintained UI app lines SHALL accept the publisher's immutable public preview assets through explicit manifest and Yarn lock updates. Dependency checks MUST accept supported release and preview identities while retaining exact shared/Vue pair alignment and direct/indirect shared identity. Preview testing MUST NOT require moving branch URLs or consumer-wide lifecycle suppression.

#### Scenario: Returned preview pair is tested
- **WHEN** a maintainer selects the returned shared and Vue URLs in an intended UI feature/testing graph and regenerates its lockfile using the existing container workflow
- **THEN** immutable installation and targeted source-compilation/rendering checks can use that pair, with Vue's packaged shared URL exactly matching the application's shared URL

#### Scenario: Maintainer iterates and selects merged sources
- **WHEN** a maintainer requests a later feature or merged source revision through the publisher command
- **THEN** documentation directs them to verify returned provenance/checksums and explicitly update the matching pair and lockfile on the intended app line, rather than track a moving source branch

### Requirement: Preserve accepted final graph and evidence
Preview acceptance SHALL remain separate from the already-accepted pinned migration. Arbitrary preview source changes MUST stay in the intended feature/testing graph and MUST NOT silently replace accepted final dependency pins. Completed unchanged migration evidence and historical assets SHALL remain valid; regression checks MUST cover the affected preview-consumption behavior.

#### Scenario: Preview validation finishes
- **WHEN** preview consumption is demonstrated and the mounted UI configuration is restored
- **THEN** the accepted final dependency pins remain unchanged unless a separate intentional dependency update was requested, and preview evidence is reported separately from retained pinned-migration evidence
