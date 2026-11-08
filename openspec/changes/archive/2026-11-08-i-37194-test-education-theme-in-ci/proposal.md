## Why

Budsies, Education, Petsies and Waggables are all built from the app branch `petsies-theme`, but CI for that branch tests only the `petsies-theme`, `budsies-theme` and `waggables-theme` theme branches. The Education theme (`budsies-education-theme`) ships without any CI run, so production releases repeat the install, unit tests and build locally for it (#37123 release, 2026-11-08).

## What Changes

- Add `budsies-education-theme` to the default themes of `petsies-theme`, for pushes and for pull requests into it.
- Unrecognized pull-request targets, which use every default theme, also test it.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `cross-repository-pr-ci-selection`: the default themes of `petsies-theme` include `budsies-education-theme`.

## Impact

- `.github/scripts/resolve-pr-ci-selection.js` and its tests; `AGENTS.md` CI notes.
- One more matrix entry per job (dependencies, lint, unit tests, build) on `petsies-theme` pushes and pull requests.
