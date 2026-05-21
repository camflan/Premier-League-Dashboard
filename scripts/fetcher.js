#!/usr/bin/env node
// Unified data fetcher. One CLI, all sources, all seasons.
//
// Usage:
//   node scripts/fetcher.js                              # active season only (default)
//   node scripts/fetcher.js --all                        # iterate fetchFrom → active
//   node scripts/fetcher.js --season=2024-25             # one specific season
//   node scripts/fetcher.js --type=matches               # one type only
//   node scripts/fetcher.js --season=2024-25 --no-cache  # bypass TTL gate
//
// Caching:
//   - TTL gates the API call. Active season has a short TTL; past seasons
//     are checked less often (configurable per type).
//   - Content hash gates the file write. If the merged data hashes the
//     same as last time, nothing is written and the commit stays quiet.
//   - Cache metadata lives in data/.cache/<type>/<season>.json (gitignored).
//
// Safety:
//   - Never deletes or overwrites existing data with an empty/null fetch.
//   - For seasons where the per-type fetcher returns null (e.g. past seasons
//     without a date-range implementation), the existing file is preserved.

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

import { activeSeason } from './utils/active-season.js';
import { deriveStandings } from './utils/derive-standings.js';
import { fetchMatchesForSeason } from './fetchers/fetch-matches.js';
import { fetchFixturesForSeason } from './fetchers/fetch-fixtures.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');
const dataDir = path.join(rootDir, 'data');
const cacheDir = path.join(dataDir, '.cache');
const staticDir = path.join(rootDir, 'static');

// TTL in seconds. Active season is hot; past seasons are gated more loosely.
const TTL = {
  active: { matches: 60 * 60,         fixtures: 60 * 60 },
  past:   { matches: 7 * 24 * 60 * 60, fixtures: 7 * 24 * 60 * 60 },
};

const TYPES = ['matches', 'fixtures'];
const FETCHERS = {
  matches:  fetchMatchesForSeason,
  fixtures: fetchFixturesForSeason,
};

// ---- args ------------------------------------------------------------------

function parseArgs(argv) {
  const out = { season: null, type: null, noCache: false, all: false };
  for (const a of argv) {
    if (a === '--no-cache')        out.noCache = true;
    else if (a === '--all')        out.all = true;
    else if (a.startsWith('--season=')) out.season = a.slice('--season='.length);
    else if (a.startsWith('--type='))   out.type = a.slice('--type='.length);
    else if (a === '--help' || a === '-h') {
      console.log(`Usage: node scripts/fetcher.js [options]
  --season=YYYY-YY   Fetch a single season
  --type=matches|fixtures   Fetch a single data type
  --all              Iterate every season from fetchFrom (in static/seasons.json) to active
  --no-cache         Bypass TTL; force the network call
  -h, --help         Show this help`);
      process.exit(0);
    }
  }
  return out;
}

// ---- helpers ---------------------------------------------------------------

function sha(value) {
  return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function readJSON(p, fallback = null) {
  if (!fs.existsSync(p)) return fallback;
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function writeJSON(p, value) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(value, null, 2) + '\n');
}

function dataPath(type, season)  { return path.join(dataDir, type, `${season}.json`); }
function cachePath(type, season) { return path.join(cacheDir, type, `${season}.json`); }

function cacheIsFresh(type, season, isActive) {
  const cache = readJSON(cachePath(type, season));
  if (!cache?.fetchedAt) return false;
  const ttl = (isActive ? TTL.active : TTL.past)[type] ?? Infinity;
  const ageMs = Date.now() - new Date(cache.fetchedAt).getTime();
  return ageMs < ttl * 1000;
}

function writeCache(type, season, hash) {
  writeJSON(cachePath(type, season), { hash, fetchedAt: new Date().toISOString() });
}

// Merge for matches: dedupe by (date, home, away). For fixtures: replace.
function mergeMatches(existing, fetched) {
  const seen = new Map();
  for (const m of existing) seen.set(`${m.d}|${m.h}|${m.a}`, m);
  for (const m of fetched)  seen.set(`${m.d}|${m.h}|${m.a}`, m); // fetched overrides existing
  return [...seen.values()].sort((a, b) => {
    const da = new Date(a.d.split('/').reverse().join('-'));
    const db = new Date(b.d.split('/').reverse().join('-'));
    return db - da;
  });
}

function sortFixtures(arr) {
  return [...arr].sort((a, b) => {
    const da = new Date(a.d.split('/').reverse().join('-'));
    const db = new Date(b.d.split('/').reverse().join('-'));
    return da - db;
  });
}

// ---- season iteration ------------------------------------------------------

function expandSeasons({ from, to }) {
  // Generate every season label from `from` to `to` inclusive.
  // Each season's start year is one more than the previous.
  const out = [];
  const [fromStartStr] = from.split('-');
  const [toStartStr]   = to.split('-');
  for (let y = parseInt(fromStartStr, 10); y <= parseInt(toStartStr, 10); y++) {
    const endYY = String((y + 1) % 100).padStart(2, '0');
    out.push(`${y}-${endYY}`);
  }
  return out;
}

function seasonsToFetch(args, active) {
  if (args.season) return [args.season];
  if (!args.all)   return [active];
  const cfg = readJSON(path.join(staticDir, 'seasons.json'), {});
  const from = cfg.fetchFrom || active;
  return expandSeasons({ from, to: active });
}

// ---- per (season, type) processing -----------------------------------------

async function processOne(season, type, args, active) {
  const isActive = season === active;
  const label = `${type}/${season}`;

  if (!args.noCache && cacheIsFresh(type, season, isActive)) {
    console.log(`  ⏭️  ${label}: cache fresh, skipping`);
    return { skipped: true };
  }

  const fetcher = FETCHERS[type];
  const fetched = await fetcher(season);

  if (fetched == null) {
    console.log(`  ➖ ${label}: no data fetched, existing file preserved`);
    return { skipped: true };
  }

  // Merge or replace, depending on type.
  let next;
  if (type === 'matches') {
    const existing = readJSON(dataPath(type, season), []);
    next = mergeMatches(existing, fetched);
  } else if (type === 'fixtures') {
    next = sortFixtures(fetched);
  } else {
    next = fetched;
  }

  const newHash = sha(next);
  const cache = readJSON(cachePath(type, season));
  if (cache?.hash === newHash) {
    writeCache(type, season, newHash); // refresh timestamp
    console.log(`  =  ${label}: ${next.length} items, unchanged (touched cache)`);
    return { unchanged: true };
  }

  writeJSON(dataPath(type, season), next);
  writeCache(type, season, newHash);
  console.log(`  ✓  ${label}: ${next.length} items written`);
  return { written: true, data: next };
}

// Re-derive standings/<season>.json from matches/<season>.json whenever matches change.
function rederiveStandings(season, matchesData) {
  const standings = deriveStandings(matchesData);
  const p = dataPath('standings', season);
  const existing = readJSON(p);
  const newHash = sha(standings);
  if (existing && sha(existing) === newHash) {
    console.log(`  =  standings/${season}: unchanged`);
    return;
  }
  writeJSON(p, standings);
  console.log(`  ✓  standings/${season}: ${standings.length} teams (derived from matches)`);
}

// ---- main ------------------------------------------------------------------

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const active = activeSeason();
  const seasons = seasonsToFetch(args, active);
  const types = args.type ? [args.type] : TYPES;

  console.log(`🔄 Premier League data fetch`);
  console.log(`   active season: ${active}`);
  console.log(`   seasons:       ${seasons.join(', ')}`);
  console.log(`   types:         ${types.join(', ')}`);
  console.log(`   cache:         ${args.noCache ? 'BYPASSED' : 'enabled'}\n`);

  for (const season of seasons) {
    console.log(`📅 ${season}`);
    let matchesChanged = false;
    let matchesData = null;

    for (const type of types) {
      try {
        const result = await processOne(season, type, args, active);
        if (type === 'matches' && result.written) {
          matchesChanged = true;
          matchesData = result.data;
        }
      } catch (e) {
        console.error(`  ❌ ${type}/${season}: ${e.message}`);
      }
    }

    if (matchesChanged && matchesData) {
      rederiveStandings(season, matchesData);
    }
    console.log('');
  }

  console.log('✅ Done.');
}

main().catch(e => {
  console.error('❌', e);
  process.exit(1);
});
