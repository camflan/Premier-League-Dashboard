#!/usr/bin/env node

// Dev server: renders the dashboard in memory on every request — no index.html
// on disk, no watcher, no build step. Edit template/ or any JSON and refresh.
//
// Usage: node scripts/dev.js [--port=8000]

import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { composeData } from './lib/compose-data.js';
import { renderHTML } from './lib/render.js';
import { activeSeason } from './utils/active-season.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');
const staticDir = path.join(rootDir, 'static');
const templatePath = path.join(rootDir, 'template', 'index.html.template');

const PRIMARY_LEAGUE = 'premier-league';
const DEFAULT_PORT = 8000;

const portArg = process.argv.find((a) => a.startsWith('--port='));
const port = portArg ? parseInt(portArg.slice('--port='.length), 10) : DEFAULT_PORT;

const CONTENT_TYPES = {
  '.css': 'text/css',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
};

// Warn only when active-season data is missing/empty. Stale data is fine —
// dev must work offline; run `npm run sync` to refresh when you care.
function checkActiveSeasonData() {
  const p = path.join(rootDir, 'data', PRIMARY_LEAGUE, 'standings', `${activeSeason()}.json`);
  try {
    const rows = JSON.parse(fs.readFileSync(p, 'utf8'));
    if (Array.isArray(rows) && rows.length > 0) return;
  } catch {
    // missing or unparsable → warn below
  }
  console.warn(
    `⚠️  No ${activeSeason()} standings data for ${PRIMARY_LEAGUE} — run \`npm run sync\``,
  );
}

function serveStatic(res, urlPath) {
  // Resolve under static/ only; reject traversal out of it.
  const rel = urlPath.replace(/^\/static\//, '');
  const filePath = path.join(staticDir, rel);
  if (
    !filePath.startsWith(staticDir + path.sep) ||
    !fs.existsSync(filePath) ||
    !fs.statSync(filePath).isFile()
  ) {
    res.writeHead(404).end('Not found');
    return;
  }
  const type = CONTENT_TYPES[path.extname(filePath).toLowerCase()] ?? 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': type });
  fs.createReadStream(filePath).pipe(res);
}

const server = http.createServer((req, res) => {
  const urlPath = decodeURIComponent(new URL(req.url, `http://localhost:${port}`).pathname);

  if (urlPath === '/' || urlPath === '/index.html') {
    try {
      const start = performance.now();
      const html = renderHTML(composeData(rootDir), fs.readFileSync(templatePath, 'utf8'));
      const elapsed = Math.round(performance.now() - start);
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(html);
      console.log(`  ✓ rendered / in ${elapsed} ms`);
    } catch (e) {
      console.error(`  ❌ render failed: ${e.message}`);
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end(`Render error:\n\n${e.stack}`);
    }
    return;
  }

  if (urlPath.startsWith('/static/')) {
    serveStatic(res, urlPath);
    return;
  }

  res.writeHead(404).end('Not found');
});

checkActiveSeasonData();
server.listen(port, () => {
  console.log(`🌐 Dev server: http://localhost:${port} (renders in-memory per request)`);
});
