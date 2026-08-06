-- 🍿 Caramel Popcorn — initial schema (migration 0001)
-- Run this in the Supabase SQL editor (Dashboard → SQL Editor → New query → paste → Run).
--
-- Architecture note: the Express backend accesses these tables with the SECRET
-- (service_role) key, which BYPASSES Row Level Security. We therefore enable RLS
-- with NO policies on every table, so the browser-safe publishable/anon key can
-- touch nothing. All privacy filtering (is_public_generic / is_public_items) is
-- enforced in backend query code — never trusted to the client.

-- Extensions -----------------------------------------------------------------
create extension if not exists "pgcrypto";   -- gen_random_uuid()
create extension if not exists "pg_trgm";     -- fuzzy restaurant dedup (step 2)

-- updated_at helper ----------------------------------------------------------
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Users ----------------------------------------------------------------------
create table if not exists users (
  id              uuid primary key default gen_random_uuid(),
  google_id       text unique not null,
  email           text unique,
  name            text,
  avatar_url      text,
  taste_tags      text[] not null default '{}',
  manual_location text,
  lat             double precision,
  lng             double precision,
  created_at      timestamptz not null default now()
);

-- Restaurants (shared, public, deduped) --------------------------------------
create table if not exists restaurants (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  address      text,
  lat          double precision,
  lng          double precision,
  cuisine_tags text[] not null default '{}',
  created_by   uuid references users(id) on delete set null,
  created_at   timestamptz not null default now()
);
-- Trigram index powers the fuzzy "Did you mean …?" dedup lookup (step 2).
create index if not exists restaurants_name_trgm_idx on restaurants using gin (name gin_trgm_ops);

-- Reviews (Generic Review part) ----------------------------------------------
-- Both visibility toggles live here: the generic review and the favourite-items
-- list are the two independent parts, each with its own public/private flag.
create table if not exists reviews (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references users(id) on delete cascade,
  restaurant_id     uuid not null references restaurants(id) on delete cascade,
  rating_food       smallint check (rating_food between 0 and 5),
  rating_service    smallint check (rating_service between 0 and 5),
  rating_price      smallint check (rating_price between 0 and 5),
  rating_ambiance   smallint check (rating_ambiance between 0 and 5),
  text_review       text,
  is_public_generic boolean not null default true,
  is_public_items   boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (user_id, restaurant_id)   -- one (editable) review per user per place
);
create index if not exists reviews_restaurant_idx on reviews (restaurant_id);
create index if not exists reviews_user_idx on reviews (user_id);
create trigger reviews_set_updated_at before update on reviews
  for each row execute function set_updated_at();

-- Favourite Items (Favourite Items part) -------------------------------------
create table if not exists favourite_items (
  id         uuid primary key default gen_random_uuid(),
  review_id  uuid not null references reviews(id) on delete cascade,
  item_name  text not null,
  note       text,
  photo_url  text,
  created_at timestamptz not null default now()
);
create index if not exists favourite_items_review_idx on favourite_items (review_id);

-- Reports (moderation queue) -------------------------------------------------
create table if not exists reports (
  id          uuid primary key default gen_random_uuid(),
  target_type text not null check (target_type in ('review', 'restaurant')),
  target_id   uuid not null,
  reporter_id uuid references users(id) on delete set null,
  reason      text,
  status      text not null default 'open'
                check (status in ('open', 'reviewed', 'dismissed', 'actioned')),
  created_at  timestamptz not null default now()
);
create index if not exists reports_status_idx on reports (status);

-- Lock everything to the backend (secret key) --------------------------------
alter table users           enable row level security;
alter table restaurants     enable row level security;
alter table reviews         enable row level security;
alter table favourite_items enable row level security;
alter table reports         enable row level security;
-- Intentionally NO policies: only the service_role/secret key can read/write.
