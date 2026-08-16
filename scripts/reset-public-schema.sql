-- DANGER: wipes everything in the `public` schema (tables, types, functions).
-- Used by `npm run db:reset` to clear out any previous setup (e.g. the old
-- Replit-era tables) before applying Zuby's migrations from scratch.
-- Auth users, storage buckets, and the extensions schema are NOT touched.

drop schema if exists public cascade;
-- Drizzle ORM (used by the old Replit setup) keeps its journal in its own schema.
drop schema if exists drizzle cascade;

create schema public;
comment on schema public is 'standard public schema';

-- Restore the grants Supabase expects on public (dropping the schema drops them).
grant usage on schema public to postgres, anon, authenticated, service_role;
grant create on schema public to postgres, service_role;

-- Objects created by the migration runner (postgres) stay visible to the API
-- roles; RLS — not grants — is what gates row access.
alter default privileges in schema public
  grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public
  grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public
  grant execute on functions to anon, authenticated, service_role;
