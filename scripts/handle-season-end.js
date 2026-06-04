#!/usr/bin/env node

// Handle end-of-season automation:
// 1. Fetch final standings for all leagues
// 2. Detect promoted/relegated teams
// 3. Create next season skeleton structure
// 4. Update league-promotions.json with the results
//
// This is typically run on May 31st via GitHub Actions.
// Can also be run manually for testing.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { activeSeason } from './utils/active-season.js';
import { detectPromotions, verifyPromotions } from './utils/detect-promotions.js';
import espnApi from './utils/espn-api.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');
const dataDir = path.join(rootDir, 'data');
const staticDir = path.join(rootDir, 'static');

// Map league IDs to ESPN league IDs
const LEAGUE_ESPN_ID = {
  'premier-league': 'eng.1',
  'championship': 'eng.2',
  'efl-league-one': 'eng.3',
};

const LEAGUE_INFO = {
  'premier-league': { teams: 20, promoted: 3, relegated: 3 },
  'championship': { teams: 24, promoted: 2, relegated: 2, playoff: true },
  'efl-league-one': { teams: 24, promoted: 2, relegated: 2, playoff: true },
};

function readJSON(filePath, fallback = null) {
  if (!fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJSON(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function dataPath(type, season, leagueId) {
  return path.join(dataDir, leagueId, type, `${season}.json`);
}

function ensureDirExists(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

// Compute the next season string
function getNextSeason(season) {
  const [startYearStr, endYearStr] = season.split('-');
  const nextStartYear = parseInt(startYearStr, 10) + 1;
  const nextEndYY = String((nextStartYear + 1) % 100).padStart(2, '0');
  return `${nextStartYear}-${nextEndYY}`;
}

async function main() {
  const active = activeSeason();
  const next = getNextSeason(active);

  console.log(`\n🔄 End-of-Season Handler`);
  console.log(`   Current (completed) season: ${active}`);
  console.log(`   Next season to create: ${next}\n`);

  // Step 1: Fetch final standings for all leagues
  console.log(`📊 Fetching final standings for ${active}...\n`);

  const standings = {};
  const leagues = ['premier-league', 'championship', 'efl-league-one'];

  for (const league of leagues) {
    const espnLeagueId = LEAGUE_ESPN_ID[league];
    const leagueName =
      league === 'premier-league' ? 'Premier League' : league === 'championship' ? 'Championship' : 'EFL League One';

    console.log(`  📋 ${leagueName}...`);
    const fetchedStandings = await espnApi.getLeagueStandings(active, espnLeagueId);

    if (!fetchedStandings || fetchedStandings.length === 0) {
      console.log(`     ⚠️  Could not fetch final standings for ${league}`);
      // Fall back to existing file if available
      const existingPath = dataPath('standings', active, league);
      standings[league] = readJSON(existingPath, []);
      if (standings[league].length === 0) {
        console.log(`     ⚠️  No existing standings file either. Skipping.`);
      }
    } else {
      standings[league] = fetchedStandings;
      console.log(`     ✓ Got ${fetchedStandings.length} teams`);
    }
  }

  // Step 2: Detect promotions and relegations
  console.log(`\n🔄 Detecting promotions/relegations...\n`);

  const promotions = {};

  // Helper to get league below (where teams are relegated to)
  function getLeagueBelow(leagueId) {
    if (leagueId === 'premier-league') return 'championship';
    if (leagueId === 'championship') return 'efl-league-one';
    return null;
  }

  // Helper to get league above (where teams are promoted to)
  function getLeagueAbove(leagueId) {
    if (leagueId === 'efl-league-one') return 'championship';
    if (leagueId === 'championship') return 'premier-league';
    return null;
  }

  for (const league of leagues) {
    const aboveLeague = getLeagueAbove(league);
    const belowLeague = getLeagueBelow(league);
    const leagueName =
      league === 'premier-league' ? 'Premier League' : league === 'championship' ? 'Championship' : 'EFL League One';

    console.log(`  ${leagueName}:`);

    if (aboveLeague && standings[aboveLeague]) {
      // Teams relegated from league above come to this league
      const relDetection = detectPromotions(standings[aboveLeague], standings[league], league);
      promotions[league] = promotions[league] || {};
      promotions[league].relegatedFrom = aboveLeague;
      promotions[league].teamsMovingDown = relDetection.promoted;
      console.log(`     ↓ Teams from ${aboveLeague}: ${relDetection.promoted.join(', ')}`);
    }

    if (belowLeague && standings[belowLeague]) {
      // Teams promoted to league above come from this league
      const promDetection = detectPromotions(standings[league], standings[belowLeague], league);
      promotions[league] = promotions[league] || {};
      promotions[league].promotedTo = belowLeague;
      promotions[league].teamsMovingUp = promDetection.relegated;
      console.log(`     ↑ Teams to ${belowLeague}: ${promDetection.relegated.join(', ')}`);
    }
  }

  // Step 3: Create next season structure
  console.log(`\n📅 Creating next season structure (${next})...\n`);

  for (const league of leagues) {
    const leagueName =
      league === 'premier-league' ? 'Premier League' : league === 'championship' ? 'Championship' : 'EFL League One';

    console.log(`  ${leagueName}:`);

    // Create empty matches and fixtures files
    const matchesPath = dataPath('matches', next, league);
    const fixturesPath = dataPath('fixtures', next, league);
    const standingsPath = dataPath('standings', next, league);

    ensureDirExists(path.dirname(matchesPath));
    ensureDirExists(path.dirname(fixturesPath));
    ensureDirExists(path.dirname(standingsPath));

    writeJSON(matchesPath, []);
    console.log(`     ✓ Created empty matches file`);

    writeJSON(fixturesPath, []);
    console.log(`     ✓ Created empty fixtures file`);

    // Create standings template with promoted teams at the top and relegated teams removed
    let nextSeasonStandings = [];

    const currentStandings = standings[league] || [];
    const teamMovingDown = promotions[league]?.teamsMovingDown || [];
    const teamMovingUp = promotions[league]?.teamsMovingUp || [];

    // Start with teams from current season, except those relegated
    for (const [idx, team] of currentStandings.entries()) {
      const teamName = team[1];
      // Skip teams that are moving up (relegated to lower league)
      if (!teamMovingUp.includes(teamName)) {
        nextSeasonStandings.push(team); // Will re-position below
      }
    }

    // Add teams moving down (promoted from league above)
    for (const teamName of teamMovingDown) {
      // Add as placeholder with minimal data
      nextSeasonStandings.unshift([0, teamName, 0, 0, 0, 0, 0, 0, 0]);
    }

    // Re-position all teams from 1 to N
    nextSeasonStandings = nextSeasonStandings.map((team, idx) => [
      idx + 1, // Re-position
      team[1], // Team name
      0,
      0,
      0,
      0,
      0,
      0,
      0,
    ]);

    const info = LEAGUE_INFO[league];
    if (nextSeasonStandings.length !== info.teams) {
      console.log(
        `     ⚠️  Expected ${info.teams} teams, got ${nextSeasonStandings.length}. Manual adjustment needed.`
      );
    }

    writeJSON(standingsPath, nextSeasonStandings);
    console.log(`     ✓ Created standings template with ${nextSeasonStandings.length} teams`);
  }

  // Step 4: Update league-promotions.json
  console.log(`\n📝 Updating league-promotions.json...\n`);

  const leaguePromotionsPath = path.join(staticDir, 'league-promotions.json');
  const leaguePromotions = readJSON(leaguePromotionsPath, {});

  leaguePromotions[active] = {
    source: 'espn_api',
    fetchedAt: new Date().toISOString(),
    promoted_to_pl: promotions['championship']?.teamsMovingUp || [],
    promoted_to_championship: promotions['efl-league-one']?.teamsMovingUp || [],
    relegated_from_pl: promotions['championship']?.teamsMovingDown || [],
    relegated_from_championship: promotions['efl-league-one']?.teamsMovingDown || [],
  };

  writeJSON(leaguePromotionsPath, leaguePromotions);
  console.log(`  ✓ Updated league-promotions.json with ${active} season results\n`);

  console.log(`✅ Season-end automation complete!`);
  console.log(`\n📝 Next steps:`);
  console.log(`   1. Review data in data/*/standings/${next}.json`);
  console.log(`   2. Run: npm run build`);
  console.log(`   3. Commit changes with: git add . && git commit -m "chore: season-end update for ${active}-${next}"`);
  console.log(`   4. Optional: Manually fetch historical data with: npm run fetch -- --all --league=championship`);
}

main().catch((e) => {
  console.error('❌', e);
  process.exit(1);
});
