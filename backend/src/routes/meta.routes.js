import { Router } from 'express';
import { TASTE_TAGS } from '../constants/tasteTags.js';

const router = Router();

/** GET /api/meta/taste-tags — predefined taste-profile tags for the UI. */
router.get('/taste-tags', (req, res) => {
  res.json({ tasteTags: TASTE_TAGS });
});

export default router;
