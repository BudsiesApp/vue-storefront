## MODIFIED Requirements

### Requirement: Pull-request task context
The CI resolver SHALL extract the leading numeric task identifier from the storefront pull-request source branch and SHALL use the pull-request target branch to determine default relevant themes.

#### Scenario: Task-prefixed Petsies pull request
- **WHEN** a storefront pull request has source branch `36838-ci-selection` and target branch `petsies-theme`
- **THEN** the resolver uses task identifier `36838` and default themes `petsies-theme`, `budsies-theme`, `budsies-education-theme`, and `waggables-theme`

#### Scenario: Pull request has no task prefix
- **WHEN** a storefront pull request source branch does not begin with a numeric task identifier
- **THEN** the resolver logs the fallback and uses default themes with payment branch `optimuspro`

#### Scenario: Pull request targets an unrecognized branch
- **WHEN** a storefront pull request target is neither `petsies-theme` nor `bulkorders-theme`
- **THEN** the resolver uses all default theme branches and logs that it could not narrow the default group

### Requirement: Branch resolution is used by CI jobs
The CI workflow SHALL use the resolver's payment branch and theme matrix for dependency preparation, linting, maintained unit tests, and builds of pull requests.

#### Scenario: Resolved payment and theme branches are checked out
- **WHEN** the resolver returns a payment branch and theme matrix entry
- **THEN** every corresponding matrix job checks out those branches before using cached dependencies or executing its command

#### Scenario: Push event preserves static behavior
- **WHEN** the workflow runs for a configured push branch
- **THEN** it uses the existing static payment and theme branch mapping without pull-request discovery

#### Scenario: Push to the main store branch tests every brand built from it
- **WHEN** the workflow runs for a push to `petsies-theme`
- **THEN** the theme matrix contains `petsies-theme`, `budsies-theme`, `budsies-education-theme`, and `waggables-theme`
