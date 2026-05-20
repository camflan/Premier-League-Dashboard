#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import espnApi from '../utils/espn-api.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..', '..');
const dataDir = path.join(rootDir, 'data');
const fixturesPath = path.join(dataDir, 'fixtures.json');

export async function fetchFixtures() {
  try {
    console.log('  🔄 Fetching upcoming fixtures for next 30 days...');

    // Fetch fixtures from ESPN API (30 days ahead)
    const fixtures = await espnApi.getFixtures(30);

    if (!fixtures || fixtures.length === 0) {
      console.log('     ⚠️  No fixture data retrieved from ESPN');
      return false;
    }

    // Read existing fixtures file
    let existingData = {};
    if (fs.existsSync(fixturesPath)) {
      const content = fs.readFileSync(fixturesPath, 'utf-8');
      existingData = JSON.parse(content);
    }

    // Replace 2025-26 fixtures with newly fetched ones
    // (This overwrites rather than merges, as fixtures should be the authoritative list)
    existingData['2025-26'] = fixtures;

    // Sort fixtures by date (ascending - earliest first)
    existingData['2025-26'].sort((a, b) => {
      const dateA = new Date(a.d.split('/').reverse().join('-'));
      const dateB = new Date(b.d.split('/').reverse().join('-'));
      return dateA - dateB;
    });

    // Write updated fixtures back to file
    fs.writeFileSync(fixturesPath, JSON.stringify(existingData, null, 2), 'utf-8');

    console.log(`     ✓ Updated 2025-26 fixtures (${existingData['2025-26'].length} upcoming matches)`);
    return true;

  } catch (error) {
    console.error('     ❌ Error fetching fixtures:', error.message);
    return false;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const success = await fetchFixtures();
  process.exit(success ? 0 : 1);
}

export default { fetchFixtures };
