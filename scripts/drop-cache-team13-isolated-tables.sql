-- One-time cleanup: remove duplicate tables created when CACHE_DB_USE_ISOLATED_TABLES=1
-- or CACHE_DB_TABLE_PREFIX was set (or older bot defaults).
--
-- Run in Supabase → SQL Editor only after you confirm the bot uses the plain tables:
--   teams, members, teamassociations, projects, messagehistory
--
-- In .env: do NOT set CACHE_DB_USE_ISOLATED_TABLES or CACHE_DB_TABLE_PREFIX for CacheBot.

DROP TABLE IF EXISTS public.cache_team13_messagehistory CASCADE;
DROP TABLE IF EXISTS public.cache_team13_teamassociations CASCADE;
DROP TABLE IF EXISTS public.cache_team13_projects CASCADE;
DROP TABLE IF EXISTS public.cache_team13_members CASCADE;
DROP TABLE IF EXISTS public.cache_team13_teams CASCADE;
