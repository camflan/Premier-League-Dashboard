#!/usr/bin/env node

// CI render entry point: compose data + template → _site/index.html.
// The repo root never receives an HTML file; _site/ is gitignored.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { composeData } from './lib/compose-data.js';
import { renderHTML } from './lib/render.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');
const templatePath = path.join(rootDir, 'template', 'index.html.template');
const outputPath = path.join(rootDir, '_site', 'index.html');

console.log('🔨 Rendering _site/index.html from template + data…\n');

const start = performance.now();
const data = composeData(rootDir);
const template = fs.readFileSync(templatePath, 'utf8');
const html = renderHTML(data, template);
const elapsed = Math.round(performance.now() - start);

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, html, 'utf8');

const sizeMB = (Buffer.byteLength(html) / 1024 / 1024).toFixed(2);
const totalStandingsSeasons = Object.values(data.standings).reduce(
  (sum, s) => sum + Object.keys(s).length,
  0,
);
console.log(
  `✅ Rendered _site/index.html (${sizeMB} MB, ${elapsed} ms) — ${data.leagues.length} leagues, ${totalStandingsSeasons} standings seasons`,
);
