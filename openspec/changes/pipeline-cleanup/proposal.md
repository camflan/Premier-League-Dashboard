# Pipeline Cleanup

## Why

The repo has drifted: 12 tracked iCloud duplicate files (~4.5 MB of stale build artifacts), ~16 dead one-off scripts, orphaned flat data dirs the build no longer reads, three separate fetch entry points, and a build artifact (`index.html`) committed to the repo that workflows race to regenerate. Docs describe a data layout that no longer exists. There is no single, clear pipeline from sources → rendered site.

## What Changes

- **BREAKING**: `index.html` is no longer committed or written to the repo root. All `index*.html` files are gitignored and untracked. The site is rendered fresh in CI to `_site/index.html` at deploy time.
- One unified sync entry point: `scripts/sync.js` absorbs `fetcher.js`, `fetch-historical.js`, and `fetchers/fetch-logos.js`. Default run covers all leagues × all types, cache-gated; `--force` bypasses caches (replaces `--no-cache`). Existing safety rails (content-hash-gated writes, never-clobber-with-empty) are preserved.
- Rendering becomes a pure library: `composeData()` (reads `data/` + `static/`) and `renderHTML(data, template)` (string in → string out), extracted from `build-html.js`.
- New dev server `scripts/dev.js`: bare `node:http`, renders in-memory per request — no disk artifact, no watcher. Warns only when active-season data is missing/empty (stale data is fine for dev). Drops the `http-server` dependency.
- New CI render entry `scripts/render.js`: writes `_site/index.html` only.
- Workflows commit `data/` (and `static/league-promotions.json`) only — never HTML. `deploy-pages.yml` renders fresh on push to main.
- Delete fake-data generator `generate-matches.js` (violates the no-fabricated-data rule).
- Delete ~16 dead one-off scripts: `fix-wolves.js`, `add-reading.js`, `find-reading.js`, `find-reading-logo.js`, `fix-old-urls.js`, `update-old-urls.js`, `fix-logo-names.js`, `scrape-logos.js`, `scrape-logos-extended.js`, `find-missing-logos.js`, `find-missing-logos-v2.js`, `check-logos-detailed.js`, `verify-logos.js`, `merge-logos.js`, `add-found-logos.js`, `extract-data.js`, `extract-data-simple.js`.
- Delete tracked iCloud duplicates: `index 2.html`–`index 8.html`, `ARCHITECTURE 2.md`, `COMPLETION_SUMMARY 2.md`, `COMPLETION_SUMMARY.md`, `IMPLEMENTATION_SUMMARY.md`, `QUICK_REFERENCE 2.md`, `.gitignore 2`, `template/index.html 2.template`.
- Delete orphaned flat data dirs `data/standings/` and `data/matches/` (build reads only `data/<league>/<type>/`).
- Remove dead code/config: unused `readSeasonDir()` in build logic, dead npm scripts (`test` → nonexistent file, `extract`).
- Rewrite `CLAUDE.md` and `ARCHITECTURE.md` to document the per-league data layout and the new sync → render pipeline.

## Capabilities

### New Capabilities

- `data-sync`: unified CLI that pulls standings/matches/fixtures/logos from sources for all leagues, cache-gated by default with force override, with write-safety guarantees.
- `site-rendering`: pure compose/render library plus the CI entry point that produces `_site/index.html`; no HTML artifact ever lands in the repo root or git.
- `dev-server`: in-memory development server that renders per request from current `template/` + `data/` + `static/`, with an empty-data warning.
- `ci-pipeline`: workflow contract — data-only commits from fetch jobs, fresh render at deploy, no HTML committed anywhere.

### Modified Capabilities

(none — no existing specs)

## Impact

- `scripts/` shrinks from ~24 files to the pipeline core (`sync.js`, `render.js`, `dev.js`, `lib/`, `fetchers/`, `utils/`, `validate-data.js`, `handle-season-end.js`).
- `package.json`: scripts rewritten (`sync`, `render`, `dev`); `http-server` devDependency removed; dead `test`/`extract` scripts removed.
- All four data workflows (`nightly-update`, `season-end-update`, `historical-fetch`, `deploy-pages`) change.
- `.gitignore` gains `/index*.html` and keeps `/_site/`; `index.html` + 7 dupes untracked.
- Anyone relying on a committed `index.html` (e.g. opening the repo copy directly) must run `npm run dev` or `npm run render` instead.
