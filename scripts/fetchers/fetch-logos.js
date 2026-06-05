// Download every logo URL in static/logos.json to static/logos/<slug>.png.
// Idempotent: skips files that already exist (force re-downloads).
// After downloading, rewrites static/logos.json to use the local relative path.

import fs from 'node:fs';
import path from 'node:path';

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/['’.]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function isLocalPath(s) {
  return !/^https?:\/\//i.test(s);
}

async function download(url, dest) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(dest, buf);
  return buf.length;
}

export async function syncLogos(rootDir, { force = false } = {}) {
  const staticDir = path.join(rootDir, 'static');
  const logosDir = path.join(staticDir, 'logos');
  const logosJsonPath = path.join(staticDir, 'logos.json');

  const logos = JSON.parse(fs.readFileSync(logosJsonPath, 'utf8')).logos;
  fs.mkdirSync(logosDir, { recursive: true });

  let downloaded = 0;
  let skipped = 0;
  let failed = 0;
  const rewritten = {};

  for (const [team, value] of Object.entries(logos)) {
    // Already a local path — keep as-is and verify file exists.
    if (isLocalPath(value)) {
      rewritten[team] = value;
      const absPath = path.join(staticDir, value);
      if (!fs.existsSync(absPath)) {
        console.warn(`  ⚠️  ${team}: local path ${value} does not exist on disk`);
      }
      skipped++;
      continue;
    }

    // Remote URL — download to static/logos/<slug>.<ext>.
    const url = value;
    const ext = path.extname(new URL(url).pathname) || '.png';
    const slug = slugify(team);
    const filename = `${slug}${ext}`;
    const localRel = path.posix.join('logos', filename);
    const localAbs = path.join(staticDir, localRel);

    if (!force && fs.existsSync(localAbs)) {
      rewritten[team] = localRel;
      skipped++;
      continue;
    }

    try {
      const size = await download(url, localAbs);
      console.log(`  ✓ ${team} → ${localRel} (${(size / 1024).toFixed(1)} KB)`);
      rewritten[team] = localRel;
      downloaded++;
    } catch (e) {
      console.error(`  ✗ ${team}: ${e.message}`);
      // Keep the remote URL in logos.json so the dashboard still works.
      rewritten[team] = url;
      failed++;
    }
  }

  // Rewrite logos.json to point at the local paths.
  fs.writeFileSync(logosJsonPath, `${JSON.stringify({ logos: rewritten }, null, 2)}\n`);

  console.log(`  logos: ${downloaded} downloaded, ${skipped} skipped, ${failed} failed`);
}
