import { Router } from 'express';
import { isSupabaseConfigured, isGoogleConfigured } from '../config/index.js';
import authRoutes from './auth.routes.js';
import userRoutes from './users.routes.js';
import metaRoutes from './meta.routes.js';
import restaurantRoutes from './restaurants.routes.js';
import reviewRoutes from './reviews.routes.js';
import itemRoutes from './items.routes.js';
import reportRoutes from './reports.routes.js';
import geoRoutes from './geo.routes.js';

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
    google: isGoogleConfigured ? 'configured' : 'not-configured',
    timestamp: new Date().toISOString(),
  });
});

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/meta', metaRoutes);
router.use('/restaurants', restaurantRoutes);
router.use('/reviews', reviewRoutes);
router.use('/items', itemRoutes);
router.use('/reports', reportRoutes);
router.use('/geo', geoRoutes);

export default router;
