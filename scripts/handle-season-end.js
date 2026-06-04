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

  // Step 2: Apply promotion/relegation rules
  console.log(`\n🔄 Detecting promotions/relegations...\n`);

  const promotions = {};

  // Promotion/relegation rules
  const promotionRules = {
    'premier-league': { relegated: 3, promoted: 3 },
    'championship': { relegated: 2, promoted: 2 },
    'efl-league-one': { relegated: 4, promoted: 2 },
  };

  // Apply promotion/relegation rules
  // Key insight: promoted/relegated teams must be tracked as:
  // - Teams LEAVING a league (promoted up or relegated down)
  // - Teams JOINING a league (promoted down from above or relegated up from below)

  if (standings['premier-league'] && standings['championship']) {
    // PL: Bottom 3 are relegated DOWN
    const plStandings = standings['premier-league'];
    const plRelegated = plStandings.slice(-3).map((s) => s[1]);

    // Championship: Top 2 are promoted UP
    const chStandings = standings['championship'];
    const chPromoted = chStandings.slice(0, 2).map((s) => s[1]);

    // Track teams leaving/entering each league
    promotions['premier-league'] = promotions['premier-league'] || {};
    promotions['premier-league'].leaving = plRelegated; // Teams leaving PL → Championship
    promotions['premier-league'].joining = chPromoted; // Teams joining PL ← Championship

    promotions['championship'] = promotions['championship'] || {};
    promotions['championship'].leaving = chPromoted; // Teams leaving Championship → PL
    promotions['championship'].joining = promotions['championship'].joining || [];
    promotions['championship'].joining = promotions['championship'].joining.concat(plRelegated); // Teams joining Championship ← PL

    console.log(`  Premier League:`);
    console.log(`     ↓ Relegated to Championship: ${plRelegated.join(', ')}`);
    console.log(`  Championship:`);
    console.log(`     ↑ Promoted to Premier League: ${chPromoted.join(', ')}`);
  }

  if (standings['championship'] && standings['efl-league-one']) {
    // Championship: Bottom 2 are relegated DOWN
    const chStandings = standings['championship'];
    const chRelegated = chStandings.slice(-2).map((s) => s[1]);

    // League One: Top 2 are promoted UP
    const leagueOneStandings = standings['efl-league-one'];
    const leagueOnePromoted = leagueOneStandings.slice(0, 2).map((s) => s[1]);

    promotions['championship'] = promotions['championship'] || {};
    promotions['championship'].leaving = (promotions['championship'].leaving || []).concat(chRelegated);
    promotions['championship'].joining = (promotions['championship'].joining || []).concat(leagueOnePromoted);

    promotions['efl-league-one'] = promotions['efl-league-one'] || {};
    promotions['efl-league-one'].leaving = leagueOnePromoted; // Teams leaving League One → Championship
    promotions['efl-league-one'].joining = chRelegated; // Teams joining League One ← Championship

    console.log(`  Championship:`);
    console.log(`     ↓ Relegated to League One: ${chRelegated.join(', ')}`);
    console.log(`  EFL League One:`);
    console.log(`     ↑ Promoted to Championship: ${leagueOnePromoted.join(', ')}`);
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

    // Create standings template for next season
    let nextSeasonStandings = [];

    const currentStandings = standings[league] || [];
    const info = LEAGUE_INFO[league];

    // Get teams leaving this league and teams joining this league
    const teamsLeaving = promotions[league]?.leaving || [];
    const teamsJoining = promotions[league]?.joining || [];

    // Step 1: Keep remaining teams from current season with their previous records
    const remainingTeamsData = [];
    for (const teamData of currentStandings) {
      const teamName = teamData[1];
      if (!teamsLeaving.includes(teamName)) {
        remainingTeamsData.push(teamData);
      }
    }

    // Step 2: Add joining teams at the BOTTOM with empty records (0,0,0,0,0,0,0)
    const joiningTeamsData = teamsJoining.map((teamName) => [
      0, // Position (will be recalculated)
      teamName, // Team name
      0, // Played
      0, // Wins
      0, // Draws
      0, // Losses
      0, // Goals for
      0, // Goals against
      0, // Points
    ]);

    // Step 3: Combine: remaining teams first (with their records), then joining teams at bottom
    const allTeamsForNextSeason = [...remainingTeamsData, ...joiningTeamsData];

    // Step 4: Re-position all teams from 1 to N
    nextSeasonStandings = allTeamsForNextSeason.map((teamData, idx) => [
      idx + 1, // Position (1-indexed)
      teamData[1], // Team name
      teamData[2], // Played (kept from previous, or 0 for new teams)
      teamData[3], // Wins
      teamData[4], // Draws
      teamData[5], // Losses
      teamData[6], // Goals for
      teamData[7], // Goals against
      teamData[8], // Points
    ]);

    if (nextSeasonStandings.length !== info.teams) {
      console.log(
        `     ⚠️  Expected ${info.teams} teams, got ${nextSeasonStandings.length}`
      );
      console.log(`        Remaining from prev season: ${remainingTeamsData.length}, Newly promoted: ${joiningTeamsData.length}`);
      console.log(`        ⚠️  MANUAL ADJUSTMENT NEEDED: Missing ${info.teams - nextSeasonStandings.length} team(s) (likely playoff winner)`);
    } else {
      console.log(`     ✓ Complete standings with all ${nextSeasonStandings.length} teams (remaining + promoted)`);
    }

    writeJSON(standingsPath, nextSeasonStandings);
  }

  // Step 4: Update league-promotions.json
  console.log(`\n📝 Updating league-promotions.json...\n`);

  const leaguePromotionsPath = path.join(staticDir, 'league-promotions.json');
  const leaguePromotions = readJSON(leaguePromotionsPath, {});

  leaguePromotions[active] = {
    source: 'standings_analysis',
    fetchedAt: new Date().toISOString(),
    promoted_to_pl: promotions['championship']?.leaving || [],
    promoted_to_championship: promotions['efl-league-one']?.leaving || [],
    relegated_from_pl: promotions['premier-league']?.leaving || [],
    relegated_from_championship: promotions['championship']?.leaving?.filter(
      (t) => !(promotions['championship']?.joining || []).includes(t)
    ) || [],
  };

  writeJSON(leaguePromotionsPath, leaguePromotions);
  console.log(`  ✓ Updated league-promotions.json with ${active} season results`);
  console.log(`    - Promoted to PL: ${(promotions['championship']?.leaving || []).join(', ') || 'None'}`);
  console.log(`    - Relegated from PL: ${(promotions['premier-league']?.leaving || []).join(', ') || 'None'}`);
  console.log(`    - Promoted to Championship: ${(promotions['efl-league-one']?.leaving || []).join(', ') || 'None'}`);

  const chRelegated = (promotions['championship']?.leaving || []).filter((t) => !(promotions['championship']?.joining || []).includes(t));
  console.log(`    - Relegated from Championship: ${chRelegated.join(', ') || 'None'}\n`);

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
