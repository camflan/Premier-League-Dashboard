#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');
const dataDir = path.join(rootDir, 'data');
const staticDir = path.join(rootDir, 'static');
const templatePath = path.join(rootDir, 'template', 'index.html.template');
const outputPath = path.join(rootDir, 'index.html');

const INJECTION_MARKER = '/* __DATA_INJECTION_POINT__ */';

function readJSON(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

console.log('🔨 Building index.html from template + data…\n');

// Curated data (hand-edited)
const teams      = readJSON(path.join(staticDir, 'teams.json')).teams;
const shortNames = readJSON(path.join(staticDir, 'short-names.json')).shortNames;
const logos      = readJSON(path.join(staticDir, 'logos.json')).logos;
const seasons    = readJSON(path.join(staticDir, 'seasons.json')).seasons;
const notes      = readJSON(path.join(staticDir, 'notes.json'));

// Fetched data (written by CI)
const standings  = readJSON(path.join(dataDir, 'standings.json'));
const matches    = readJSON(path.join(dataDir, 'matches.json'));
const fixtures   = readJSON(path.join(dataDir, 'fixtures.json'));

const data = { teams, shortNames, logos, seasons, notes, standings, matches, fixtures };

const template = fs.readFileSync(templatePath, 'utf8');

if (!template.includes(INJECTION_MARKER)) {
  console.error(`❌ Injection marker not found in template: ${INJECTION_MARKER}`);
  process.exit(1);
}

const injection = `window.__DATA = ${JSON.stringify(data, null, 2)};`;
const html = template.replace(INJECTION_MARKER, injection);

fs.writeFileSync(outputPath, html, 'utf8');

const sizeMB = (fs.statSync(outputPath).size / 1024 / 1024).toFixed(2);
console.log(`✅ Built index.html (${sizeMB} MB)`);
