import { config } from '../config/index.js';

/**
 * Forward/reverse geocoding for the "pick the exact place" flow, so a review is
 * tied to a specific restaurant/branch with precise coordinates (fixes
 * duplicate/ambiguous entries — Content.md §2.2). Proxies OSM Nominatim
 * server-side with the required descriptive User-Agent; provider is swappable
 * via GEOCODE_BASE_URL.
 */

async function nominatim(path, params) {
  const url = new URL(config.geocode.baseUrl.replace(/\/$/, '') + path);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));

  let res;
  try {
    res = await fetch(url, {
      headers: { 'User-Agent': config.geocode.userAgent, Accept: 'application/json' },
    });
  } catch {
    const e = new Error('Geocoding service is unavailable');
    e.status = 502;
    throw e;
  }
  if (!res.ok) {
    const e = new Error('Geocoding service error');
    e.status = 502;
    throw e;
  }
  return res.json();
}

/** Map a raw Nominatim row to our place shape. */
function toPlace(r) {
  if (!r || r.error) return null;
  const a = r.address ?? {};
  const name =
    r.name ||
    a.amenity ||
    a.shop ||
    a.restaurant ||
    (r.display_name ? r.display_name.split(',')[0] : '') ||
    '';
  // A short address line (drop the leading venue name to avoid duplication).
  const address = r.display_name
    ? r.display_name.split(',').slice(1).map((s) => s.trim()).filter(Boolean).join(', ')
    : '';
  return {
    displayName: r.display_name ?? name,
    name,
    address,
    lat: r.lat != null ? Number(r.lat) : null,
    lng: r.lon != null ? Number(r.lon) : null,
    category: r.category ?? r.class ?? null,
    type: r.type ?? null,
  };
}

/**
 * Google Places API (New) Text Search — full POI coverage (returns every
 * branch, matching Google Maps). Bills through the Text Search "Pro" SKU with a
 * free monthly allowance; we request only name/address/location (the cheapest
 * field tier) and pass a location bias so nearby branches rank first.
 */
async function googleTextSearch(q, { lat = null, lng = null, limit = 8 } = {}) {
  const body = { textQuery: q, maxResultCount: limit };
  if (lat != null && lng != null) {
    body.locationBias = { circle: { center: { latitude: lat, longitude: lng }, radius: 30000 } };
  }

  let res;
  try {
    res = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': config.google.mapsApiKey,
        'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.location',
      },
      body: JSON.stringify(body),
    });
  } catch {
    const e = new Error('Geocoding service is unavailable');
    e.status = 502;
    throw e;
  }
  if (!res.ok) {
    // Surface Google's actual reason server-side (the client still gets a
    // generic 502). Common causes: "Places API (New)" not enabled on the
    // project, key restriction mismatch, or billing not enabled.
    const detail = await res.text().catch(() => '');
    console.error(`Google Places Text Search failed (HTTP ${res.status}): ${detail}`);
    const e = new Error('Geocoding service error');
    e.status = 502;
    throw e;
  }
  const data = await res.json();
  return (data.places ?? []).map((p) => ({
    displayName: p.displayName?.text || p.formattedAddress || '',
    name: p.displayName?.text || (p.formattedAddress ? p.formattedAddress.split(',')[0] : ''),
    address: p.formattedAddress || '',
    lat: p.location?.latitude ?? null,
    lng: p.location?.longitude ?? null,
    category: null,
    type: null,
  }));
}

/**
 * Forward-geocode free text → candidate places with exact coordinates.
 * Uses Google Places (full coverage) when a key is configured; otherwise falls
 * back to keyless OSM Nominatim (sparse POI coverage — misses some branches).
 * Optional { lat, lng } biases results toward the searcher's location.
 */
export async function searchPlaces(query, { lat = null, lng = null, limit = 8 } = {}) {
  const q = String(query || '').trim();
  if (q.length < 3) return [];

  if (config.google.mapsApiKey) {
    return googleTextSearch(q, { lat, lng, limit });
  }

  const rows = await nominatim('/search', {
    q,
    format: 'jsonv2',
    addressdetails: 1,
    limit,
  });
  return (Array.isArray(rows) ? rows : []).map(toPlace).filter(Boolean);
}

/** Reverse-geocode coordinates → a single place (address for a pinned point). */
export async function reverseGeocode(lat, lng) {
  const nlat = Number(lat);
  const nlng = Number(lng);
  if (
    Number.isNaN(nlat) || Number.isNaN(nlng) ||
    nlat < -90 || nlat > 90 || nlng < -180 || nlng > 180
  ) {
    const e = new Error('valid lat/lng required');
    e.status = 400;
    throw e;
  }
  const row = await nominatim('/reverse', {
    lat: nlat,
    lon: nlng,
    format: 'jsonv2',
    addressdetails: 1,
  });
  const place = toPlace(row);
  // Reverse always has coords even if the label is sparse — trust the input.
  if (place && (place.lat == null || place.lng == null)) {
    place.lat = nlat;
    place.lng = nlng;
  }
  return place;
}
