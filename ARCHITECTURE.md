# Architecture — Premier League Dashboard

## Overview

A single-page football statistics dashboard rendered from JSON data and one HTML template. The rendered page is a build artifact that never lives in the repo: dev serves it from memory, CI renders it at deploy time.

```
 SOURCES                          REPO (committed)                 OUTPUT (never committed)
 ───────                          ────────────────                 ────────────────────────
 ESPN API ──── npm run sync ───▶  data/<league>/<type>/<season>.json
 logo URLs                        static/*.json  (curated)
                                  template/index.html.template
                                          │
                                          │  composeData() + renderHTML()
                                          │  (scripts/lib/ — pure functions)
                                          ▼
                              ┌── npm run dev ──▶ in-memory HTTP response (:8000)
                              └── npm run render ▶ _site/index.html ──▶ GitHub Pages
```

## Principles

1. **One writer per direction.** `sync` is the only thing that writes `data/`. `render` is the only thing that produces HTML, and only into `_site/` (gitignored). Nothing writes HTML at the repo root, ever.
2. **Pure rendering.** `composeData()` reads JSON into the `window.__DATA` object; `renderHTML(data, template)` is a string transform. Dev and CI call the same functions, so dev output cannot drift from deploys.
3. **Data is real or absent.** No fabricated match results or synthetic standings. The only generated data:
   - *Derived standings* — computed from real fetched matches (`scripts/utils/derive-standings.js`), never for the active season (official standings are preserved).
   - *Season scaffolding* — `scripts/handle-season-end.js` creates next-season standings with zeroed records and promotion/relegation movements at rollover (May 31). Structural, not results.
   A fake-data generator (`generate-matches.js`) existed once and was deliberately removed.
4. **Fetches are safe by construction.**
   - TTL cache gates API calls (`data/.cache/`, gitignored; active season 1 h, past seasons 7 d).
   - SHA-256 content hash gates file writes — unchanged data writes nothing, so commits stay quiet.
   - Empty/null fetches never clobber existing files.
   - Seasons before a league's ESPN availability (`static/seasons-config.json`) are skipped without a network call.

## Repo layout

```
premier-league-dashboard/
├── template/index.html.template    ← all HTML/CSS/client JS; reads window.__DATA
├── static/                         ← CURATED (hand-edited)
│   ├── leagues.json                ← league list: id, name, espnId, team count
│   ├── teams.json, short-names.json, logos.json, logos/
│   ├── notes.json, fun-facts.json, team-notes.json, …
│   ├── seasons.json                ← sync config (fetchFrom for --all)
│   └── seasons-config.json         ← per-league data availability
├── data/<league>/<type>/<season>.json   ← FETCHED (sync/CI); league ∈ leagues.json,
│                                          type ∈ standings|matches|fixtures
├── scripts/
│   ├── sync.js                     ← THE fetch entry point (all leagues × types)
│   ├── render.js                   ← CI entry: → _site/index.html
│   ├── dev.js                      ← node:http server, per-request in-memory render
│   ├── lib/
│   │   ├── compose-data.js         ← composeData(): JSON → window.__DATA object
│   │   └── render.js               ← renderHTML(data, template): pure string transform
│   ├── fetchers/                   ← per-type modules (matches, fixtures, logos)
│   ├── utils/                      ← active-season, derive-standings, espn-api, …
│   ├── validate-data.js
│   └── handle-season-end.js        ← season rollover scaffolding
└── .github/workflows/              ← see CI below
```

## Rendering

`composeData()` merges `static/*.json` (curated) with every `data/<league>/<type>/<season>.json` (fetched) into one object; `renderHTML()` injects it at the template's `/* __DATA_INJECTION_POINT__ */` marker and substitutes `{{ACTIVE_SEASON_SHORT}}`. Template compilation (not runtime fetch) avoids CORS issues on GitHub Pages; the page is self-contained except for team logos (`static/logos/`) and optional live-score calls the client makes directly to ESPN.

The dev server re-renders on every request (~30 ms), so freshness is structural — there is no cached artifact to go stale. It also strips the `/Premier-League-Dashboard` Pages base path so the same markup works locally.

The active season is computed from the current date (August → May rollover, `scripts/utils/active-season.js`); nothing in the repo hardcodes a season.

## CI

| Workflow | Trigger | Does | Commits |
|---|---|---|---|
| `nightly-update.yml` | 2 AM UTC daily | `npm run sync` (season-end handler on May 31) | `data/` only |
| `season-end-update.yml` | May 31, manual | rollover scaffolding + validation | `data/`, `static/league-promotions.json` |
| `historical-fetch.yml` | manual | `sync --league=… --from=…` backfill | `data/` only |
| `deploy-pages.yml` | push to main, `workflow_run` after data workflows, manual | `npm run render` → `_site/` + `static/` → Pages | nothing |

Data workflows never build or commit HTML. Deploy renders fresh from the commit it ships. The `workflow_run` chaining exists because pushes made with the default `GITHUB_TOKEN` don't fire `on: push` workflows.

## History

v1 was a 332 KB monolithic HTML file with hardcoded data. v2 split data from presentation (template + JSON + build-to-root-index.html). v3 (current) removed the committed artifact entirely: unified sync, pure render library, in-memory dev, render-at-deploy.
