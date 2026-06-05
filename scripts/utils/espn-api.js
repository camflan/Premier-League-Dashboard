// ESPN API URLs for football/soccer
const _ESPN_BASE = 'https://site.api.espn.com/apis/site/v2';
const _FOOTBALL_BASE = 'https://www.espn.com/soccer/json';

// Utility to add delay between API calls (rate limiting)
async function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Get league standings for current season
export async function getLeagueStandings(season = '2025-26', leagueEspnId = 'eng.1') {
  try {
    const leagueName = leagueEspnId === 'eng.1' ? 'Premier League' : leagueEspnId === 'eng.2' ? 'Championship' : 'EFL League One';
    console.log(`  🔄 Fetching ${leagueName} standings for ${season}...`);

    // Try multiple endpoints
    const endpoints = [
      `https://site.api.espn.com/apis/site/v2/sports/soccer/${leagueEspnId}/standings`,
      `https://www.espn.com/soccer/api/site/v2/competitions/${leagueEspnId.split('.')[0]}/seasons/2025/standings`,
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
                idx + 1, // Position
                entry.team.name, // Team name
                entry.stats.find((s) => s.name === 'gamesPlayed')?.value || 0, // P
                entry.stats.find((s) => s.name === 'wins')?.value || 0, // W
                entry.stats.find((s) => s.name === 'draws')?.value || 0, // D
                entry.stats.find((s) => s.name === 'losses')?.value || 0, // L
                entry.stats.find((s) => s.name === 'goalsFor')?.value || 0, // GF
                entry.stats.find((s) => s.name === 'goalsAgainst')?.value || 0, // GA
                entry.points, // Pts
              ]);
            });

            console.log(`     ✓ Got standings for ${standings.length} teams`);
            return standings;
          }
        }
      } catch (_e) {}
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
  const home = c.find((x) => x.homeAway === 'home');
  const away = c.find((x) => x.homeAway === 'away');
  if (!home || !away) return null;
  return { away, home };
}

// Get recent match results (only events with a final/in-progress status).
export async function getMatchResults(team = null, limit = 100, leagueEspnId = 'eng.1') {
  try {
    const leagueName = leagueEspnId === 'eng.1' ? 'Premier League' : leagueEspnId === 'eng.2' ? 'Championship' : 'EFL League One';
    console.log(`  🔄 Fetching recent ${leagueName} match results${team ? ` for ${team}` : ''}...`);

    const endpoints = [
      `https://site.api.espn.com/apis/site/v2/sports/soccer/${leagueEspnId}/scoreboard`,
      `https://www.espn.com/soccer/api/site/v2/competitions/${leagueEspnId.split('.')[0]}/events`,
    ];

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint);
        if (!response.ok) {
          console.log(`     ℹ️  ${endpoint}: HTTP ${response.status}`);
          continue;
        }
        const data = await response.json();
        const events = data.events ?? [];
        console.log(`     ℹ️  Found ${events.length} events from ${endpoint}`);
        const matches = [];

        for (const event of events.slice(0, limit)) {
          const status = event.status?.type?.name; // e.g. STATUS_FINAL
          if (status === 'STATUS_SCHEDULED') continue; // belongs in fixtures, not matches
          const sides = parseEvent(event);
          if (!sides) continue;
          matches.push({
            a: sides.away.team?.displayName || sides.away.team?.name,
            ag: parseInt(sides.away.score, 10) || 0,
            d: new Date(event.date).toLocaleDateString('en-GB'), // DD/MM/YYYY
            h: sides.home.team?.displayName || sides.home.team?.name,
            hg: parseInt(sides.home.score, 10) || 0,
            status,
          });
        }

        if (matches.length > 0) {
          console.log(`     ✓ Got ${matches.length} recent matches`);
          return matches;
        }
        console.log(`     ℹ️  No valid matches found from ${endpoint}`);
      } catch (e) {
        console.log(`     ⚠️  Error from ${endpoint}: ${e.message}`);
      }
    }

    console.log('     ⚠️  Could not fetch match results');
    return null;
  } catch (error) {
    console.error('     ❌ Error fetching matches:', error.message);
    return null;
  }
}

// Fetch one date-range chunk (format: YYYY-MM-DD). The scoreboard endpoint
// silently caps responses (~100 events), so callers must keep chunks small.
async function fetchDateRangeChunk(startDate, endDate, leagueEspnId) {
  const dateRange = `${startDate.replace(/-/g, '')}-${endDate.replace(/-/g, '')}`;

  const endpoints = [
    `https://site.api.espn.com/apis/site/v2/sports/soccer/${leagueEspnId}/scoreboard?dates=${dateRange}`,
    `https://www.espn.com/soccer/api/site/v2/competitions/${leagueEspnId.split('.')[0]}/events?dates=${dateRange}`,
  ];

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint);
      if (!response.ok) {
        continue;
      }

      const data = await response.json();
      const events = data.events ?? [];

      if (events.length === 0) {
        continue;
      }

      const matches = [];
      const [startYear, startMonth, startDay] = startDate.split('-').map(Number);
      const [endYear, endMonth, endDay] = endDate.split('-').map(Number);
      const rangeStart = new Date(startYear, startMonth - 1, startDay);
      const rangeEnd = new Date(endYear, endMonth - 1, endDay);

      for (const event of events) {
        const status = event.status?.type?.name;
        // Include only finished matches (not scheduled)
        if (!status || status === 'STATUS_SCHEDULED') continue;

        const sides = parseEvent(event);
        if (!sides) continue;

        const eventDate = new Date(event.date);
        // Double-check date is in range
        if (eventDate < rangeStart || eventDate > rangeEnd) continue;

        matches.push({
          a: sides.away.team?.displayName || sides.away.team?.name,
          ag: parseInt(sides.away.score, 10) || 0,
          d: eventDate.toLocaleDateString('en-GB'), // DD/MM/YYYY
          h: sides.home.team?.displayName || sides.home.team?.name,
          hg: parseInt(sides.home.score, 10) || 0,
          status,
        });
      }

      if (matches.length > 0) return matches;
    } catch (_e) {
      // Try next endpoint
    }
  }

  return [];
}

// Split an ISO date range into calendar-month chunks (inclusive).
function monthChunks(startDate, endDate) {
  const chunks = [];
  const [sy, sm] = startDate.split('-').map(Number);
  const [ey, em] = endDate.split('-').map(Number);
  let y = sy;
  let m = sm;
  while (y < ey || (y === ey && m <= em)) {
    const first = `${y}-${String(m).padStart(2, '0')}-01`;
    const lastDay = new Date(y, m, 0).getDate(); // day 0 of next month
    const last = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    chunks.push([first < startDate ? startDate : first, last > endDate ? endDate : last]);
    m++;
    if (m > 12) {
      m = 1;
      y++;
    }
  }
  return chunks;
}

// Get historical match results for a specific date range.
// Fetches completed matches between startDate and endDate (ISO format: YYYY-MM-DD),
// month by month — a whole-season request gets silently truncated to ~100 events.
// Returns matches in canonical format or null/empty array on failure.
export async function getMatchResultsForDateRange(startDate, endDate, leagueEspnId = 'eng.1') {
  try {
    console.log(`     🔄 Fetching ${leagueEspnId} matches from ${startDate} to ${endDate}…`);

    const seen = new Map();
    for (const [from, to] of monthChunks(startDate, endDate)) {
      const chunk = await fetchDateRangeChunk(from, to, leagueEspnId);
      for (const match of chunk) {
        seen.set(`${match.d}|${match.h}|${match.a}`, match);
      }
      await delay(300); // rate-limit between month requests
    }

    const matches = [...seen.values()];
    if (matches.length === 0) {
      console.log(`       ℹ️  No matches found in date range`);
      return [];
    }

    // Sort by date descending (most recent first)
    matches.sort((a, b) => {
      const da = new Date(a.d.split('/').reverse().join('-'));
      const db = new Date(b.d.split('/').reverse().join('-'));
      return db - da;
    });
    console.log(`       ✓ Got ${matches.length} matches`);
    return matches;
  } catch (error) {
    console.error(`     ❌ Error fetching historical matches: ${error.message}`);
    return null;
  }
}

// Get upcoming fixtures
export async function getFixtures(daysAhead = 30, leagueEspnId = 'eng.1') {
  try {
    const leagueName = leagueEspnId === 'eng.1' ? 'Premier League' : leagueEspnId === 'eng.2' ? 'Championship' : 'EFL League One';
    console.log(`  🔄 Fetching upcoming ${leagueName} fixtures (next ${daysAhead} days)...`);

    const endpoints = [
      `https://site.api.espn.com/apis/site/v2/sports/soccer/${leagueEspnId}/scoreboard`,
      `https://www.espn.com/soccer/api/site/v2/competitions/${leagueEspnId.split('.')[0]}/events`,
    ];

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint);
        if (!response.ok) {
          console.log(`     ℹ️  ${endpoint}: HTTP ${response.status}`);
          continue;
        }

        const data = await response.json();
        const events = data.events ?? [];
        console.log(`     ℹ️  Found ${events.length} events from ${endpoint}`);

        if (events.length > 0) {
          const fixtures = [];
          const now = new Date();
          const future = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);

          for (const event of events) {
            const eventDate = new Date(event.date);
            const status = event.status?.type?.name;
            if (status !== 'STATUS_SCHEDULED') continue;
            if (eventDate < now || eventDate > future) continue;
            const sides = parseEvent(event);
            if (!sides) continue;
            const time = eventDate.toLocaleTimeString('en-GB', {
              hour: '2-digit',
              hour12: false,
              minute: '2-digit',
            });
            fixtures.push({
              a: sides.away.team?.displayName || sides.away.team?.name,
              d: eventDate.toLocaleDateString('en-GB'),
              h: sides.home.team?.displayName || sides.home.team?.name,
              time,
            });
          }

          if (fixtures.length > 0) {
            console.log(`     ✓ Got ${fixtures.length} upcoming fixtures`);
            return fixtures;
          }
          console.log(`     ℹ️  No valid fixtures found from ${endpoint}`);
        }
      } catch (e) {
        console.log(`     ⚠️  Error from ${endpoint}: ${e.message}`);
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
    const response = await fetch(
      'https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/standings',
    );
    return response.ok;
  } catch {
    return false;
  }
}

export default {
  delay,
  getFixtures,
  getLeagueStandings,
  getMatchResults,
  getMatchResultsForDateRange,
  healthCheck,
};
