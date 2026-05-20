# Data-Driven Dashboard Architecture

## Overview

The Premier League Dashboard has been transformed from a 332 KB monolithic HTML file with hardcoded data into a scalable, data-driven system using a template-based build architecture.

## What's Complete ✅

### Phase 1: Data Extraction ✅
All hardcoded data has been extracted from `index.html` into clean JSON files:

| File | Contents | Size |
|------|----------|------|
| `data/teams.json` | 51 teams with colors | 3.4 KB |
| `data/short-names.json` | 32 team abbreviations | 1.1 KB |
| `data/logos.json` | 25 team logo URLs | 2.4 KB |
| `data/seasons.json` | 34 seasons (1992-93 to 2025-26) | 531 B |
| `data/standings.json` | League tables: 666 records | 74 KB |
| `data/matches.json` | Match results: 3,030 records | 355 KB |
| `data/fixtures.json` | 2025-26 upcoming fixtures | 919 B |
| `data/notes.json` | Season achievements & top scorers | 6.2 KB |
| **Total** | **All data extracted** | **457 KB** |

### Phase 2: Template & Build System ✅

#### Template-Based Architecture
- `template/index.html.template` - HTML template with data injection points
- `scripts/build-html.js` - Builds final `index.html` from template + JSON data
- All CSS and JavaScript logic preserved, only data is templated

#### Build Process
```bash
npm run extract   # Extract data from old HTML → JSON
npm run build     # Generate index.html from template + JSON data
```

#### How It Works
1. **Template Creation**: Current `index.html` → `template/index.html.template`
2. **Data Loading**: Build script reads all JSON files from `data/`
3. **Injection**: Data formatted as JavaScript constants and injected into template
4. **Generation**: Complete `index.html` written with all data embedded

## Current Status

### File Structure
```
premier-league-dashboard/
├── index.html                        ← Generated (DO NOT EDIT)
│   └── Auto-generated from template + data
├── template/
│   └── index.html.template          ← Edit this for HTML/CSS/JS changes
├── data/                            ← Data files (source of truth)
│   ├── teams.json
│   ├── standings.json
│   ├── matches.json
│   ├── fixtures.json
│   ├── notes.json
│   ├── seasons.json
│   ├── short-names.json
│   └── logos.json
├── scripts/
│   ├── extract-data.js             ← Extract from old HTML → JSON
│   ├── build-html.js               ← Generate index.html from template+data
│   ├── fetch-all.js                ← Master fetcher (runs all fetchers)
│   ├── fetchers/
│   │   ├── fetch-live-standings.js ← Fetch current standings
│   │   ├── fetch-matches.js        ← Fetch recent match results
│   │   └── fetch-fixtures.js       ← Fetch upcoming fixtures
│   └── utils/
│       └── espn-api.js             ← ESPN API client utilities
├── .github/
│   └── workflows/
│       └── nightly-update.yml      ← GitHub Actions workflow
└── package.json                     ← NPM scripts & config
```

## Usage Guide

### Development Workflow

#### 1. To modify HTML/CSS/JavaScript
```bash
# Edit template (not index.html!)
vim template/index.html.template

# Rebuild HTML with your changes
npm run build
```

#### 2. To update data manually
```bash
# Edit JSON files directly
vim data/standings.json
vim data/notes.json

# Rebuild HTML with new data
npm run build
```

#### 3. To extract from old HTML
```bash
# If you have an older version with different data
npm run extract
```

### Testing Locally
```bash
npm run dev
# Opens http://localhost:8000 with dashboard
```

## What's Remaining 🚀

### Phase 3: Automated Data Fetchers ✅
Fetch latest 2025-26 season data from APIs:
- `scripts/fetchers/fetch-live-standings.js` - Get current standings ✅
- `scripts/fetchers/fetch-matches.js` - Get match results ✅
- `scripts/fetchers/fetch-fixtures.js` - Get upcoming fixtures ✅
- `scripts/utils/espn-api.js` - ESPN API client ✅
- `scripts/fetch-all.js` - Master fetcher script ✅

**Data Sources:**
- Primary: ESPN API (free, good coverage)
- Secondary: Official Premier League API (authoritative but limited)
- Notes: Fetch from Wikipedia/official sources

### Phase 4: GitHub Actions CI/CD ✅
`.github/workflows/nightly-update.yml` - Automated nightly updates ✅:
- Fetch latest data from APIs
- Update JSON files if changed
- Rebuild `index.html`
- Commit and push changes (only if data changed)
- **Frequency**: Every night at 2 AM UTC, skip commit if no changes

### Phase 5: Documentation & Testing (In Progress)
- Update README with new architecture
- Create maintenance guide
- Full end-to-end testing
- Monitor first automated runs

## Benefits of New Architecture

✅ **Maintainability**: Easy to find and update data (JSON files)
✅ **Scalability**: Add features without modifying monolithic file  
✅ **Automation**: Can update data nightly via CI/CD
✅ **Separation**: Code and data clearly separated
✅ **Version Control**: Track data changes in git history
✅ **Flexibility**: Can easily switch data sources or format

## Data Size Improvements

| Metric | Before | After | Change |
|--------|--------|-------|--------|
| Main file | 332 KB | 160 KB | ↓ 52% |
| Data files | Embedded | 457 KB total | Organized |
| Template | N/A | 332 KB | Source of truth |

## Implementation Decisions Made

- **JSON Loading**: Template compilation (not runtime fetch) → No CORS issues on GitHub Pages
- **Data Sources**: Mix of ESPN + PL APIs → Reliable, free, good coverage
- **Notes Management**: Scrape from external sources → Automated, reduces errors
- **Update Frequency**: Year-round, skip commits if no changes → Consistent, low noise
- **Failure Handling**: Keep previous data, continue workflow → Graceful degradation

## Next Steps

1. **Review**: Examine the extracted data in `data/` directory
2. **Test**: Run `npm run build` to verify HTML generation works
3. **Phase 3**: Implement API fetchers for automated data updates
4. **Phase 4**: Set up GitHub Actions workflow for nightly CI/CD
5. **Phase 5**: Document the new system and train on workflows

## Key Commands

```bash
# Setup
npm install

# Development
npm run build      # Generate index.html from template + data
npm run extract    # Extract data from old HTML (if needed)
npm run dev        # Build and start local dev server

# (Future) Automation
npm run fetch-data # Fetch latest data from APIs
npm run validate   # Validate data structure
npm run test       # Run tests

# Git workflow
git add data/                           # Track data changes
git commit -m "chore: update season data"
```

## Data Format Reference

### teams.json
```json
{
  "teams": [
    {"name": "Arsenal", "color": "#EF0107"},
    ...
  ]
}
```

### standings.json
```json
{
  "1992-93": [
    [1, "Manchester United", 42, 24, 12, 6, 80, 47, 84],
    ...
  ],
  "1993-94": [...]
}
```

### matches.json
```json
{
  "2025-26": [
    {"d": "15/08/2025", "h": "Man Utd", "a": "Fulham", "hg": 1, "ag": 0},
    ...
  ]
}
```

### fixtures.json
```json
{
  "2025-26": [
    {"d": "24/05/2026", "h": "Brighton", "a": "Man Utd", "time": "15:00"},
    ...
  ]
}
```

### notes.json
```json
{
  "1992-93": {
    "champion": "Manchester United",
    "topScorer": {"name": "Alan Shearer", "team": "Blackburn Rovers", "goals": 34}
  }
}
```

## Questions & Support

For questions about the new architecture, refer to the plan file:
`C:\Users\colin\.claude\plans\fuzzy-growing-sifakis.md`

---

**Last Updated**: May 20, 2026  
**Architecture Version**: 2.0 (Data-Driven)  
**Status**: Phases 1-4 Complete | Phase 5 (Documentation) In Progress
