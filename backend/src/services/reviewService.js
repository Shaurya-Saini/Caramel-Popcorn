import { requireSupabase } from '../config/supabase.js';
import { signPhoto } from '../lib/storage.js';

const TABLE = 'reviews';

/** Raw ratings shape for API responses. */
function ratings(row) {
  return {
    food: row.rating_food,
    service: row.rating_service,
    price: row.rating_price,
    ambiance: row.rating_ambiance,
  };
}

function clampRating(v) {
  if (v === undefined || v === null || v === '') return null;
  const n = Math.round(Number(v));
  if (Number.isNaN(n) || n < 0 || n > 5) {
    const err = new Error('ratings must be integers 0–5');
    err.status = 400;
    throw err;
  }
  return n;
}

export async function getReviewById(id) {
  const sb = requireSupabase();
  const { data, error } = await sb.from(TABLE).select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data;
}

/** The signed-in user's own review for a restaurant (for the edit form), or null. */
export async function getOwnReview(userId, restaurantId) {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from(TABLE)
    .select('*')
    .eq('user_id', userId)
    .eq('restaurant_id', restaurantId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    id: data.id,
    restaurantId: data.restaurant_id,
    ratings: ratings(data),
    textReview: data.text_review,
    isPublicGeneric: data.is_public_generic,
    isPublicItems: data.is_public_items,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

export async function createReview(userId, input) {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from(TABLE)
    .insert({
      user_id: userId,
      restaurant_id: input.restaurantId,
      rating_food: clampRating(input.ratings?.food),
      rating_service: clampRating(input.ratings?.service),
      rating_price: clampRating(input.ratings?.price),
      rating_ambiance: clampRating(input.ratings?.ambiance),
      text_review: input.textReview?.trim() || null,
      is_public_generic: input.isPublicGeneric ?? true,
      is_public_items: input.isPublicItems ?? true,
    })
    .select()
    .single();
  if (error) {
    // 23505 = unique_violation (one review per user per restaurant)
    if (error.code === '23505') {
      const e = new Error('You already have a review for this restaurant');
      e.status = 409;
      throw e;
    }
    throw error;
  }
  return data;
}

export async function updateReview(id, userId, patch) {
  const sb = requireSupabase();
  const existing = await getReviewById(id);
  if (!existing) {
    const e = new Error('Review not found');
    e.status = 404;
    throw e;
  }
  if (existing.user_id !== userId) {
    const e = new Error('Not your review');
    e.status = 403;
    throw e;
  }

  const update = {};
  if (patch.ratings) {
    if ('food' in patch.ratings) update.rating_food = clampRating(patch.ratings.food);
    if ('service' in patch.ratings) update.rating_service = clampRating(patch.ratings.service);
    if ('price' in patch.ratings) update.rating_price = clampRating(patch.ratings.price);
    if ('ambiance' in patch.ratings) update.rating_ambiance = clampRating(patch.ratings.ambiance);
  }
  if (patch.textReview !== undefined) update.text_review = patch.textReview?.trim() || null;
  if (patch.isPublicGeneric !== undefined) update.is_public_generic = patch.isPublicGeneric;
  if (patch.isPublicItems !== undefined) update.is_public_items = patch.isPublicItems;

  const { data, error } = await sb.from(TABLE).update(update).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteReview(id, userId) {
  const sb = requireSupabase();
  const existing = await getReviewById(id);
  if (!existing) return; // idempotent
  if (existing.user_id !== userId) {
    const e = new Error('Not your review');
    e.status = 403;
    throw e;
  }
  const { error } = await sb.from(TABLE).delete().eq('id', id);
  if (error) throw error;
}

/**
 * Batch rating summaries for a set of restaurants, for the public list view.
 * Only PUBLIC generic reviews count (the list is anonymous/public — no viewer
 * gets private parts here). Mirrors listForRestaurant's rule: each review
 * contributes the mean of its own set ratings, then we average those.
 * Returns Map<restaurantId, { avgRating: number|null, reviewCount: number }>.
 */
export async function getRatingSummaries(restaurantIds) {
  const summaries = new Map();
  if (!restaurantIds?.length) return summaries;

  const sb = requireSupabase();
  const { data, error } = await sb
    .from(TABLE)
    .select('restaurant_id, rating_food, rating_service, rating_price, rating_ambiance')
    .in('restaurant_id', restaurantIds)
    .eq('is_public_generic', true);
  if (error) throw error;

  // restaurant_id -> { sum of per-review means, count of rated reviews }
  const acc = new Map();
  for (const row of data ?? []) {
    const vals = [row.rating_food, row.rating_service, row.rating_price, row.rating_ambiance]
      .filter((v) => v !== null && v !== undefined);
    if (!vals.length) continue;
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
    const cur = acc.get(row.restaurant_id) ?? { sum: 0, count: 0 };
    cur.sum += mean;
    cur.count += 1;
    acc.set(row.restaurant_id, cur);
  }

  for (const id of restaurantIds) {
    const cur = acc.get(id);
    summaries.set(id, {
      avgRating: cur ? Math.round((cur.sum / cur.count) * 10) / 10 : null,
      reviewCount: cur ? cur.count : 0,
    });
  }
  return summaries;
}

/**
 * Reviews for a restaurant, with the two independent privacy flags enforced
 * SERVER-SIDE:
 *   - Generic part (ratings + text) shown only if is_public_generic OR viewer is owner.
 *   - Favourite-items part shown only if is_public_items OR viewer is owner.
 * A review with no visible part is omitted for non-owners.
 * Also returns a rating summary over the visible generic parts.
 */
export async function listForRestaurant(restaurantId, viewerId = null) {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from(TABLE)
    .select('*, user:users(id, name, avatar_url), favourite_items(*)')
    .eq('restaurant_id', restaurantId)
    .order('created_at', { ascending: false });
  if (error) throw error;

  const reviews = [];
  let ratingSum = 0;
  let ratingCount = 0;

  for (const row of data ?? []) {
    const isOwner = viewerId && row.user_id === viewerId;
    const showGeneric = row.is_public_generic || isOwner;

    const rawItems = row.favourite_items ?? [];
    // The items part is only a *visible part* if it's public/owned AND non-empty —
    // an empty favourites list must not keep an otherwise-private review visible.
    const showItems = (row.is_public_items || isOwner) && rawItems.length > 0;

    // Omit entirely if the viewer can see neither part.
    if (!showGeneric && !showItems) continue;

    // Sign photo URLs only for items we're actually exposing.
    const items = showItems
      ? await Promise.all(
          rawItems.map(async (it) => ({
            id: it.id,
            itemName: it.item_name,
            note: it.note,
            photoUrl: await signPhoto(it.photo_url),
          }))
        )
      : [];

    // Average across visible-generic reviews that have any rating.
    if (showGeneric) {
      const vals = [row.rating_food, row.rating_service, row.rating_price, row.rating_ambiance]
        .filter((v) => v !== null && v !== undefined);
      if (vals.length) {
        ratingSum += vals.reduce((a, b) => a + b, 0) / vals.length;
        ratingCount += 1;
      }
    }

    reviews.push({
      id: row.id,
      isOwner: !!isOwner,
      reviewer: { id: row.user?.id, name: row.user?.name, avatarUrl: row.user?.avatar_url },
      createdAt: row.created_at,
      // Generic part (or null when private & not owner)
      generic: showGeneric
        ? { ratings: ratings(row), textReview: row.text_review, isPublic: row.is_public_generic }
        : null,
      // Favourite items part (or null when private & not owner)
      favouriteItems: showItems ? { items, isPublic: row.is_public_items } : null,
    });
  }

  return {
    reviews,
    summary: {
      count: reviews.length,
      averageRating: ratingCount ? Math.round((ratingSum / ratingCount) * 10) / 10 : null,
    },
  };
}
