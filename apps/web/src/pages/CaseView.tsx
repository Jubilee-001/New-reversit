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

  return (
    <Layout title={`Case ${record.id} — ReverseIt`}>
      {apiError && <Banner kind="error" title={apiError} />}

      <h1 className="text-2xl font-semibold">Your case</h1>
      <p className="mt-2 text-[var(--muted)]">
        Case <span className="font-mono">{record.id}</span> · {statusLabel[record.status]} ·
        created {formatWAT(record.created_at)}
      </p>

      <h2 className="mt-10 mb-3 font-semibold text-[var(--ink)]">Status timeline</h2>
      <ol className="list-none pl-0 space-y-3 text-[var(--muted)]">
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
            <li key={status} className={`flex items-start gap-3 ${active ? 'text-[var(--ink)]' : ''}`}>
              <span className={`shrink-0 w-6 h-6 rounded-full border flex items-center justify-center text-xs font-medium ${
                active ? 'bg-[var(--accent)] text-white border-[var(--accent)]' : 'border-[var(--line)] text-[var(--muted)]'
              }`}>
                {STATUS_ORDER.indexOf(status) + 1}
              </span>
              <div>
                <span className={`font-medium ${active ? 'text-[var(--ink)]' : 'text-[var(--muted)]'}`}>
                  {statusLabel[status]}
                </span>
                {when && <span className="block text-xs mt-0.5">{formatWAT(when)}</span>}
                {noteLine && <span className="text-xs text-[var(--muted)]">{noteLine}</span>}
                {status === 'bank_replied' && record.bank_ticket && (
                  <span className="block text-xs mt-0.5 text-[var(--muted)]">Ticket: {record.bank_ticket}</span>
                )}
                {status === 'escalated' && record.escalation_tier && (
                  <span className="block text-xs mt-0.5 text-[var(--muted)]">Escalation tier {record.escalation_tier}</span>
                )}
              </div>
            </li>
          )
        })}
      </ol>

      {record.deadline_at && (
        <div className="mt-8 rounded-md border p-4">
          <h2 className="font-semibold mb-2">Deadline countdown</h2>
          <p className="text-[var(--ink)] font-semibold">
            {passed
              ? 'Your bank’s timeline has passed.'
              : hours === null
                ? 'No deadline is set for this problem type.'
                : `${hours} hours left.`}
          </p>
          <p className="text-xs text-[var(--muted)]">Counted from when you told us you sent it.</p>
          {passed && (
            <p className="mt-2 text-xs text-[var(--muted)]">
              Your bank’s timeline for this case has passed. You can <a href={`/case/${record.id}/escalate`}>escalate to the next tier</a>.
              We never say your bank is “in breach” — only you can decide that.
            </p>
          )}
          {record.deadline_at && !passed && (
            <Button variant="secondary" onClick={addReminder} className="mt-3">
              Add reminder (.ics)
            </Button>
          )}
        </div>
      )}

      {!record.deadline_at && record.status === 'sent' && (
        <div className="mt-8 rounded-md border p-4">
          <h2 className="font-semibold mb-2">Deadline countdown</h2>
          <p className="text-[var(--ink)]">No deadline applies to this problem type.</p>
          <p className="text-xs text-[var(--muted)]">
            There is no fixed CBN deadline for a transfer sent to the wrong account. A recall request depends on
            the recipient and your bank.
          </p>
        </div>
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
