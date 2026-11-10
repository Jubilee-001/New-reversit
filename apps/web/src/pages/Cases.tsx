import * as React from 'react'
import { ArrowRight, CheckCircle2, Clock3, Search, TriangleAlert } from 'lucide-react'
import { Layout } from '@/components/Layout'
import { Banner } from '@/components/ui/Banner'
import { routeTitle } from '@/router'
import { ApiError, getCase } from '@/lib/api'
import type { CaseRecord } from '@/lib/types'
import { getCaseIds, removeCaseId } from '@/lib/storage'
import { hoursLeft } from '@/lib/dates'
import { buildMailto } from '@/lib/mailto'
import { notify } from '@/lib/toast'

type CaseFilter = 'all' | 'active' | 'breached' | 'resolved'

const money = new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' })

export default function Cases() {
  const [records, setRecords] = React.useState<CaseRecord[]>([])
  const [loading, setLoading] = React.useState(true)
  const [loadError, setLoadError] = React.useState<string | null>(null)
  const [query, setQuery] = React.useState('')
  const [filter, setFilter] = React.useState<CaseFilter>('all')
  const [now, setNow] = React.useState(() => Date.now())

  React.useEffect(() => {
    let mounted = true
    const load = async () => {
      try {
        const ids = getCaseIds()
        const results = await Promise.allSettled(ids.map((id) => getCase(id)))
        const fetched: CaseRecord[] = []
        let hasLoadFailure = false
        results.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            fetched.push(result.value)
          } else if (result.reason instanceof ApiError && result.reason.status === 404) {
            const missingId = ids[index]
            if (missingId) removeCaseId(missingId)
          } else {
            hasLoadFailure = true
          }
        })
        if (mounted) {
          setRecords(fetched.sort((a, b) => b.created_at.localeCompare(a.created_at)))
          if (hasLoadFailure) {
            setLoadError('Some saved cases could not be loaded. Check your connection and refresh to try again.')
          }
        }
      } catch {
        if (mounted) setLoadError('Your saved cases could not be loaded. Check your connection and try again.')
      } finally {
        if (mounted) setLoading(false)
      }
    }
    void load()
    const timer = window.setInterval(() => setNow(Date.now()), 60_000)
    return () => {
      mounted = false
      window.clearInterval(timer)
    }
  }, [])

  const activeCases = records.filter((record) => record.status !== 'resolved')
  const breachedCases = activeCases.filter((record) => isBreached(record, now))
  const recoveringValue = activeCases.reduce((total, record) => total + record.amount, 0)
  const normalizedQuery = query.trim().toLowerCase()
  const visibleRecords = records.filter((record) => {
    const breached = isBreached(record, now)
    if (filter === 'active' && record.status === 'resolved') return false
    if (filter === 'breached' && !breached) return false
    if (filter === 'resolved' && record.status !== 'resolved') return false
    if (!normalizedQuery) return true
    return [
      record.bank_name,
      record.channel,
      record.id,
      record.reference,
      record.problem_type,
      record.status,
    ].some((value) => value.toLowerCase().includes(normalizedQuery))
  })

  const escalateToCbn = (record: CaseRecord) => {
    const subject = `Escalation: unresolved ${record.channel.toUpperCase()} debit — ${record.reference}`
    const body = [
      'Dear Consumer Protection Department,',
      '',
      `I am requesting guidance about an unresolved complaint to ${record.bank_name}.`,
      '',
      'Case audit trail:',
      `Case ID: ${record.id}`,
      `Prepared: ${record.created_at}`,
      `Bank complaint sent: ${record.sent_at ?? 'Not recorded'}`,
      `Transaction date and time: ${record.txn_date} ${record.txn_time} WAT`,
      `Channel: ${record.channel.toUpperCase()}`,
      `Disputed amount: ${money.format(record.amount)}`,
      `Session/reference ID: ${record.reference}`,
      `Bank ticket: ${record.bank_ticket || 'Not provided'}`,
      `Current status: ${record.status.replace(/_/g, ' ')}`,
      '',
      'Original complaint:',
      record.complaint_text,
      '',
      'I understand I should first complain to my bank and retain the correspondence and supporting evidence.',
      '',
      'Thank you,',
      '[Your name]',
    ].join('\n')
    notify('Opening a CBN escalation draft in your email app.', 'info')
    window.open(buildMailto('cpd@cbn.gov.ng', subject, body), '_self')
  }

  return (
    <Layout title={routeTitle('/cases')}>
      {loadError && <Banner kind="error" title="Cases could not all be loaded" body={loadError} />}
      <header className="mb-7">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-indigo-700">Overview</p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-['Plus_Jakarta_Sans'] text-3xl font-extrabold tracking-tight text-slate-900">My cases</h1>
            <p className="mt-2 max-w-[65ch] text-sm leading-6 text-slate-600">
              Track the complaints saved from this browser. Treat each case link like a key—anyone with it can view the case.
            </p>
          </div>
          <a href="/start" className="inline-flex min-h-11 w-fit items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700">
            Start a complaint <ArrowRight size={16} aria-hidden="true" />
          </a>
        </div>
      </header>

      <section aria-label="Case summary" className="mb-7 grid gap-3 sm:grid-cols-3">
        <MetricCard label="Active disputes" value={loading ? '—' : String(activeCases.length)} detail="Not yet marked resolved" />
        <MetricCard label="SLA breaches" value={loading ? '—' : String(breachedCases.length)} detail="Past their recorded response window" alert={breachedCases.length > 0} />
        <MetricCard label="Total recovering value" value={loading ? '—' : money.format(recoveringValue)} detail="Open disputes, not a guaranteed recovery" mono />
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div>
            <h2 className="font-['Plus_Jakarta_Sans'] text-lg font-bold tracking-tight text-slate-900">Dispute activity</h2>
            <p className="mt-0.5 text-xs text-slate-600">{visibleRecords.length} {visibleRecords.length === 1 ? 'case' : 'cases'} shown</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <label className="relative block">
              <span className="sr-only">Search cases</span>
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search bank, reference…" className="min-h-10 w-full rounded-lg border border-slate-200 pl-9 pr-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 sm:w-56" />
            </label>
            <label>
              <span className="sr-only">Filter cases</span>
              <select value={filter} onChange={(event) => setFilter(event.target.value as CaseFilter)} className="min-h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 sm:w-40">
                <option value="all">All cases</option>
                <option value="active">Active</option>
                <option value="breached">SLA passed</option>
                <option value="resolved">Resolved</option>
              </select>
            </label>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3 p-5" aria-label="Loading cases" aria-busy="true">
            {[0, 1, 2].map((item) => <div key={item} className="h-16 animate-pulse rounded-xl bg-slate-100" />)}
            <p className="sr-only">Loading your cases…</p>
          </div>
        ) : visibleRecords.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="font-semibold text-slate-900">{records.length ? 'No matching cases' : 'No cases yet'}</p>
            <p className="mt-1 text-sm text-slate-600">{records.length ? 'Try another search or filter.' : 'Start a complaint to create your first case record.'}</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {visibleRecords.map((record) => (
              <CaseRow key={record.id} record={record} now={now} onEscalate={() => escalateToCbn(record)} />
            ))}
          </div>
        )}
      </section>
    </Layout>
  )
}

function MetricCard({ label, value, detail, mono = false, alert = false }: { label: string; value: string; detail: string; mono?: boolean; alert?: boolean }) {
  return (
    <article className={`rounded-2xl border bg-white p-4 shadow-sm ${alert ? 'border-rose-200' : 'border-slate-200/80'}`}>
      <p className="text-xs font-semibold text-slate-600">{label}</p>
      <p className={`mt-2 truncate text-2xl font-bold tracking-tight ${mono ? "font-['JetBrains_Mono'] tabular-nums text-slate-900" : "font-['Plus_Jakarta_Sans'] text-slate-900"}`}>{value}</p>
      <p className="mt-1 text-xs leading-5 text-slate-500">{detail}</p>
    </article>
  )
}

function CaseRow({ record, now, onEscalate }: { record: CaseRecord; now: number; onEscalate: () => void }) {
  const left = hoursLeft(record.deadline_at, new Date(now))
  const breached = isBreached(record, now)
  const resolved = record.status === 'resolved'
  const urgency = resolved
    ? <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-800"><CheckCircle2 size={13} aria-hidden="true" />Resolved</span>
    : breached
      ? <span className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-[10px] font-semibold text-rose-800"><span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-500 opacity-75" /><span className="relative inline-flex h-2 w-2 rounded-full bg-rose-600" /></span>SLA passed · action available</span>
      : left === null
        ? <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-semibold text-slate-700">No fixed window</span>
        : <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-semibold text-amber-900"><Clock3 size={13} aria-hidden="true" />In window · {left}h remaining</span>

  return (
    <article className="grid gap-3 px-4 py-4 sm:px-5 lg:grid-cols-[1fr_auto] lg:items-center">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold text-slate-900">{record.bank_name}</p>
          {urgency}
        </div>
        <div className="mt-2 grid gap-x-5 gap-y-1 text-xs text-slate-600 sm:grid-cols-2 lg:grid-cols-5">
          <span>Date: <span className="font-mono tabular-nums text-slate-800">{record.txn_date}</span></span>
          <span>Channel: <span className="font-medium text-slate-800">{record.channel.toUpperCase()}</span></span>
          <span className="truncate">Session ID: <span className="font-mono tabular-nums text-slate-800">{record.reference}</span></span>
          <span>Amount: <span className="font-mono font-medium tabular-nums text-slate-900">{money.format(record.amount)}</span></span>
          <span className="truncate">Case: <span className="font-mono tabular-nums">{record.id}</span></span>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {breached && (
          <button type="button" onClick={onEscalate} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-rose-700 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-rose-800">
            <TriangleAlert size={14} aria-hidden="true" /> Escalate to CBN Consumer Protection
          </button>
        )}
        <a href={`/case/${record.id}`} className="inline-flex min-h-10 items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-800">
          View case <ArrowRight size={14} aria-hidden="true" />
        </a>
      </div>
    </article>
  )
}

function isBreached(record: CaseRecord, now: number): boolean {
  return record.status !== 'resolved'
    && Boolean(record.deadline_at && new Date(record.deadline_at).getTime() <= now)
}
