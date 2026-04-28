-- Cache Bot — SQLite schema (local development)
-- Safe to re-run: all statements use IF NOT EXISTS.
--
-- The bot runs this automatically on startup via sqliteDriver.setup(),
-- so you only need this script if you want to inspect or pre-seed the schema manually.
-- Database file: test.sqlite (project root)

PRAGMA journal_mode = WAL;

CREATE TABLE IF NOT EXISTS "Members" (
    discord TEXT PRIMARY KEY NOT NULL,
    github  TEXT UNIQUE
);

CREATE TABLE IF NOT EXISTS "Teams" (
    slug        TEXT    PRIMARY KEY NOT NULL,
    role_id     TEXT,
    channel_id  TEXT,
    is_active   INTEGER NOT NULL DEFAULT 0,
    github_repo TEXT
);

-- perm_level: 0 = MEMBER, 1 = LEADER
CREATE TABLE IF NOT EXISTS "TeamAssociations" (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    TEXT    NOT NULL,
    team_slug  TEXT    NOT NULL,
    perm_level INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS "Projects" (
    slug      TEXT    PRIMARY KEY NOT NULL,
    name      TEXT    NOT NULL,
    team_slug TEXT    NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS "MessageHistory" (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    team_slug TEXT,
    user_id   TEXT,
    scope     TEXT,
    timestamp TEXT,
    content   TEXT
);
