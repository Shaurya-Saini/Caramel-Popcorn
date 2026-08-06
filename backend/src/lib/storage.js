import sharp from 'sharp';
import { requireSupabase } from '../config/supabase.js';

/** Private bucket for favourite-item photos. */
export const PHOTO_BUCKET = 'favourite-photos';

// Compression targets (keep the 1 GB free tier lean — see project constraint).
const MAX_DIMENSION = 1280; // longest side, px
const WEBP_QUALITY = 80;
const SIGNED_URL_TTL = 60 * 60; // 1 hour

/** Ensure the (private) photo bucket exists. Safe to call repeatedly. */
export async function ensurePhotoBucket() {
  const sb = requireSupabase();
  const { data: buckets, error } = await sb.storage.listBuckets();
  if (error) throw error;
  if (buckets.some((b) => b.name === PHOTO_BUCKET)) return { created: false };

  const { error: createErr } = await sb.storage.createBucket(PHOTO_BUCKET, {
    public: false,
    fileSizeLimit: '15MB',
  });
  if (createErr) throw createErr;
  return { created: true };
}

/**
 * Compress + resize an uploaded image to a small WebP.
 * Downscales the longest side to MAX_DIMENSION (never enlarges) and re-encodes.
 * Returns { buffer, contentType, ext }.
 */
export async function compressImage(inputBuffer) {
  const buffer = await sharp(inputBuffer)
    .rotate() // respect EXIF orientation
    .resize({ width: MAX_DIMENSION, height: MAX_DIMENSION, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: WEBP_QUALITY })
    .toBuffer();
  return { buffer, contentType: 'image/webp', ext: 'webp' };
}

/** Upload bytes to the photo bucket at `path`. */
export async function uploadPhoto(path, buffer, contentType) {
  const sb = requireSupabase();
  const { error } = await sb.storage
    .from(PHOTO_BUCKET)
    .upload(path, buffer, { contentType, upsert: false });
  if (error) throw error;
  return path;
}

/** Create a short-lived signed URL for a stored object path (or null). */
export async function signPhoto(path) {
  if (!path) return null;
  const sb = requireSupabase();
  const { data, error } = await sb.storage
    .from(PHOTO_BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL);
  if (error) return null; // don't fail a whole list because one file is missing
  return data.signedUrl;
}

/** Delete a stored object (best-effort). */
export async function deletePhoto(path) {
  if (!path) return;
  const sb = requireSupabase();
  await sb.storage.from(PHOTO_BUCKET).remove([path]);
}
