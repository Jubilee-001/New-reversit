import * as React from 'react'
import { Layout } from '@/components/Layout'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Banner } from '@/components/ui/Banner'
import { getCase, bankReply, resolveCase, escalateCase } from '@/lib/api'
import { formatWAT, countdownText } from '@/lib/dates'
import type { CaseRecord } from '@/lib/types'

const STATUS_ORDER: string[] = ['draft_ready', 'sent', 'bank_replied', 'resolved', 'escalated']

export default function CaseView({ params }: { params?: { id: string } }) {
  const id = params?.id ?? ''
  const [record, setRecord] = React.useState<CaseRecord | null>(null)
  const [apiError, setApiError] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [ticket, setTicket] = React.useState('')
  const [note, setNote] = React.useState('')
  const [countdown, setCountdown] = React.useState<{ hours: number | null; passed: boolean }>({ hours: null, passed: false })

  React.useEffect(() => {
    let mounted = true
    const load = async () => {
      try {
        const rec = await getCase(id)
        setRecord(rec)
      } catch {
        setApiError("We couldn’t find that case.")
      } finally {
        setLoading(false)
      }
    }
    if (mounted) void load()
    return () => {
      mounted = false
    }
  }, [id])

  React.useEffect(() => {
    const tick = () => {
      if (record) setCountdown(countdownText(record.deadline_at))
    }
    tick()
    const timer = setInterval(tick, 60 * 1000)
    return () => clearInterval(timer)
  }, [record])

  const isSent = record?.status === 'sent'

  const markBankReplied = async () => {
    if (!record) return
    setApiError(null)
    try {
      const updated = await bankReply(record.id, ticket || undefined, note || undefined)
      setRecord(updated)
      setTicket('')
      setNote('')
    } catch {
      setApiError("We couldn’t record the bank’s reply. Try again.")
    }
  }

  const markResolved = async () => {
    if (!record) return
    setApiError(null)
    try {
      setRecord(await resolveCase(record.id))
    } catch {
      setApiError("We couldn’t mark the case as resolved. Try again.")
    }
  }

  const markEscalated = async () => {
    if (!record) return
    setApiError(null)
    try {
      setRecord(await escalateCase(record.id, 1))
    } catch {
      setApiError("We couldn’t escalate the case. Try again.")
    }
  }

  const addReminder = () => {
    if (!record?.deadline_at) return
    const deadline = new Date(record.deadline_at)
    const end = new Date(deadline.getTime() + 60 * 60 * 1000)
    const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//ReverseIt//Case Deadline//EN',
      'BEGIN:VEVENT',
      `UID:reverseit-case-${record.id}@reverseit.example`,
      `DTSTAMP:${fmt(new Date())}`,
      `DTSTART:${fmt(deadline)}`,
      `DTEND:${fmt(end)}`,
      `SUMMARY:ReverseIt — CBN deadline for case ${record.id}`,
      `DESCRIPTION:Deadline for your complaint to ${record.bank_name}. Counted from when you told us you sent it.`,
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n')
    const blob = new Blob([ics], { type: 'text/calendar' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `reverseit-case-${record.id}-deadline.ics`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const statusLabel: Record<string, string> = {
    draft_ready: 'Draft — complaint ready to send',
    sent: 'Sent — waiting on your bank',
    bank_replied: 'Bank replied',
    resolved: 'Resolved',
    escalated: 'Escalated',
  }

  if (loading) return <Layout title={`Case — ReverseIt`}><p className="text-[var(--muted)]">Loading your case…</p></Layout>
  if (!record) {
    return (
      <Layout title={`Case — ReverseIt`}>
        {apiError && <Banner kind="error" title={apiError} />}
      </Layout>
    )
  }

  const { hours, passed } = countdown
  const deadlineProgress = record.sent_at && record.deadline_at
    ? Math.max(0, Math.min(100, ((Date.now() - new Date(record.sent_at).getTime()) /
      (new Date(record.deadline_at).getTime() - new Date(record.sent_at).getTime())) * 100))
    : null
  const deadlineTone = passed
    ? 'border-rose-200 bg-rose-50 text-rose-900'
    : hours !== null && hours <= 24
      ? 'border-amber-200 bg-amber-50 text-amber-950'
      : 'border-indigo-200 bg-indigo-50 text-indigo-950'

  return (
    <Layout title={`Case ${record.id} — ReverseIt`}>
      {apiError && <Banner kind="error" title={apiError} />}

      <header className="mb-7 rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)] sm:p-6">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-indigo-700">Case record</p>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Your case</h1>
            <p className="mt-2 text-sm text-slate-600">
              Created {formatWAT(record.created_at)} · {record.bank_name}
            </p>
          </div>
          <span className={`inline-flex w-fit items-center rounded-full border px-3 py-1.5 text-xs font-semibold ${deadlineTone}`}>
            {statusLabel[record.status]}
          </span>
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-slate-100 pt-4 text-xs text-slate-500">
          <span className="font-semibold uppercase tracking-wider">Case ID</span>
          <span className="font-mono tracking-tight tabular-nums text-slate-800">{record.id}</span>
        </div>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)] sm:p-6">
        <div className="mb-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Activity</p>
          <h2 className="mt-1 text-lg font-semibold tracking-tight text-slate-950">Status timeline</h2>
        </div>
      <ol className="list-none space-y-4 pl-0 text-slate-600">
        {STATUS_ORDER.map((status) => {
          const active = STATUS_ORDER.indexOf(status) <= STATUS_ORDER.indexOf(record.status)
          let when: string | null = null
          let noteLine: string | null = null
          if (status === 'draft_ready') when = record.created_at
          if (status === 'sent') when = record.sent_at
          if (status === 'bank_replied') when = record.updated_at
          if (status === 'resolved') when = record.resolved_at
          if (status === 'escalated') when = record.escalated_at
          if (status === 'sent' && record.sent_at_source) noteLine = `Counted from when you told us you sent it ({record.sent_at_source}).`
          return (
            <li key={status} className={`flex items-start gap-3.5 ${active ? 'text-slate-950' : 'text-slate-500'}`}>
              <span className={`mt-0.5 grid size-7 shrink-0 place-items-center rounded-full border text-[10px] font-semibold ${
                active ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-200 bg-white text-slate-500'
              }`}>
                {STATUS_ORDER.indexOf(status) + 1}
              </span>
              <div>
                <span className={`text-sm font-semibold ${active ? 'text-slate-950' : 'text-slate-500'}`}>
                  {statusLabel[status]}
                </span>
                {when && <span className="mt-0.5 block font-mono text-xs tabular-nums text-slate-500">{formatWAT(when)}</span>}
                {noteLine && <span className="text-xs text-slate-600">{noteLine}</span>}
                {status === 'bank_replied' && record.bank_ticket && (
                  <span className="mt-0.5 block font-mono text-xs text-slate-500">Ticket: {record.bank_ticket}</span>
                )}
                {status === 'escalated' && record.escalation_tier && (
                  <span className="mt-0.5 block text-xs text-slate-500">Escalation tier {record.escalation_tier}</span>
                )}
              </div>
            </li>
          )
        })}
      </ol>
      </section>

      {record.deadline_at && (
        <section className={`mt-5 rounded-2xl border p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)] sm:p-6 ${deadlineTone}`}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] opacity-75">Response window</p>
              <h2 className="mt-1 text-lg font-semibold tracking-tight">Deadline countdown</h2>
              <p className="mt-2 font-mono text-2xl font-semibold tracking-tight tabular-nums">
                {passed
                  ? 'Timeline passed'
                  : hours === null
                    ? 'No deadline'
                    : `${hours} hours left`}
              </p>
              <p className="mt-1 text-xs opacity-80">Counted from when you told us you sent it.</p>
            </div>
            <span className="w-fit rounded-full border border-current/20 bg-white/70 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider">
              {passed ? 'Follow-up available' : hours !== null && hours <= 24 ? 'Due soon' : 'CBN timeline'}
            </span>
          </div>
          {deadlineProgress !== null && (
            <div className="mt-5">
              <div className="mb-1.5 flex justify-between text-[10px] font-semibold uppercase tracking-wider opacity-75">
                <span>Elapsed</span>
                <span className="font-mono tabular-nums">{Math.round(deadlineProgress)}%</span>
              </div>
              <div
                className="h-2 overflow-hidden rounded-full bg-white/80"
                role="progressbar"
                aria-label="Response window elapsed"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(deadlineProgress)}
              >
                <div
                  className={`h-full rounded-full transition-[width] duration-500 ${passed ? 'bg-rose-600' : hours !== null && hours <= 24 ? 'bg-amber-500' : 'bg-indigo-600'}`}
                  style={{ width: `${deadlineProgress}%` }}
                />
              </div>
            </div>
          )}
          {passed && (
            <p className="mt-4 text-xs leading-5 opacity-90">
              Your bank’s timeline for this case has passed. You can <a href={`/case/${record.id}/escalate`}>escalate to the next tier</a>.
              We never say your bank is “in breach” — only you can decide that.
            </p>
          )}
          {record.deadline_at && !passed && (
            <Button variant="secondary" onClick={addReminder} className="mt-4">
              Add reminder (.ics)
            </Button>
          )}
        </section>
      )}

      {!record.deadline_at && record.status === 'sent' && (
        <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Response window</p>
          <h2 className="mt-1 font-semibold tracking-tight text-slate-950">No fixed deadline applies</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            There is no fixed CBN deadline for a transfer sent to the wrong account. A recall request depends on
            the recipient and your bank.
          </p>
        </section>
      )}

      {isSent && (
        <>
          <div className="mt-10 border-t border-[var(--line)] pt-8">
            <h2 className="font-semibold mb-3">Update your case</h2>

            <div className="mb-6">
              <label className="block text-sm font-medium text-[var(--ink)] mb-1.5">Bank’s ticket number (optional)</label>
              <Input
                id="bank-ticket"
                value={ticket}
                onChange={(e) => setTicket(e.target.value)}
              />
              <p className="mt-1 text-xs text-[var(--muted)]">The ticket or reference number your bank gave you.</p>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-[var(--ink)] mb-1.5">Note (optional)</label>
              <Textarea id="notes" value={note} onChange={(e) => setNote(e.target.value)} rows={3} />
            </div>

            <Button onClick={markBankReplied}>Mark bank replied</Button>

            <div className="mt-6 flex gap-3">
              <Button variant="secondary" onClick={markResolved}>Mark resolved</Button>
              <Button variant="secondary" onClick={markEscalated}>Escalate</Button>
            </div>
            <p className="mt-2 text-xs text-[var(--muted)]">
              Escalation opens the escalation pack with the three tiers and pre-written messages.
            </p>
          </div>
        </>
      )}

      {record.status === 'resolved' && (
        <div className="mt-8 rounded-md border border-[var(--ok)] bg-[#f1f8f4] p-4">
          <h2 className="font-semibold text-[var(--ok)]">Case resolved</h2>
          <p className="mt-1 text-[var(--muted)]">Resolved {formatWAT(record.resolved_at)}.</p>
        </div>
      )}
    </Layout>
  )
}
