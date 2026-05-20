# Quick Reference Card

Keep this handy for common tasks.

---

## Essential Commands

```bash
# Setup (first time)
npm install

# Build HTML from template + data
npm run build

# Start local dev server
npm run dev

# Fetch data from APIs
npm run fetch-data

# Extract data from HTML (one-time)
npm run extract
```

---

## File Locations

| What | Where | Edit? |
|------|-------|-------|
| HTML | `index.html` | ❌ Auto-generated |
| HTML template | `template/index.html.template` | ✅ Yes |
| League standings | `data/standings.json` | ✅ Yes |
| Match results | `data/matches.json` | ✅ Yes |
| Upcoming fixtures | `data/fixtures.json` | ✅ Yes |
| Season notes | `data/notes.json` | ✅ Yes |
| Team data | `data/teams.json` | ✅ Yes |
| API client | `scripts/utils/espn-api.js` | ⚠️ Advanced |
| Data fetchers | `scripts/fetchers/` | ⚠️ Advanced |
| Automation | `.github/workflows/nightly-update.yml` | ⚠️ Advanced |

---

## Common Tasks

### Update Standings Now
```bash
# 1. Edit data/standings.json
# 2. Run:
npm run build

# 3. Test:
npm run dev

# 4. If good, commit:
git add data/standings.json index.html
git commit -m "chore: update standings"
git push
```

### Update Matches Now
```bash
# 1. Edit data/matches.json
# 2. Run:
npm run build
npm run dev

# 3. Commit if good
git add data/matches.json index.html
git commit -m "chore: update match results"
git push
```

### Update Fixtures Now
```bash
# 1. Edit data/fixtures.json
# 2. Run:
npm run build
npm run dev

# 3. Commit if good
git add data/fixtures.json index.html
git commit -m "chore: update fixtures"
git push
```

### Modify HTML/CSS/JavaScript
```bash
# ⚠️ IMPORTANT: DO NOT edit index.html
# Instead, edit template/index.html.template

# 1. Edit template/index.html.template
# 2. Run:
npm run build

# 3. Test:
npm run dev

# 4. Commit if good
git add template/index.html.template index.html
git commit -m "feat: [describe your change]"
git push
```

### Fetch Data Manually
```bash
npm run fetch-data
npm run build
npm run dev
```

---

## Data Format Reference

### Standings Format
```json
{
  "2025-26": [
    [Position, "Team Name", Games, Wins, Draws, Losses, GoalsFor, GoalsAgainst, Points],
    [1, "Manchester City", 20, 14, 4, 2, 45, 18, 46]
  ]
}
```

### Matches Format
```json
{
  "2025-26": [
    {"d": "DD/MM/YYYY", "h": "Home Team", "a": "Away Team", "hg": 1, "ag": 0}
  ]
}
```

### Fixtures Format
```json
{
  "2025-26": [
    {"d": "DD/MM/YYYY", "h": "Home Team", "a": "Away Team", "time": "HH:MM"}
  ]
}
```

### Notes Format
```json
{
  "2025-26": {
    "champion": "Team Name",
    "topScorer": {"name": "Player Name", "team": "Team Name", "goals": 35}
  }
}
```

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Dashboard doesn't update | Run `npm run build` |
| Build fails | Check `template/index.html.template` exists |
| Dev server won't start | Kill existing process: `lsof -ti:8000 \| xargs kill -9` |
| Data formatting wrong | Check JSON syntax with `cat file.json \| python3 -m json.tool` |
| GitHub Actions fails | Check workflow logs in Actions tab |
| API errors | May be temporary - nightly run will retry |

---

## Git Workflow

```bash
# Check status
git status

# See what changed
git diff

# Stage files
git add data/standings.json

# Commit
git commit -m "chore: update standings"

# Push
git push

# View history
git log --oneline
```

---

## Automation

| What | When | Where |
|-----|------|-------|
| Fetch data | Daily at 2 AM UTC | GitHub Actions |
| Build HTML | After fetch | GitHub Actions |
| Commit changes | Only if data changed | GitHub Actions |
| Manual trigger | Anytime | Actions tab |

**Manual trigger:**
- Actions → Nightly Data Update → Run workflow → main → Run workflow

---

## Documentation Guide

| Doc | Purpose | Read When |
|-----|---------|-----------|
| ARCHITECTURE.md | Technical design | Need to understand architecture |
| README.md | Overview & quick start | First time setup |
| MAINTENANCE.md | How-to guides | Need to do a specific task |
| VERIFICATION_CHECKLIST.md | Testing & deployment | Before going live |
| COMPLETION_SUMMARY.md | What was delivered | Project overview |
| QUICK_REFERENCE.md | Common tasks | Quick lookup (this file) |

---

## Key Dates & Times

- **Nightly update**: 2 AM UTC (configurable in `.github/workflows/nightly-update.yml`)
- **Check logs**: GitHub Actions tab, after 2 AM UTC
- **Watch commits**: Main branch, look for "nightly data update" commits
- **Monitor data**: Next day, check if dashboard shows fresh data

---

## File Size Reference

| File | Size | Type |
|------|------|------|
| template/index.html.template | ~330 KB | HTML template |
| index.html (generated) | ~160 KB | Generated HTML |
| data/standings.json | ~74 KB | League tables |
| data/matches.json | ~355 KB | Match results |
| data/teams.json | ~3.4 KB | Team metadata |
| data/fixtures.json | ~1 KB | Upcoming matches |
| data/notes.json | ~6 KB | Season notes |

**Total**: ~529 KB (vs 332 KB original monolith)

---

## Environment Variables (if needed)

Currently, no environment variables needed.

To add API keys in future:
```bash
# .env file (create if needed)
ESPN_API_KEY=your_key
PL_API_KEY=your_key

# Reference in scripts
import dotenv from 'dotenv';
dotenv.config();
const apiKey = process.env.ESPN_API_KEY;
```

---

## Useful Links

- **GitHub Actions docs**: https://docs.github.com/en/actions
- **ESPN API**: https://site.api.espn.com/
- **Node.js docs**: https://nodejs.org/docs/

---

## Emergency Commands

```bash
# Revert last commit (keeps file changes)
git revert HEAD

# Discard all local changes
git checkout -- .

# Restore a deleted file
git checkout HEAD -- data/standings.json

# View file history
git log -- data/standings.json

# See all branches
git branch -a

# Force push (use with caution)
git push --force-with-lease
```

---

## Daily Checklist (Optional)

```bash
# Morning routine (check if nightly update happened)
git log --oneline -5                # See recent commits
npm run dev                          # Start server
# Visit dashboard
# Check: Does data look current?
# Check: Any errors in console?

# If issues:
npm run fetch-data                  # Manual fetch
npm run build                        # Rebuild
git add data/ index.html            # Stage changes
git commit -m "chore: manual update" # Commit
git push                             # Push
```

---

## Performance Tips

```bash
# Check generated HTML size
ls -lh index.html

# Monitor GitHub Actions runtime
# Actions → Nightly Data Update → Select run → View logs

# Track data changes over time
git log --stat -- data/

# Compare builds
git diff index.html  # See what changed
```

---

**Keep this card handy!**

Last Updated: May 20, 2026
