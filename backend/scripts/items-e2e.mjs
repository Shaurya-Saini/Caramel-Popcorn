// Favourite items + photo compression + privacy round-trip.
// Run from backend/: node scripts/items-e2e.mjs  (server running, bucket created).
import sharp from 'sharp';
import { findOrCreateByGoogle } from '../src/services/userService.js';
import { signSession } from '../src/lib/token.js';
import { requireSupabase } from '../src/config/supabase.js';
import { createRestaurant } from '../src/services/restaurantService.js';
import { createReview } from '../src/services/reviewService.js';

const API = 'http://localhost:4000/api';
function ok(label, cond, extra = '') {
  console.log((cond ? 'PASS ' : 'FAIL ') + label + (extra ? '  ' + extra : ''));
  if (!cond) process.exitCode = 1;
}

const sb = requireSupabase();
const cleanup = { users: [], restaurants: [] };

try {
  const A = await findOrCreateByGoogle({ googleId: 'item-A-' + Date.now(), email: 'ia@x.com', name: 'Ava' });
  cleanup.users.push(A.id);
  const cookieA = `cp_session=${signSession(A.id)}`;

  const rest = await createRestaurant({ name: 'Item Test Cafe ' + Date.now(), createdBy: A.id });
  cleanup.restaurants.push(rest.id);
  const review = await createReview(A.id, {
    restaurantId: rest.id,
    ratings: { food: 5 },
    isPublicGeneric: true,
    isPublicItems: false, // start private
  });

  // Build a big 2000x2000 JPEG (larger than our 1280 cap) to prove downscaling.
  const bigJpeg = await sharp({
    create: { width: 2000, height: 2000, channels: 3, background: { r: 200, g: 150, b: 60 } },
  }).jpeg({ quality: 100 }).toBuffer();

  // Add an item with the photo (multipart)
  const fd = new FormData();
  fd.append('itemName', 'Caramel Popcorn Bucket');
  fd.append('note', 'the good stuff');
  fd.append('photo', new Blob([bigJpeg], { type: 'image/jpeg' }), 'big.jpg');
  const add = await fetch(`${API}/reviews/${review.id}/items`, {
    method: 'POST', headers: { cookie: cookieA }, body: fd,
  });
  const addBody = await add.json();
  ok('POST item with photo -> 201', add.status === 201 && !!addBody.item?.id);
  ok('item returns a signed photo URL', typeof addBody.item?.photoUrl === 'string' && addBody.item.photoUrl.includes('token='));

  // Fetch the signed URL and inspect the stored image
  const imgRes = await fetch(addBody.item.photoUrl);
  const imgBuf = Buffer.from(await imgRes.arrayBuffer());
  const meta = await sharp(imgBuf).metadata();
  ok('stored image re-encoded to webp', meta.format === 'webp', `format=${meta.format}`);
  ok('stored image downscaled to <=1280px', meta.width <= 1280 && meta.height <= 1280, `${meta.width}x${meta.height}`);
  ok('compressed smaller than original', imgBuf.length < bigJpeg.length, `${imgBuf.length} < ${bigJpeg.length}`);

  // Privacy: items private -> anon does NOT see the item (generic public, so review shows w/o items)
  const anon1 = await (await fetch(`${API}/restaurants/${rest.id}/reviews`)).json();
  const anonReview = anon1.reviews[0];
  ok('items private: anon sees review but no items', !!anonReview && anonReview.favouriteItems === null);

  // Make items public
  await fetch(`${API}/reviews/${review.id}`, {
    method: 'PATCH', headers: { cookie: cookieA, 'content-type': 'application/json' },
    body: JSON.stringify({ isPublicItems: true }),
  });
  const anon2 = await (await fetch(`${API}/restaurants/${rest.id}/reviews`)).json();
  const items2 = anon2.reviews[0]?.favouriteItems;
  ok('items public: anon now sees item w/ signed URL',
     items2?.items?.length === 1 && items2.items[0].photoUrl?.includes('token='));

  // Reject a non-image upload
  const fdBad = new FormData();
  fdBad.append('itemName', 'bad');
  fdBad.append('photo', new Blob([Buffer.from('not an image')], { type: 'text/plain' }), 'x.txt');
  const bad = await fetch(`${API}/reviews/${review.id}/items`, {
    method: 'POST', headers: { cookie: cookieA }, body: fdBad,
  });
  ok('non-image upload rejected -> 400', bad.status === 400);

  // Owner item list
  const list = await (await fetch(`${API}/reviews/${review.id}/items`, { headers: { cookie: cookieA } })).json();
  ok('owner lists items (1)', list.items.length === 1);

  // Delete the item
  const del = await fetch(`${API}/items/${addBody.item.id}`, { method: 'DELETE', headers: { cookie: cookieA } });
  ok('delete item -> 200', del.status === 200);
  const after = await (await fetch(`${API}/reviews/${review.id}/items`, { headers: { cookie: cookieA } })).json();
  ok('item gone after delete (0)', after.items.length === 0);
} finally {
  for (const id of cleanup.restaurants) await sb.from('restaurants').delete().eq('id', id);
  for (const id of cleanup.users) await sb.from('users').delete().eq('id', id);
  console.log('cleanup done');
}
