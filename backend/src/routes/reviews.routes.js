import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { singlePhoto } from '../middleware/upload.js';
import { createReview, updateReview, deleteReview } from '../services/reviewService.js';
import { getRestaurantById } from '../services/restaurantService.js';
import { addItem, listItems } from '../services/favouriteItemService.js';

const router = Router();

/**
 * POST /api/reviews — create the signed-in user's review for a restaurant.
 * Body: { restaurantId, ratings:{food,service,price,ambiance}, textReview,
 *         isPublicGeneric, isPublicItems }
 */
router.post('/', requireAuth, async (req, res) => {
  const { restaurantId } = req.body ?? {};
  if (!restaurantId) {
    return res.status(400).json({ error: 'Bad Request', message: 'restaurantId is required' });
  }
  const restaurant = await getRestaurantById(restaurantId);
  if (!restaurant) {
    return res.status(404).json({ error: 'Not Found', message: 'Restaurant not found' });
  }

  const review = await createReview(req.user.id, req.body);
  res.status(201).json({ review });
});

/** PATCH /api/reviews/:id — edit own review. */
router.patch('/:id', requireAuth, async (req, res) => {
  const review = await updateReview(req.params.id, req.user.id, req.body ?? {});
  res.json({ review });
});

/** DELETE /api/reviews/:id — delete own review. */
router.delete('/:id', requireAuth, async (req, res) => {
  await deleteReview(req.params.id, req.user.id);
  res.json({ ok: true });
});

/** GET /api/reviews/:id/items — the owner's favourite items (signed photo URLs). */
router.get('/:id/items', requireAuth, async (req, res) => {
  const items = await listItems(req.params.id, req.user.id);
  res.json({ items });
});

/**
 * POST /api/reviews/:id/items — add a favourite item (multipart).
 * Fields: itemName, note?, photo? (image — compressed server-side).
 */
router.post('/:id/items', requireAuth, singlePhoto, async (req, res) => {
  const { itemName, note } = req.body ?? {};
  if (!itemName || !itemName.trim()) {
    return res.status(400).json({ error: 'Bad Request', message: 'itemName is required' });
  }
  const item = await addItem({
    reviewId: req.params.id,
    userId: req.user.id,
    itemName,
    note,
    photoBuffer: req.file?.buffer ?? null,
  });
  res.status(201).json({ item });
});

export default router;
