-- Cache Bot — PostgreSQL schema
-- Safe to re-run: all statements use IF NOT EXISTS / ADD COLUMN IF NOT EXISTS.
--
-- Usage (Supabase): paste into the SQL Editor and run.
-- Default table names assume no CACHE_DB_TABLE_PREFIX / CACHE_DB_USE_ISOLATED_TABLES.
-- If using an isolated prefix, replace the bare table names below with e.g. cache_team13_members.

-- Members: one row per registered Discord user, linked to a GitHub username.
CREATE TABLE IF NOT EXISTS members (
    discord TEXT PRIMARY KEY NOT NULL,
    github  TEXT UNIQUE
);

-- Teams: one row per project team.
CREATE TABLE IF NOT EXISTS teams (
    slug        TEXT    PRIMARY KEY NOT NULL,
    role_id     TEXT,
    channel_id  TEXT,
    is_active   BOOLEAN NOT NULL DEFAULT FALSE,
    github_repo TEXT
);

-- TeamAssociations: many-to-many between members and teams, with a permission level.
--   perm_level: 0 = MEMBER, 1 = LEADER
CREATE TABLE IF NOT EXISTS teamassociations (
    id         SERIAL  PRIMARY KEY,
    user_id    TEXT    NOT NULL,
    team_slug  TEXT    NOT NULL,
    perm_level INTEGER NOT NULL
);

-- Projects: display name / metadata for a team's project.
CREATE TABLE IF NOT EXISTS projects (
    slug      TEXT    PRIMARY KEY NOT NULL,
    name      TEXT    NOT NULL,
    team_slug TEXT    NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

-- MessageHistory: per-team chat history used by the AI context layer.
CREATE TABLE IF NOT EXISTS messagehistory (
    id        SERIAL PRIMARY KEY,
    team_slug TEXT,
    user_id   TEXT,
    scope     TEXT,
    timestamp TEXT,
    content   TEXT
);

-- Backfill columns added after initial deploy (safe to run on existing DBs).
ALTER TABLE teams ADD COLUMN IF NOT EXISTS role_id     TEXT;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS channel_id  TEXT;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS github_repo TEXT;
