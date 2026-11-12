# Tasks

## 1. Main app dependency transport

- [x] 1.1 Replace shared/Vue direct URLs with the verified source repository release assets and regenerate Yarn 4.17.1 lock entries in the UI container; verify the scoped manifest/lock diff preserves source pins and unrelated locked versions, matches Vue's packaged shared URL and removes direct/indirect/workspace GitPkg entries.
- [x] 1.2 Add a focused dependency-contract check for the release URLs, matching shared identity and active manifest/lock graph; verify it passes on the migrated graph and detects the actual old GitPkg/indirect mismatch regression without globally disabling lifecycle scripts.
- [x] 1.3 Document archive provenance/checksum inspection, container lockfile updates, the two app lines and retained historical URLs; verify examples match the actual published assets and identify all five maintained app/theme combinations.

## 2. Bulk Orders app dependency transport

- [x] 2.1 Apply the same narrow manifest/lock/check/documentation changes on `37220-replace-gitpkg-with-release-tarballs-bulkorders` from updated `bulkorders-theme`; verify its focused dependency check and diff use the same asset pair without importing unrelated main-app/theme changes or submodule pointers.

## 3. Explicit preview consumption

- [x] 3.1 Update dependency-contract checks on both existing app-line features to accept supported immutable preview identities as well as explicit releases; verify focused cases retain exact shared/Vue pair and indirect identity, no-GitPkg/hook checks and rejection of mismatches without changing accepted final manifest/lock pins.
- [x] 3.2 Document the publisher command/defaults and exact handoff, feature iteration and merged-source selection, explicit container URL/lock updates and isolated testing/restoration on both app lines; verify examples require no publisher config/test commit or manual tag and keep all five maintained brand combinations and historical assets identified.

## Workflow follow-up

- Source publication and anonymous-download/checksum evidence are prerequisites for final release URLs/lock regeneration; ask the lead for missing authorization/access instead of substituting local archives or invented integrity values.
- Tester owns empty-cache `yarn install --immutable` with GitPkg unavailable, maintained configuration/lint/unit checks, full builds and Storefront UI render/hydration evidence across main-app Petsies/Budsies/Education/Waggables themes and the separate Bulk Orders app/theme. See design.md for exact commands and branch inventory.
- Unchanged theme/Braintree sources remain on maintained branches; preserve local edits and do not commit submodule pointers. Archive only when selected by the operator; merges and deployment remain separate.
- Preview extension: tester consumes the returned matching pair in an intended feature/testing graph, checks targeted immutable install/source compilation/rendering and restores the accepted final pins and mounted configuration. Preserve completed migration evidence; determine additional regressions from the actual diff. No automatic VSF commits or arbitrary final-pin replacement is authorized.
