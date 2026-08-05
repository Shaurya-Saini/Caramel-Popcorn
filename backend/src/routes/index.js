import { Router } from 'express';
import { isSupabaseConfigured } from '../config/index.js';

const router = Router();

/**
 * Health check — confirms the API is up and reports whether Supabase is wired.
 * GET /api/health
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'caramel-popcorn-api',
    supabase: isSupabaseConfigured ? 'configured' : 'not-configured',
    timestamp: new Date().toISOString(),
  });
});

// Feature routers get mounted here as they are built:
// router.use('/auth', authRoutes);
// router.use('/restaurants', restaurantRoutes);
// router.use('/reviews', reviewRoutes);
// router.use('/reports', reportRoutes);

export default router;
