import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiGet, apiPatch, type Report, type ReportStatus } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { Container } from '../components/ui/container'
import { Card } from '../components/ui/card'
import { Badge } from '../components/ui/badge'

const STATUS_FILTERS: Array<ReportStatus | 'all'> = ['open', 'reviewed', 'actioned', 'dismissed', 'all']

const STATUS_VARIANT: Record<ReportStatus, 'accent' | 'default' | 'success' | 'secondary'> = {
  open: 'accent',
  reviewed: 'default',
  actioned: 'success',
  dismissed: 'secondary',
}

export default function AdminReports() {
  const { user } = useAuth()
  const [filter, setFilter] = useState<ReportStatus | 'all'>('open')
  const [reports, setReports] = useState<Report[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setReports(null)
    setError(null)
    try {
      const q = filter === 'all' ? '' : `?status=${filter}`
      const { reports } = await apiGet<{ reports: Report[] }>(`/reports${q}`)
      setReports(reports)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load reports')
    }
  }, [filter])

  useEffect(() => {
    if (user?.isAdmin) load()
  }, [user?.isAdmin, load])

  async function setStatus(id: string, status: ReportStatus) {
    try {
      await apiPatch<{ report: Report }>(`/reports/${id}`, { status })
      setReports((prev) =>
        (prev ?? [])
          .map((r) => (r.id === id ? { ...r, status } : r))
          .filter((r) => filter === 'all' || r.status === filter),
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed')
    }
  }

  if (!user) return null
  if (!user.isAdmin) {
    return (
      <Container size="narrow" className="py-10">
        <p className="text-butter-700">You don’t have access to the moderation queue.</p>
      </Container>
    )
  }

  return (
    <Container size="narrow" className="py-10">
      <h1 className="font-display text-3xl font-semibold text-butter-900">Moderation queue</h1>
      <p className="mt-1 text-butter-700">Reports from the community, newest first.</p>

      <div className="mt-5 flex flex-wrap gap-2">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={
              'rounded-full border px-3.5 py-1.5 text-sm font-semibold capitalize transition ' +
              (filter === s
                ? 'border-popcorn-500 bg-popcorn-500 text-butter-900 shadow-sm'
                : 'border-border bg-white text-butter-700 hover:border-popcorn-400')
            }
          >
            {s}
          </button>
        ))}
      </div>

      {error && <p className="mt-4 text-berry-600">{error}</p>}
      {reports === null && !error && <p className="mt-6 text-butter-500">Loading…</p>}
      {reports?.length === 0 && <p className="mt-10 text-center text-butter-500">No reports here 🎉</p>}

      <div className="mt-6 space-y-3">
        {reports?.map((r) => (
          <Card key={r.id} className="p-5">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="uppercase">{r.targetType}</Badge>
              <Badge variant={STATUS_VARIANT[r.status]} className="capitalize">{r.status}</Badge>
            </div>
            <div className="mt-2 font-semibold text-butter-900">
              {r.targetType === 'restaurant' ? (
                <Link to={`/restaurants/${r.targetId}`} className="hover:underline">{r.targetLabel ?? 'Restaurant'}</Link>
              ) : (
                r.targetLabel ?? 'Review'
              )}
            </div>
            {r.reason && <p className="mt-1 text-sm text-butter-700">“{r.reason}”</p>}
            <p className="mt-1 text-xs text-butter-500">
              by {r.reporter?.name ?? r.reporter?.email ?? 'unknown'} · {new Date(r.createdAt).toLocaleDateString()}
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              {(['reviewed', 'actioned', 'dismissed', 'open'] as ReportStatus[])
                .filter((s) => s !== r.status)
                .map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatus(r.id, s)}
                    className="rounded-full border border-border px-3 py-1 text-xs font-semibold capitalize text-butter-700 transition hover:border-popcorn-400 hover:bg-popcorn-50"
                  >
                    Mark {s}
                  </button>
                ))}
            </div>
          </Card>
        ))}
      </div>
    </Container>
  )
}
