# Design

## Context

See `proposal.md` for motivation. The root manifest currently pins shared at `3ff374628936ba579a9bbb2a634c6c3ce9db6ac5` and Vue at `b345b9cb261dabf1c105f4e6007fe7332ec8b6a4` through GitPkg. Vue introduces the same shared GitPkg URL indirectly. Both maintained app branches contain these three transport references in their Yarn 4 graphs, including the root workspace entry.

The working checkout was fast-forwarded to `petsies-theme` commit `494bacccc01f37d254d936410e164368081f3707` before creating `37220-replace-gitpkg-with-release-tarballs`. Unrelated untracked files and existing theme/Braintree submodule state are preserved. No component-source edit is needed in those repositories.

`core/build/webpack.server.config.ts` explicitly bundles `@storefront-ui/vue`; normal client/server builds compile its source. Theme imports include package-root components, `@storefront-ui/vue/styles`, `@storefront-ui/shared/styles/helpers/breakpoints`, shared component SCSS and deep Vue utilities such as `src/utilities/mobile-observer`. Existing CI runs Node 24.17.0 and Yarn 4.17.1, selecting theme/Braintree branches with `.github/scripts/resolve-pr-ci-selection.js`.

## Goals / Non-Goals

**Goals:** Consume the companion repository's prepared source archives with a minimal dependency diff; cover every maintained app/theme combination without altering CI's branch-selection behavior.

**Non-Goals:** Installing native Git workspaces, switching package managers, adding ignore-scripts globally, replacing source compilation, changing component imports, modifying theme/Braintree code or committing submodule pointers.

## Decisions

### Real release URLs before final lockfile regeneration

The source-repository change publishes `storefront-ui-shared.tgz` and `storefront-ui-vue.tgz` under a `packages-*` tag, initially proposed as `packages-37220-v1`. Final dependency values use:

`https://github.com/BudsiesApp/storefront-ui/releases/download/<release-tag>/storefront-ui-shared.tgz`

and the corresponding `storefront-ui-vue.tgz` URL. Verify the release metadata identifies the separate initial pins and packaging revision before selecting it. If the proposed tag is occupied, the publisher uses a new tag and consumers use those real URLs; never repoint a release. Exact tag selection is an execution detail, not permission to upgrade sources.

Regenerate lockfiles using Yarn 4.17.1 in the documented UI container, using the existing workspaces, rather than hand-editing archive checksums or broadly updating dependencies. Do not substitute local-file URLs in the final graph. Archive availability is a prerequisite for final lockfile work, not a reason to report a local package as published. Preserve unrelated locked versions; explain any unavoidable transport/identity-induced lock changes.

### Direct and indirect shared identity

The companion Vue archive replaces its own shared GitPkg URL with the same shared asset as the application and removes its entry-generation lifecycle hooks. This consumer replaces the two root dependency values and every corresponding lock resolution/workspace reference. Use the packaged manifest as the source of the indirect dependency; do not hide stale GitPkg references with a consumer resolution override. The old packages' versions remain `0.7.11`; URL locators, not invented version bumps, distinguish the prepared artifacts.

### Two app branches, five brand combinations

The primary feature targets `petsies-theme`. Prepare `37220-replace-gitpkg-with-release-tarballs-bulkorders` from updated `bulkorders-theme` for the same narrow manifest/lock/documentation change; do not merge whole app lines or unrelated brand changes. Carry this OpenSpec change to both ticket branches so each PR describes its contract. The two app branches share one behavior specification, not different dependency policies.

Acceptance matrix derived from repository CI and the development branch inventory:

- Main app feature with `vsf-capybara` branches `petsies-theme`, `budsies-theme`, `budsies-education-theme`, and `waggables-theme`.
- Bulk Orders app feature with theme `bulkorders-theme`.
- `vsf-payment-braintree` remains on `optimuspro`; no same-ticket companion PR is needed because its sources do not change.

The existing CI resolver naturally selects these defaults without theme PRs. Keep its selection logic and tests unchanged. A primary app PR alone does not exercise the separate Bulk Orders line. Local verification uses the existing mounted checkout and follows branch-switching conventions; do not create a second installed worktree or detach locally maintained submodules.

### Focused checks and tester-owned acceptance

Add a small dependency-contract check using existing project tooling: both direct values are release-specific assets; packaged Vue's shared locator equals the app's shared URL; relevant root/workspace/indirect lock entries contain no GitPkg transport. This is an explicit migration requirement, not a generic URL validator. Validate package payload compatibility through existing imports/builds instead of rewriting them or adding speculative fallbacks.

The implementer runs focused checks and records scoped lock diffs. The tester owns cache-empty immutable installation with GitPkg unavailable, anonymous archive/checksum verification, maintained checks (`yarn test:upgrade:config`, `yarn lint`, `yarn test:unit:maintained`), `yarn build` for all five combinations and representative Storefront UI render/hydration smoke evidence. Existing non-CI core tests remain separately reported, not silently reclassified as maintained tests. Where checks fail, distinguish pre-existing failures from migration regressions with evidence; do not suppress them or claim success.

## Risks / Trade-offs

- Theme tests may mock component exports → supplement automated builds/tests with tester-owned real rendering; this does not authorize new customer-facing behavior or a payment flow.
- Node/toolchain/cache differences can conceal network dependencies → use the pinned UI container tools and tester-owned empty-cache/GitPkg-unavailable installation rather than trusting an existing `node_modules` tree.
- Source publication is external and separately authorized → do independent check/documentation work first, keep final URL/lock acceptance open until actual public artifacts exist.
- Historical app revisions intentionally retain GitPkg URLs → audit active maintained manifests/locks and installed package manifests, not immutable history or OpenSpec context text; keep GitPkg hosting intact.

## Migration Plan

Publish and verify source assets first with lead authorization; update both UI feature branches using the same asset pair and regenerate their respective locks; run focused checks and hand off the five-combination acceptance matrix. Future source/packaging revisions publish a new tag and repeat both app-line updates. Merging/brand release propagation/deployment are not part of this specification-writing assignment. An authorized consumer rollback can restore the previous dependency commit without modifying any release asset.

## Approved preview-consumption extension

### Retain the accepted migration baseline

The original migration is implemented and accepted for its targeted distribution behavior (D18–D21). Main UI PR #567 head `5bf89f083` and Bulk Orders PR #568 head `a6daf4258` consume `packages-37220-v1`; these final pins, the completed five-brand evidence and published assets remain valid. The following preview checks are additions, not a claim that unchanged original acceptance must be repeated or that baseline caveats disappeared.

### Explicit paired preview handoff

The source publisher's selected surface is the local `python3 scripts/preview-packages.py --vue-ref <branch-or-full-commit> [--shared-ref <branch-or-full-commit>]` command using supported existing Python in a committed, pushed packaging checkout, not a dispatch action dependent on stale defaults. Independent omitted Storefront UI inputs visibly use the documented pinned companion from its release configuration; a shared-only selection is also supported. The command returns exact paired package URLs, resolved source/packaging identities including the exact toolchain, and manifest/checksum URLs after verified publication under `package-preview-<identity digest>`. Maintainers do not prepare tags or edit publisher config/tests for each request.

Document how to verify that handoff, explicitly set both UI dependencies and regenerate the Yarn 4 lock in the existing mounted container. Preserve exact pair equality between the app's shared URL and the Vue archive's shared dependency. A later iteration invokes the command against the advanced source branch; final post-merge selection passes the actual merged SHA. Similar source trees are not an excuse to reuse a different source/packaging identity. Do not introduce a moving branch URL or automatic VSF commits/PRs.

### Dependency-contract compatibility on both app lines

`test/upgrade/storefront-ui-release-contract.js` currently restricts shared URLs to `packages-*`, so it would reject the new namespace even though the package transport is compatible. Update the contract to accept supported `packages-*` release tags and `package-preview-<64 lowercase hex>` identities from the same public repository with the same archive basenames. Keep pair matching, installed indirect shared equality, lock presence, no-GitPkg and no generation-hook assertions; do not generalize to arbitrary hosts/assets or suppress lifecycle scripts.

Focused regression cases cover both namespaces, an actual returned pair, mismatched preview pairs/indirect references and the existing old-GitPkg rejection. Apply the same check and documentation changes to the primary and Bulk Orders features, preserving their existing implementation/task status and branch differences. No new dependency version, package manager or component change is selected.

### Acceptance and state restoration

Tester demonstrates returned-preview consumption in an explicitly identified temporary feature/testing graph using the existing container workflow, including immutable install, matching shared identity and targeted source compilation/rendering. Avoid committing arbitrary preview source pins onto the already-accepted final feature graphs; restore any temporary manifests, lockfiles, mounted app/theme/Petsies configuration and dependencies after the experiment while preserving unrelated user edits. The implementation changes here can consist only of contract tests and documentation; successful preview consumption is separate evidence, not a permanent final-pin replacement.

Retain the completed five-brand builds/rendering and original empty-cache evidence. Spec reviewer/tester select additional regressions from the changed checks/docs and actual preview payload; do not silently invalidate every original result. Source publication/branch-advance evidence belongs to the publisher acceptance, not duplicate UI implementation checkboxes. Input-10 authorizes later command-managed preview tags/releases/assets after source checks, not application merges, deployment or issue transition; no new access is assumed.
