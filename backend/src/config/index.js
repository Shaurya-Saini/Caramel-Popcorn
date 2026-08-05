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
  supabase: {
    url: process.env.SUPABASE_URL || '',
    // Service-role key: server-side only, NEVER expose to the client.
    serviceKey: process.env.SUPABASE_SERVICE_KEY || '',
  },
};

export const isProd = config.env === 'production';

/**
 * Returns true when Supabase credentials are present. Lets the app boot for
 * local development / health checks before Supabase is provisioned.
 */
export const isSupabaseConfigured = Boolean(
  config.supabase.url && config.supabase.serviceKey
);
