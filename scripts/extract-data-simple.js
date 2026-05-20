#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import vm from 'vm';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');
const dataDir = path.join(rootDir, 'data');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

console.log('🔄 Extracting data from index.html...\n');

// Read the current index.html
let htmlContent = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf-8');

// Extract only the JavaScript section
const scriptStart = htmlContent.indexOf('<script>');
const scriptEnd = htmlContent.indexOf('</script>');
const scriptContent = htmlContent.slice(scriptStart + 8, scriptEnd);

// Create a safe context to evaluate the variables with browser API stubs
const context = {
  localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
  window: {},
  document: { querySelector: () => null, querySelectorAll: () => [] },
  console: console,
  Math: Math,
  Object: Object,
  Array: Array,
  String: String,
  Number: Number,
  Boolean: Boolean,
  Date: Date,
  RegExp: RegExp,
  JSON: JSON,
  parseInt: parseInt,
  parseFloat: parseFloat,
  isNaN: isNaN,
  undefined: undefined
};

try {
  // Execute the script in a sandbox to populate the context
  console.log('📦 Executing HTML script to extract variables...');
  vm.runInNewContext(scriptContent, context, { timeout: 10000 });
  console.log('   ✓ Script executed successfully\n');

  // Now extract the variables from the context
  const variables = {
    TEAM_COLORS: context.TEAM_COLORS,
    SHORT_NAMES: context.SHORT_NAMES,
    THESPORTSDB_LOGOS: context.THESPORTSDB_LOGOS,
    SEASONS: context.SEASONS,
    RAW: context.RAW,
    HISTORICAL_MATCHES_PRE2003: context.HISTORICAL_MATCHES_PRE2003,
    HISTORICAL_MATCHES: context.HISTORICAL_MATCHES,
    FIXTURES_2025_26: context.FIXTURES_2025_26,
    NOTES: context.NOTES
  };

  // Check what was extracted
  console.log('📦 Extracted variables:\n');

  if (variables.TEAM_COLORS) {
    console.log(`✓ TEAM_COLORS: ${Object.keys(variables.TEAM_COLORS).length} teams`);
  }

  if (variables.SHORT_NAMES) {
    console.log(`✓ SHORT_NAMES: ${Object.keys(variables.SHORT_NAMES).length} entries`);
  }

  if (variables.THESPORTSDB_LOGOS) {
    console.log(`✓ THESPORTSDB_LOGOS: ${Object.keys(variables.THESPORTSDB_LOGOS).length} logos`);
  }

  if (variables.SEASONS) {
    console.log(`✓ SEASONS: ${variables.SEASONS.length} seasons`);
  }

  if (variables.RAW) {
    const seasonCount = Object.keys(variables.RAW).length;
    const totalRecords = Object.values(variables.RAW).reduce((sum, season) => sum + (Array.isArray(season) ? season.length : 0), 0);
    console.log(`✓ RAW: ${seasonCount} seasons with ${totalRecords} total records`);
  }

  if (variables.HISTORICAL_MATCHES_PRE2003) {
    const seasonCount = Object.keys(variables.HISTORICAL_MATCHES_PRE2003).length;
    const totalMatches = Object.values(variables.HISTORICAL_MATCHES_PRE2003).reduce((sum, season) => sum + (Array.isArray(season) ? season.length : 0), 0);
    console.log(`✓ HISTORICAL_MATCHES_PRE2003: ${seasonCount} seasons with ${totalMatches} total matches`);
  }

  if (variables.HISTORICAL_MATCHES) {
    const seasonCount = Object.keys(variables.HISTORICAL_MATCHES).length;
    const totalMatches = Object.values(variables.HISTORICAL_MATCHES).reduce((sum, season) => sum + (Array.isArray(season) ? season.length : 0), 0);
    console.log(`✓ HISTORICAL_MATCHES: ${seasonCount} seasons with ${totalMatches} total matches`);
  }

  if (variables.FIXTURES_2025_26) {
    console.log(`✓ FIXTURES_2025_26: ${variables.FIXTURES_2025_26.length} fixtures`);
  }

  if (variables.NOTES) {
    console.log(`✓ NOTES: ${Object.keys(variables.NOTES).length} seasons`);
  }

  // Write extracted data to JSON files
  console.log('\n💾 Writing JSON files...\n');

  // Helper function to write JSON file
  function writeJsonFile(filename, data, description) {
    const filePath = path.join(dataDir, filename);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    console.log(`✓ ${description} → ${filename}`);
  }

  // Write individual JSON files
  if (variables.TEAM_COLORS) {
    const teamsArray = Object.entries(variables.TEAM_COLORS).map(([name, color]) => ({ name, color }));
    writeJsonFile('teams.json', { teams: teamsArray }, 'Team Colors');
  }

  if (variables.SHORT_NAMES) {
    writeJsonFile('short-names.json', { shortNames: variables.SHORT_NAMES }, 'Short Names');
  }

  if (variables.THESPORTSDB_LOGOS) {
    writeJsonFile('logos.json', { logos: variables.THESPORTSDB_LOGOS }, 'Team Logos');
  }

  if (variables.SEASONS) {
    writeJsonFile('seasons.json', { seasons: variables.SEASONS }, 'Seasons');
  }

  // Merge matches from pre-2003 and post-2003
  if (variables.HISTORICAL_MATCHES_PRE2003 || variables.HISTORICAL_MATCHES) {
    const mergedMatches = {
      ...(variables.HISTORICAL_MATCHES_PRE2003 || {}),
      ...(variables.HISTORICAL_MATCHES || {})
    };
    writeJsonFile('matches.json', mergedMatches, 'Match Results');
  }

  if (variables.RAW) {
    writeJsonFile('standings.json', variables.RAW, 'Standings');
  }

  if (variables.FIXTURES_2025_26) {
    writeJsonFile('fixtures.json', { '2025-26': variables.FIXTURES_2025_26 }, 'Fixtures');
  }

  if (variables.NOTES) {
    writeJsonFile('notes.json', variables.NOTES, 'Notes/Achievements');
  }

  console.log('\n✅ Data extraction complete!\n');
  console.log('📂 Files created in ./data/\n');

} catch (error) {
  console.error('❌ Error executing script:', error.message);
  process.exit(1);
}
