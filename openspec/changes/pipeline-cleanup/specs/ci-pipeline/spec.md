# ci-pipeline

## ADDED Requirements

### Requirement: Data workflows commit data only
Fetch workflows (`nightly-update`, `season-end-update`, `historical-fetch`) SHALL commit changes under `data/` (and `static/league-promotions.json` for season-end) only. They MUST NOT build, commit, or push any HTML.

#### Scenario: Nightly run with data changes
- **WHEN** the nightly workflow fetches new match data
- **THEN** the resulting commit touches only files under `data/`

#### Scenario: Nightly run without changes
- **WHEN** the nightly fetch produces no data changes (hash-gated writes wrote nothing)
- **THEN** no commit is created

### Requirement: Deploy renders fresh
`deploy-pages.yml` SHALL render the site from the current commit (`npm run render` → `_site/index.html`) and deploy `_site/` to GitHub Pages. It MUST NOT rely on any committed HTML.

#### Scenario: Deploy after data commit
- **WHEN** a data commit lands on main
- **THEN** a deploy run renders `_site/index.html` from that commit's template + data and publishes it

### Requirement: Data commits trigger deploys
A successful data-workflow commit to main SHALL result in a Pages deploy without manual intervention, accounting for the fact that pushes made with the default `GITHUB_TOKEN` do not fire `on: push` workflows.

#### Scenario: Bot push reaches Pages
- **WHEN** the nightly workflow pushes a data commit using the default token
- **THEN** the deploy workflow still runs (via `workflow_run` chaining or an equivalent mechanism) and publishes the updated site
