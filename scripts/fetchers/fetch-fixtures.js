// Fetch upcoming fixtures for a single season from ESPN.
//
// Returns a fresh array of fixtures: [{ d: "DD/MM/YYYY", h, a, time }, …].
// Fixtures only make sense for the active season; past seasons return null.

import espnApi from '../utils/espn-api.js';
import { activeSeason } from '../utils/active-season.js';

export async function fetchFixturesForSeason(season) {
  if (season !== activeSeason()) return null;

  const fetched = await espnApi.getFixtures(30);
  if (!fetched || fetched.length === 0) return null;
  return fetched;
}
