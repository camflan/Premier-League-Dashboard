#!/usr/bin/env node

import fetch from 'node-fetch';
import { JSDOM } from 'jsdom';

const teamsToFind = {
  'Birmingham City': 'https://www.thesportsdb.com/league/4329-english-league-championship',
  'Blackburn Rovers': 'https://www.thesportsdb.com/league/4329-english-league-championship',
  'Ipswich Town': 'https://www.thesportsdb.com/league/4329-english-league-championship',
  'Leicester City': 'https://www.thesportsdb.com/league/4329-english-league-championship',
  'Southampton': 'https://www.thesportsdb.com/league/4329-english-league-championship',
  'Reading': 'https://www.thesportsdb.com/league/4329-english-league-championship'
};

async function findLogoForTeam(teamName, pageUrl) {
  try {
    const response = await fetch(pageUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    const html = await response.text();
    const dom = new JSDOM(html);
    const doc = dom.window.document;
    
    // Find all img tags with badge
    const images = doc.querySelectorAll('img[src*="/team/badge/"]');
    
    for (const img of images) {
      const parent = img.closest('tr, td, div, li');
      if (parent && parent.textContent && parent.textContent.includes(teamName)) {
        let url = img.src;
        url = url.replace('/medium', '').replace('/tiny', '');
        if (url.includes('/team/badge/')) {
          return url;
        }
      }
    }
    
    return null;
  } catch (error) {
    console.error(`Error: ${error.message}`);
    return null;
  }
}

async function main() {
  console.log('🔍 Finding r2 URLs for teams with old URLs...\n');
  
  const results = {};
  
  for (const [team, url] of Object.entries(teamsToFind)) {
    console.log(`Searching for ${team}...`);
    const logoUrl = await findLogoForTeam(team, url);
    
    if (logoUrl) {
      results[team] = logoUrl;
      console.log(`  ✓ Found: ${logoUrl}\n`);
    } else {
      console.log(`  ✗ Not found\n`);
    }
    
    await new Promise(r => setTimeout(r, 300));
  }
  
  console.log('📝 Results:\n');
  Object.entries(results).forEach(([team, url]) => {
    console.log(`"${team}": "${url}",`);
  });
}

main().catch(console.error);

