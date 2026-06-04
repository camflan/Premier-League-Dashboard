// Detect promotions and relegations by comparing consecutive season standings.
//
// Takes two years of standings and identifies which teams moved between leagues.
// Returns { promoted: [...], relegated: [...] }

export function detectPromotions(standingsThisYear, standingsNextYear, leagueId = 'premier-league') {
  if (!Array.isArray(standingsThisYear) || !Array.isArray(standingsNextYear)) {
    return { promoted: [], relegated: [], error: 'Invalid standings data' };
  }

  // Extract team names from standings (column 1 in our format: [pos, name, p, w, d, l, gf, ga, pts])
  const thisYearTeams = new Set(standingsThisYear.map((s) => s[1]));
  const nextYearTeams = new Set(standingsNextYear.map((s) => s[1]));

  // Teams in next year but not this year = promoted
  const promoted = [];
  for (const team of nextYearTeams) {
    if (!thisYearTeams.has(team)) {
      promoted.push(team);
    }
  }

  // Teams in this year but not next year = relegated
  const relegated = [];
  for (const team of thisYearTeams) {
    if (!nextYearTeams.has(team)) {
      relegated.push(team);
    }
  }

  return {
    promoted,
    relegated,
  };
}

// Verify promotion/relegation makes sense for the league
export function verifyPromotions(promotions, leagueId = 'premier-league') {
  const rules = {
    'premier-league': { promoted: 3, relegated: 3 },
    'championship': { promoted: 2, relegated: 2 }, // Plus playoff winner
    'efl-league-one': { promoted: 2, relegated: 2 }, // Plus playoff winner
  };

  const rule = rules[leagueId] || rules['championship'];
  const { promoted, relegated } = promotions;

  const errors = [];

  // Allow some flexibility due to playoffs and playoff winners
  const promotionTolerance = leagueId === 'premier-league' ? 3 : 3;
  const relegationTolerance = leagueId === 'premier-league' ? 3 : 3;

  if (promoted.length < rule.promoted && promoted.length < rule.promoted) {
    errors.push(`Expected at least ${rule.promoted} promoted teams, got ${promoted.length}`);
  }

  if (relegated.length < rule.relegated) {
    errors.push(`Expected at least ${rule.relegated} relegated teams, got ${relegated.length}`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings: [],
  };
}

export default {
  detectPromotions,
  verifyPromotions,
};
