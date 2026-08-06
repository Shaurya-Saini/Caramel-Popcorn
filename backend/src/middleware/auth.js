import { config } from '../config/index.js';
import { verifySession } from '../lib/token.js';
import { getUserById } from '../services/userService.js';

/**
 * Best-effort auth: attaches `req.user` when a valid session cookie is present,
 * but never blocks. Used on public endpoints that reveal more to the owner
 * (e.g. private review parts).
 */
export async function attachUser(req, res, next) {
  try {
    const token = req.cookies?.[config.jwt.cookieName];
    if (token) {
      const payload = verifySession(token);
      req.user = await getUserById(payload.sub);
    }
  } catch {
    // ignore invalid/expired tokens on optional-auth routes
  }
  next();
}

/**
 * Requires a valid session cookie. On success attaches the full user to
 * `req.user`. Responds 401 otherwise.
 */
export async function requireAuth(req, res, next) {
  try {
    const token = req.cookies?.[config.jwt.cookieName];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Not signed in' });
    }

    const payload = verifySession(token);
    const user = await getUserById(payload.sub);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized', message: 'User no longer exists' });
    }

    req.user = user;
    next();
  } catch (err) {
    // Invalid/expired token
    return res.status(401).json({ error: 'Unauthorized', message: 'Invalid session' });
  }
}
