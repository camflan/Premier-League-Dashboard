#!/usr/bin/env node

import { fetchLiveStandings } from './fetchers/fetch-live-standings.js';
import { fetchMatches } from './fetchers/fetch-matches.js';
import { fetchFixtures } from './fetchers/fetch-fixtures.js';

async function fetchAllData() {
  console.log('🔄 Premier League Dashboard - Fetching Latest Data\n');
  console.log('📅 ' + new Date().toLocaleString() + '\n');

  const results = {
    standings: false,
    matches: false,
    fixtures: false
  };

  try {
    // Fetch all data in sequence
    console.log('📥 Fetching data from APIs...\n');

    results.standings = await fetchLiveStandings();
    console.log('');

    results.matches = await fetchMatches();
    console.log('');

    results.fixtures = await fetchFixtures();
    console.log('');

    // Summary
    console.log('📊 Fetch Summary:\n');
    console.log(`  ${results.standings ? '✓' : '✗'} Standings: ${results.standings ? 'Updated' : 'Failed'}`);
    console.log(`  ${results.matches ? '✓' : '✗'} Matches: ${results.matches ? 'Updated' : 'Failed'}`);
    console.log(`  ${results.fixtures ? '✓' : '✗'} Fixtures: ${results.fixtures ? 'Updated' : 'Failed'}`);
    console.log('');

    // Exit status
    const anySuccess = Object.values(results).some(r => r);
    const allSuccess = Object.values(results).every(r => r);

    if (allSuccess) {
      console.log('✅ All data sources fetched successfully\n');
      process.exit(0);
    } else if (anySuccess) {
      console.log('⚠️  Partial success - some data sources failed, but continuing\n');
      process.exit(0);  // Don't fail - CI should continue to rebuild with what we have
    } else {
      console.log('❌ All data sources failed - keeping previous data\n');
      process.exit(0);  // Still exit 0 - let CI continue, the build will use old data
    }

  } catch (error) {
    console.error('❌ Unexpected error in fetch-all:', error.message);
    console.log('\n⚠️  Keeping previous data and continuing\n');
    process.exit(0);  // Graceful degradation - don't break CI
  }
}

// Run the fetch
fetchAllData();
