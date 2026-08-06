import crypto from 'node:crypto';
import { requireSupabase } from '../config/supabase.js';
import { getReviewById } from './reviewService.js';
import {
  compressImage,
  uploadPhoto,
  signPhoto,
  deletePhoto,
} from '../lib/storage.js';

const TABLE = 'favourite_items';

function forbid(msg = 'Not your review') {
  const e = new Error(msg);
  e.status = 403;
  return e;
}
function notFound(msg = 'Review not found') {
  const e = new Error(msg);
  e.status = 404;
  return e;
}

/** Sign the stored photo paths for a set of item rows -> API shape. */
export async function signItems(rows) {
  return Promise.all(
    (rows ?? []).map(async (it) => ({
      id: it.id,
      itemName: it.item_name,
      note: it.note,
      photoUrl: await signPhoto(it.photo_url),
    }))
  );
}

async function assertOwnedReview(reviewId, userId) {
  const review = await getReviewById(reviewId);
  if (!review) throw notFound();
  if (review.user_id !== userId) throw forbid();
  return review;
}

/**
 * Add a favourite item to the user's review. Optional photo is compressed to a
 * small WebP before upload (Supabase 1 GB budget).
 */
export async function addItem({ reviewId, userId, itemName, note, photoBuffer }) {
  await assertOwnedReview(reviewId, userId);
  const sb = requireSupabase();

  let photoPath = null;
  if (photoBuffer) {
    const { buffer, contentType, ext } = await compressImage(photoBuffer);
    photoPath = `reviews/${reviewId}/${crypto.randomUUID()}.${ext}`;
    await uploadPhoto(photoPath, buffer, contentType);
  }

  const { data, error } = await sb
    .from(TABLE)
    .insert({
      review_id: reviewId,
      item_name: itemName.trim(),
      note: note?.trim() || null,
      photo_url: photoPath,
    })
    .select()
    .single();
  if (error) {
    if (photoPath) await deletePhoto(photoPath); // roll back the orphaned upload
    throw error;
  }

  const [signed] = await signItems([data]);
  return signed;
}

/** List the items on a review (owner view), with signed photo URLs. */
export async function listItems(reviewId, userId) {
  await assertOwnedReview(reviewId, userId);
  const sb = requireSupabase();
  const { data, error } = await sb
    .from(TABLE)
    .select('*')
    .eq('review_id', reviewId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return signItems(data);
}

/** Delete an item (and its photo) if the caller owns the parent review. */
export async function deleteItem(itemId, userId) {
  const sb = requireSupabase();
  const { data: item, error } = await sb
    .from(TABLE)
    .select('*, review:reviews(user_id)')
    .eq('id', itemId)
    .maybeSingle();
  if (error) throw error;
  if (!item) return; // idempotent
  if (item.review?.user_id !== userId) throw forbid();

  await deletePhoto(item.photo_url);
  const { error: delErr } = await sb.from(TABLE).delete().eq('id', itemId);
  if (delErr) throw delErr;
}
