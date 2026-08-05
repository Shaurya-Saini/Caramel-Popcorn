import { createClient } from '@supabase/supabase-js';
import { config, isSupabaseConfigured } from './index.js';

/**
 * Server-side Supabase client using the service-role key.
 *
 * IMPORTANT: this key bypasses Row Level Security. All privacy/visibility
 * filtering (is_public_generic / is_public_items) must therefore be enforced
 * explicitly in our own query logic — never trust the client to filter.
 *
 * Null until Supabase is configured, so the API can still boot for health
 * checks during early development.
 */
export const supabase = isSupabaseConfigured
  ? createClient(config.supabase.url, config.supabase.serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null;

export function requireSupabase() {
  if (!supabase) {
    throw new Error(
      'Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_KEY in backend/.env'
    );
  }
  return supabase;
}
