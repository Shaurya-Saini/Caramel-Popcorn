import { requireSupabase } from '../config/supabase.js';

const TABLE = 'restaurants';

function toRestaurant(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    address: row.address,
    lat: row.lat,
    lng: row.lng,
    cuisineTags: row.cuisine_tags ?? [],
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

/** Normalise free-form cuisine tags: trim, lowercase, dedupe, drop empties. */
function normaliseTags(tags) {
  if (!Array.isArray(tags)) return [];
  return [...new Set(tags.map((t) => String(t).trim().toLowerCase()).filter(Boolean))];
}

/**
 * Fuzzy-match candidates for a proposed restaurant (name + optional location).
 * Returns [{ id, name, address, distanceM, nameSimilarity, ... }] ordered by
 * name similarity. Empty array = no likely duplicates.
 */
export async function findMatches({ name, lat = null, lng = null, limit = 5 }) {
  const sb = requireSupabase();
  const { data, error } = await sb.rpc('find_restaurant_matches', {
    p_name: name,
    p_lat: lat,
    p_lng: lng,
    p_limit: limit,
  });
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    address: r.address,
    lat: r.lat,
    lng: r.lng,
    cuisineTags: r.cuisine_tags ?? [],
    nameSimilarity: r.name_similarity,
    distanceM: r.distance_m,
  }));
}

export async function createRestaurant({ name, address, lat, lng, cuisineTags, createdBy }) {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from(TABLE)
    .insert({
      name: name.trim(),
      address: address?.trim() || null,
      lat: lat ?? null,
      lng: lng ?? null,
      cuisine_tags: normaliseTags(cuisineTags),
      created_by: createdBy,
    })
    .select()
    .single();
  if (error) throw error;
  return toRestaurant(data);
}

export async function getRestaurantById(id) {
  const sb = requireSupabase();
  const { data, error } = await sb.from(TABLE).select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return toRestaurant(data);
}

/**
 * List restaurants. Filters: cuisine (single tag). Sort: 'recent' | 'name'.
 * (Rating/distance sort arrive with reviews (step 3) / geolocation (step 6).)
 */
export async function listRestaurants({ cuisine, sort = 'recent', limit = 50 } = {}) {
  const sb = requireSupabase();
  let query = sb.from(TABLE).select('*').limit(limit);

  if (cuisine) query = query.contains('cuisine_tags', [cuisine.trim().toLowerCase()]);

  if (sort === 'name') query = query.order('name', { ascending: true });
  else query = query.order('created_at', { ascending: false });

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map(toRestaurant);
}
