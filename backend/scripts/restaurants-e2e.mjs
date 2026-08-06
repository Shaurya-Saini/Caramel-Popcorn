// Restaurant CRUD + fuzzy-dedup round-trip test.
// Run from backend/: node scripts/restaurants-e2e.mjs  (server must be running,
// migration 0002 applied).
import { findOrCreateByGoogle } from '../src/services/userService.js';
import { signSession } from '../src/lib/token.js';
import { requireSupabase } from '../src/config/supabase.js';

const API = 'http://localhost:4000/api';

function ok(label, cond, extra = '') {
  console.log((cond ? 'PASS ' : 'FAIL ') + label + (extra ? '  ' + extra : ''));
  if (!cond) process.exitCode = 1;
}

const created = [];
let userId;

try {
  const user = await findOrCreateByGoogle({
    googleId: 'test-rest-' + Date.now(),
    email: 'rest@example.com',
    name: 'Rest Tester',
  });
  userId = user.id;
  const cookie = `cp_session=${signSession(user.id)}`;
  const jsonHeaders = { cookie, 'content-type': 'application/json' };

  const uniq = 'Popcorn Palace ' + Date.now();

  // 1. Create requires auth
  const noAuth = await fetch(`${API}/restaurants`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: uniq, confirmCreate: true }),
  });
  ok('POST /restaurants without auth -> 401', noAuth.status === 401);

  // 2. Create first restaurant (no duplicates expected)
  const c1 = await fetch(`${API}/restaurants`, {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify({
      name: uniq,
      address: '1 Butter St',
      lat: 40.0,
      lng: -73.0,
      cuisineTags: ['Snacks', 'snacks', '  Cinema '],
    }),
  });
  const r1 = await c1.json();
  if (r1.restaurant) created.push(r1.restaurant.id);
  ok('POST /restaurants creates (201)', c1.status === 201 && !!r1.restaurant?.id);
  ok('cuisine tags normalised (trim/lowercase/dedupe)',
     JSON.stringify(r1.restaurant?.cuisineTags) === JSON.stringify(['snacks', 'cinema']),
     JSON.stringify(r1.restaurant?.cuisineTags));

  // 3. duplicate-check finds the near-identical name
  const dc = await fetch(`${API}/restaurants/duplicate-check`, {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify({ name: uniq + '!', lat: 40.0, lng: -73.0 }),
  });
  const dcBody = await dc.json();
  ok('duplicate-check returns candidate', dc.status === 200 && dcBody.matches?.length >= 1,
     `matches=${dcBody.matches?.length}`);
  ok('candidate includes distance (m)',
     dcBody.matches?.[0]?.distanceM != null && dcBody.matches[0].distanceM < 100,
     `distanceM=${dcBody.matches?.[0]?.distanceM}`);

  // 4. Creating a similar name without confirm -> 409 with matches
  const dup = await fetch(`${API}/restaurants`, {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify({ name: uniq, lat: 40.0, lng: -73.0 }),
  });
  const dupBody = await dup.json();
  ok('POST similar name without confirm -> 409', dup.status === 409 && dupBody.matches?.length >= 1);

  // 5. Same payload with confirmCreate:true -> 201 (override)
  const forced = await fetch(`${API}/restaurants`, {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify({ name: uniq, lat: 40.0, lng: -73.0, confirmCreate: true }),
  });
  const forcedBody = await forced.json();
  if (forcedBody.restaurant) created.push(forcedBody.restaurant.id);
  ok('POST with confirmCreate -> 201 (override)', forced.status === 201 && !!forcedBody.restaurant?.id);

  // 6. GET list (public, no auth) includes our entries
  const list = await fetch(`${API}/restaurants`);
  const listBody = await list.json();
  ok('GET /restaurants public + lists entries',
     list.status === 200 && listBody.restaurants.some((r) => r.id === created[0]));

  // 7. GET detail (public)
  const det = await fetch(`${API}/restaurants/${created[0]}`);
  const detBody = await det.json();
  ok('GET /restaurants/:id returns detail', det.status === 200 && detBody.restaurant?.id === created[0]);

  // 8. Unknown id -> 404
  const missing = await fetch(`${API}/restaurants/00000000-0000-0000-0000-000000000000`);
  ok('GET unknown restaurant -> 404', missing.status === 404);
} finally {
  const sb = requireSupabase();
  for (const id of created) await sb.from('restaurants').delete().eq('id', id);
  if (userId) await sb.from('users').delete().eq('id', userId);
  console.log(`cleanup: removed ${created.length} restaurant(s) + test user`);
}
