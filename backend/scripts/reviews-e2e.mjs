// Review CRUD + server-enforced privacy round-trip test.
// Run from backend/: node scripts/reviews-e2e.mjs  (server running).
import { findOrCreateByGoogle } from '../src/services/userService.js';
import { signSession } from '../src/lib/token.js';
import { requireSupabase } from '../src/config/supabase.js';
import { createRestaurant } from '../src/services/restaurantService.js';

const API = 'http://localhost:4000/api';

function ok(label, cond, extra = '') {
  console.log((cond ? 'PASS ' : 'FAIL ') + label + (extra ? '  ' + extra : ''));
  if (!cond) process.exitCode = 1;
}
const j = (cookie) => ({ cookie, 'content-type': 'application/json' });

const sb = requireSupabase();
const cleanup = { users: [], restaurants: [] };

try {
  const A = await findOrCreateByGoogle({ googleId: 'rev-A-' + Date.now(), email: 'a@x.com', name: 'Alice' });
  const B = await findOrCreateByGoogle({ googleId: 'rev-B-' + Date.now(), email: 'b@x.com', name: 'Bob' });
  cleanup.users.push(A.id, B.id);
  const cookieA = `cp_session=${signSession(A.id)}`;
  const cookieB = `cp_session=${signSession(B.id)}`;

  const rest = await createRestaurant({ name: 'Review Test Diner ' + Date.now(), createdBy: A.id });
  cleanup.restaurants.push(rest.id);

  // A: public review
  const ra = await fetch(`${API}/reviews`, {
    method: 'POST', headers: j(cookieA),
    body: JSON.stringify({
      restaurantId: rest.id,
      ratings: { food: 5, service: 4, price: 3, ambiance: 4 },
      textReview: 'Great popcorn!', isPublicGeneric: true,
    }),
  });
  const raBody = await ra.json();
  ok('A creates public review (201)', ra.status === 201 && !!raBody.review?.id);

  // A: duplicate review -> 409
  const dup = await fetch(`${API}/reviews`, {
    method: 'POST', headers: j(cookieA),
    body: JSON.stringify({ restaurantId: rest.id, ratings: { food: 1 } }),
  });
  ok('A second review same restaurant -> 409', dup.status === 409);

  // B: private-generic review
  const rb = await fetch(`${API}/reviews`, {
    method: 'POST', headers: j(cookieB),
    body: JSON.stringify({
      restaurantId: rest.id,
      ratings: { food: 2, service: 2, price: 2, ambiance: 2 },
      textReview: 'secret opinion', isPublicGeneric: false,
    }),
  });
  const rbBody = await rb.json();
  ok('B creates private review (201)', rb.status === 201 && !!rbBody.review?.id);

  // Anonymous viewer: sees only A's public review
  const anon = await (await fetch(`${API}/restaurants/${rest.id}/reviews`)).json();
  ok('anon sees only public review (1)', anon.reviews.length === 1 && anon.reviews[0].generic?.textReview === 'Great popcorn!');
  ok('anon rating summary present', anon.summary.count === 1 && anon.summary.averageRating === 4);

  // Viewer B: sees A's public + own private
  const asB = await (await fetch(`${API}/restaurants/${rest.id}/reviews`, { headers: { cookie: cookieB } })).json();
  const bSeesOwnPrivate = asB.reviews.some((r) => r.isOwner && r.generic?.textReview === 'secret opinion');
  ok('B sees own private + public (2)', asB.reviews.length === 2 && bSeesOwnPrivate);

  // Viewer A: sees own public only (B's is private) -> 1
  const asA = await (await fetch(`${API}/restaurants/${rest.id}/reviews`, { headers: { cookie: cookieA } })).json();
  ok("A does NOT see B's private review (1)", asA.reviews.length === 1 && asA.reviews[0].isOwner);

  // my-review
  const mine = await (await fetch(`${API}/restaurants/${rest.id}/my-review`, { headers: { cookie: cookieA } })).json();
  ok('A my-review returns own review', mine.review?.id === raBody.review.id);

  // B cannot edit A's review -> 403
  const forbid = await fetch(`${API}/reviews/${raBody.review.id}`, {
    method: 'PATCH', headers: j(cookieB), body: JSON.stringify({ textReview: 'hacked' }),
  });
  ok("B cannot edit A's review -> 403", forbid.status === 403);

  // A edits own review
  const edit = await fetch(`${API}/reviews/${raBody.review.id}`, {
    method: 'PATCH', headers: j(cookieA), body: JSON.stringify({ ratings: { food: 3 }, textReview: 'Updated' }),
  });
  const editBody = await edit.json();
  ok('A edits own review', edit.status === 200 && editBody.review.rating_food === 3);

  // invalid rating -> 400
  const bad = await fetch(`${API}/reviews/${raBody.review.id}`, {
    method: 'PATCH', headers: j(cookieA), body: JSON.stringify({ ratings: { food: 9 } }),
  });
  ok('rating out of range -> 400', bad.status === 400);

  // A deletes own review
  const del = await fetch(`${API}/reviews/${raBody.review.id}`, { method: 'DELETE', headers: { cookie: cookieA } });
  ok('A deletes own review', del.status === 200);
  const afterDel = await (await fetch(`${API}/restaurants/${rest.id}/reviews`)).json();
  ok('deleted review gone from public list (0)', afterDel.reviews.length === 0);
} finally {
  for (const id of cleanup.restaurants) await sb.from('restaurants').delete().eq('id', id);
  for (const id of cleanup.users) await sb.from('users').delete().eq('id', id);
  console.log('cleanup done');
}
