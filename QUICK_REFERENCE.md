# Quick Reference Card

Keep this handy for common tasks.

---

## Essential Commands

```bash
# Setup (first time)
npm install

# Start local dev server (in-memory render, edit → refresh)
npm run dev
npm run dev -- --port=3000

# Sync data from APIs (active season, all leagues, cache-gated)
npm run sync
npm run sync -- --force                  # bypass cache
npm run sync -- --league=championship    # one league
npm run sync -- --season=2023-24         # one season
npm run sync -- --from=2003-04           # historical backfill
npm run sync -- --type=logos             # download remote logos

# Render to _site/index.html (CI entry; rarely needed locally)
npm run render

# Validate data integrity
npm run validate
```

---

## File Locations

| What | Where | Edit? |
|------|-------|-------|
| Rendered HTML | in-memory (dev) / `_site/` (CI) | ❌ Never exists in repo |
| HTML template | `template/index.html.template` | ✅ Yes |
| League standings | `data/<league>/standings/<season>.json` | ❌ Use `npm run sync` |
| Match results | `data/<league>/matches/<season>.json` | ❌ Use `npm run sync` |
| Upcoming fixtures | `data/<league>/fixtures/<season>.json` | ❌ Use `npm run sync` |
| League list / ESPN IDs | `static/leagues.json` | ✅ Yes |
| Season notes | `static/notes.json` | ✅ Yes |
| Team data | `static/teams.json`, `static/short-names.json` | ✅ Yes |
| Logos | `static/logos.json`, `static/logos/` | ✅ Yes |
| Data composition | `scripts/lib/compose-data.js` | ⚠️ Advanced |
| Render logic | `scripts/lib/render.js` | ⚠️ Advanced |
| Sync / fetchers | `scripts/sync.js`, `scripts/fetchers/` | ⚠️ Advanced |
| Automation | `.github/workflows/` | ⚠️ Advanced |

Leagues: `premier-league`, `championship`, `efl-league-one`, `league-two`.

---

## Common Tasks

### Modify HTML/CSS/JavaScript
```bash
# 1. Start the dev server
npm run dev

# 2. Edit template/index.html.template — refresh browser to see changes
# 3. Commit if good
git add template/index.html.template
git commit -m "feat: [describe your change]"
git push
```

### Update curated data (notes, teams, logos, …)
```bash
# 1. Edit the JSON under static/
# 2. Refresh the dev server tab to verify
# 3. Commit
git add static/
git commit -m "chore: update season notes"
git push
```

### Refresh fetched data
```bash
npm run sync                 # respects TTL cache
npm run sync -- --force      # when you need it now
git add data/
git commit -m "chore: data sync"
git push                     # deploy renders automatically
```

### Backfill historical seasons
```bash
npm run sync -- --league=championship --from=2003-04
# or trigger .github/workflows/historical-fetch.yml from the Actions tab
```

### Deploy
Push to `main` — `deploy-pages.yml` renders fresh and publishes to GitHub Pages.
There is nothing to build or commit locally.

---

## Data Format Reference

```jsonc
// data/<league>/standings/<season>.json — P, team, GP, W, D, L, GF, GA, Pts
[ [1, "Manchester United", 42, 24, 12, 6, 80, 47, 84] ]

// data/<league>/matches/<season>.json
[ { "d": "15/08/2025", "h": "Man Utd", "a": "Fulham", "hg": 1, "ag": 0 } ]

// data/<league>/fixtures/<season>.json
[ { "d": "24/05/2026", "h": "Brighton", "a": "Man Utd", "time": "15:00" } ]

// static/teams.json
{ "teams": [ { "name": "Arsenal", "color": "#EF0107" } ] }

// static/notes.json
{ "1992-93": { "champion": "Manchester United",
                "topScorer": { "name": "Alan Shearer", "team": "Blackburn Rovers", "goals": 34 } } }
```

---

## Troubleshooting

| Problem | Fix |
|---|---|
| Page looks stale in dev | Hard-refresh; the server renders per request, so it's your browser cache |
| "No standings data" warning at dev startup | `npm run sync` (warning means missing/empty, not stale) |
| Sync skips everything | TTL cache is fresh — add `--force` |
| Sync wrote nothing despite fetching | Content unchanged (hash-gated) — that's the quiet-commit feature |
| Deploy didn't run after bot commit | Check `workflow_run` chain in `deploy-pages.yml`; bot pushes don't fire `on: push` |
