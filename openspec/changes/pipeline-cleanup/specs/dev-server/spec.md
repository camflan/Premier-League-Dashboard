# dev-server

## ADDED Requirements

### Requirement: In-memory per-request rendering
`scripts/dev.js` (exposed as `npm run dev`) SHALL serve the dashboard over HTTP by composing and rendering in memory on every request to `/`, writing no HTML to disk.

#### Scenario: Edit-refresh loop
- **WHEN** `template/index.html.template` or any JSON under `static/`/`data/` is edited while the dev server runs
- **THEN** the next browser refresh serves the updated render with no build step or server restart

#### Scenario: No disk artifact
- **WHEN** the dev server has served requests
- **THEN** no `index.html` exists in the repo root or anywhere outside `_site/`

### Requirement: Static asset serving
The dev server SHALL serve files under `static/logos/` (and other static assets the template references) from disk with correct content types.

#### Scenario: Logo request
- **WHEN** the browser requests a logo path referenced by the rendered page
- **THEN** the dev server returns the file with an appropriate `Content-Type`

### Requirement: Empty-data warning only
On startup the dev server SHALL warn (suggesting `npm run sync`) only when active-season data is missing or empty. Stale-but-present data MUST NOT produce a warning, so dev works offline.

#### Scenario: Missing active-season data warns
- **WHEN** the dev server starts and the active season's standings file for the primary league is absent or `[]`
- **THEN** a warning suggesting `npm run sync` is printed and the server still starts

#### Scenario: Stale data is silent
- **WHEN** the dev server starts with present-but-stale data (expired TTL cache)
- **THEN** no warning is printed
