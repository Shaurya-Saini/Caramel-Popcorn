# Database migrations

Plain SQL migrations, applied manually via the **Supabase SQL editor** (the
backend has the API secret key but not the Postgres connection string).

## Apply a migration

1. Supabase dashboard → **SQL Editor** → **New query**
2. Paste the contents of the next un-applied file in `migrations/` (in order)
3. **Run**

Migrations are written to be idempotent (`create ... if not exists`) so re-running
is safe.

## Migrations

| File            | What it does |
|-----------------|--------------|
| `0001_init.sql` | Extensions (`pgcrypto`, `pg_trgm`), all v1 tables (`users`, `restaurants`, `reviews`, `favourite_items`, `reports`), indexes, `updated_at` trigger, and RLS enabled with **no policies** (locks tables to the backend's secret key). |

## Architecture note

All tables have Row Level Security **enabled with no policies**, so the
publishable/anon key can access nothing. The Express backend uses the
service_role/secret key (which bypasses RLS) and enforces the per-part
visibility flags (`is_public_generic`, `is_public_items`) in query code.
