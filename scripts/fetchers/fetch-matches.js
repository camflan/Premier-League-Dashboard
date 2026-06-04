// Fetch match results for a single season from ESPN.
//
// Returns a fresh array of matches in our canonical shape:
//   [{ d: "DD/MM/YYYY", h: "Home", a: "Away", hg: 1, ag: 0, status?: "STATUS_FINAL" }, …]
//
// For the active season the simple /scoreboard endpoint returns recent matches.
// For past seasons (that have ESPN data available), fetch by date range.

import { activeSeason } from '../utils/active-season.js';
import espnApi from '../utils/espn-api.js';

// Map league IDs to ESPN league IDs
const LEAGUE_ESPN_ID = {
  'premier-league': 'eng.1',
  'championship': 'eng.2',
  'efl-league-one': 'eng.3',
};

// Data availability per league and season
// Format: "1992-93" means the 1992-93 season (Aug 1992 - May 1993)
const ESPN_DATA_AVAILABLE = {
  'premier-league': '2002-03',  // ESPN has PL data from 2002-03 onwards
  'championship': '2003-04',    // ESPN has Championship data from 2003-04 onwards
  'efl-league-one': '2003-04',  // ESPN has League One data from 2003-04 onwards
};

function seasonToDateRange(season) {
  // Convert season string "2025-26" to date range
  // "2025-26" season runs Aug 1, 2025 - May 31, 2026
  const [startYearStr, endYearStr] = season.split('-');
  const startYear = parseInt(startYearStr, 10);
  const startDate = `${startYear}-08-01`;
  const endDate = `${startYear + 1}-05-31`;
  return { startDate, endDate };
}

function seasonIsBeforeAvailable(season, availableSince) {
  // Check if season starts before available data
  const [seasonStartStr] = season.split('-');
  const [availableStartStr] = availableSince.split('-');
  return parseInt(seasonStartStr, 10) < parseInt(availableStartStr, 10);
}

export async function fetchMatchesForSeason(season, leagueId = 'premier-league') {
  const espnLeagueId = LEAGUE_ESPN_ID[leagueId] || 'eng.1';
  const active = activeSeason();

  // For active season, use the simple scoreboard endpoint (returns most recent matches)
  if (season === active) {
    const fetched = await espnApi.getMatchResults(null, 100, espnLeagueId);
    if (!fetched || fetched.length === 0) return null;
    return fetched;
  }

  // For past seasons, check if ESPN has data available
  const availableSince = ESPN_DATA_AVAILABLE[leagueId] || ESPN_DATA_AVAILABLE['premier-league'];

  if (seasonIsBeforeAvailable(season, availableSince)) {
    // No ESPN data available for this season. Callers must preserve existing data.
    console.log(`     ℹ️  ESPN data not available for ${leagueId} before ${availableSince}`);
    return null;
  }

  // Fetch historical matches by date range
  const { startDate, endDate } = seasonToDateRange(season);
  const fetched = await espnApi.getMatchResultsForDateRange(startDate, endDate, espnLeagueId);

  if (!fetched || fetched.length === 0) {
    console.log(`     ℹ️  No matches found via date range fetch for ${season}`);
    return null;
  }

  return fetched;
}
