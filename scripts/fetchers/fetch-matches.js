#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import espnApi from '../utils/espn-api.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..', '..');
const dataDir = path.join(rootDir, 'data');
const matchesPath = path.join(dataDir, 'matches.json');

export async function fetchMatches() {
  try {
    console.log('  🔄 Fetching recent match results for 2025-26...');

    // Fetch recent matches from ESPN API (default limit: 10, but get more)
    const matches = await espnApi.getMatchResults(null, 100);

    if (!matches || matches.length === 0) {
      console.log('     ⚠️  No match data retrieved from ESPN');
      return false;
    }

    // Read existing matches file
    let existingData = {};
    if (fs.existsSync(matchesPath)) {
      const content = fs.readFileSync(matchesPath, 'utf-8');
      existingData = JSON.parse(content);
    }

    // Ensure 2025-26 array exists
    if (!existingData['2025-26']) {
      existingData['2025-26'] = [];
    }

    // Merge new matches with existing ones
    // Create a Set of existing match IDs to avoid duplicates
    const existingMatchIds = new Set();
    existingData['2025-26'].forEach(match => {
      // Create a unique ID from date + teams
      const id = `${match.d}${match.h}${match.a}`;
      existingMatchIds.add(id);
    });

    // Add new matches that don't already exist
    let addedCount = 0;
    matches.forEach(match => {
      const id = `${match.d}${match.h}${match.a}`;
      if (!existingMatchIds.has(id)) {
        existingData['2025-26'].push(match);
        addedCount++;
      }
    });

    // Sort matches by date (descending - most recent first)
    existingData['2025-26'].sort((a, b) => {
      const dateA = new Date(a.d.split('/').reverse().join('-'));
      const dateB = new Date(b.d.split('/').reverse().join('-'));
      return dateB - dateA;
    });

    // Write updated matches back to file
    fs.writeFileSync(matchesPath, JSON.stringify(existingData, null, 2), 'utf-8');

    console.log(`     ✓ Updated 2025-26 match results (${existingData['2025-26'].length} total, ${addedCount} new)`);
    return true;

  } catch (error) {
    console.error('     ❌ Error fetching match results:', error.message);
    return false;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const success = await fetchMatches();
  process.exit(success ? 0 : 1);
}

export default { fetchMatches };
