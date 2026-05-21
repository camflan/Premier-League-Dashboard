#!/usr/bin/env node

import fs from 'fs';

const logos = JSON.parse(fs.readFileSync('data/logos.json', 'utf-8')).logos;

const updates = {
  'Birmingham City': 'https://r2.thesportsdb.com/images/media/team/badge/wufs551672950865.png',
  'Blackburn Rovers': 'https://r2.thesportsdb.com/images/media/team/badge/rvryut1448810814.png',
  'Ipswich Town': 'https://r2.thesportsdb.com/images/media/team/badge/mdj1ey1634670785.png',
  'Leicester City': 'https://r2.thesportsdb.com/images/media/team/badge/xtxwtu1448813356.png',
  'Southampton': 'https://r2.thesportsdb.com/images/media/team/badge/ggqtd01621593274.png'
};

console.log('Updating old URLs to r2 domain:\n');

let updatedCount = 0;
for (const [team, newUrl] of Object.entries(updates)) {
  const oldUrl = logos[team];
  logos[team] = newUrl;
  console.log(`✓ ${team}`);
  console.log(`  Old: ${oldUrl}`);
  console.log(`  New: ${newUrl}\n`);
  updatedCount++;
}

fs.writeFileSync('data/logos.json', JSON.stringify({ logos }, null, 2));

console.log(`✅ Updated ${updatedCount} URLs`);
console.log(`\nNote: Reading still missing (not available on Championship page)`);

