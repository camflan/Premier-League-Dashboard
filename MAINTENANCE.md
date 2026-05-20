# Dashboard Maintenance Guide

Step-by-step instructions for common maintenance tasks.

---

## Quick Reference

| Task | Command | Frequency |
|------|---------|-----------|
| Update standings | Edit `data/standings.json`, run `npm run build` | Manual as needed |
| Update matches | Edit `data/matches.json`, run `npm run build` | Manual as needed |
| Update fixtures | Edit `data/fixtures.json`, run `npm run build` | Manual as needed |
| Fetch latest data | `npm run fetch-data` | Daily (automated) |
| Rebuild HTML | `npm run build` | After any data/template change |
| Test locally | `npm run dev` | Before committing changes |

---

## Task 1: Update Standings Immediately

**Use this when:** You want to update the league table right now (don't wait for nightly update)

### Steps

1. Open `data/standings.json` in your editor
2. Find the `"2025-26"` section
3. Update the array with current standings:
   ```json
   [Position, "Team Name", Games, Wins, Draws, Losses, GoalsFor, GoalsAgainst, Points]
   ```
4. Ensure all teams are in correct order by position
5. Save the file
6. Run: `npm run build`
7. Test locally: `npm run dev`
8. If looks good, commit:
   ```bash
   git add data/standings.json index.html
   git commit -m "chore: update league standings"
   git push
   ```

### Example

```json
{
  "2025-26": [
    [1, "Manchester City", 20, 14, 4, 2, 45, 18, 46],
    [2, "Arsenal", 20, 13, 4, 3, 42, 22, 43],
    [3, "Liverpool", 20, 12, 3, 5, 38, 21, 39],
    ...
  ]
}
```

---

## Task 2: Update Match Results

**Use this when:** Recent matches have been played and you want to add them immediately

### Steps

1. Open `data/matches.json` in your editor
2. Find the `"2025-26"` section (or create it if it doesn't exist)
3. Add new matches to the array:
   ```json
   {"d": "DD/MM/YYYY", "h": "Home Team", "a": "Away Team", "hg": 1, "ag": 0}
   ```
4. Keep dates in DD/MM/YYYY format
5. Use full team names (not abbreviations)
6. Save the file
7. Run: `npm run build`
8. Test: `npm run dev`
9. Verify the match appears in the dashboard
10. Commit:
    ```bash
    git add data/matches.json index.html
    git commit -m "chore: add recent match results"
    git push
    ```

### Example

```json
{
  "2025-26": [
    {"d": "20/05/2026", "h": "Brighton", "a": "Manchester United", "hg": 2, "ag": 1},
    {"d": "19/05/2026", "h": "Chelsea", "a": "Tottenham", "hg": 0, "ag": 0},
    {"d": "18/05/2026", "h": "Arsenal", "a": "Liverpool", "hg": 3, "ag": 2}
  ]
}
```

---

## Task 3: Update Upcoming Fixtures

**Use this when:** New fixtures have been announced or you want to add them immediately

### Steps

1. Open `data/fixtures.json` in your editor
2. Find or create the `"2025-26"` section
3. Add new fixtures:
   ```json
   {"d": "DD/MM/YYYY", "h": "Home Team", "a": "Away Team", "time": "HH:MM"}
   ```
4. Use 24-hour time format (e.g., "15:00", not "3:00 PM")
5. Sort by date (earliest first) for better UX
6. Save the file
7. Run: `npm run build`
8. Test: `npm run dev`
9. Verify fixtures appear in "Upcoming" section
10. Commit:
    ```bash
    git add data/fixtures.json index.html
    git commit -m "chore: update upcoming fixtures"
    git push
    ```

### Example

```json
{
  "2025-26": [
    {"d": "24/05/2026", "h": "Brighton", "a": "Manchester United", "time": "15:00"},
    {"d": "25/05/2026", "h": "Chelsea", "a": "Tottenham", "time": "16:00"},
    {"d": "26/05/2026", "h": "Arsenal", "a": "Liverpool", "time": "20:00"}
  ]
}
```

---

## Task 4: Update Season Notes (Champions, Top Scorers)

**Use this when:** Season ends or notable achievement occurs

### Steps

1. Open `data/notes.json` in your editor
2. Find the season (e.g., `"2025-26"`)
3. Update the champion and top scorer:
   ```json
   {
     "2025-26": {
       "champion": "Team Name",
       "topScorer": {"name": "Player Name", "team": "Team Name", "goals": 35}
     }
   }
   ```
4. Save the file
5. Run: `npm run build`
6. Test: `npm run dev` - check season notes appear correctly
7. Commit:
   ```bash
   git add data/notes.json index.html
   git commit -m "chore: update season notes"
   git push
   ```

### Example

```json
{
  "2025-26": {
    "champion": "Manchester City",
    "topScorer": {"name": "Erling Haaland", "team": "Manchester City", "goals": 36}
  },
  "2024-25": {
    "champion": "Liverpool",
    "topScorer": {"name": "Mohamed Salah", "team": "Liverpool", "goals": 20}
  }
}
```

---

## Task 5: Add a New Season

**Use this when:** New Premier League season begins

### Steps

1. Edit `data/seasons.json`:
   ```bash
   vim data/seasons.json
   ```

2. Add new season to array:
   ```json
   {
     "seasons": ["1992-93", ..., "2025-26", "2026-27"]
   }
   ```

3. Edit `data/standings.json`:
   ```bash
   vim data/standings.json
   ```

4. Add empty standings array for new season:
   ```json
   {
     "2026-27": [],
     "2025-26": [...]
   }
   ```

5. Edit `data/matches.json`:
   ```bash
   vim data/matches.json
   ```

6. Add empty matches array:
   ```json
   {
     "2026-27": [],
     "2025-26": [...]
   }
   ```

7. Edit `data/fixtures.json`:
   ```bash
   vim data/fixtures.json
   ```

8. Add season fixtures when available:
   ```json
   {
     "2026-27": [],
     "2025-26": [...]
   }
   ```

9. Edit `data/notes.json` (optional - can update at end of season):
   ```bash
   vim data/notes.json
   ```

10. Build and test:
    ```bash
    npm run build
    npm run dev
    ```

11. Commit:
    ```bash
    git add data/
    git commit -m "chore: add 2026-27 season"
    git push
    ```

---

## Task 6: Modify HTML/CSS/JavaScript

**Use this when:** You want to change how the dashboard looks or functions

### IMPORTANT: Edit the Template, NOT index.html

**❌ DO NOT edit `index.html` directly** - It's auto-generated and your changes will be overwritten.

**✅ DO edit `template/index.html.template`** - This is the source file.

### Steps

1. Open `template/index.html.template` in your editor
2. Make your HTML/CSS/JavaScript changes
3. Save the file
4. Rebuild HTML:
   ```bash
   npm run build
   ```
5. Test locally:
   ```bash
   npm run dev
   ```
6. Verify changes look correct and work properly
7. Commit:
   ```bash
   git add template/index.html.template index.html
   git commit -m "feat: [describe your change]"
   git push
   ```

### Example: Change Team Colors

In `template/index.html.template`, find the JavaScript section and modify styling.
Then rebuild:

```bash
npm run build
npm run dev
```

---

## Task 7: Fetch Data Manually (Test API Fetchers)

**Use this when:** You want to test if APIs are working or fetch latest data immediately

### Steps

1. Run fetch command:
   ```bash
   npm run fetch-data
   ```

2. Watch output for success/failure messages:
   ```
   📥 Fetching data from APIs...
   
   ✓ Updated 2025-26 standings (20 teams)
   ✓ Updated 2025-26 match results (20 total, 3 new)
   ✓ Updated 2025-26 fixtures (15 upcoming matches)
   
   ✅ All data sources fetched successfully
   ```

3. Rebuild with new data:
   ```bash
   npm run build
   ```

4. Test:
   ```bash
   npm run dev
   ```

5. If you see new data, commit:
   ```bash
   git add data/ index.html
   git commit -m "chore: fetch latest data"
   git push
   ```

---

## Task 8: Monitor Nightly Updates

**Use this when:** You want to check if automated updates are working

### Check GitHub Actions

1. Go to your repository on GitHub
2. Click **Actions** tab
3. Find **"Nightly Data Update"** workflow
4. View recent runs:
   - ✅ Green = Success
   - ❌ Red = Failed
   - Click to see logs

### Check Git History

1. Go to repository
2. Click **Commits** to see recent changes
3. Look for commits with message "chore: nightly data update"
4. Each commit shows when data was last updated

### Manual Trigger (if needed)

If you want to run update immediately:

1. Go to **Actions** tab
2. Select **Nightly Data Update**
3. Click **Run workflow** button
4. Choose **main** branch
5. Click **Run workflow**
6. Watch logs in real-time

---

## Task 9: Fix Issues If Nightly Update Fails

**Use this when:** GitHub Actions workflow failed or APIs are down

### Steps

1. **Check GitHub Actions logs:**
   - Go to Actions tab
   - Click failed workflow
   - Read error messages

2. **Common issues:**
   
   **Issue**: "API call failed"
   - **Cause**: ESPN API is temporarily down
   - **Action**: Run manual update tomorrow or manually fetch data
   - **Dashboard**: Still works with previous data
   
   **Issue**: "Git push failed"
   - **Cause**: Branch protection or permission issue
   - **Action**: Check repository settings
   - **Solution**: Manually push if needed
   
   **Issue**: "Template not found"
   - **Cause**: Template file was deleted or moved
   - **Action**: Restore from git history
   - **Recovery**: `git checkout HEAD~1 -- template/index.html.template`

3. **Manual recovery:**
   ```bash
   # Fetch data manually
   npm run fetch-data
   
   # Rebuild
   npm run build
   
   # Commit manually
   git add data/ index.html
   git commit -m "chore: manual data update"
   git push
   ```

---

## Task 10: Test Everything Before Deploying

**Use this when:** You've made changes and want to verify everything works

### Complete Test Checklist

```bash
# 1. Install dependencies
npm install

# 2. Rebuild HTML
npm run build
# Expected: Shows "✓ Replaced [X] data constants"

# 3. Start dev server
npm run dev
# Expected: Server starts at http://localhost:8000

# 4. Open in browser
# Test: http://localhost:8000

# 5. Check all views
# - Click "Historical" - see past seasons
# - Click "Live" - see current season
# - Click teams - see team details
# - Click matches - see match info

# 6. Verify data appears correctly
# - Standings table shows correct data
# - Match results show correct scores
# - Fixtures show correct times
# - Team colors are correct

# 7. Stop dev server (Ctrl+C)

# 8. Check git status
git status
# Should show modified files you changed

# 9. Commit changes
git add [your files]
git commit -m "chore: describe your changes"

# 10. Push to GitHub
git push
```

---

## Emergency Procedures

### Rollback to Previous Version

If something breaks after a commit:

```bash
# Revert last commit (keeps file content but reverses the change)
git revert HEAD

# Or: Reset to previous commit (more drastic)
git reset --hard HEAD~1
git push --force-with-lease
```

### Restore Deleted File

```bash
# If you deleted a file accidentally
git checkout HEAD -- data/standings.json

# Rebuild
npm run build
```

### Clear All Changes and Start Fresh

```bash
# Discard all local changes
git checkout -- .

# Remove untracked files
git clean -fd

# Rebuild
npm run build
```

---

## Common Git Commands

```bash
# Check what you've changed
git status

# See differences
git diff

# Stage files for commit
git add data/standings.json

# Stage all changes
git add .

# Create commit
git commit -m "chore: update standings"

# Push to GitHub
git push

# View commit history
git log --oneline

# View a specific file's history
git log -- data/standings.json
```

---

## Tips & Best Practices

✅ **Always test locally before pushing**
```bash
npm run dev
```

✅ **Always rebuild after editing JSON files**
```bash
npm run build
```

✅ **Commit frequently with clear messages**
```bash
git commit -m "chore: update league standings for week 15"
```

✅ **Review changes before committing**
```bash
git diff
```

✅ **Let nightly updates handle routine data**
- Don't manually update if APIs are working fine
- Let GitHub Actions keep data current

✅ **Only manually update for special cases**
- Fixing erroneous data
- Adding seasonal notes
- Testing fetchers

---

## Quick Troubleshooting

| Problem | Solution |
|---------|----------|
| `npm run build` fails | Check `template/` directory exists |
| Data not appearing | Did you run `npm run build`? |
| Old data still showing | Clear browser cache or try `npm run dev` |
| Git push fails | Check branch protection settings |
| API errors in logs | APIs may be down - data will update later |
| Template syntax error | Check for missing braces or quotes |
| Standings numbers wrong | Verify format: `[Pos, Team, P, W, D, L, GF, GA, Pts]` |

---

**Questions?** See `ARCHITECTURE.md` for technical details and `README.md` for overview.

**Last Updated**: May 20, 2026
