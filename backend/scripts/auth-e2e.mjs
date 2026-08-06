// Backend auth + DB round-trip test (no Google consent needed).
// Run from backend/: node scripts/auth-e2e.mjs  (server must be running)
import { findOrCreateByGoogle } from '../src/services/userService.js';
import { signSession } from '../src/lib/token.js';
import { requireSupabase } from '../src/config/supabase.js';

const API = 'http://localhost:4000/api';
const COOKIE = 'cp_session';

function ok(label, cond, extra = '') {
  console.log((cond ? 'PASS ' : 'FAIL ') + label + (extra ? '  ' + extra : ''));
  if (!cond) process.exitCode = 1;
}

const testGoogleId = 'test-google-' + Date.now();
let userId;

try {
  const user = await findOrCreateByGoogle({
    googleId: testGoogleId,
    email: 'e2e@example.com',
    name: 'E2E Tester',
    avatarUrl: 'https://example.com/a.png',
  });
  userId = user.id;
  ok('findOrCreateByGoogle creates user', !!user.id, `id=${user.id}`);

  const cookie = `${COOKIE}=${signSession(user.id)}`;

  const meRes = await fetch(`${API}/auth/me`, { headers: { cookie } });
  const me = await meRes.json();
  ok('GET /auth/me returns the user', meRes.status === 200 && me.user?.id === user.id);

  const anonRes = await fetch(`${API}/auth/me`);
  ok('GET /auth/me without cookie -> 401', anonRes.status === 401);

  const patchRes = await fetch(`${API}/users/me`, {
    method: 'PATCH',
    headers: { cookie, 'content-type': 'application/json' },
    body: JSON.stringify({ tasteTags: ['spicy', 'vegan'], manualLocation: 'Testville' }),
  });
  const patched = await patchRes.json();
  ok(
    'PATCH /users/me persists profile',
    patchRes.status === 200 &&
      patched.user.manualLocation === 'Testville' &&
      patched.user.tasteTags.join(',') === 'spicy,vegan',
    JSON.stringify(patched.user?.tasteTags)
  );

  const badRes = await fetch(`${API}/users/me`, {
    method: 'PATCH',
    headers: { cookie, 'content-type': 'application/json' },
    body: JSON.stringify({ tasteTags: ['not-a-real-tag'] }),
  });
  ok('PATCH /users/me rejects unknown tag -> 400', badRes.status === 400);

  const reRes = await fetch(`${API}/auth/me`, { headers: { cookie } });
  const re = await reRes.json();
  ok('Profile change persisted across requests', re.user?.manualLocation === 'Testville');
} finally {
  if (userId) {
    await requireSupabase().from('users').delete().eq('id', userId);
    console.log('cleanup: removed test user ' + userId);
  }
}
