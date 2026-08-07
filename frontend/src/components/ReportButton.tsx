import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Flag } from 'lucide-react'
import {
  apiPost,
  REPORT_REASONS,
  type Report,
  type ReportTargetType,
} from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { Button } from './ui/button'
import { Textarea } from './ui/textarea'

/**
 * A small "Report" control that opens a dialog to pick a reason and file a
 * report against a review or restaurant (Content.md §2.5). Signed-in only.
 */
export function ReportButton({
  targetType,
  targetId,
  label = 'Report',
}: {
  targetType: ReportTargetType
  targetId: string
  label?: string
}) {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState<string>(REPORT_REASONS[0])
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    setSubmitting(true)
    setError(null)
    try {
      const fullReason = note.trim() ? `${reason} — ${note.trim()}` : reason
      await apiPost<{ report: Report }>('/reports', { targetType, targetId, reason: fullReason })
      setDone(true)
      setOpen(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not send report')
    } finally {
      setSubmitting(false)
    }
  }

  if (done) return <span className="text-xs text-butter-500">Reported — thanks 🙏</span>

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 text-xs font-semibold text-butter-500 transition hover:text-berry-600"
      >
        <Flag className="h-3.5 w-3.5" /> {label}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-butter-900/50 px-4 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-butter-900">Report this {targetType}</h3>

            {!user ? (
              <p className="mt-3 text-sm text-butter-700">
                Please{' '}
                <Link to="/login" className="font-semibold text-berry-600 hover:underline">sign in</Link>{' '}
                to report content.
              </p>
            ) : (
              <>
                <p className="mt-1 text-sm text-butter-500">Tell us what's wrong.</p>
                <div className="mt-4 space-y-1.5">
                  {REPORT_REASONS.map((r) => (
                    <label
                      key={r}
                      className="flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-butter-900 transition hover:bg-butter-50"
                    >
                      <input type="radio" name="reason" value={r} checked={reason === r} onChange={() => setReason(r)} className="accent-berry-600" />
                      {r}
                    </label>
                  ))}
                </div>
                <Textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Add details (optional)"
                  rows={2}
                  className="mt-3"
                />
                {error && <p className="mt-2 text-sm text-berry-600">{error}</p>}
                <div className="mt-5 flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
                  <Button variant="accent" size="sm" onClick={submit} disabled={submitting}>
                    {submitting ? 'Sending…' : 'Submit report'}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
