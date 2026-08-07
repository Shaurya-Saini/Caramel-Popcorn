import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { searchPlaces, reverseGeocode } from '../services/geocodeService.js';

const router = Router();

/**
 * GET /api/geo/search?q=<text>&lat=&lng= — forward-geocode candidates for the
 * exact-place picker (auth required). Optional lat/lng bias results toward the
 * searcher. Returns [] for short queries.
 * { places: [{ displayName, name, address, lat, lng, ... }] }
 */
router.get('/search', requireAuth, async (req, res) => {
  const lat = req.query.lat != null && req.query.lat !== '' ? Number(req.query.lat) : null;
  const lng = req.query.lng != null && req.query.lng !== '' ? Number(req.query.lng) : null;
  const bias = Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : {};
  const places = await searchPlaces(req.query.q, bias);
  res.json({ places });
});

/**
 * GET /api/geo/reverse?lat=&lng= — reverse-geocode a pinned point (e.g. "use my
 * current location") into an address. { place: { ... } | null }
 */
router.get('/reverse', requireAuth, async (req, res) => {
  const place = await reverseGeocode(req.query.lat, req.query.lng);
  res.json({ place });
});

export default router;
