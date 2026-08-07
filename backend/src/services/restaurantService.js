import { requireSupabase } from '../config/supabase.js';
import { getRatingSummaries } from './reviewService.js';

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

/**
 * Backfill a restaurant's location when it has none (older entries were added
 * without coordinates → no distance/thumbnail). Only fills a MISSING location;
 * moving an already-located place would need moderation, so we 409 instead.
 */
export async function setRestaurantLocation(id, { lat, lng, address }) {
  const sb = requireSupabase();
  const existing = await getRestaurantById(id);
  if (!existing) {
    const e = new Error('Restaurant not found');
    e.status = 404;
    throw e;
  }
  if (existing.lat != null && existing.lng != null) {
    const e = new Error('This place already has a location');
    e.status = 409;
    throw e;
  }
  const patch = { lat, lng };
  if (address !== undefined) patch.address = address?.trim() || null;

  const { data, error } = await sb.from(TABLE).update(patch).eq('id', id).select().single();
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
 * List restaurants, each enriched with { avgRating, reviewCount } over its
 * PUBLIC generic reviews. Filters: cuisine (single tag).
 * Sort: 'recent' | 'name' | 'rating' (rating desc, unrated last).
 * (Distance sort/filter is applied client-side — it needs the viewer's coords.)
 */
export async function listRestaurants({ cuisine, sort = 'recent', limit = 50 } = {}) {
  const sb = requireSupabase();
  let query = sb.from(TABLE).select('*').limit(limit);

  if (cuisine) query = query.contains('cuisine_tags', [cuisine.trim().toLowerCase()]);

  // DB-side ordering for name/recent; 'rating' is sorted after enrichment below.
  if (sort === 'name') query = query.order('name', { ascending: true });
  else query = query.order('created_at', { ascending: false });

  const { data, error } = await query;
  if (error) throw error;

  const rows = (data ?? []).map(toRestaurant);

  const summaries = await getRatingSummaries(rows.map((r) => r.id));
  for (const r of rows) {
    const s = summaries.get(r.id) ?? { avgRating: null, reviewCount: 0 };
    r.avgRating = s.avgRating;
    r.reviewCount = s.reviewCount;
  }

  if (sort === 'rating') {
    // Highest average first; unrated (null) sink to the bottom.
    rows.sort((a, b) => (b.avgRating ?? -1) - (a.avgRating ?? -1));
  }

  return rows;
}
