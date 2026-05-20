#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');
const dataDir = path.join(rootDir, 'data');
const templatePath = path.join(rootDir, 'template', 'index.html.template');
const outputPath = path.join(rootDir, 'index.html');

console.log('🔨 Building index.html from template + data...\n');

if (!fs.existsSync(templatePath)) {
  console.error('❌ Template file not found:', templatePath);
  process.exit(1);
}

// Read template
let html = fs.readFileSync(templatePath, 'utf-8');

console.log('📦 Loading data files...\n');

// Helper to load and format JSON data as JavaScript
function loadJsonAsJs(filename) {
  const filePath = path.join(dataDir, filename);
  if (!fs.existsSync(filePath)) {
    console.log(`   ⚠️  ${filename} not found`);
    return null;
  }

  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    // Return as JavaScript object literal (not JSON.stringify since we want JS format)
    return JSON.stringify(data, null, 2);
  } catch (e) {
    console.error(`   ❌ Error loading ${filename}:`, e.message);
    return null;
  }
}

// Load all data files
const data = {};

// Load teams
console.log('📥 teams.json');
let teamsData = loadJsonAsJs('teams.json');
if (teamsData) {
  const parsed = JSON.parse(teamsData);
  data.TEAM_COLORS = {};
  parsed.teams.forEach(team => {
    data.TEAM_COLORS[team.name] = team.color;
  });
}

// Load short names
console.log('📥 short-names.json');
let shortNamesData = loadJsonAsJs('short-names.json');
if (shortNamesData) {
  const parsed = JSON.parse(shortNamesData);
  data.SHORT_NAMES = parsed.shortNames || {};
}

// Load logos
console.log('📥 logos.json');
let logosData = loadJsonAsJs('logos.json');
if (logosData) {
  const parsed = JSON.parse(logosData);
  data.THESPORTSDB_LOGOS = parsed.logos || {};
}

// Load standings
console.log('📥 standings.json');
let standingsData = loadJsonAsJs('standings.json');
if (standingsData) {
  data.RAW = JSON.parse(standingsData);
}

// Load matches
console.log('📥 matches.json');
let matchesData = loadJsonAsJs('matches.json');
if (matchesData) {
  data.HISTORICAL_MATCHES = JSON.parse(matchesData);
  // Separate pre-2003 if exists
  if (data.HISTORICAL_MATCHES['2002-03'] && !data.HISTORICAL_MATCHES['2001-02']) {
    data.HISTORICAL_MATCHES_PRE2003 = { '2002-03': data.HISTORICAL_MATCHES['2002-03'] };
  }
}

// Load fixtures
console.log('📥 fixtures.json');
let fixturesData = loadJsonAsJs('fixtures.json');
if (fixturesData) {
  const parsed = JSON.parse(fixturesData);
  data.FIXTURES_2025_26 = parsed['2025-26'] || [];
}

// Load notes
console.log('📥 notes.json');
let notesData = loadJsonAsJs('notes.json');
if (notesData) {
  data.NOTES = JSON.parse(notesData);
}

// Now find and replace data constants in the template
console.log('\n🔄 Replacing data constants in template...\n');

let replaced = 0;

// Replace each constant
if (data.TEAM_COLORS) {
  const regex = /const\s+TEAM_COLORS\s*=\s*\{[^}]*(?:\{[^}]*\}[^}]*)*\};/s;
  const replacement = `const TEAM_COLORS = ${JSON.stringify(data.TEAM_COLORS, null, 2)};`;
  if (regex.test(html)) {
    html = html.replace(regex, replacement);
    console.log('✓ Replaced TEAM_COLORS');
    replaced++;
  }
}

if (data.SHORT_NAMES) {
  const regex = /const\s+SHORT_NAMES\s*=\s*\{[^}]*\};/s;
  const replacement = `const SHORT_NAMES = ${JSON.stringify(data.SHORT_NAMES, null, 2)};`;
  if (regex.test(html)) {
    html = html.replace(regex, replacement);
    console.log('✓ Replaced SHORT_NAMES');
    replaced++;
  }
}

if (data.THESPORTSDB_LOGOS) {
  const regex = /const\s+THESPORTSDB_LOGOS\s*=\s*\{[^}]*(?:\{[^}]*\}[^}]*)*\};/s;
  const replacement = `const THESPORTSDB_LOGOS = ${JSON.stringify(data.THESPORTSDB_LOGOS, null, 2)};`;
  if (regex.test(html)) {
    html = html.replace(regex, replacement);
    console.log('✓ Replaced THESPORTSDB_LOGOS');
    replaced++;
  }
}

if (data.RAW) {
  const regex = /const\s+RAW\s*=\s*\{[\s\S]*?\n  \};/;
  const replacement = `const RAW = ${JSON.stringify(data.RAW, null, 2)};`;
  if (regex.test(html)) {
    html = html.replace(regex, replacement);
    console.log('✓ Replaced RAW');
    replaced++;
  }
}

if (data.HISTORICAL_MATCHES) {
  const regex = /const\s+HISTORICAL_MATCHES\s*=\s*\{[\s\S]*?\n  \};/;
  const replacement = `const HISTORICAL_MATCHES = ${JSON.stringify(data.HISTORICAL_MATCHES, null, 2)};`;
  if (regex.test(html)) {
    html = html.replace(regex, replacement);
    console.log('✓ Replaced HISTORICAL_MATCHES');
    replaced++;
  }
}

if (data.FIXTURES_2025_26) {
  const regex = /const\s+FIXTURES_2025_26\s*=\s*\[[^\]]*\{[^}]*\}[^\]]*\];/s;
  const replacement = `const FIXTURES_2025_26 = ${JSON.stringify(data.FIXTURES_2025_26, null, 2)};`;
  if (regex.test(html)) {
    html = html.replace(regex, replacement);
    console.log('✓ Replaced FIXTURES_2025_26');
    replaced++;
  }
}

if (data.NOTES) {
  const regex = /const\s+NOTES\s*=\s*\{[\s\S]*?\n  \};/;
  const replacement = `const NOTES = ${JSON.stringify(data.NOTES, null, 2)};`;
  if (regex.test(html)) {
    html = html.replace(regex, replacement);
    console.log('✓ Replaced NOTES');
    replaced++;
  }
}

// Write output
console.log(`\n💾 Writing ${replaced} data constants to index.html...\n`);
fs.writeFileSync(outputPath, html, 'utf-8');

// Get file size
const stats = fs.statSync(outputPath);
const sizeMB = (stats.size / 1024 / 1024).toFixed(2);

console.log(`✅ Build complete!\n`);
console.log(`📊 Output: index.html (${sizeMB} MB)\n`);
console.log('✨ Next: Test the generated HTML in the browser\n');
