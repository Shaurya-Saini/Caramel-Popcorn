import { Router } from 'express';
import { requireAuth, attachUser } from '../middleware/auth.js';
import {
  findMatches,
  createRestaurant,
  getRestaurantById,
  listRestaurants,
} from '../services/restaurantService.js';
import { listForRestaurant, getOwnReview } from '../services/reviewService.js';

const router = Router();

/** Validate an optional coordinate pair; returns { lat, lng } or throws 400. */
function parseCoords(lat, lng) {
  if (lat === undefined && lng === undefined) return { lat: null, lng: null };
  const nlat = Number(lat);
  const nlng = Number(lng);
  if (
    Number.isNaN(nlat) || Number.isNaN(nlng) ||
    nlat < -90 || nlat > 90 || nlng < -180 || nlng > 180
  ) {
    const err = new Error('lat/lng must be valid coordinates');
    err.status = 400;
    throw err;
  }
  return { lat: nlat, lng: nlng };
}

/**
 * GET /api/restaurants — public list.
 * Query: ?cuisine=<tag>&sort=recent|name
 */
router.get('/', async (req, res) => {
  const { cuisine, sort } = req.query;
  const restaurants = await listRestaurants({ cuisine, sort });
  res.json({ restaurants });
});

/**
 * POST /api/restaurants/duplicate-check — fuzzy candidates for a proposed place.
 * Body: { name, lat?, lng? }. Lets the UI show "Did you mean …?" before creating.
 */
router.post('/duplicate-check', requireAuth, async (req, res) => {
  const { name, lat, lng } = req.body ?? {};
  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'Bad Request', message: 'name is required' });
  }
  const coords = parseCoords(lat, lng);
  const matches = await findMatches({ name: name.trim(), ...coords });
  res.json({ matches });
});

/**
 * GET /api/restaurants/:id — public detail.
 */
router.get('/:id', async (req, res) => {
  const restaurant = await getRestaurantById(req.params.id);
  if (!restaurant) {
    return res.status(404).json({ error: 'Not Found', message: 'Restaurant not found' });
  }
  res.json({ restaurant });
});

/**
 * GET /api/restaurants/:id/reviews — public list, privacy-filtered by viewer.
 * Optional auth: signed-in owners additionally see their own private parts.
 */
router.get('/:id/reviews', attachUser, async (req, res) => {
  const result = await listForRestaurant(req.params.id, req.user?.id ?? null);
  res.json(result);
});

/**
 * GET /api/restaurants/:id/my-review — the signed-in user's own review (or null).
 */
router.get('/:id/my-review', requireAuth, async (req, res) => {
  const review = await getOwnReview(req.user.id, req.params.id);
  res.json({ review });
});

/**
 * POST /api/restaurants — create (auth required).
 * Runs fuzzy dedup first: if candidates exist and `confirmCreate` is not true,
 * responds 409 with the candidates so the client can prompt "Did you mean …?".
 * Body: { name, address?, lat?, lng?, cuisineTags?, confirmCreate? }
 */
router.post('/', requireAuth, async (req, res) => {
  const { name, address, lat, lng, cuisineTags, confirmCreate } = req.body ?? {};

  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'Bad Request', message: 'name is required' });
  }
  const coords = parseCoords(lat, lng);

  if (!confirmCreate) {
    const matches = await findMatches({ name: name.trim(), ...coords });
    if (matches.length > 0) {
      return res.status(409).json({
        error: 'Possible duplicate',
        message: 'Did you mean one of these? Re-submit with confirmCreate:true to add anyway.',
        matches,
      });
    }
  }

  const restaurant = await createRestaurant({
    name,
    address,
    ...coords,
    cuisineTags,
    createdBy: req.user.id,
  });
  res.status(201).json({ restaurant });
});

export default router;
