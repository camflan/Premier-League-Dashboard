// `fetch` is a Node 18+ global, so no import needed.

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

// Pull (home, away) out of an ESPN event. The competitors live on
// event.competitions[0].competitors (not event.competitors); each entry
// has a .homeAway field to identify which side it is.
function parseEvent(event) {
  const c = event.competitions?.[0]?.competitors;
  if (!Array.isArray(c) || c.length < 2) return null;
  const home = c.find(x => x.homeAway === 'home');
  const away = c.find(x => x.homeAway === 'away');
  if (!home || !away) return null;
  return { home, away };
}

// Get recent match results (only events with a final/in-progress status).
export async function getMatchResults(team = null, limit = 100) {
  try {
    console.log(`  🔄 Fetching recent match results${team ? ` for ${team}` : ''}...`);

    const endpoints = [
      'https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/scoreboard',
      'https://www.espn.com/soccer/api/site/v2/competitions/eng/events',
    ];

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint);
        if (!response.ok) continue;
        const data = await response.json();
        const events = data.events ?? [];
        const matches = [];

        for (const event of events.slice(0, limit)) {
          const status = event.status?.type?.name; // e.g. STATUS_FINAL
          if (status === 'STATUS_SCHEDULED') continue; // belongs in fixtures, not matches
          const sides = parseEvent(event);
          if (!sides) continue;
          matches.push({
            d: new Date(event.date).toLocaleDateString('en-GB'), // DD/MM/YYYY
            h: sides.home.team?.displayName || sides.home.team?.name,
            a: sides.away.team?.displayName || sides.away.team?.name,
            hg: parseInt(sides.home.score) || 0,
            ag: parseInt(sides.away.score) || 0,
            status,
          });
        }

        if (matches.length > 0) {
          console.log(`     ✓ Got ${matches.length} recent matches`);
          return matches;
        }
      } catch {
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

          for (const event of data.events) {
            const eventDate = new Date(event.date);
            const status = event.status?.type?.name;
            if (status !== 'STATUS_SCHEDULED') continue;
            if (eventDate < now || eventDate > future) continue;
            const sides = parseEvent(event);
            if (!sides) continue;
            const time = eventDate.toLocaleTimeString('en-GB', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: false,
            });
            fixtures.push({
              d: eventDate.toLocaleDateString('en-GB'),
              h: sides.home.team?.displayName || sides.home.team?.name,
              a: sides.away.team?.displayName || sides.away.team?.name,
              time,
            });
          }

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
