import * as React from 'react'
import { Layout } from '@/components/Layout'
import { ErrorSummary } from '@/components/ui/ErrorSummary'
import { routeTitle } from '@/router'
import { getCase } from '@/lib/api'
import type { CaseRecord } from '@/lib/types'
import { getCaseIds } from '@/lib/storage'
import { hoursLeft } from '@/lib/dates'

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

      <h1 className="text-2xl font-semibold">My cases</h1>
      <p className="mt-2 max-w-[65ch] text-[var(--muted)]">
        Cases are saved in this browser only (local storage). Your case link is the access key — anyone with the
        link can see the case, so do not share it publicly.
      </p>

      {loading ? (
        <p className="mt-4 text-[var(--muted)]">Loading your cases…</p>
      ) : records.length === 0 ? (
        <div className="mt-8 rounded-md border p-6 text-[var(--muted)]">
          You have no saved cases yet. Start a complaint to create one.
        </div>
      ) : (
        <div className="mt-8 overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm min-w-[600px]">
            <thead>
              <tr className="border-b border-[var(--line)]">
                <th className="pb-3 font-medium text-[var(--ink)]">Case</th>
                <th className="pb-3 font-medium text-[var(--ink)]">Problem</th>
                <th className="pb-3 font-medium text-[var(--ink)]">Bank</th>
                <th className="pb-3 font-medium text-[var(--ink)]">Status</th>
                <th className="pb-3 font-medium text-[var(--ink)]">Time left</th>
              </tr>
            </thead>
            <tbody>
              {records.map((rec) => {
                const left = hoursLeft(rec.deadline_at)
                return (
                  <tr key={rec.id} className="border-b border-[var(--line)]">
                    <td className="py-3">
                      <a href={`/case/${rec.id}`} className="font-mono text-[var(--accent)] underline underline-offset-4">
                        {rec.id}
                      </a>
                    </td>
                    <td className="py-3 text-[var(--muted)]">{rec.problem_type.replace(/_/g, ' ')}</td>
                    <td className="py-3 text-[var(--muted)]">{rec.bank_name}</td>
                    <td className="py-3">
                      <span className={`inline-block rounded-sm px-2 py-0.5 text-xs font-medium ${
                        rec.status === 'resolved'
                          ? 'bg-[#f1f8f4] text-[var(--ok)] border border-[var(--ok)]'
                          : rec.status === 'escalated'
                            ? 'bg-[#fbeeec] text-[var(--danger)] border border-[var(--danger)]'
                            : 'bg-[#eef3f5] text-[var(--ink)] border border-[var(--line)]'
                      }`}>
                        {rec.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-3 text-[var(--muted)]">
                      {rec.status === 'resolved' ? 'Resolved' : left === null ? 'No deadline' : left <= 0 ? 'Passed' : `${left}h left`}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </Layout>
  )
}
