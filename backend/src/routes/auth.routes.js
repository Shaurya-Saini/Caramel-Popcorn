import { Router } from 'express';
import crypto from 'node:crypto';
import { OAuth2Client } from 'google-auth-library';
import { config, isProd, isGoogleConfigured } from '../config/index.js';
import { findOrCreateByGoogle } from '../services/userService.js';
import { signSession, setSessionCookie, clearSessionCookie } from '../lib/token.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

const oauthClient = new OAuth2Client(
  config.google.clientId,
  config.google.clientSecret,
  config.google.callbackUrl
);

const STATE_COOKIE = 'cp_oauth_state';

/**
 * GET /api/auth/google
 * Kicks off the OAuth flow: sets a short-lived CSRF `state` cookie and redirects
 * the browser to Google's consent screen.
 */
router.get('/google', (req, res) => {
  if (!isGoogleConfigured) {
    return res.status(503).json({ error: 'Auth unavailable', message: 'Google OAuth not configured' });
  }

  const state = crypto.randomBytes(16).toString('hex');
  res.cookie(STATE_COOKIE, state, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    maxAge: 10 * 60 * 1000, // 10 minutes
    path: '/',
  });

  const url = oauthClient.generateAuthUrl({
    access_type: 'offline',
    scope: ['openid', 'email', 'profile'],
    state,
    prompt: 'select_account',
  });
  res.redirect(url);
});

/**
 * GET /api/auth/google/callback
 * Google redirects here with `code` + `state`. We verify state, exchange the
 * code, verify the id_token, upsert the user, set the session cookie, and bounce
 * back to the frontend.
 */
router.get('/google/callback', async (req, res) => {
  const { code, state } = req.query;
  const expectedState = req.cookies?.[STATE_COOKIE];
  clearCookie(res, STATE_COOKIE);

  if (!code || !state || state !== expectedState) {
    return res.redirect(`${config.frontendUrl}/login?error=oauth_state`);
  }

  try {
    const { tokens } = await oauthClient.getToken(String(code));
    const ticket = await oauthClient.verifyIdToken({
      idToken: tokens.id_token,
      audience: config.google.clientId,
    });
    const payload = ticket.getPayload();

    const user = await findOrCreateByGoogle({
      googleId: payload.sub,
      email: payload.email,
      name: payload.name,
      avatarUrl: payload.picture,
    });

    setSessionCookie(res, signSession(user.id));
    res.redirect(`${config.frontendUrl}/profile`);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('OAuth callback failed:', err.message);
    res.redirect(`${config.frontendUrl}/login?error=oauth_failed`);
  }
});

/** GET /api/auth/me — current signed-in user (or 401). */
router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

/** POST /api/auth/logout — clear the session cookie. */
router.post('/logout', (req, res) => {
  clearSessionCookie(res);
  res.json({ ok: true });
});

function clearCookie(res, name) {
  res.clearCookie(name, { path: '/' });
}

export default router;
