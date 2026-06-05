# Historical Data & Multi-League Support

This document explains how historical match data is fetched and how promotion/relegation automation works in the Premier League Dashboard.

## Data Availability

The dashboard fetches match data from ESPN API for the following periods:

| League | Matches Available | Standings Available | Notes |
|--------|------------------|-------------------|-------|
| Premier League | 2002-03 onwards | 1992-93 onwards | PL has good historical ESPN coverage from 2002-03 |
| Championship | 2003-04 onwards | 2003-04 onwards | ESPN data available from 2003-04 |
| EFL League One | 2003-04 onwards | 2003-04 onwards | ESPN data available from 2003-04 |

**Before these years:** Manual data entry or alternative sources (Transfermarkt, SoccerWay) would be required.

## Fetching Historical Data

### Automatic Daily Fetch

The nightly GitHub Actions workflow (`nightly-update.yml`) runs every day at 2 AM UTC and:
1. Fetches the active season match data
2. On May 31st, also triggers end-of-season automation

To manually trigger the nightly workflow:
1. Go to GitHub > Actions > "Nightly Data Update"
2. Click "Run workflow"

### Manual Historical Fetch

To fetch historical match data for Championship or EFL League One:

#### Via CLI (Local)
```bash
npm run sync -- --league=championship --from=2010-11
npm run sync -- --league=efl-league-one --from=2005-06
```

Backfills run from the given season through the active season; the TTL cache
and availability gating make already-fetched seasons cheap to re-run.

#### Via GitHub Actions (Recommended for large ranges)
1. Go to GitHub > Actions > "Fetch Historical Data"
2. Click "Run workflow"
3. Select:
   - **League**: any league in `static/leagues.json`
   - **From season**: start season (e.g., `2003-04`)
4. Click "Run workflow"

The workflow will:
- Fetch all seasons from the start season to the active season (with 500ms delays between requests to respect API rate limits)
- Validate the data
- Commit and push `data/` changes if successful (the deploy workflow renders the site)

**Tip:** Breaking large ranges into smaller batches (e.g., 2003-2010, 2011-2018) can help if network timeouts occur.

## Season End Automation

On May 31st each year, the dashboard automatically:

### 1. Detects Promotions & Relegations
- Compares final standings from this season with next season
- Identifies promoted/relegated teams
- Updates `static/league-promotions.json`

### 2. Creates Next Season Structure
- Generates empty `matches/` and `fixtures/` files for all leagues
- Creates standings template with promoted teams at correct positions
- Removes relegated teams from standings

The `nightly-update.yml` workflow handles this automatically, or you can manually trigger:

```bash
npm run season-end
git add data/ static/league-promotions.json
git commit -m "chore: season-end update"
git push    # deploy-pages.yml renders and publishes
```

## Promotion/Relegation Rules

```
Premier League (20 teams)
├─ Promoted: Top 2 + playoff winner (3 total)
└─ Relegated: Bottom 3

Championship (24 teams)
├─ Promoted: Top 2 + playoff winner (3 total)
├─ To: Premier League
└─ Receives: Bottom 3 from PL + Top 2 + playoff winner from League One

EFL League One (24 teams)
├─ Promoted: Top 2 + playoff winner (3 total)
├─ To: Championship
└─ Receives: Bottom 2 from Championship
```

## Troubleshooting

### No matches found for a season

If `fetch-historical` returns 0 matches for a season:
1. Check ESPN availability (see table above)
2. Try fetching individual seasons manually with different date ranges
3. Check network/API status with the health check:
   ```bash
   node -e "import('./scripts/utils/espn-api.js').then(m => m.default.healthCheck().then(ok => console.log(ok ? '✓ ESPN API OK' : '✗ ESPN API DOWN')))"
   ```

### Incomplete standings after historical fetch

If standings has fewer than expected teams:
1. Check the warnings in validation output
2. The standings are derived from matches data
3. Fetch more complete match data or manually fill in missing matches

### Fetch timeout or rate limit (429)

ESPN API rate limits on high request volumes. The `fetch-historical` script includes 500ms delays between requests.

If you still hit rate limits:
1. Reduce the range (e.g., fetch 5-year chunks instead of 20 years)
2. Run during off-peak hours (e.g., 2-4 AM UTC)
3. Manual fallback: Use [Transfermarkt](https://www.transfermarkt.com) or [SoccerWay](https://soccerway.com) to collect data

### Data validation errors

Run validation to check data integrity:
```bash
npm run validate
```

Common issues:
- **Invalid JSON**: Check file formatting
- **Missing fields**: Match must have `d`, `h`, `a`, `hg`, `ag`
- **Duplicate matches**: Same date/home/away appears twice (fetch merge issue)

## Data File Structure

### Standings Format
```json
[
  [1, "Manchester United", 38, 28, 5, 5, 92, 35, 89],
  [2, "Manchester City", 38, 27, 5, 6, 89, 41, 86],
  ...
]
// [position, team_name, played, wins, draws, losses, goals_for, goals_against, points]
```

### Matches Format
```json
[
  {
    "d": "15/08/2025",
    "h": "Manchester United",
    "a": "Fulham",
    "hg": 1,
    "ag": 0,
    "status": "STATUS_FINAL"
  }
]
// d: date (DD/MM/YYYY)
// h: home team, a: away team
// hg: home goals, ag: away goals
// status: optional match status
```

### Fixtures Format
```json
[
  {
    "d": "24/05/2026",
    "h": "Brighton",
    "a": "Manchester United",
    "time": "15:00"
  }
]
// d: date (DD/MM/YYYY)
// h: home team, a: away team
// time: kick-off time (HH:MM, 24-hour format)
```

## File Organization

```
data/
├── premier-league/
│   ├── standings/
│   │   ├── 1992-93.json
│   │   ├── ...
│   │   └── 2025-26.json
│   ├── matches/
│   │   ├── 2002-03.json
│   │   ├── ...
│   │   └── 2025-26.json
│   └── fixtures/
│       └── 2025-26.json
├── championship/
│   ├── standings/
│   │   ├── 2003-04.json
│   │   ├── ...
│   │   └── 2025-26.json
│   ├── matches/
│   │   └── 2025-26.json (more after historical fetch)
│   └── fixtures/
│       └── 2025-26.json
└── efl-league-one/
    ├── standings/
    │   ├── 2003-04.json
    │   └── ...
    ├── matches/
    └── fixtures/
```

## Manual Data Sources

If ESPN data isn't available, you can manually add match data from:

1. **[Transfermarkt](https://www.transfermarkt.com)** - Most comprehensive historical database
2. **[SoccerWay](https://soccerway.com)** - Good coverage for all leagues
3. **[Flashscore](https://www.flashscore.com)** - Modern interface, all results
4. **League official websites** - Most accurate but harder to scrape

When manually entering data:
1. Save as JSON in the correct directory: `data/<league>/matches/<season>.json`
2. Follow the matches format above
3. Run `npm run validate` to check integrity
4. Verify in the dashboard with `npm run dev`
5. Commit with: `git commit -m "chore: manual historical data entry - <league> <seasons>"`

## CI/CD Integration

GitHub Actions workflows automatically handle:

### `nightly-update.yml` (Daily, 2 AM UTC)
- Fetches active season data
- Checks if today is May 31 (season end)
- Runs season-end automation if applicable
- Commits and pushes changes

### `season-end-update.yml` (Manual or May 31st)
- Explicitly triggers end-of-season automation
- Better separation of concerns from nightly updates
- Can be manually triggered anytime with `workflow_dispatch`

### `historical-fetch.yml` (Manual only)
- Triggered via `workflow_dispatch`
- Fetches a configurable range of historical data
- Best for bulk historical data collection

## Advanced: Modifying Fetcher Logic

To change data sources or fetching strategy:

1. **ESPN API calls**: Edit `scripts/utils/espn-api.js`
2. **Historical season logic**: Edit `scripts/fetchers/fetch-matches.js`
3. **Season iteration**: Edit `scripts/sync.js` (seasonsToSync function)
4. **Promotion detection**: Edit `scripts/handle-season-end.js` (inline logic)

After changes:
```bash
npm run validate
npm run dev    # test locally before pushing
```

## Quick Reference

```bash
# Sync active season (all leagues)
npm run sync

# Sync all seasons (from configured fetchFrom to active)
npm run sync -- --all --league=championship

# Sync specific season
npm run sync -- --season=2015-16 --league=championship

# Bulk historical backfill
npm run sync -- --league=championship --from=2003-04

# Manual season-end automation
npm run season-end

# Validate all data
npm run validate

# Deploy: just push — deploy-pages.yml renders the site
git add data/ static/
git commit -m "chore: data updates"
git push
```
