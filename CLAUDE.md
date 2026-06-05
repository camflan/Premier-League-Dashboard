# Agent guide — Premier League Dashboard

**Read this before editing anything.** This project is data-driven and template-based. The rendered site is a **build artifact** that never exists in the repo — not at the root, not in git.

## Hard rules

1. **Never write an `index.html` anywhere in the repo.** The site is rendered from `template/index.html.template` + `data/` + `static/` — in memory by `npm run dev`, or to `_site/` by `npm run render` (CI only). `/index*.html` is gitignored.
2. **Never create standalone HTML pages.** If the site needs new HTML, edit the template.
3. **Never embed data (standings, matches, fixtures, team metadata) directly into the template or any JS.** Data goes in `data/` or `static/` as JSON; rendering injects it as `window.__DATA`.
4. **Don't bypass the sync.** Use `npm run sync` (and its flags) to refresh `data/`. Don't hand-write fetched season files unless patching a specific bug.
5. **Never fabricate data.** No generated match results, no synthetic standings. Derived standings (computed from real matches) and season-rollover scaffolding (`handle-season-end.js`, zeroed records) are the only permitted generated data.

## Pipeline in one screen

```
 SOURCES (ESPN API, logo URLs)
        │
        ▼
 npm run sync                    ← one entry point, all leagues × types
        │                          cache-gated (data/.cache/, gitignored)
        │                          --force to bypass; never clobbers data
        ▼
 data/<league>/<type>/<season>.json   static/*.json (curated, hand-edited)
        └──────────────┬──────────────┘
                       ▼
        scripts/lib/compose-data.js → composeData()
        scripts/lib/render.js       → renderHTML(data, template)   (pure)
                       │
        ┌──────────────┴──────────────┐
        ▼                             ▼
 npm run dev                   npm run render (CI)
 in-memory per-request         _site/index.html
 server on :8000               → GitHub Pages
```

Leagues: `premier-league`, `championship`, `efl-league-one`, `league-two` (see `static/leagues.json`). Types: `standings`, `matches`, `fixtures` (+ `logos`, on request only).

## Where to make a change

| You want to change… | Edit this | Then |
|---|---|---|
| Page layout, styles, client-side JS | `template/index.html.template` | refresh browser (`npm run dev`) |
| Team colors, abbreviations, logos | `static/teams.json`, `static/short-names.json`, `static/logos.json` | refresh browser |
| Season notes, fun facts, team notes | `static/notes.json`, `static/fun-facts.json`, `static/team-notes.json` | refresh browser |
| League list / ESPN IDs | `static/leagues.json` | refresh browser |
| Fetch scope / data availability | `static/seasons.json`, `static/seasons-config.json` | re-sync if needed |
| Standings / matches / fixtures | **Don't hand-edit.** `npm run sync` | — |
| Data composition logic | `scripts/lib/compose-data.js` | — |
| Render logic | `scripts/lib/render.js` | — |
| Fetching logic | `scripts/sync.js`, `scripts/fetchers/*` | — |

## Commands

```bash
npm run dev                          # in-memory dev server on :8000 (edit → refresh)
npm run dev -- --port=3000           # custom port
npm run sync                         # active season, all leagues (cache-gated)
npm run sync -- --force              # bypass TTL cache
npm run sync -- --league=championship --season=2023-24
npm run sync -- --from=2003-04       # historical backfill → active
npm run sync -- --all                # fetchFrom (static/seasons.json) → active
npm run sync -- --type=logos         # download remote logos (not in default set)
npm run render                       # render _site/index.html (CI entry; rarely needed locally)
npm run validate                     # data integrity checks
```

Active season is derived from the current date (Aug → May rollover). Nothing hardcodes a season.

## Data shapes (canonical)

```jsonc
// static/teams.json
{ "teams": [ { "name": "Arsenal", "color": "#EF0107" } ] }

// data/<league>/standings/<season>.json — P, team, GP, W, D, L, GF, GA, Pts
[ [1, "Manchester United", 42, 24, 12, 6, 80, 47, 84] ]

// data/<league>/matches/<season>.json
[ { "d": "15/08/2025", "h": "Man Utd", "a": "Fulham", "hg": 1, "ag": 0 } ]

// data/<league>/fixtures/<season>.json
[ { "d": "24/05/2026", "h": "Brighton", "a": "Man Utd", "time": "15:00" } ]

// static/notes.json
{ "1992-93": { "champion": "Manchester United",
                "topScorer": { "name": "Alan Shearer", "team": "Blackburn Rovers", "goals": 34 } } }
```

## CI

- `.github/workflows/nightly-update.yml` — `npm run sync`, commits `data/` only
- `.github/workflows/season-end-update.yml` — season rollover scaffolding (May 31)
- `.github/workflows/historical-fetch.yml` — manual backfill (`sync --from=…`)
- `.github/workflows/deploy-pages.yml` — `npm run render` → `_site/` → GitHub Pages; chained via `workflow_run` so bot data-commits trigger deploys

Data workflows commit **data only**. Deploy is the only place HTML is produced, and it renders fresh from the commit it deploys.

## If you're tempted to…

- **"Just write a quick standalone HTML page to test something"** → don't. Use `npm run dev` — it re-renders on every refresh.
- **"Inline a small bit of data so I don't have to rebuild"** → don't. There is no rebuild; put it in the right JSON and refresh.
- **"Generate plausible match data to fill a gap"** → don't. A fake-data generator was deliberately removed; gaps stay visible until real data is sourced.

## Further reading

- `ARCHITECTURE.md` — design rationale
- `QUICK_REFERENCE.md` — common task recipes
- `docs/HISTORICAL_DATA.md` — data availability per league
