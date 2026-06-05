// Fetch upcoming fixtures for a single season from ESPN.
//
// Returns a fresh array of fixtures: [{ d: "DD/MM/YYYY", h, a, time }, …].
// Fixtures only make sense for the active season; past seasons return null.

import { activeSeason } from '../utils/active-season.js';
import espnApi from '../utils/espn-api.js';

// league: { id, espnId } from static/leagues.json
export async function fetchFixturesForSeason(season, league) {
  if (season !== activeSeason()) return null;

  const fetched = await espnApi.getFixtures(30, league.espnId);
  if (!fetched || fetched.length === 0) return null;
  return fetched;
}
