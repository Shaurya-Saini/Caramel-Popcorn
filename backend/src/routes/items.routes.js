import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { deleteItem } from '../services/favouriteItemService.js';

const router = Router();

/** DELETE /api/items/:id — remove a favourite item (owner only). */
router.delete('/:id', requireAuth, async (req, res) => {
  await deleteItem(req.params.id, req.user.id);
  res.json({ ok: true });
});

export default router;
