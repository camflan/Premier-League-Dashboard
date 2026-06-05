// Compute the active Premier League season from the current date. No hardcoded
// season anywhere — when a new PL season starts in August, this rolls forward
// automatically.
//
// Premier League seasons run August → May. Format is "YYYY-YY" where YYYY is
// the starting calendar year (e.g. 2025-26 covers Aug 2025 → May 2026).

export function seasonFromDate(d = new Date()) {
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth() + 1; // 1..12
  const startYear = m >= 8 ? y : y - 1;
  const endYY = String((startYear + 1) % 100).padStart(2, '0');
  return `${startYear}-${endYY}`;
}

export function activeSeason() {
  return seasonFromDate(new Date());
}
