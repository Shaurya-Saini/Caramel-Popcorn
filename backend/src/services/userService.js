import { requireSupabase } from '../config/supabase.js';
import { isAdminEmail } from '../config/index.js';

const TABLE = 'users';

/** Public-safe shape of a user row (everything here is fine to send to the owner). */
function toUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    avatarUrl: row.avatar_url,
    tasteTags: row.taste_tags ?? [],
    manualLocation: row.manual_location,
    lat: row.lat,
    lng: row.lng,
    createdAt: row.created_at,
    // Derived from the ADMIN_EMAILS allowlist — lets the UI show the report queue.
    isAdmin: isAdminEmail(row.email),
  };
}

/**
 * Find a user by their Google account, creating the row on first login.
 * Keeps name/avatar/email fresh from Google on each login.
 */
export async function findOrCreateByGoogle({ googleId, email, name, avatarUrl }) {
  const sb = requireSupabase();

  const { data: existing, error } = await sb
    .from(TABLE)
    .select('*')
    .eq('google_id', googleId)
    .maybeSingle();
  if (error) throw error;

  if (existing) {
    const { data: updated, error: updErr } = await sb
      .from(TABLE)
      .update({ email, name, avatar_url: avatarUrl })
      .eq('id', existing.id)
      .select()
      .single();
    if (updErr) throw updErr;
    return toUser(updated);
  }

  const { data: created, error: insErr } = await sb
    .from(TABLE)
    .insert({ google_id: googleId, email, name, avatar_url: avatarUrl })
    .select()
    .single();
  if (insErr) throw insErr;
  return toUser(created);
}

export async function getUserById(id) {
  const sb = requireSupabase();
  const { data, error } = await sb.from(TABLE).select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return toUser(data);
}

/** Update the editable profile fields (taste tags, manual location, name). */
export async function updateProfile(id, { name, tasteTags, manualLocation, lat, lng }) {
  const sb = requireSupabase();

  const patch = {};
  if (name !== undefined) patch.name = name;
  if (tasteTags !== undefined) patch.taste_tags = tasteTags;
  if (manualLocation !== undefined) patch.manual_location = manualLocation;
  if (lat !== undefined) patch.lat = lat;
  if (lng !== undefined) patch.lng = lng;

  const { data, error } = await sb
    .from(TABLE)
    .update(patch)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return toUser(data);
}
