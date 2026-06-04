#!/usr/bin/env node

// Bulk historical data fetcher for Championship and EFL League One.
// This is a specialized script for one-time historical data collection.
//
// Usage:
//   node scripts/fetch-historical.js --league=championship --from-year=2010 --to-year=2018
//   node scripts/fetch-historical.js --league=efl-league-one --from-year=2005 --to-year=2015

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { activeSeason } from './utils/active-season.js';
import espnApi from './utils/espn-api.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');
const dataDir = path.join(rootDir, 'data');

// Map league IDs to ESPN league IDs
const LEAGUE_ESPN_ID = {
  'premier-league': 'eng.1',
  'championship': 'eng.2',
  'efl-league-one': 'eng.3',
};

// Data availability per league
const ESPN_DATA_AVAILABLE = {
  'premier-league': 2002,
  'championship': 2003,
  'efl-league-one': 2003,
};

function parseArgs(argv) {
  const out = {
    league: 'championship',
    fromYear: null,
    toYear: null,
  };

  for (const a of argv) {
    if (a.startsWith('--league=')) out.league = a.slice('--league='.length);
    else if (a.startsWith('--from-year=')) out.fromYear = parseInt(a.slice('--from-year='.length), 10);
    else if (a.startsWith('--to-year=')) out.toYear = parseInt(a.slice('--to-year='.length), 10);
    else if (a === '--help' || a === '-h') {
      console.log(`
Bulk Historical Data Fetcher

Usage: node scripts/fetch-historical.js [options]

Options:
  --league=ID              League ID: championship, efl-league-one (default: championship)
  --from-year=YYYY         Start year (e.g., 2010)
  --to-year=YYYY           End year (e.g., 2018)
  --help                   Show this help

Examples:
  node scripts/fetch-historical.js --league=championship --from-year=2003 --to-year=2010
  node scripts/fetch-historical.js --league=efl-league-one --from-year=2003 --to-year=2015
`);
      process.exit(0);
    }
  }

  return out;
}

function seasonsInRange(fromYear, toYear) {
  // Generate season strings from YYYY-YY format
  // e.g., 2010, 2011, 2012 -> ["2010-11", "2011-12", "2012-13"]
  const seasons = [];
  for (let y = fromYear; y <= toYear; y++) {
    const endYY = String((y + 1) % 100).padStart(2, '0');
    seasons.push(`${y}-${endYY}`);
  }
  return seasons;
}

function dataPath(type, season, leagueId) {
  return path.join(dataDir, leagueId, type, `${season}.json`);
}

function ensureDirExists(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function readJSON(filePath, fallback = null) {
  if (!fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJSON(filePath, value) {
  ensureDirExists(path.dirname(filePath));
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function seasonToDateRange(season) {
  const [startYearStr, endYearStr] = season.split('-');
  const startYear = parseInt(startYearStr, 10);
  const startDate = `${startYear}-08-01`;
  const endDate = `${startYear + 1}-05-31`;
  return { startDate, endDate };
}

async function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchSeasonMatches(season, espnLeagueId, delayMs = 500) {
  const { startDate, endDate } = seasonToDateRange(season);
  console.log(`  📅 ${season} (${startDate} to ${endDate})...`);

  // Add delay to respect rate limiting
  await delay(delayMs);

  const matches = await espnApi.getMatchResultsForDateRange(startDate, endDate, espnLeagueId);

  if (!matches || matches.length === 0) {
    console.log(`       ⚠️  No matches found`);
    return null;
  }

  return matches;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (!args.fromYear || !args.toYear) {
    console.error('❌ Error: --from-year and --to-year are required');
    console.error('Try: node scripts/fetch-historical.js --help');
    process.exit(1);
  }

  if (args.toYear < args.fromYear) {
    console.error('❌ Error: --to-year must be >= --from-year');
    process.exit(1);
  }

  const leagueName = args.league === 'championship' ? 'Championship' : 'EFL League One';
  const espnLeagueId = LEAGUE_ESPN_ID[args.league];
  const minAvailableYear = ESPN_DATA_AVAILABLE[args.league];

  if (args.fromYear < minAvailableYear) {
    console.warn(`⚠️  Warning: ESPN data for ${leagueName} only available from ${minAvailableYear}`);
    console.log(`   Adjusting start year from ${args.fromYear} to ${minAvailableYear}`);
    args.fromYear = minAvailableYear;
  }

  const seasons = seasonsInRange(args.fromYear, args.toYear);

  console.log(`\n🔄 Fetching ${leagueName} historical match data`);
  console.log(`   League:  ${leagueName}`);
  console.log(`   Years:   ${args.fromYear} - ${args.toYear}`);
  console.log(`   Seasons: ${seasons.join(', ')}`);
  console.log(`\n⏳ Fetching (with 500ms delays to respect rate limits)...\n`);

  let successCount = 0;
  let failureCount = 0;
  const startTime = Date.now();

  for (const season of seasons) {
    const matches = await fetchSeasonMatches(season, espnLeagueId, 500);

    if (matches) {
      const filePath = dataPath('matches', season, args.league);
      writeJSON(filePath, matches);
      console.log(`       ✓ Saved ${matches.length} matches`);
      successCount++;
    } else {
      failureCount++;
    }
  }

  const elapsedSeconds = Math.round((Date.now() - startTime) / 1000);

  console.log(`\n✅ Done!`);
  console.log(`   ✓ Fetched: ${successCount} seasons`);
  console.log(`   ⚠️  Failed: ${failureCount} seasons`);
  console.log(`   ⏱️  Time:    ${elapsedSeconds}s`);
  console.log(`\n📝 Next steps:`);
  console.log(`   1. Run: npm run build`);
  console.log(`   2. Run: npm run validate`);
  console.log(`   3. Review data in data/${args.league}/matches/`);
}

main().catch((e) => {
  console.error('❌', e);
  process.exit(1);
});
