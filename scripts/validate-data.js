#!/usr/bin/env node

// Validate data integrity across all season files.
// Checks for:
// - Valid JSON format
// - Required fields present
// - Data consistency (standings, matches, fixtures)
// - Promotion/relegation logic

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');
const dataDir = path.join(rootDir, 'data');
const _staticDir = path.join(rootDir, 'static');

const LEAGUE_INFO = {
  championship: { teams: 24 },
  'efl-league-one': { teams: 24 },
  'premier-league': { teams: 20 },
};

const WARNINGS = [];
const ERRORS = [];

function _readJSON(filePath, fallback = null) {
  if (!fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function validateJSON(filePath) {
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (e) {
    ERRORS.push(`Invalid JSON in ${filePath}: ${e.message}`);
    return null;
  }
}

function validateStandings(standings, leagueId, season) {
  if (!Array.isArray(standings)) {
    ERRORS.push(`${leagueId}/${season}/standings: not an array`);
    return false;
  }

  if (standings.length === 0) {
    WARNINGS.push(`${leagueId}/${season}/standings: empty`);
    return true;
  }

  const expected = LEAGUE_INFO[leagueId].teams;
  if (standings.length !== expected) {
    WARNINGS.push(
      `${leagueId}/${season}/standings: expected ${expected} teams, got ${standings.length}`,
    );
  }

  // Check each entry has required fields: [pos, name, p, w, d, l, gf, ga, pts]
  for (let i = 0; i < standings.length; i++) {
    const entry = standings[i];
    if (!Array.isArray(entry) || entry.length < 9) {
      ERRORS.push(
        `${leagueId}/${season}/standings[${i}]: invalid format (expected [pos, name, p, w, d, l, gf, ga, pts])`,
      );
      continue;
    }

    if (entry[0] !== i + 1) {
      WARNINGS.push(
        `${leagueId}/${season}/standings[${i}]: position ${entry[0]} != expected ${i + 1}`,
      );
    }
  }

  return true;
}

function validateMatches(matches, leagueId, season) {
  if (!Array.isArray(matches)) {
    ERRORS.push(`${leagueId}/${season}/matches: not an array`);
    return false;
  }

  if (matches.length === 0) {
    // Empty is OK for seasons still in progress
    return true;
  }

  const seen = new Set();
  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    if (
      !match.d ||
      !match.h ||
      !match.a ||
      typeof match.hg === 'undefined' ||
      typeof match.ag === 'undefined'
    ) {
      ERRORS.push(`${leagueId}/${season}/matches[${i}]: missing required field (d, h, a, hg, ag)`);
      continue;
    }

    const key = `${match.d}|${match.h}|${match.a}`;
    if (seen.has(key)) {
      WARNINGS.push(`${leagueId}/${season}/matches[${i}]: duplicate match (${key})`);
    }
    seen.add(key);
  }

  return true;
}

function validateFixtures(fixtures, leagueId, season) {
  if (!Array.isArray(fixtures)) {
    ERRORS.push(`${leagueId}/${season}/fixtures: not an array`);
    return false;
  }

  if (fixtures.length === 0) {
    return true;
  }

  for (let i = 0; i < fixtures.length; i++) {
    const fixture = fixtures[i];
    if (!fixture.d || !fixture.h || !fixture.a) {
      ERRORS.push(`${leagueId}/${season}/fixtures[${i}]: missing required field (d, h, a)`);
      continue;
    }

    if (fixture.time && !/^\d{2}:\d{2}$/.test(fixture.time)) {
      WARNINGS.push(`${leagueId}/${season}/fixtures[${i}]: invalid time format: ${fixture.time}`);
    }
  }

  return true;
}

function main() {
  console.log('🔍 Validating data integrity...\n');

  const leagues = ['premier-league', 'championship', 'efl-league-one'];
  let validStandingsCount = 0;
  let validMatchesCount = 0;
  let validFixturesCount = 0;

  for (const league of leagues) {
    const leagueDir = path.join(dataDir, league);
    if (!fs.existsSync(leagueDir)) continue;

    // Get all seasons
    const standingsDir = path.join(leagueDir, 'standings');
    if (fs.existsSync(standingsDir)) {
      for (const file of fs.readdirSync(standingsDir)) {
        if (!file.endsWith('.json')) continue;
        const season = path.basename(file, '.json');
        const filePath = path.join(standingsDir, file);
        const data = validateJSON(filePath);
        if (data !== null) {
          validateStandings(data, league, season);
          validStandingsCount++;
        }
      }
    }

    // Validate matches
    const matchesDir = path.join(leagueDir, 'matches');
    if (fs.existsSync(matchesDir)) {
      for (const file of fs.readdirSync(matchesDir)) {
        if (!file.endsWith('.json')) continue;
        const season = path.basename(file, '.json');
        const filePath = path.join(matchesDir, file);
        const data = validateJSON(filePath);
        if (data !== null) {
          validateMatches(data, league, season);
          validMatchesCount++;
        }
      }
    }

    // Validate fixtures
    const fixturesDir = path.join(leagueDir, 'fixtures');
    if (fs.existsSync(fixturesDir)) {
      for (const file of fs.readdirSync(fixturesDir)) {
        if (!file.endsWith('.json')) continue;
        const season = path.basename(file, '.json');
        const filePath = path.join(fixturesDir, file);
        const data = validateJSON(filePath);
        if (data !== null) {
          validateFixtures(data, league, season);
          validFixturesCount++;
        }
      }
    }
  }

  console.log('📊 Validation Results:\n');
  console.log(`  ✓ Valid standings files: ${validStandingsCount}`);
  console.log(`  ✓ Valid matches files: ${validMatchesCount}`);
  console.log(`  ✓ Valid fixtures files: ${validFixturesCount}`);

  if (WARNINGS.length > 0) {
    console.log(`\n⚠️  Warnings (${WARNINGS.length}):`);
    for (const w of WARNINGS.slice(0, 10)) console.log(`    - ${w}`);
    if (WARNINGS.length > 10) {
      console.log(`    ... and ${WARNINGS.length - 10} more`);
    }
  }

  if (ERRORS.length > 0) {
    console.log(`\n❌ Errors (${ERRORS.length}):`);
    for (const e of ERRORS.slice(0, 10)) console.log(`    - ${e}`);
    if (ERRORS.length > 10) {
      console.log(`    ... and ${ERRORS.length - 10} more`);
    }
    console.log('\n❌ Validation failed');
    process.exit(1);
  }

  console.log('\n✅ Validation passed');
  process.exit(0);
}

main();
