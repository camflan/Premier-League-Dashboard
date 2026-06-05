# Tasks — pipeline-cleanup

## 1. Pre-flight verification

- [x] 1.1 Verify GitHub Pages source is "GitHub Actions" (not branch root) so untracking `index.html` can't break serving
- [x] 1.2 Capture baseline: run current `npm run build`, stash `index.html` output outside the repo for later diff

## 2. Cleanup commit

- [x] 2.1 Delete dead one-off scripts: `generate-matches.js`, `fix-wolves.js`, `add-reading.js`, `find-reading.js`, `find-reading-logo.js`, `fix-old-urls.js`, `update-old-urls.js`, `fix-logo-names.js`, `scrape-logos.js`, `scrape-logos-extended.js`, `find-missing-logos.js`, `find-missing-logos-v2.js`, `check-logos-detailed.js`, `verify-logos.js`, `merge-logos.js`, `add-found-logos.js`, `extract-data.js`, `extract-data-simple.js`
- [x] 2.2 Delete iCloud dupes: `index 2.html`–`index 8.html`, `ARCHITECTURE 2.md`, `COMPLETION_SUMMARY 2.md`, `COMPLETION_SUMMARY.md`, `IMPLEMENTATION_SUMMARY.md`, `QUICK_REFERENCE 2.md`, `.gitignore 2`, `template/index.html 2.template`
- [x] 2.3 Delete orphaned flat dirs `data/standings/` and `data/matches/`
- [x] 2.4 Add `/index*.html` to `.gitignore` (replacing the commented-out `/index.html` + iCloud note); `git rm --cached index.html`
- [x] 2.5 Commit cleanup atomically

## 3. Render library + entry points

- [x] 3.1 Create `scripts/lib/compose-data.js` exporting `composeData()` (extracted from `build-html.js`, per-league reads only — drop dead `readSeasonDir()`)
- [x] 3.2 Create `scripts/lib/render.js` exporting `renderHTML(data, template)` (injection marker + `{{ACTIVE_SEASON_SHORT}}`)
- [x] 3.3 Create `scripts/render.js` CI entry: composeData → renderHTML → write `_site/index.html`; log compose+render duration
- [x] 3.4 Create `scripts/dev.js`: `node:http` server (port 8000, `--port` flag), per-request render for `/`, serve `static/` assets from disk with content types, startup warning only when active-season standings for the primary league are missing/empty
- [x] 3.5 Delete `scripts/build-html.js`
- [x] 3.6 Verify: `npm run render` output is identical to the stashed baseline `index.html` (modulo nothing)
- [x] 3.7 Verify: `npm run dev` serves the page, logos load, template edit shows on refresh, no root `index.html` created
- [x] 3.8 Commit refactor

## 4. Unified sync

- [x] 4.1 Rename/refactor `fetcher.js` → `scripts/sync.js`: default all leagues from `static/leagues.json`, `--force` replaces `--no-cache`, league names from `leagues.json` (drop hardcoded map)
- [x] 4.2 Absorb `fetch-historical.js` as `--from=YYYY-YY` backfill respecting `static/seasons-config.json` availability; delete `fetch-historical.js`
- [x] 4.3 Absorb `fetchers/fetch-logos.js` as `--type=logos` (excluded from default type set); keep module under `scripts/fetchers/`
- [x] 4.4 Preserve safety rails: TTL cache, hash-gated writes, never-clobber-with-empty, standings re-derivation with active-season protection
- [x] 4.5 Verify: `npm run sync` (cache-fresh → skips), `npm run sync -- --force --league=premier-league --type=fixtures` (fetches), empty fetch preserves files
- [x] 4.6 Commit sync unification

## 5. package.json

- [x] 5.1 Rewrite scripts: `sync`, `render`, `dev`; remove `build`, `fetch`, `fetch-historical`, `fetch-logos`, `extract`, `test`; keep `validate`, `season-end`, biome scripts
- [x] 5.2 Remove `http-server` devDependency and `"main": "index.html"`; run `npm install` to refresh lockfile
- [x] 5.3 Commit

## 6. Workflows

- [x] 6.1 `nightly-update.yml`: replace fetch+build steps with `npm run sync`; `git add data/` only (keep `static/league-promotions.json` in season-end branch); drop `index.html` from all `git add` lines
- [x] 6.2 `season-end-update.yml`: drop build step and `index.html` from `git add`
- [x] 6.3 `historical-fetch.yml`: use `npm run sync -- --from=…`; drop build step and `index.html` from `git add`
- [x] 6.4 `deploy-pages.yml`: `npm run render`, upload `_site/`; ensure bot data-commits trigger deploy (add `workflow_run` on the three data workflows, since default `GITHUB_TOKEN` pushes don't fire `on: push`)
- [x] 6.5 Commit workflow changes

## 7. Docs

- [x] 7.1 Rewrite `CLAUDE.md`: per-league data layout, sync → render pipeline, new commands table, drop iCloud rationale and `index.html`-tracking notes
- [x] 7.2 Update `ARCHITECTURE.md`: new pipeline diagram, note `handle-season-end.js` scaffolding vs deleted fake-data generator
- [x] 7.3 Update `QUICK_REFERENCE.md` recipes to new commands
- [x] 7.4 Commit docs

## 8. Post-merge verification

- [ ] 8.1 Manually dispatch `deploy-pages.yml`; confirm Pages serves the freshly rendered site
- [ ] 8.2 After first nightly run: confirm data-only commit and that it triggered a deploy

## 9. Immutable source data (added during apply)

- [x] 9.1 Remove `rederiveStandings()` from sync — sync writes fetched data only
- [x] 9.2 `composeData()` derives standings in memory for seasons with matches but no standings file; official files always win
- [x] 9.3 Month-chunk `getMatchResultsForDateRange()` (whole-season queries truncate at ~100 events)
- [x] 9.4 Add `league-two` to `static/seasons-config.json` (eng.4, ESPN from 2003-04)
- [x] 9.5 Update specs/design/docs for the immutability principle
