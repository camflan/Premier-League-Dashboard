#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');
const dataDir = path.join(rootDir, 'data');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

console.log('🔄 Extracting data from index.html...\n');

// Read the current index.html
const htmlContent = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf-8');

// Extract only the JavaScript section
const scriptStart = htmlContent.indexOf('<script>');
const scriptEnd = htmlContent.indexOf('</script>');
const scriptContent = htmlContent.slice(scriptStart + 8, scriptEnd);

// Helper function to safely extract and evaluate a single variable
function extractVariable(name, content) {
  // Find the pattern: const NAME = {...}; or const NAME = [...];
  const regex = new RegExp(`const\\s+${name}\\s*=\\s*([\\s\\S]*?);\\s*(?=const|function|async|$)`, 'gm');
  const match = regex.exec(content);

  if (!match) {
    return null;
  }

  const valueStr = match[1].trim();

  // Try to evaluate it safely
  try {
    // Use Function constructor to evaluate in a safe context
    const evaluator = new Function(`return (${valueStr})`);
    return evaluator();
  } catch (error) {
    console.error(`   ⚠️  Could not evaluate ${name}: ${error.message.slice(0, 50)}`);
    return null;
  }
}

// Extract all data
const data = {};

// Extract each variable
console.log('📦 Extracting TEAM_COLORS...');
data.teamColors = extractVariable('TEAM_COLORS', scriptContent);
if (data.teamColors) {
  console.log(`   ✓ Found ${Object.keys(data.teamColors).length} teams`);
}

console.log('📦 Extracting SHORT_NAMES...');
data.shortNames = extractVariable('SHORT_NAMES', scriptContent);
if (data.shortNames) {
  console.log(`   ✓ Found ${Object.keys(data.shortNames).length} short names`);
}

console.log('📦 Extracting THESPORTSDB_LOGOS...');
data.logos = extractVariable('THESPORTSDB_LOGOS', scriptContent);
if (data.logos) {
  console.log(`   ✓ Found ${Object.keys(data.logos).length} logos`);
}

console.log('📦 Extracting SEASONS...');
data.seasons = extractVariable('SEASONS', scriptContent);
if (data.seasons) {
  console.log(`   ✓ Found ${data.seasons.length} seasons`);
}

console.log('📦 Extracting RAW (standings)...');
data.standings = extractVariable('RAW', scriptContent);
if (data.standings) {
  const seasonCount = Object.keys(data.standings).length;
  const totalRecords = Object.values(data.standings).reduce((sum, season) => sum + (Array.isArray(season) ? season.length : 0), 0);
  console.log(`   ✓ Found ${seasonCount} seasons with ${totalRecords} total records`);
}

console.log('📦 Extracting HISTORICAL_MATCHES_PRE2003...');
data.matchesPre2003 = extractVariable('HISTORICAL_MATCHES_PRE2003', scriptContent);
if (data.matchesPre2003) {
  const seasonCount = Object.keys(data.matchesPre2003).length;
  const totalMatches = Object.values(data.matchesPre2003).reduce((sum, season) => sum + (Array.isArray(season) ? season.length : 0), 0);
  console.log(`   ✓ Found ${seasonCount} seasons with ${totalMatches} total matches`);
}

console.log('📦 Extracting HISTORICAL_MATCHES...');
data.matches = extractVariable('HISTORICAL_MATCHES', scriptContent);
if (data.matches) {
  const seasonCount = Object.keys(data.matches).length;
  const totalMatches = Object.values(data.matches).reduce((sum, season) => sum + (Array.isArray(season) ? season.length : 0), 0);
  console.log(`   ✓ Found ${seasonCount} seasons with ${totalMatches} total matches`);
}

console.log('📦 Extracting FIXTURES_2025_26...');
data.fixtures = extractVariable('FIXTURES_2025_26', scriptContent);
if (data.fixtures) {
  console.log(`   ✓ Found ${data.fixtures.length} fixtures`);
}

console.log('📦 Extracting NOTES...');
data.notes = extractVariable('NOTES', scriptContent);
if (data.notes) {
  const seasonCount = Object.keys(data.notes).length;
  console.log(`   ✓ Found notes for ${seasonCount} seasons`);
}

// Write extracted data to JSON files
console.log('\n💾 Writing JSON files...\n');

function writeJsonFile(filename, data, description) {
  const filePath = path.join(dataDir, filename);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  console.log(`✓ ${description} → ${filename}`);
}

if (data.teamColors) {
  const teamsArray = Object.entries(data.teamColors).map(([name, color]) => ({ name, color }));
  writeJsonFile('teams.json', { teams: teamsArray }, 'Team Colors');
}

if (data.shortNames) {
  writeJsonFile('short-names.json', { shortNames: data.shortNames }, 'Short Names');
}

if (data.logos) {
  writeJsonFile('logos.json', { logos: data.logos }, 'Team Logos');
}

if (data.seasons) {
  writeJsonFile('seasons.json', { seasons: data.seasons }, 'Seasons');
}

if (data.matchesPre2003 || data.matches) {
  const mergedMatches = { ...(data.matchesPre2003 || {}), ...(data.matches || {}) };
  writeJsonFile('matches.json', mergedMatches, 'Match Results');
}

if (data.standings) {
  writeJsonFile('standings.json', data.standings, 'Standings');
}

if (data.fixtures) {
  writeJsonFile('fixtures.json', { '2025-26': data.fixtures }, 'Fixtures');
}

if (data.notes) {
  writeJsonFile('notes.json', data.notes, 'Notes/Achievements');
}

console.log('\n✅ Data extraction complete!\n');
console.log('📂 Files created in ./data/\n');
console.log('Next: Run `npm run build` to generate index.html from template\n');
