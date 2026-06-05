#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { activeSeason } from './utils/active-season.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');
const dataDir = path.join(rootDir, 'data');
const staticDir = path.join(rootDir, 'static');
const templatePath = path.join(rootDir, 'template', 'index.html.template');
const outputPath = path.join(rootDir, 'index.html');

const INJECTION_MARKER = '/* __DATA_INJECTION_POINT__ */';

function readJSON(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

// Read every <season>.json under data/<type>/ and merge into { "1992-93": …, "1993-94": … }
function readSeasonDir(type) {
  const dir = path.join(dataDir, type);
  if (!fs.existsSync(dir)) return {};
  const out = {};
  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith('.json')) continue;
    const season = path.basename(file, '.json');
    out[season] = readJSON(path.join(dir, file));
  }
  return out;
}

// Read league-organized season directories
function readLeagueSeasonDir(leagueId, type) {
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

console.log('🔨 Building index.html from template + data…\n');

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
  standings[league.id] = readLeagueSeasonDir(league.id, 'standings');
  matches[league.id] = readLeagueSeasonDir(league.id, 'matches');
  fixtures[league.id] = readLeagueSeasonDir(league.id, 'fixtures');
}

// Derive seasons from Premier League standings (primary source)
const seasons = Object.keys(standings['premier-league'] || {}).sort().reverse();

const active = activeSeason(); // e.g., "2025-26" — recomputed from current date each build
const activeShort = active.slice(2); // "25-26" → display as "25/26"
const activeShortSlash = activeShort.replace('-', '/');

const data = {
  activeSeason: active,
  espnNames,
  europeanCups,
  fixtures,
  funFacts,
  leaguePromotions,
  leagues,
  logos,
  matches: JSON.parse(JSON.stringify(matches)), // Deep copy to ensure proper serialization
  notes,
  seasons,
  shortNames,
  standings,
  teamNotes,
  teams,
  tournamentQualifications,
};

const template = fs.readFileSync(templatePath, 'utf8');

if (!template.includes(INJECTION_MARKER)) {
  console.error(`❌ Injection marker not found in template: ${INJECTION_MARKER}`);
  process.exit(1);
}

const injection = `window.__DATA = ${JSON.stringify(data, null, 2)};`;
const html = template
  .replace(INJECTION_MARKER, injection)
  .replaceAll('{{ACTIVE_SEASON_SHORT}}', activeShortSlash);

fs.writeFileSync(outputPath, html, 'utf8');

const sizeMB = (fs.statSync(outputPath).size / 1024 / 1024).toFixed(2);
const totalStandingsSeasons = Object.values(standings).reduce((sum, s) => sum + Object.keys(s).length, 0);
const totalMatchesSeasons = Object.values(matches).reduce((sum, m) => sum + Object.keys(m).length, 0);
const totalFixturesSeasons = Object.values(fixtures).reduce((sum, f) => sum + Object.keys(f).length, 0);
console.log(
  `✅ Built index.html (${sizeMB} MB) — ${Object.keys(leagues).length} leagues, ${totalStandingsSeasons} standings seasons, ${totalMatchesSeasons} matches, ${totalFixturesSeasons} fixtures`,
);
