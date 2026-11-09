import * as React from 'react'
import { Layout } from '@/components/Layout'
import { ErrorSummary } from '@/components/ui/ErrorSummary'
import { routeTitle } from '@/router'
import { getCase } from '@/lib/api'
import type { CaseRecord } from '@/lib/types'
import { getCaseIds } from '@/lib/storage'
import { hoursLeft } from '@/lib/dates'
import { ArrowRight } from 'lucide-react'

export default function Cases() {
  const [records, setRecords] = React.useState<CaseRecord[]>([])
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    let mounted = true
    const load = async () => {
      const ids = getCaseIds()
      const fetched: CaseRecord[] = []
      for (const id of ids) {
        try {
          const rec = await getCase(id)
          fetched.push(rec)
        } catch {
          // ignore cases that no longer exist on the server
        }
      }
      if (mounted) {
        setRecords(fetched.sort((a, b) => (a.created_at < b.created_at ? 1 : -1)))
        setLoading(false)
      }
    }
    if (mounted) void load()
    return () => {
      mounted = false
    }
  }, [])

  return (
    <Layout title={routeTitle('/cases')}>
      <ErrorSummary errors={[]} />

      <header className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-indigo-700">Overview</p>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950">My cases</h1>
          <p className="mt-2 max-w-[65ch] text-sm text-slate-600">
            Your cases are saved in this browser. Treat each case link like a key—anyone with it can view the case.
          </p>
        </div>
        {!loading && records.length > 0 && (
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm">
            <span className="size-2 rounded-full bg-indigo-500" aria-hidden="true" />
            {records.length} {records.length === 1 ? 'case' : 'cases'}
          </div>
        )}
      </header>

      {loading ? (
        <div className="space-y-3" aria-label="Loading cases" aria-busy="true">
          {[0, 1, 2].map((item) => (
            <div key={item} className="h-24 animate-pulse rounded-2xl border border-slate-200 bg-white" />
          ))}
          <p className="sr-only">Loading your cases…</p>
        </div>
      ) : records.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-indigo-50 text-indigo-700" aria-hidden="true">
            <span className="text-xl">↗</span>
          </span>
          <h2 className="mt-4 font-semibold text-slate-950">No cases yet</h2>
          <p className="mt-1 text-sm text-slate-600">Start a complaint to create your first case record.</p>
          <a href="/start" className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">
            Start a complaint
          </a>
        </div>
      ) : (
        <div className="grid gap-3">
          {records.map((rec) => {
            const left = hoursLeft(rec.deadline_at)
            const statusClass = rec.status === 'resolved'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : rec.status === 'escalated'
                ? 'border-rose-200 bg-rose-50 text-rose-800'
                : 'border-indigo-200 bg-indigo-50 text-indigo-800'
            const deadlineClass = left !== null && left <= 24
              ? 'border-amber-200 bg-amber-50 text-amber-900'
              : 'border-slate-200 bg-slate-50 text-slate-700'
            return (
              <article key={rec.id} className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.04)] transition-all hover:border-indigo-200 hover:shadow-md sm:p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${statusClass}`}>
                        {rec.status.replace(/_/g, ' ')}
                      </span>
                      <span className="text-xs text-slate-500">{rec.problem_type.replace(/_/g, ' ')}</span>
                    </div>
                    <a href={`/case/${rec.id}`} className="mt-3 inline-flex items-center gap-2 font-mono text-sm font-semibold tracking-tight text-indigo-700 hover:text-indigo-900 focus-visible:rounded-sm focus-visible:outline-indigo-600">
                      {rec.id}
                      <span className="font-sans text-xs font-normal text-slate-500">· {rec.bank_name}</span>
                    </a>
                  </div>
                  <div className="flex items-center justify-between gap-4 sm:justify-end">
                    <div className={`rounded-xl border px-3.5 py-2 text-right ${deadlineClass}`}>
                      <p className="text-[9px] font-semibold uppercase tracking-wider opacity-75">Response window</p>
                      <p className="mt-0.5 font-mono text-sm font-semibold tracking-tight tabular-nums">
                        {rec.status === 'resolved' ? 'Resolved' : left === null ? 'No deadline' : left <= 0 ? 'Passed' : `${left}h left`}
                      </p>
                    </div>
                    <a href={`/case/${rec.id}`} aria-label={`Open case ${rec.id}`} className="grid size-10 shrink-0 place-items-center rounded-xl border border-slate-200 text-slate-500 transition-colors group-hover:border-indigo-200 group-hover:bg-indigo-50 group-hover:text-indigo-700 focus-visible:outline-3 focus-visible:outline-indigo-600">
                      <ArrowRight size={17} aria-hidden="true" />
                    </a>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </Layout>
  )
}
