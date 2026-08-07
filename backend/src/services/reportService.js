import { requireSupabase } from '../config/supabase.js';
import { getReviewById } from './reviewService.js';
import { getRestaurantById } from './restaurantService.js';

const TABLE = 'reports';

export const TARGET_TYPES = ['review', 'restaurant'];
export const REPORT_STATUSES = ['open', 'reviewed', 'dismissed', 'actioned'];

function toReport(row) {
  if (!row) return null;
  return {
    id: row.id,
    targetType: row.target_type,
    targetId: row.target_id,
    reporterId: row.reporter_id,
    reason: row.reason,
    status: row.status,
    createdAt: row.created_at,
  };
}

/** Confirm the reported target exists; throws 404 if not. Returns a short label. */
async function resolveTargetLabel(targetType, targetId) {
  if (targetType === 'restaurant') {
    const r = await getRestaurantById(targetId);
    if (!r) return null;
    return r.name;
  }
  // review
  const row = await getReviewById(targetId);
  if (!row) return null;
  return 'Review';
}

/**
 * File a report against a review or restaurant. Verifies the target exists.
 * To avoid spam, an existing OPEN report from the same reporter for the same
 * target is returned as-is instead of inserting a duplicate.
 */
export async function createReport({ reporterId, targetType, targetId, reason }) {
  if (!TARGET_TYPES.includes(targetType)) {
    const e = new Error('targetType must be "review" or "restaurant"');
    e.status = 400;
    throw e;
  }
  if (!targetId || typeof targetId !== 'string') {
    const e = new Error('targetId is required');
    e.status = 400;
    throw e;
  }

  const label = await resolveTargetLabel(targetType, targetId);
  if (label === null) {
    const e = new Error('Reported item not found');
    e.status = 404;
    throw e;
  }

  const sb = requireSupabase();

  // Dedupe: reuse an existing open report by this reporter for this target.
  const { data: existing, error: exErr } = await sb
    .from(TABLE)
    .select('*')
    .eq('reporter_id', reporterId)
    .eq('target_type', targetType)
    .eq('target_id', targetId)
    .eq('status', 'open')
    .maybeSingle();
  if (exErr) throw exErr;
  if (existing) return toReport(existing);

  const { data, error } = await sb
    .from(TABLE)
    .insert({
      reporter_id: reporterId,
      target_type: targetType,
      target_id: targetId,
      reason: reason?.trim() || null,
    })
    .select()
    .single();
  if (error) throw error;
  return toReport(data);
}

/**
 * Admin queue: reports (optionally filtered by status), newest first, each
 * enriched with the reporter's name and a short target label for context.
 */
export async function listReports({ status } = {}) {
  const sb = requireSupabase();
  let query = sb
    .from(TABLE)
    .select('*, reporter:users(id, name, email)')
    .order('created_at', { ascending: false });
  if (status) query = query.eq('status', status);

  const { data, error } = await query;
  if (error) throw error;

  return Promise.all(
    (data ?? []).map(async (row) => ({
      ...toReport(row),
      reporter: row.reporter
        ? { id: row.reporter.id, name: row.reporter.name, email: row.reporter.email }
        : null,
      targetLabel: await resolveTargetLabel(row.target_type, row.target_id),
    }))
  );
}

/** Admin: move a report through the workflow. */
export async function updateReportStatus(id, status) {
  if (!REPORT_STATUSES.includes(status)) {
    const e = new Error(`status must be one of: ${REPORT_STATUSES.join(', ')}`);
    e.status = 400;
    throw e;
  }
  const sb = requireSupabase();
  const { data, error } = await sb
    .from(TABLE)
    .update({ status })
    .eq('id', id)
    .select()
    .maybeSingle();
  if (error) throw error;
  if (!data) {
    const e = new Error('Report not found');
    e.status = 404;
    throw e;
  }
  return toReport(data);
}
