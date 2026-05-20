import fetch from 'node-fetch';

// ESPN API URLs for football/soccer
const ESPN_BASE = 'https://site.api.espn.com/apis/site/v2';
const FOOTBALL_BASE = 'https://www.espn.com/soccer/json';

// Utility to add delay between API calls (rate limiting)
async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Get Premier League standings for current season
export async function getLeagueStandings(season = '2025-26') {
  try {
    console.log(`  🔄 Fetching Premier League standings for ${season}...`);

    // Try multiple endpoints
    const endpoints = [
      'https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/standings',
      'https://www.espn.com/soccer/api/site/v2/competitions/eng/seasons/2025/standings',
    ];

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint);
        if (!response.ok) continue;

        const data = await response.json();

        if (data.standings && data.standings.length > 0) {
          // Convert ESPN standings to our format
          const standings = [];
          const table = data.standings[0];

          if (table.entries) {
            table.entries.forEach((entry, idx) => {
              standings.push([
                idx + 1,                    // Position
                entry.team.name,            // Team name
                entry.stats.find(s => s.name === 'gamesPlayed')?.value || 0,  // P
                entry.stats.find(s => s.name === 'wins')?.value || 0,         // W
                entry.stats.find(s => s.name === 'draws')?.value || 0,        // D
                entry.stats.find(s => s.name === 'losses')?.value || 0,       // L
                entry.stats.find(s => s.name === 'goalsFor')?.value || 0,     // GF
                entry.stats.find(s => s.name === 'goalsAgainst')?.value || 0, // GA
                entry.points                // Pts
              ]);
            });

            console.log(`     ✓ Got standings for ${standings.length} teams`);
            return standings;
          }
        }
      } catch (e) {
        // Try next endpoint
        continue;
      }
    }

    console.log('     ⚠️  Could not fetch from ESPN endpoints');
    return null;

  } catch (error) {
    console.error('     ❌ Error fetching standings:', error.message);
    return null;
  }
}

// Get recent match results
export async function getMatchResults(team = null, limit = 10) {
  try {
    console.log(`  🔄 Fetching recent match results${team ? ` for ${team}` : ''}...`);

    const endpoints = [
      'https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/scoreboard',
      'https://www.espn.com/soccer/api/site/v2/competitions/eng/events'
    ];

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint);
        if (!response.ok) continue;

        const data = await response.json();

        if (data.events && data.events.length > 0) {
          const matches = [];

          data.events.slice(0, limit).forEach(event => {
            const competitors = event.competitors || [];
            const home = competitors[1];
            const away = competitors[0];

            if (home && away) {
              matches.push({
                d: new Date(event.date).toLocaleDateString('en-GB'), // DD/MM/YYYY
                h: home.name,
                a: away.name,
                hg: parseInt(home.score) || 0,
                ag: parseInt(away.score) || 0,
                status: event.status.type // 'STATUS_SCHEDULED', 'STATUS_IN_PROGRESS', 'STATUS_FINAL'
              });
            }
          });

          if (matches.length > 0) {
            console.log(`     ✓ Got ${matches.length} recent matches`);
            return matches;
          }
        }
      } catch (e) {
        continue;
      }
    }

    console.log('     ⚠️  Could not fetch match results');
    return null;

  } catch (error) {
    console.error('     ❌ Error fetching matches:', error.message);
    return null;
  }
}

// Get upcoming fixtures
export async function getFixtures(daysAhead = 30) {
  try {
    console.log(`  🔄 Fetching upcoming fixtures (next ${daysAhead} days)...`);

    const endpoints = [
      'https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/scoreboard',
      'https://www.espn.com/soccer/api/site/v2/competitions/eng/events'
    ];

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint);
        if (!response.ok) continue;

        const data = await response.json();

        if (data.events && data.events.length > 0) {
          const fixtures = [];
          const now = new Date();
          const future = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);

          data.events.forEach(event => {
            const eventDate = new Date(event.date);

            // Only include scheduled (future) matches
            if (event.status.type === 'STATUS_SCHEDULED' && eventDate >= now && eventDate <= future) {
              const competitors = event.competitors || [];
              const home = competitors[1];
              const away = competitors[0];

              if (home && away) {
                const time = new Date(event.date).toLocaleTimeString('en-GB', {
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: false
                });

                fixtures.push({
                  d: new Date(event.date).toLocaleDateString('en-GB'),
                  h: home.name,
                  a: away.name,
                  time: time
                });
              }
            }
          });

          if (fixtures.length > 0) {
            console.log(`     ✓ Got ${fixtures.length} upcoming fixtures`);
            return fixtures;
          }
        }
      } catch (e) {
        continue;
      }
    }

    console.log('     ⚠️  Could not fetch fixtures');
    return null;

  } catch (error) {
    console.error('     ❌ Error fetching fixtures:', error.message);
    return null;
  }
}

// Health check - test API connectivity
export async function healthCheck() {
  try {
    const response = await fetch('https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/standings');
    return response.ok;
  } catch {
    return false;
  }
}

export default {
  getLeagueStandings,
  getMatchResults,
  getFixtures,
  healthCheck,
  delay
};
