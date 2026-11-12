# Tasks

## 1. Main app dependency transport

- [x] 1.1 Replace shared/Vue direct URLs with the verified source repository release assets and regenerate Yarn 4.17.1 lock entries in the UI container; verify the scoped manifest/lock diff preserves source pins and unrelated locked versions, matches Vue's packaged shared URL and removes direct/indirect/workspace GitPkg entries.
- [x] 1.2 Add a focused dependency-contract check for the release URLs, matching shared identity and active manifest/lock graph; verify it passes on the migrated graph and detects the actual old GitPkg/indirect mismatch regression without globally disabling lifecycle scripts.
- [x] 1.3 Document archive provenance/checksum inspection, container lockfile updates, the two app lines and retained historical URLs; verify examples match the actual published assets and identify all five maintained app/theme combinations.

## 2. Bulk Orders app dependency transport

- [x] 2.1 Apply the same narrow manifest/lock/check/documentation changes on `37220-replace-gitpkg-with-release-tarballs-bulkorders` from updated `bulkorders-theme`; verify its focused dependency check and diff use the same asset pair without importing unrelated main-app/theme changes or submodule pointers.

## Workflow follow-up

- Source publication and anonymous-download/checksum evidence are prerequisites for final release URLs/lock regeneration; ask the lead for missing authorization/access instead of substituting local archives or invented integrity values.
- Tester owns empty-cache `yarn install --immutable` with GitPkg unavailable, maintained configuration/lint/unit checks, full builds and Storefront UI render/hydration evidence across main-app Petsies/Budsies/Education/Waggables themes and the separate Bulk Orders app/theme. See design.md for exact commands and branch inventory.
- Unchanged theme/Braintree sources remain on maintained branches; preserve local edits and do not commit submodule pointers. Archive only when selected by the operator; merges and deployment remain separate.
