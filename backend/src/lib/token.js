import jwt from 'jsonwebtoken';
import { config, isProd } from '../config/index.js';

/** Sign a session JWT carrying the user id as `sub`. */
export function signSession(userId) {
  return jwt.sign({ sub: userId }, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  });
}

/** Verify a session JWT; returns the payload or throws. */
export function verifySession(token) {
  return jwt.verify(token, config.jwt.secret);
}

/** Attach the session cookie to a response. */
export function setSessionCookie(res, token) {
  res.cookie(config.jwt.cookieName, token, {
    httpOnly: true,
    secure: isProd, // HTTPS-only in production
    sameSite: 'lax',
    maxAge: config.jwt.maxAgeMs,
    path: '/',
  });
}

export function clearSessionCookie(res) {
  res.clearCookie(config.jwt.cookieName, { path: '/' });
}
