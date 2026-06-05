// Fetch match results for a single season from ESPN.
//
// Returns a fresh array of matches in our canonical shape:
//   [{ d: "DD/MM/YYYY", h: "Home", a: "Away", hg: 1, ag: 0, status?: "STATUS_FINAL" }, …]
//
// For the active season the simple /scoreboard endpoint returns recent matches.
// For past seasons (that have ESPN data available), fetch by date range.

import { activeSeason } from '../utils/active-season.js';
import espnApi from '../utils/espn-api.js';

function seasonToDateRange(season) {
  // "2025-26" season runs Aug 1, 2025 - May 31, 2026
  const [startYearStr] = season.split('-');
  const startYear = parseInt(startYearStr, 10);
  return { endDate: `${startYear + 1}-05-31`, startDate: `${startYear}-08-01` };
}

function seasonIsBeforeAvailable(season, availableSince) {
  const [seasonStartStr] = season.split('-');
  const [availableStartStr] = availableSince.split('-');
  return parseInt(seasonStartStr, 10) < parseInt(availableStartStr, 10);
}

// league: { id, espnId } from static/leagues.json
// availableFrom: earliest season with ESPN data (from static/seasons-config.json),
//                or null when unknown — then only the active season is fetchable.
export async function fetchMatchesForSeason(season, league, availableFrom = null) {
  const active = activeSeason();

  // For active season, use the simple scoreboard endpoint (returns most recent matches)
  if (season === active) {
    const fetched = await espnApi.getMatchResults(null, 100, league.espnId);
    if (!fetched || fetched.length === 0) return null;
    return fetched;
  }

  if (!availableFrom || seasonIsBeforeAvailable(season, availableFrom)) {
    // No ESPN data available for this season. Callers must preserve existing data.
    console.log(`     ℹ️  ESPN data not available for ${league.id} in ${season}`);
    return null;
  }

  // Fetch historical matches by date range
  const { startDate, endDate } = seasonToDateRange(season);
  const fetched = await espnApi.getMatchResultsForDateRange(startDate, endDate, league.espnId);

  if (!fetched || fetched.length === 0) {
    console.log(`     ℹ️  No matches found via date range fetch for ${season}`);
    return null;
  }

  return fetched;
}
