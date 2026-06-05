# Premier League Dashboard

Interactive English football history — every Premier League season since 1992-93, plus the Championship, League One, and League Two, on a single fast page.

**Live site:** https://customsnow.github.io/Premier-League-Dashboard/

## What it does

- **Historical grid** — every club × every season at a glance, colored by finishing position, goals, goal difference, points, or clean sheets
- **Live table** — current standings for the active season, any league
- **Four leagues** — Premier League (1992-93 →), Championship, League One, League Two
- **Match detail** — click any cell for that club's season; 20+ years of match results backfilled from ESPN
- **Season notes** — champions, top scorers, fun facts, European qualification, promotion/relegation movements

No backend, no build framework, no runtime dependencies — one rendered HTML page with the data embedded, served from GitHub Pages.

## Quick start

```bash
npm install
npm run dev          # → http://localhost:8000, re-renders on every refresh
```

Edit `template/index.html.template` or any JSON under `static/`/`data/`, refresh the browser, see the change. There is no build step.

## How it works

```
 ESPN API ── npm run sync ──▶  data/<league>/<type>/<season>.json   (fetched)
                               static/*.json                        (curated)
                                       │
                                       │  composeData() + renderHTML()
                                       │  pure functions, shared by dev & CI
                          ┌────────────┴────────────┐
                          ▼                         ▼
                   npm run dev               npm run render (CI)
                   in-memory server          _site/index.html → GitHub Pages
```

Three rules keep it sane:

1. **The rendered page never exists in the repo.** Dev serves it from memory; CI renders it fresh at deploy. `index*.html` is gitignored.
2. **Source data files are immutable.** `sync` writes only what it fetched; derivation (e.g. standings computed from matches) happens in memory at render time. Official tables — which encode things like points deductions — always win over derivation.
3. **No fabricated data.** Gaps stay visible until real data is sourced.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Dev server on :8000 (`--port=` to change), renders per request |
| `npm run sync` | Fetch active-season data, all leagues — TTL-cached, quiet when nothing changed |
| `npm run sync -- --force` | Bypass the cache |
| `npm run sync -- --league=championship --from=2003-04` | Historical backfill |
| `npm run render` | Render `_site/index.html` (what CI runs at deploy) |
| `npm run validate` | Data integrity checks |
| `npm run lint` / `npm run fix` | Biome check / autofix |

## Data

- `static/` — curated by hand: team colors, short names, logos, season notes, league config
- `data/<league>/<type>/<season>.json` — fetched: standings, matches, fixtures per league per season
- Canonical shapes are documented in [CLAUDE.md](CLAUDE.md#data-shapes-canonical)

A nightly GitHub Actions job syncs the active season and commits only data; every push to `main` triggers a fresh render and Pages deploy. On May 31 a season-end job rolls the leagues over (promotions, relegations, next-season scaffolding).

## Further reading

- [ARCHITECTURE.md](ARCHITECTURE.md) — design rationale and principles
- [QUICK_REFERENCE.md](QUICK_REFERENCE.md) — common task recipes
- [docs/HISTORICAL_DATA.md](docs/HISTORICAL_DATA.md) — data availability per league, backfill guide
- [CLAUDE.md](CLAUDE.md) — guide for AI agents working in this repo

## License

[MIT](package.json)
