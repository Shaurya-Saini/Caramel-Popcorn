import { Router } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { createReport, listReports, updateReportStatus } from '../services/reportService.js';

const router = Router();

/**
 * POST /api/reports — file a report (auth required).
 * Body: { targetType: 'review'|'restaurant', targetId, reason? }
 * Idempotent per (reporter, target) while the prior report is still open.
 */
router.post('/', requireAuth, async (req, res) => {
  const { targetType, targetId, reason } = req.body ?? {};
  const report = await createReport({
    reporterId: req.user.id,
    targetType,
    targetId,
    reason,
  });
  res.status(201).json({ report });
});

/**
 * GET /api/reports — moderation queue (admin only). Query: ?status=<status>.
 */
router.get('/', requireAuth, requireAdmin, async (req, res) => {
  const reports = await listReports({ status: req.query.status });
  res.json({ reports });
});

/**
 * PATCH /api/reports/:id — move a report through the workflow (admin only).
 * Body: { status: 'open'|'reviewed'|'dismissed'|'actioned' }
 */
router.patch('/:id', requireAuth, requireAdmin, async (req, res) => {
  const report = await updateReportStatus(req.params.id, req.body?.status);
  res.json({ report });
});

export default router;
