# Design — pipeline-cleanup

## Context

The build architecture (template + JSON → injected `window.__DATA` → single HTML page) is sound. What rotted is the edges:

- Three fetch entry points (`fetcher.js`, `fetch-historical.js`, `fetchers/fetch-logos.js`), each single-purpose, `fetcher.js` single-league per run.
- `build-html.js` couples data composition, rendering, and disk output in one script that writes `index.html` at repo root.
- `index.html` is tracked (for a now-abandoned iCloud rationale), so CI workflows commit it, and iCloud Drive keeps spawning tracked `index N.html` conflict copies.
- ~16 dead one-off scripts, orphaned flat `data/standings|matches` dirs, docs describing the pre-multi-league layout.

`fetcher.js` already has the right bones: TTL cache in `data/.cache/` (gitignored), content-hash-gated writes, never-clobber-with-empty safety, standings re-derivation from matches with active-season protection. Preserve all of it.

## Goals / Non-Goals

**Goals:**
- One sync entry point covering all leagues × all data types, cached by default, `--force` override.
- Pure render library shared by dev and CI — impossible for dev and deploy output to drift.
- No HTML artifact in the repo root or in git, ever. CI renders fresh at deploy.
- Dev loop: edit template/JSON → refresh browser. No build step, no watcher, no disk writes.
- Repo contains only sources: `template/`, `static/`, `data/`, `scripts/`, docs, workflows.

**Non-Goals:**
- No changes to template HTML/CSS/JS behavior or `window.__DATA` shape — the rendered page is byte-identical (modulo timestamp-free determinism already present).
- No changes to data file formats or the per-league `data/<league>/<type>/<season>.json` layout.
- No new data sources or leagues.
- Not migrating the repo out of iCloud Drive (but gitignoring `index*.html` removes the tracked-dupe problem).

## Decisions

### 1. Library split: `scripts/lib/compose-data.js` + `scripts/lib/render.js`

`build-html.js` is already ~90% pure. Extract:

```
composeData({ rootDir })  → data object   (reads static/*.json + data/<league>/<type>/*)
renderHTML(data, template) → html string  (injection + {{ACTIVE_SEASON_SHORT}} replacement)
```

Entry points become thin:

```
scripts/render.js  →  composeData → renderHTML → write _site/index.html
scripts/dev.js     →  node:http server; per request: composeData → renderHTML → respond
scripts/sync.js    →  fetch orchestrator (no rendering)
```

*Alternative considered*: keep `build-html.js` and add a `--stdout` flag. Rejected — dev server needs the functions in-process, not a subprocess; and the name "build" no longer describes what happens (render at deploy, not build-and-commit).

### 2. `sync.js` = `fetcher.js` core, generalized

- Default: all leagues from `static/leagues.json` × all types, active season, cache-gated.
- Flags: `--league=<id>`, `--season=YYYY-YY`, `--type=<t>`, `--all` (fetchFrom → active), `--from=YYYY-YY` (historical backfill, absorbs `fetch-historical.js`), `--force` (replaces `--no-cache`).
- Logos become a sync target (absorbs `fetchers/fetch-logos.js`) — run via `--type=logos`; excluded from the default type set since logos change rarely and write to `static/`, not `data/`.
- League display names come from `static/leagues.json`, replacing the hardcoded map in `fetcher.js:237`.
- All existing safety rails carry over verbatim: TTL gate, hash-gated writes, never-clobber, standings re-derivation rules.

*Alternative considered*: keep three scripts, add a wrapper. Rejected — wrapper-over-fragments is how the current sprawl happened; one orchestrator with per-type fetcher modules (`scripts/fetchers/*` stay) is the same composition with one front door.

### 3. Dev server: per-request render, no cache, no watcher

Every request to `/` runs `composeData() → renderHTML()` (~tens of ms: ~140 JSON files + one string replace). Freshness is structural — there is no artifact to go stale. `static/logos/*` served from disk with basic content-type mapping. Port 8000 (current convention), `--port` override.

Startup check: if `data/<league>/standings/<activeSeason>.json` is missing or `[]` for the primary league, print a warning suggesting `npm run sync`. **Stale data does not warn** — dev must work offline.

*Alternative considered*: render-once + fs.watch. Rejected — watcher complexity buys nothing when render is this cheap.

### 4. CI inversion: data commits trigger deploy renders

```
nightly-update.yml      sync (active season, all leagues) → commit data/ only ─┐
season-end-update.yml   handle-season-end → commit data/ + league-promotions ──┼─▶ push to main
historical-fetch.yml    sync --from=… → commit data/ only ─────────────────────┘      │
                                                                                      ▼
deploy-pages.yml        on push to main (and workflow_run after data jobs):
                        npm ci → npm run render → upload _site/ → Pages
```

`git add` lines drop `index.html`; build steps removed from data workflows. Deploy is the only place HTML exists, in `_site/` (gitignored).

*Note*: if `deploy-pages.yml` currently triggers on push, data commits from the bots trigger it automatically — verify its trigger covers bot pushes (default `GITHUB_TOKEN` pushes do **not** trigger `on: push` workflows; may need `workflow_run` or a PAT/deploy-key. Decide in implementation: prefer adding `workflow_call`/`workflow_run` chaining over PATs).

### 5. Untrack + ignore, single commit

```
.gitignore: + /index*.html      (covers index.html and iCloud "index N.html" dupes)
            keep /_site/
git rm --cached index.html "index 2.html" … "index 8.html"
git rm "<other dupes>" "<dead scripts>" data/standings data/matches -r
```

One atomic cleanup commit (deletions + gitignore), separate commits for the sync/render/dev refactor and the workflow changes.

### 6. package.json

```json
"sync":   "node scripts/sync.js",
"render": "node scripts/render.js",
"dev":    "node scripts/dev.js",
"validate": "node scripts/validate-data.js",
"season-end": "node scripts/handle-season-end.js",
"lint" / "format" / "fix": (unchanged)
```

Removed: `build`, `fetch`, `fetch-historical`, `fetch-logos`, `extract`, `test` (dead). `http-server` devDependency dropped. `"main": "index.html"` removed.

## Risks / Trade-offs

- [Bot pushes don't trigger `on: push` deploys with default `GITHUB_TOKEN`] → chain deploy via `workflow_run` on the data workflows, or call deploy as a reusable workflow from each data job. Verify on first nightly after merge.
- [Someone's muscle memory runs `npm run build`/`npm run fetch`] → keep `build` and `fetch` as aliases printing a one-line pointer for one release, or just let npm error clearly. Decision: let them error; CLAUDE.md rewrite covers it.
- [iCloud may still spawn `" 2"` dupes of *other* tracked files (e.g. `.md`)] → out of scope to fix the sync root cause; gitignore only covers `index*.html`. Accept manual cleanup for rare doc dupes.
- [Per-request render hides a slow-compose regression] → render.js logs compose+render duration; if it ever crosses ~500 ms revisit.
- [`handle-season-end.js` also *creates* data (zeroed next-season standings)] → retained deliberately: structural scaffolding, not fabricated results. Documented in ARCHITECTURE.md to distinguish from the deleted `generate-matches.js`.

## Migration Plan

1. Cleanup commit (deletions, untrack, gitignore).
2. Refactor commit (lib split, sync.js, dev.js, render.js, package.json).
3. Workflow commit (4 workflows).
4. Docs commit (CLAUDE.md, ARCHITECTURE.md, QUICK_REFERENCE.md).
5. Verify: `npm run render` output diffed against pre-change `npm run build` output (must be identical modulo nothing); manual dispatch of deploy workflow; watch first nightly.

Rollback: revert commits; `index.html` regenerable at any commit via the render entry of that commit.

## Open Questions

- Does GitHub Pages deploy currently rely on the *committed* `index.html` anywhere besides `deploy-pages.yml` (e.g. Pages configured to serve from branch root rather than Actions)? Verify Pages source is "GitHub Actions" before untracking.
- Should `validate-data.js` run as a gate inside sync (post-fetch) and/or render (pre-render)? Lean: post-fetch in sync, fail loud in CI.

### 7. Source data is immutable; derivation at render time (added during apply)

Sync originally re-derived past-season standings files from fetched matches (carried over from `fetcher.js`). That writes *computed* data into `data/` and can silently clobber official tables — derived standings can't know about points deductions (e.g. Portsmouth −9, 2009-10). Decision: **nothing ever writes derived data to `data/`**. `composeData()` derives standings in memory for any (league, season) with played matches but no standings file; an existing non-empty standings file always wins. `rederiveStandings()` removed from sync.

Consequences:
- `data/<league>/standings/` files are official/curated tables only (plus season-rollover scaffolding).
- league-two history needs no standings backfill — fetching its matches is enough; tables derive at render.
- Known limitation: ESPN date-range results include playoff finals, so derived tables can slightly overcount games for playoff participants. Acceptable for gap-filling; official files are unaffected.

Related fix: ESPN's scoreboard endpoint silently truncates whole-season date-range queries to ~100 events; `getMatchResultsForDateRange()` now fetches month-by-month chunks with rate-limit delays and dedupes.
