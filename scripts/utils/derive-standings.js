// Given an array of played matches (each: { h, a, hg, ag }), return a
// standings array in the canonical shape: [pos, team, p, w, d, l, gf, ga, pts].
//
// Match-derived standings are the source of truth for the active season.
// Live-fetched ESPN standings used to be overwritten by an identical
// computation at page-load — that derivation has moved here.

export function deriveStandings(matches) {
  const rows = {};
  const teams = new Set();

  for (const m of matches) {
    teams.add(m.h);
    teams.add(m.a);
    if (!rows[m.h]) rows[m.h] = { d: 0, ga: 0, gf: 0, l: 0, p: 0, pts: 0, w: 0 };
    if (!rows[m.a]) rows[m.a] = { d: 0, ga: 0, gf: 0, l: 0, p: 0, pts: 0, w: 0 };

    const h = rows[m.h];
    const a = rows[m.a];
    h.p++;
    a.p++;
    h.gf += m.hg;
    h.ga += m.ag;
    a.gf += m.ag;
    a.ga += m.hg;

    if (m.hg > m.ag) {
      h.w++;
      a.l++;
      h.pts += 3;
    } else if (m.hg < m.ag) {
      h.l++;
      a.w++;
      a.pts += 3;
    } else {
      h.d++;
      a.d++;
      h.pts += 1;
      a.pts += 1;
    }
  }

  return [...teams]
    .map((team) => {
      const s = rows[team];
      return [team, s.p, s.w, s.d, s.l, s.gf, s.ga, s.pts];
    })
    .sort((a, b) => {
      const gdA = a[5] - a[6];
      const gdB = b[5] - b[6];
      if (b[7] !== a[7]) return b[7] - a[7]; // points desc
      if (gdB !== gdA) return gdB - gdA; // goal diff desc
      return b[5] - a[5]; // goals for desc
    })
    .map((row, i) => [i + 1, ...row]);
}
