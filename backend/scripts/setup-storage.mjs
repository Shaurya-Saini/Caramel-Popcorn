// Ensure the private favourite-photos bucket exists. Run from backend/:
//   node scripts/setup-storage.mjs
import { ensurePhotoBucket, PHOTO_BUCKET } from '../src/lib/storage.js';

const { created } = await ensurePhotoBucket();
console.log(created ? `Created private bucket "${PHOTO_BUCKET}"` : `Bucket "${PHOTO_BUCKET}" already exists`);
