import dotenv from 'dotenv';

dotenv.config();

/**
 * Centralised, validated configuration.
 * Read from process.env once here so the rest of the app never touches env vars directly.
 */
export const config = {
  env: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 4000,
  // Comma-separated list of allowed origins for CORS (e.g. the frontend dev server).
  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),
  // Where to send the browser back to after a successful OAuth login.
  frontendUrl: (process.env.CORS_ORIGINS || 'http://localhost:5173')
    .split(',')[0]
    .trim(),
  supabase: {
    url: process.env.SUPABASE_URL || '',
    // Service-role/secret key: server-side only, bypasses RLS. NEVER expose to the client.
    serviceKey: process.env.SUPABASE_SERVICE_KEY || '',
  },
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    callbackUrl:
      process.env.GOOGLE_CALLBACK_URL ||
      'http://localhost:4000/api/auth/google/callback',
    // Server-side key for Places API (New) Text Search — when set, place search
    // uses Google (full POI coverage incl. multiple branches) instead of OSM.
    mapsApiKey: process.env.GOOGLE_MAPS_API_KEY || '',
  },
  jwt: {
    secret: process.env.SESSION_SECRET || 'dev-insecure-secret',
    // 7 days — matches the auth cookie maxAge below.
    expiresIn: '7d',
    cookieName: 'cp_session',
    maxAgeMs: 7 * 24 * 60 * 60 * 1000,
  },
  admin: {
    // Comma-separated emails granted moderation access (the report queue).
    // Basic v1 admin capability — no roles table yet (Content.md §2.5).
    emails: (process.env.ADMIN_EMAILS || '')
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  },
  geocode: {
    // Forward/reverse geocoding for the "pick the exact place" flow. Keyless
    // OSM Nominatim by default; swap for a keyed/self-hosted geocoder in prod.
    // The service appends /search and /reverse to this base.
    baseUrl: process.env.GEOCODE_BASE_URL || 'https://nominatim.openstreetmap.org',
    // Nominatim's usage policy REQUIRES a descriptive User-Agent with contact.
    userAgent: process.env.GEOCODE_USER_AGENT || 'CaramelPopcorn/1.0 (dev)',
  },
};

export const isProd = config.env === 'production';

/** True when the given email is on the admin allowlist. */
export function isAdminEmail(email) {
  return Boolean(email) && config.admin.emails.includes(String(email).toLowerCase());
}

/**
 * Returns true when Supabase credentials are present. Lets the app boot for
 * local development / health checks before Supabase is provisioned.
 */
export const isSupabaseConfigured = Boolean(
  config.supabase.url && config.supabase.serviceKey
);

/** True when Google OAuth credentials are present. */
export const isGoogleConfigured = Boolean(
  config.google.clientId && config.google.clientSecret
);
