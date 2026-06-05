# site-rendering

## ADDED Requirements

### Requirement: Pure render library
Rendering SHALL be a pure library: `composeData()` reads `static/*.json` and `data/<league>/<type>/<season>.json` into the `window.__DATA` object, and `renderHTML(data, template)` returns the full HTML page as a string with no filesystem or network side effects.

#### Scenario: Render is deterministic for fixed inputs
- **WHEN** `renderHTML` is called twice with the same data object and template string
- **THEN** it returns byte-identical output

#### Scenario: Composition reads only per-league layout
- **WHEN** `composeData()` runs
- **THEN** season data is read exclusively from `data/<league>/<type>/` directories (no flat `data/<type>/` fallback)

### Requirement: CI render entry point
`scripts/render.js` (exposed as `npm run render`) SHALL write the rendered page to `_site/index.html` and nowhere else.

#### Scenario: Render writes only to _site
- **WHEN** `npm run render` completes
- **THEN** `_site/index.html` exists and no HTML file is created or modified in the repo root

### Requirement: No HTML artifacts in the repository
No `index*.html` file SHALL be tracked by git or written to the repo root by any script or workflow. `.gitignore` SHALL contain `/index*.html` and `/_site/`.

#### Scenario: Build artifacts are ignored
- **WHEN** an `index.html` or iCloud-duplicate `index N.html` appears in the repo root
- **THEN** `git status` shows it as ignored, not untracked or modified

### Requirement: Render-time derivation
Derived data SHALL be computed in memory during composition, never written to `data/`. For any (league, season) that has played matches but no standings file (or an empty one), `composeData()` SHALL derive standings from those matches. An existing non-empty standings file (official tables, including points deductions) always wins over derivation.

#### Scenario: Missing standings derived from matches
- **WHEN** a season has a matches file with played results and no standings file
- **THEN** the rendered `window.__DATA` contains standings derived from those matches, and no standings file is written to disk

#### Scenario: Official standings never overridden
- **WHEN** a season has both a standings file and a matches file
- **THEN** the rendered standings come verbatim from the standings file
