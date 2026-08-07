// Reporting / moderation round-trip test (step 8).
// Run from backend/: node scripts/reports-e2e.mjs  (server must be running).
// Requires the admin allowlist to include cp-admin-e2e@example.com (ADMIN_EMAILS).
import { findOrCreateByGoogle } from '../src/services/userService.js';
import { createRestaurant } from '../src/services/restaurantService.js';
import { createReview } from '../src/services/reviewService.js';
import { signSession } from '../src/lib/token.js';
import { requireSupabase } from '../src/config/supabase.js';

const API = 'http://localhost:4000/api';
const ADMIN_EMAIL = 'cp-admin-e2e@example.com';

function ok(label, cond, extra = '') {
  console.log((cond ? 'PASS ' : 'FAIL ') + label + (extra ? '  ' + extra : ''));
  if (!cond) process.exitCode = 1;
}

const sb = requireSupabase();
const reportIds = [];
let restId, reviewId, adminId, userId;

try {
  const admin = await findOrCreateByGoogle({
    googleId: 'rep-admin-' + Date.now(), email: ADMIN_EMAIL, name: 'Admin',
  });
  adminId = admin.id;
  ok('admin user has isAdmin=true (from allowlist)', admin.isAdmin === true);
  const adminHeaders = { cookie: `cp_session=${signSession(admin.id)}`, 'content-type': 'application/json' };

  const user = await findOrCreateByGoogle({
    googleId: 'rep-user-' + Date.now(), email: 'rep-user@example.com', name: 'Reporter',
  });
  userId = user.id;
  ok('normal user has isAdmin=false', user.isAdmin === false);
  const userHeaders = { cookie: `cp_session=${signSession(user.id)}`, 'content-type': 'application/json' };

  const rest = await createRestaurant({
    name: 'Report Target ' + Date.now(), address: null, lat: null, lng: null,
    cuisineTags: [], createdBy: admin.id,
  });
  restId = rest.id;
  const review = await createReview(user.id, {
    restaurantId: restId, ratings: { food: 3 }, textReview: 'meh',
    isPublicGeneric: true, isPublicItems: true,
  });
  reviewId = review.id;

  // 1. Report requires auth
  const noAuth = await fetch(`${API}/reports`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ targetType: 'restaurant', targetId: restId, reason: 'spam' }),
  });
  ok('POST /reports without auth -> 401', noAuth.status === 401);

  // 2. Normal user files a report on the restaurant
  const c1 = await fetch(`${API}/reports`, {
    method: 'POST', headers: userHeaders,
    body: JSON.stringify({ targetType: 'restaurant', targetId: restId, reason: 'incorrect info' }),
  });
  const c1b = await c1.json();
  if (c1b.report) reportIds.push(c1b.report.id);
  ok('POST /reports (restaurant) -> 201', c1.status === 201 && !!c1b.report?.id && c1b.report.status === 'open');

  // 3. Duplicate open report from same reporter -> same id (deduped)
  const dup = await fetch(`${API}/reports`, {
    method: 'POST', headers: userHeaders,
    body: JSON.stringify({ targetType: 'restaurant', targetId: restId, reason: 'again' }),
  });
  const dupB = await dup.json();
  ok('duplicate open report deduped (same id)', dup.status === 201 && dupB.report?.id === c1b.report.id);

  // 4. Report on a review target
  const c2 = await fetch(`${API}/reports`, {
    method: 'POST', headers: userHeaders,
    body: JSON.stringify({ targetType: 'review', targetId: reviewId, reason: 'inappropriate' }),
  });
  const c2b = await c2.json();
  if (c2b.report) reportIds.push(c2b.report.id);
  ok('POST /reports (review) -> 201', c2.status === 201 && !!c2b.report?.id);

  // 5. Unknown target -> 404
  const missing = await fetch(`${API}/reports`, {
    method: 'POST', headers: userHeaders,
    body: JSON.stringify({ targetType: 'restaurant', targetId: '00000000-0000-0000-0000-000000000000', reason: 'x' }),
  });
  ok('report on unknown target -> 404', missing.status === 404);

  // 6. Bad targetType -> 400
  const bad = await fetch(`${API}/reports`, {
    method: 'POST', headers: userHeaders,
    body: JSON.stringify({ targetType: 'user', targetId: restId }),
  });
  ok('invalid targetType -> 400', bad.status === 400);

  // 7. Non-admin cannot read the queue -> 403
  const forbidden = await fetch(`${API}/reports`, { headers: userHeaders });
  ok('non-admin GET /reports -> 403', forbidden.status === 403);

  // 8. Admin reads the queue -> 200 with enrichment
  const queue = await fetch(`${API}/reports`, { headers: adminHeaders });
  const queueB = await queue.json();
  const mine = queueB.reports?.find((r) => r.id === c1b.report.id);
  ok('admin GET /reports -> 200 + lists report', queue.status === 200 && !!mine);
  ok('report enriched with reporter + targetLabel',
     mine?.reporter?.id === userId && typeof mine?.targetLabel === 'string',
     `reporter=${mine?.reporter?.name} label=${mine?.targetLabel}`);

  // 9. Status filter
  const openOnly = await fetch(`${API}/reports?status=open`, { headers: adminHeaders });
  const openB = await openOnly.json();
  ok('?status=open filter returns only open',
     openOnly.status === 200 && openB.reports.every((r) => r.status === 'open'));

  // 10. Admin updates status
  const patch = await fetch(`${API}/reports/${c1b.report.id}`, {
    method: 'PATCH', headers: adminHeaders, body: JSON.stringify({ status: 'reviewed' }),
  });
  const patchB = await patch.json();
  ok('admin PATCH status -> reviewed', patch.status === 200 && patchB.report?.status === 'reviewed');

  // 11. Invalid status -> 400
  const badStatus = await fetch(`${API}/reports/${c1b.report.id}`, {
    method: 'PATCH', headers: adminHeaders, body: JSON.stringify({ status: 'nope' }),
  });
  ok('invalid status -> 400', badStatus.status === 400);

  // 12. Non-admin cannot patch -> 403
  const userPatch = await fetch(`${API}/reports/${c2b.report.id}`, {
    method: 'PATCH', headers: userHeaders, body: JSON.stringify({ status: 'dismissed' }),
  });
  ok('non-admin PATCH -> 403', userPatch.status === 403);

  // 13. Unknown report id -> 404
  const missingPatch = await fetch(`${API}/reports/00000000-0000-0000-0000-000000000000`, {
    method: 'PATCH', headers: adminHeaders, body: JSON.stringify({ status: 'dismissed' }),
  });
  ok('PATCH unknown report -> 404', missingPatch.status === 404);
} finally {
  for (const id of reportIds) await sb.from('reports').delete().eq('id', id);
  if (reviewId) await sb.from('reviews').delete().eq('id', reviewId);
  if (restId) await sb.from('restaurants').delete().eq('id', restId);
  if (adminId) await sb.from('users').delete().eq('id', adminId);
  if (userId) await sb.from('users').delete().eq('id', userId);
  console.log(`cleanup: removed ${reportIds.length} report(s) + review + restaurant + 2 users`);
}
