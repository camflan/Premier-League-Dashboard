import fs from 'node:fs';
import path from 'node:path';
import { activeSeason } from '../utils/active-season.js';

function readJSON(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

// Read every <season>.json under data/<leagueId>/<type>/ and merge into
// { "1992-93": …, "1993-94": … }
function readLeagueSeasonDir(dataDir, leagueId, type) {
  const dir = path.join(dataDir, leagueId, type);
  if (!fs.existsSync(dir)) return {};
  const out = {};
  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith('.json')) continue;
    const season = path.basename(file, '.json');
    out[season] = readJSON(path.join(dir, file));
  }
  return out;
}

// Compose the window.__DATA object from static/ (curated) + data/ (fetched).
// Pure read: no writes, no network.
export function composeData(rootDir) {
  const dataDir = path.join(rootDir, 'data');
  const staticDir = path.join(rootDir, 'static');

  // Curated data (hand-edited)
  const teams = readJSON(path.join(staticDir, 'teams.json')).teams;
  const shortNames = readJSON(path.join(staticDir, 'short-names.json')).shortNames;
  const logos = readJSON(path.join(staticDir, 'logos.json')).logos;
  const notes = readJSON(path.join(staticDir, 'notes.json'));
  const europeanCups = readJSON(path.join(staticDir, 'european-cups.json'));
  const funFacts = readJSON(path.join(staticDir, 'fun-facts.json'));
  const teamNotes = readJSON(path.join(staticDir, 'team-notes.json'));
  const espnNames = readJSON(path.join(staticDir, 'espn-names.json'));
  const leagues = readJSON(path.join(staticDir, 'leagues.json')).leagues;
  const leaguePromotions = readJSON(path.join(staticDir, 'league-promotions.json'));
  const tournamentQualifications = readJSON(path.join(staticDir, 'tournament-qualifications.json'));

  // Read season-based data organized by league
  const standings = {};
  const matches = {};
  const fixtures = {};

  for (const league of leagues) {
    standings[league.id] = readLeagueSeasonDir(dataDir, league.id, 'standings');
    matches[league.id] = readLeagueSeasonDir(dataDir, league.id, 'matches');
    fixtures[league.id] = readLeagueSeasonDir(dataDir, league.id, 'fixtures');
  }

  // Derive seasons from Premier League standings (primary source)
  const seasons = Object.keys(standings['premier-league'] || {})
    .sort()
    .reverse();

  return {
    activeSeason: activeSeason(), // recomputed from current date each render
    espnNames,
    europeanCups,
    fixtures,
    funFacts,
    leaguePromotions,
    leagues,
    logos,
    matches,
    notes,
    seasons,
    shortNames,
    standings,
    teamNotes,
    teams,
    tournamentQualifications,
  };
}
