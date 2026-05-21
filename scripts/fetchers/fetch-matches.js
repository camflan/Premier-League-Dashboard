// Fetch match results for a single season from ESPN.
//
// Returns a fresh array of matches in our canonical shape:
//   [{ d: "DD/MM/YYYY", h: "Home", a: "Away", hg: 1, ag: 0, status?: "STATUS_FINAL" }, …]
//
// For the active season the simple /scoreboard endpoint returns recent matches.
// For past seasons ESPN's scoreboard requires date ranges; we don't iterate
// those yet — caller will receive `null` and is expected to leave the existing
// data file alone.

import espnApi from '../utils/espn-api.js';
import { activeSeason } from '../utils/active-season.js';

export async function fetchMatchesForSeason(season) {
  if (season !== activeSeason()) {
    // No date-range fetcher yet. Callers must preserve existing data.
    return null;
  }

  const fetched = await espnApi.getMatchResults(null, 100);
  if (!fetched || fetched.length === 0) return null;
  return fetched;
}
