# Premier League Dashboard - Data-Driven Architecture

A maintainable, scalable Premier League statistics dashboard built with a template-based architecture and automated nightly data updates.

## Overview

This dashboard has been transformed from a 332 KB monolithic HTML file into a modern data-driven system:

- **Data Layer**: JSON files in `data/` directory (source of truth)
- **Build System**: Node.js scripts that generate `index.html` from template + data
- **Automation**: GitHub Actions runs nightly updates automatically

**Result**: Easy maintenance, scalable architecture, automated data updates.

---

## Quick Start

### Installation

```bash
npm install
```

### Development

```bash
# Build HTML from template + data
npm run build

# Start local server
npm run dev
```

The generated `index.html` will be available at `http://localhost:8000`

---

## Architecture

### File Structure

```
premier-league-dashboard/
├── index.html                      ← Generated (auto-updated nightly)
├── template/
│   └── index.html.template         ← Edit this for HTML/CSS/JS changes
├── data/                           ← Edit these for data changes
│   ├── teams.json
│   ├── standings.json
│   ├── matches.json
│   ├── fixtures.json
│   ├── notes.json
│   ├── seasons.json
│   ├── short-names.json
│   └── logos.json
├── scripts/
│   ├── extract-data.js             ← Extract from HTML to JSON
│   ├── build-html.js               ← Generate HTML from template+data
│   ├── fetch-all.js                ← Fetch all data from APIs
│   ├── fetchers/
│   │   ├── fetch-live-standings.js
│   │   ├── fetch-matches.js
│   │   └── fetch-fixtures.js
│   └── utils/
│       └── espn-api.js             ← ESPN API client
├── .github/
│   └── workflows/
│       └── nightly-update.yml      ← GitHub Actions workflow
├── package.json
└── README.md
```

### How It Works

1. **Data Source**: JSON files in `data/` contain all dashboard data
2. **Template**: `template/index.html.template` is the HTML source (with JS logic intact)
3. **Build**: `npm run build` reads template + JSON, injects data, generates `index.html`
4. **Automation**: GitHub Actions runs nightly:
   - Fetches latest data from ESPN API
   - Updates JSON files
   - Rebuilds HTML
   - Commits and pushes changes

---

## Maintenance Guide

### Updating Data Manually

If you need to update data immediately (don't wait for nightly automation):

#### 1. Update League Standings

Edit `data/standings.json`:

```json
{
  "2025-26": [
    [1, "Team Name", 10, 7, 2, 1, 20, 8, 23],
    // [Position, Team, Games, Wins, Draws, Losses, GoalsFor, GoalsAgainst, Points]
  ]
}
```

#### 2. Update Match Results

Edit `data/matches.json`:

```json
{
  "2025-26": [
    {"d": "15/08/2025", "h": "Man Utd", "a": "Fulham", "hg": 1, "ag": 0},
    // [Date (DD/MM/YYYY), Home Team, Away Team, Home Goals, Away Goals]
  ]
}
```

#### 3. Update Fixtures

Edit `data/fixtures.json`:

```json
{
  "2025-26": [
    {"d": "24/05/2026", "h": "Brighton", "a": "Man Utd", "time": "15:00"}
    // [Date (DD/MM/YYYY), Home Team, Away Team, Time (HH:MM)]
  ]
}
```

#### 4. Update Season Notes

Edit `data/notes.json`:

```json
{
  "2025-26": {
    "champion": "Manchester City",
    "topScorer": {"name": "Erling Haaland", "team": "Manchester City", "goals": 25}
  }
}
```

#### 5. Rebuild HTML

After editing JSON files:

```bash
npm run build
```

This regenerates `index.html` with your new data.

### Adding New Seasons

Edit `data/seasons.json`:

```json
{
  "seasons": ["1992-93", "1993-94", ..., "2026-27"]
}
```

Add corresponding entries to:
- `data/standings.json` (new season tables)
- `data/matches.json` (new season results)
- `data/notes.json` (new season achievements)

Rebuild:

```bash
npm run build
```

### Modifying HTML/CSS/JavaScript

**IMPORTANT**: Do NOT edit `index.html` directly. It's auto-generated.

Instead, edit `template/index.html.template`:

```bash
# 1. Edit the template
vim template/index.html.template

# 2. Rebuild HTML
npm run build

# 3. Test locally
npm run dev
```

---

## Automated Nightly Updates

### How It Works

GitHub Actions workflow (`.github/workflows/nightly-update.yml`) runs daily at **2 AM UTC**:

1. **Fetch Data**: Calls `npm run fetch-data`
   - Fetches 2025-26 standings from ESPN API
   - Fetches recent match results
   - Fetches upcoming fixtures

2. **Update JSON Files**: Changes written to `data/`

3. **Build HTML**: Runs `npm run build`
   - Regenerates `index.html` from template + updated data

4. **Commit & Push**: If data changed, commits with message:
   ```
   chore: nightly data update [skip ci]
   ```

### Manual Trigger

You can manually trigger the nightly update from GitHub:

1. Go to **Actions** tab
2. Select **Nightly Data Update** workflow
3. Click **Run workflow**
4. Select **main** branch
5. Click **Run workflow**

The workflow will run immediately and update data.

### Monitoring Updates

- Check GitHub Actions tab for workflow runs
- View commit history to see when data was updated
- Each successful run creates a commit on `main` branch

### If Updates Fail

If the nightly workflow fails:

1. GitHub Actions logs show what went wrong
2. **Previous data is preserved** - HTML still works with old data
3. Next nightly run will try again
4. You can manually fetch/update if needed

---

## NPM Scripts

```bash
# Extract hardcoded data from HTML to JSON (one-time operation)
npm run extract

# Build index.html from template + data
npm run build

# Fetch latest data from APIs
npm run fetch-data

# Build and start local dev server
npm run dev

# Validate data files structure
npm run validate

# Run tests
npm run test
```

---

## Data Formats

### teams.json
```json
{
  "teams": [
    {"name": "Arsenal", "color": "#EF0107"},
    {"name": "Aston Villa", "color": "#540C2C"}
  ]
}
```

### standings.json
```json
{
  "2025-26": [
    [1, "Manchester City", 10, 7, 2, 1, 20, 8, 23],
    [2, "Arsenal", 10, 6, 2, 2, 18, 12, 20]
  ],
  "2024-25": [...]
}
```

### matches.json
```json
{
  "2025-26": [
    {"d": "15/08/2025", "h": "Man Utd", "a": "Fulham", "hg": 1, "ag": 0},
    {"d": "16/08/2025", "h": "Arsenal", "a": "Brighton", "hg": 0, "ag": 0}
  ]
}
```

### fixtures.json
```json
{
  "2025-26": [
    {"d": "24/05/2026", "h": "Brighton", "a": "Man Utd", "time": "15:00"},
    {"d": "25/05/2026", "h": "Tottenham", "a": "Chelsea", "time": "16:00"}
  ]
}
```

### notes.json
```json
{
  "2025-26": {
    "champion": "Manchester City",
    "topScorer": {"name": "Erling Haaland", "team": "Manchester City", "goals": 36}
  },
  "2024-25": {...}
}
```

---

## Troubleshooting

### Dashboard doesn't update after manual changes

```bash
# Rebuild HTML
npm run build

# Restart dev server
npm run dev
```

### Data not fetching from APIs

- Check internet connection
- ESPN API might be down (workflow handles this gracefully)
- Previous data is preserved
- Nightly update will try again tomorrow

### Git commit fails in workflow

- Check GitHub Actions permissions (Settings → Actions)
- Verify bot credentials are configured correctly
- Can manually push changes if needed

### Can't find generated index.html

```bash
# Make sure you've run build
npm run build

# Then check
ls -lah index.html
```

---

## API Data Sources

### ESPN API
- **Standings**: `https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/standings`
- **Matches**: `https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/scoreboard`
- **Fixtures**: Same as matches, filtered by status
- **Rate Limit**: None explicitly enforced (respectful requests only)
- **Coverage**: Excellent for Premier League data

### Fallback Sources
- Official Premier League API for verification
- Wikipedia for historical data and season achievements

---

## Development Tips

### Adding a New Fetcher

1. Create `scripts/fetchers/fetch-something.js`
2. Implement fetch logic that updates `data/something.json`
3. Add to `scripts/fetch-all.js` to run on schedule
4. Update `.github/workflows/nightly-update.yml` if needed

### Testing Data Fetchers

```bash
# Test specific fetcher
node scripts/fetchers/fetch-live-standings.js

# Test all fetchers
npm run fetch-data

# Rebuild and check results
npm run build
npm run dev
```

### Debugging Build Issues

```bash
# Check if template exists
ls template/index.html.template

# Check if data files exist
ls data/*.json

# Run build with output
npm run build  # Shows which constants were replaced

# Check generated file size
ls -lh index.html
```

---

## Architecture Benefits

✅ **Maintainability**: Data in easy-to-edit JSON files  
✅ **Automation**: Nightly updates without manual intervention  
✅ **Scalability**: Easy to add new features/seasons  
✅ **Reliability**: API failures don't break the dashboard  
✅ **Version Control**: Track all changes in git history  
✅ **Separation**: Clear boundary between code and data  

---

## History & Previous Versions

The original monolithic HTML file is preserved in version control history. This new architecture provides:

- **332 KB** monolithic file → **160 KB** generated HTML + **457 KB** organized data
- **No build process** → **Automated build & deploy**
- **Manual updates** → **Nightly automated updates**
- **Mixed code/data** → **Clean separation**

---

## Support & Questions

For questions about the architecture, refer to `ARCHITECTURE.md` which contains:
- Detailed design decisions
- Data format specifications
- Phase-by-phase implementation guide
- Troubleshooting notes

---

**Last Updated**: May 20, 2026  
**Version**: 2.0 (Data-Driven)  
**Status**: Actively Maintained with Nightly Automation
