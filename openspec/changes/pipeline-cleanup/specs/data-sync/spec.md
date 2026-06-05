# data-sync

## ADDED Requirements

### Requirement: Single sync entry point
The system SHALL provide one CLI (`scripts/sync.js`, exposed as `npm run sync`) that fetches all remote data. No other script SHALL fetch remote data directly.

#### Scenario: Default run covers all leagues
- **WHEN** `npm run sync` is run with no flags
- **THEN** matches and fixtures are fetched for the active season for every league in `static/leagues.json`

#### Scenario: Scoped fetch
- **WHEN** `npm run sync -- --league=championship --season=2023-24 --type=matches` is run
- **THEN** only that league/season/type combination is fetched

#### Scenario: Historical backfill
- **WHEN** `npm run sync -- --from=2003-04` is run
- **THEN** every season from 2003-04 through the active season is fetched, respecting per-league data availability in `static/seasons-config.json`

### Requirement: Cache-gated by default with force override
Sync SHALL skip network calls when the TTL cache (`data/.cache/`, gitignored) is fresh, and SHALL bypass all cache gates when `--force` is passed.

#### Scenario: Fresh cache skips fetch
- **WHEN** sync runs and the cache entry for a (league, type, season) is within TTL
- **THEN** no network request is made for that target and the existing data file is untouched

#### Scenario: Force bypasses cache
- **WHEN** sync runs with `--force`
- **THEN** every selected target is fetched from the network regardless of cache freshness

### Requirement: Write safety
Sync MUST NOT delete or overwrite existing data with empty or null fetch results, and MUST NOT rewrite a data file whose content hash is unchanged.

#### Scenario: Empty fetch preserves existing data
- **WHEN** a fetcher returns null or an empty result for a season that has an existing data file
- **THEN** the existing file is preserved unchanged

#### Scenario: Unchanged content writes nothing
- **WHEN** fetched data hashes identically to the existing file
- **THEN** the file is not rewritten (cache timestamp only is refreshed) so commits stay quiet

### Requirement: No fabricated data
The repository SHALL NOT contain tooling that generates synthetic match results or standings. Derived standings (computed from real fetched matches) and structural season scaffolding (zeroed records at season rollover) are permitted.

#### Scenario: Fake-data generator removed
- **WHEN** the scripts directory is inspected
- **THEN** `generate-matches.js` does not exist and no script fabricates match results
