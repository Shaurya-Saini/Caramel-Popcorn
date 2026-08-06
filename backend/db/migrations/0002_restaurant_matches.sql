-- 🍿 Caramel Popcorn — restaurant fuzzy-dedup function (migration 0002)
-- Run in the Supabase SQL editor after 0001.
--
-- Powers "Did you mean [existing]?" when adding a restaurant (Content.md §2.2):
-- returns existing restaurants whose name is trigram-similar OR an exact
-- case-insensitive match, with the great-circle distance (metres) to the given
-- point when coordinates are available. Uses the restaurants_name_trgm_idx index.

create or replace function find_restaurant_matches(
  p_name  text,
  p_lat   double precision default null,
  p_lng   double precision default null,
  p_limit int default 5
)
returns table (
  id              uuid,
  name            text,
  address         text,
  lat             double precision,
  lng             double precision,
  cuisine_tags    text[],
  name_similarity real,
  distance_m      double precision
)
language sql
stable
as $$
  select
    r.id, r.name, r.address, r.lat, r.lng, r.cuisine_tags,
    similarity(r.name, p_name) as name_similarity,
    case
      when p_lat is null or p_lng is null or r.lat is null or r.lng is null then null
      else 6371000 * acos(least(1, greatest(-1,
        sin(radians(p_lat)) * sin(radians(r.lat)) +
        cos(radians(p_lat)) * cos(radians(r.lat)) * cos(radians(r.lng - p_lng))
      )))
    end as distance_m
  from restaurants r
  where similarity(r.name, p_name) > 0.3
     or lower(r.name) = lower(p_name)
  order by similarity(r.name, p_name) desc
  limit p_limit;
$$;
