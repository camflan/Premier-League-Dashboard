#!/usr/bin/env node

// Unified data sync. One CLI, all sources, all leagues, all seasons.
//
// Usage:
//   node scripts/sync.js                              # active season, every league (default)
//   node scripts/sync.js --all                        # iterate fetchFrom → active
//   node scripts/sync.js --from=2003-04               # historical backfill from a season
//   node scripts/sync.js --season=2024-25             # one specific season
//   node scripts/sync.js --league=championship        # one league only
//   node scripts/sync.js --type=matches               # one type only
//   node scripts/sync.js --type=logos                 # download remote logos (not in default set)
//   node scripts/sync.js --season=2024-25 --force     # bypass TTL gate
//
// Caching:
//   - TTL gates the API call. Active season has a short TTL; past seasons
//     are checked less often (configurable per type).
//   - Content hash gates the file write. If the merged data hashes the
//     same as last time, nothing is written and the commit stays quiet.
//   - Cache metadata lives in data/.cache/<league>/<type>/<season>.json (gitignored).
//
// Safety:
//   - Never deletes or overwrites existing data with an empty/null fetch.
//   - For seasons where the per-type fetcher returns null (e.g. seasons
//     before a league's ESPN availability), the existing file is preserved.

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchFixturesForSeason } from './fetchers/fetch-fixtures.js';
import { syncLogos } from './fetchers/fetch-logos.js';
import { fetchMatchesForSeason } from './fetchers/fetch-matches.js';
import { activeSeason } from './utils/active-season.js';
import { deriveStandings } from './utils/derive-standings.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');
const dataDir = path.join(rootDir, 'data');
const cacheDir = path.join(dataDir, '.cache');
const staticDir = path.join(rootDir, 'static');

// TTL in seconds. Active season is hot; past seasons are gated more loosely.
const TTL = {
  active: { fixtures: 60 * 60, matches: 60 * 60 },
  past: { fixtures: 7 * 24 * 60 * 60, matches: 7 * 24 * 60 * 60 },
};

// Delay between historical (non-active) season fetches, to respect rate limits.
const BACKFILL_DELAY_MS = 500;

const TYPES = ['matches', 'fixtures'];
const FETCHERS = {
  fixtures: fetchFixturesForSeason,
  matches: fetchMatchesForSeason,
};

// ---- args ------------------------------------------------------------------

function parseArgs(argv) {
  const out = { all: false, force: false, from: null, league: null, season: null, type: null };
  for (const a of argv) {
    if (a === '--force') out.force = true;
    else if (a === '--all') out.all = true;
    else if (a.startsWith('--from=')) out.from = a.slice('--from='.length);
    else if (a.startsWith('--season=')) out.season = a.slice('--season='.length);
    else if (a.startsWith('--type=')) out.type = a.slice('--type='.length);
    else if (a.startsWith('--league=')) out.league = a.slice('--league='.length);
    else if (a === '--help' || a === '-h') {
      console.log(`Usage: node scripts/sync.js [options]
  --season=YYYY-YY          Sync a single season
  --from=YYYY-YY            Backfill every season from YYYY-YY to active
  --all                     Iterate every season from fetchFrom (in static/seasons.json) to active
  --type=matches|fixtures|logos   Sync a single data type (logos not in default set)
  --league=ID               Sync one league (default: every league in static/leagues.json)
  --force                   Bypass TTL; force the network call
  -h, --help                Show this help`);
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
  fs.writeFileSync(p, `${JSON.stringify(value, null, 2)}\n`);
}

function dataPath(type, season, leagueId) {
  return path.join(dataDir, leagueId, type, `${season}.json`);
}
function cachePath(type, season, leagueId) {
  return path.join(cacheDir, leagueId, type, `${season}.json`);
}

function cacheIsFresh(type, season, isActive, leagueId) {
  const cache = readJSON(cachePath(type, season, leagueId));
  if (!cache?.fetchedAt) return false;
  const ttl = (isActive ? TTL.active : TTL.past)[type] ?? Infinity;
  const ageMs = Date.now() - new Date(cache.fetchedAt).getTime();
  return ageMs < ttl * 1000;
}

function writeCache(type, season, hash, leagueId) {
  writeJSON(cachePath(type, season, leagueId), { fetchedAt: new Date().toISOString(), hash });
}

// Merge for matches: dedupe by (date, home, away). For fixtures: replace.
function mergeMatches(existing, fetched) {
  const seen = new Map();
  for (const m of existing) seen.set(`${m.d}|${m.h}|${m.a}`, m);
  for (const m of fetched) seen.set(`${m.d}|${m.h}|${m.a}`, m); // fetched overrides existing
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

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---- season iteration ------------------------------------------------------

function expandSeasons({ from, to }) {
  // Generate every season label from `from` to `to` inclusive.
  const out = [];
  const [fromStartStr] = from.split('-');
  const [toStartStr] = to.split('-');
  for (let y = parseInt(fromStartStr, 10); y <= parseInt(toStartStr, 10); y++) {
    const endYY = String((y + 1) % 100).padStart(2, '0');
    out.push(`${y}-${endYY}`);
  }
  return out;
}

function seasonsToSync(args, active) {
  if (args.season) return [args.season];
  if (args.from) return expandSeasons({ from: args.from, to: active });
  if (!args.all) return [active];

  const cfg = readJSON(path.join(staticDir, 'seasons.json'), {});
  const from = cfg.fetchFrom || '2003-04';
  return expandSeasons({ from, to: active });
}

function seasonStartYear(season) {
  return parseInt(season.split('-')[0], 10);
}

// ---- per (league, season, type) processing ----------------------------------

async function processOne(league, season, type, args, active, availableFrom) {
  const isActive = season === active;
  const label = `${type}/${season}`;

  // Skip seasons before this league's ESPN availability — no network call,
  // existing (manually sourced) data untouched.
  if (
    !isActive &&
    type === 'matches' &&
    availableFrom &&
    seasonStartYear(season) < seasonStartYear(availableFrom)
  ) {
    console.log(`  ➖ ${label}: before ${league.id} availability (${availableFrom}), skipping`);
    return { skipped: true };
  }

  if (!args.force && cacheIsFresh(type, season, isActive, league.id)) {
    console.log(`  ⏭️  ${label}: cache fresh, skipping`);
    return { skipped: true };
  }

  const fetcher = FETCHERS[type];
  if (!isActive) await delay(BACKFILL_DELAY_MS);
  const fetched = await fetcher(season, league, availableFrom);

  if (fetched == null) {
    console.log(`  ➖ ${label}: no data fetched, existing file preserved`);
    return { skipped: true };
  }

  // Merge or replace, depending on type.
  let next;
  if (type === 'matches') {
    const existing = readJSON(dataPath(type, season, league.id), []);
    next = mergeMatches(existing, fetched);
  } else if (type === 'fixtures') {
    next = sortFixtures(fetched);
  } else {
    next = fetched;
  }

  const newHash = sha(next);
  const cache = readJSON(cachePath(type, season, league.id));
  if (cache?.hash === newHash) {
    writeCache(type, season, newHash, league.id); // refresh timestamp
    console.log(`  =  ${label}: ${next.length} items, unchanged (touched cache)`);
    return { unchanged: true };
  }

  writeJSON(dataPath(type, season, league.id), next);
  writeCache(type, season, newHash, league.id);
  console.log(`  ✓  ${label}: ${next.length} items written`);
  return { data: next, written: true };
}

// Re-derive standings/<season>.json from matches/<season>.json whenever matches change.
// For the active season, skip derivation entirely to preserve official final standings.
// For past seasons, only derive if we have more teams than before (avoid losing data).
function rederiveStandings(season, matchesData, leagueId, active) {
  // For active/current season, never override standings with incomplete match data
  if (season === active) {
    console.log(
      `  ➖ standings/${season}: skipped (active season - preserving official standings)`,
    );
    return;
  }

  const standings = deriveStandings(matchesData);
  const p = dataPath('standings', season, leagueId);
  const existing = readJSON(p);

  // If derived standings has fewer teams than existing, skip to preserve completeness
  if (
    existing &&
    Array.isArray(existing) &&
    Array.isArray(standings) &&
    standings.length < existing.length
  ) {
    console.log(
      `  ➖ standings/${season}: skipped (derived ${standings.length} < existing ${existing.length} teams)`,
    );
    return;
  }

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

  const allLeagues = readJSON(path.join(staticDir, 'leagues.json')).leagues;
  const availability =
    readJSON(path.join(staticDir, 'seasons-config.json'), {}).dataAvailability ?? {};

  // Logos are league-independent and rarely change — only synced on request.
  if (args.type === 'logos') {
    console.log('🔄 Logo sync');
    await syncLogos(rootDir, { force: args.force });
    console.log('✅ Done.');
    return;
  }

  const leagues = args.league ? allLeagues.filter((l) => l.id === args.league) : allLeagues;
  if (args.league && leagues.length === 0) {
    console.error(`❌ Unknown league: ${args.league} (see static/leagues.json)`);
    process.exit(1);
  }

  const seasons = seasonsToSync(args, active);
  const types = args.type ? [args.type] : TYPES;

  console.log('🔄 Data sync');
  console.log(`   active season: ${active}`);
  console.log(`   leagues:       ${leagues.map((l) => l.id).join(', ')}`);
  console.log(`   seasons:       ${seasons.join(', ')}`);
  console.log(`   types:         ${types.join(', ')}`);
  console.log(`   cache:         ${args.force ? 'BYPASSED (--force)' : 'enabled'}\n`);

  for (const league of leagues) {
    console.log(`🏆 ${league.name}`);
    const availableFrom = availability[league.id]?.espnMatchesFrom ?? null;

    for (const season of seasons) {
      console.log(`📅 ${season}`);
      let matchesChanged = false;
      let matchesData = null;

      for (const type of types) {
        try {
          const result = await processOne(league, season, type, args, active, availableFrom);
          if (type === 'matches' && result.written) {
            matchesChanged = true;
            matchesData = result.data;
          }
        } catch (e) {
          console.error(`  ❌ ${type}/${season}: ${e.message}`);
        }
      }

      if (matchesChanged && matchesData) {
        rederiveStandings(season, matchesData, league.id, active);
      }
    }
    console.log('');
  }

  console.log('✅ Done.');
}

main().catch((e) => {
  console.error('❌', e);
  process.exit(1);
});
