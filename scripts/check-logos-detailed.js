#!/usr/bin/env node

import fs from 'fs';

const teams = JSON.parse(fs.readFileSync('data/teams.json', 'utf-8')).teams;
const logos = JSON.parse(fs.readFileSync('data/logos.json', 'utf-8')).logos;

console.log('📋 Detailed Logo Status\n');

const missing = [];
const hasOldUrls = [];

teams.forEach(team => {
  const logo = logos[team.name];
  
  if (!logo) {
    missing.push(team.name);
    console.log(`❌ ${team.name}: MISSING`);
  } else if (logo.includes('www.thesportsdb.com')) {
    hasOldUrls.push(team.name);
    console.log(`⚠️  ${team.name}: OLD URL (www domain)`);
  } else {
    console.log(`✓ ${team.name}: OK (r2 domain)`);
  }
});

console.log(`\n📊 Summary:`);
console.log(`  Missing: ${missing.length}`);
console.log(`  Old URLs: ${hasOldUrls.length}`);

if (missing.length > 0) {
  console.log(`\nMissing teams:`);
  missing.forEach(t => console.log(`  - ${t}`));
}

if (hasOldUrls.length > 0) {
  console.log(`\nTeams with old URLs (www domain):`);
  hasOldUrls.forEach(t => console.log(`  - ${t}`));
}

