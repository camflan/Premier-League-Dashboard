#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import espnApi from '../utils/espn-api.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..', '..');
const dataDir = path.join(rootDir, 'data');
const standingsPath = path.join(dataDir, 'standings.json');

export async function fetchLiveStandings() {
  try {
    console.log('  🔄 Fetching live Premier League standings...');

    // Fetch standings from ESPN API
    const standings = await espnApi.getLeagueStandings('2025-26');

    if (!standings || standings.length === 0) {
      console.log('     ⚠️  No standings data retrieved from ESPN');
      return false;
    }

    // Read existing standings file
    let existingData = {};
    if (fs.existsSync(standingsPath)) {
      const content = fs.readFileSync(standingsPath, 'utf-8');
      existingData = JSON.parse(content);
    }

    // Update 2025-26 standings with new data
    existingData['2025-26'] = standings;

    // Write updated standings back to file
    fs.writeFileSync(standingsPath, JSON.stringify(existingData, null, 2), 'utf-8');

    console.log(`     ✓ Updated 2025-26 standings (${standings.length} teams)`);
    return true;

  } catch (error) {
    console.error('     ❌ Error fetching live standings:', error.message);
    return false;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const success = await fetchLiveStandings();
  process.exit(success ? 0 : 1);
}

export default { fetchLiveStandings };
