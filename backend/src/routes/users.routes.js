import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { updateProfile } from '../services/userService.js';
import { TASTE_TAG_SET } from '../constants/tasteTags.js';

const router = Router();

/**
 * PATCH /api/users/me — update the signed-in user's profile.
 * Accepts: name, tasteTags[], manualLocation, lat, lng.
 */
router.patch('/me', requireAuth, async (req, res) => {
  const { name, tasteTags, manualLocation, lat, lng } = req.body ?? {};

  if (tasteTags !== undefined) {
    if (!Array.isArray(tasteTags) || tasteTags.some((t) => !TASTE_TAG_SET.has(t))) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'tasteTags must be an array of predefined tags',
      });
    }
  }
  if (name !== undefined && typeof name !== 'string') {
    return res.status(400).json({ error: 'Bad Request', message: 'name must be a string' });
  }
  // Coordinates: allow null (clear) or a valid pair; reject out-of-range/NaN.
  for (const [key, val, min, max] of [['lat', lat, -90, 90], ['lng', lng, -180, 180]]) {
    if (val !== undefined && val !== null) {
      const n = Number(val);
      if (Number.isNaN(n) || n < min || n > max) {
        return res.status(400).json({ error: 'Bad Request', message: `${key} is out of range` });
      }
    }
  }

  const updated = await updateProfile(req.user.id, { name, tasteTags, manualLocation, lat, lng });
  res.json({ user: updated });
});

export default router;
