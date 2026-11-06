import * as React from 'react'
import { Layout } from '@/components/Layout'
import { Button } from '@/components/ui/Button'
import { getCase } from '@/lib/api'
import type { CaseRecord } from '@/lib/types'

export default function CaseEscalate({ params }: { params?: { id: string } }) {
  const id = params?.id ?? ''
  const [record, setRecord] = React.useState<CaseRecord | null>(null)
  const [tiers, setTiers] = React.useState<{ tier: number; title: string; when: string; verified: boolean; contacts: Array<{ type: string; value: string; verified: boolean; note?: string }>; message: string }[]>([])

  React.useEffect(() => {
    let mounted = true
    const load = async () => {
      try {
        const rec = await getCase(id)
        setRecord(rec)
        void fetch('/api/config').then(async (r) => {
          if (!mounted) return
          const cfg = await r.json()
          if (mounted) setTiers((cfg.escalation || []) as { tier: number; title: string; when: string; verified: boolean; contacts: Array<{ type: string; value: string; verified: boolean; note?: string }>; message: string }[])
        })
      } catch {
        // handled by case page links; keep minimal
      }
    }
    if (mounted) void load()
    return () => {
      mounted = false
    }
  }, [id])

  if (!record) {
    return (
      <Layout title={`Escalate — ReverseIt`}>
        <p className="text-[var(--muted)]">Loading your case…</p>
      </Layout>
    )
  }

  return (
    <Layout title={`Escalate case ${record.id} — ReverseIt`}>
      <h1 className="text-2xl font-semibold">Escalate your complaint</h1>
      <p className="mt-2 max-w-[65ch] text-[var(--muted)]">
        Escalate only if your bank has not acknowledged your complaint within 3 days, has given no ticket number,
        or the timeline has passed. Complain to your bank first and keep evidence of that.
      </p>

      <div className="mt-8 space-y-6">
        {tiers.map((tier) => (
          <section key={tier.tier} className="border border-[var(--line)] rounded-md p-5">
            <div className="flex items-start gap-3 mb-3">
              <span className="shrink-0 w-6 h-6 rounded-full border flex items-center justify-center text-xs font-medium border-[var(--line)] text-[var(--muted)]">
                {tier.tier}
              </span>
              <div>
                <h2 className="font-semibold text-[var(--ink)]">{tier.title}</h2>
                <p className="text-sm text-[var(--muted)]">{tier.when}</p>
                {tier.verified === false && (
                  <span className="mt-1 inline-block text-xs border border-[#e3cd8c] bg-[#fff8e6] text-[#6b4f00] rounded px-2 py-0.5">
                    Not verified against a current source — check before relying on it.
                  </span>
                )}
              </div>
            </div>
            <div className="mb-3">
              <h3 className="text-sm font-medium text-[var(--ink)] mb-2">Pre-written message</h3>
              <textarea
                readOnly
                className="w-full rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--ink)]"
                rows={4}
              >
{renderMessage(tier.message, record)}
              </textarea>
            </div>
              {tier.contacts.map((contact, i: number) => (
              <div key={i} className="mt-4 flex items-start gap-3">
                <span className="mt-0.5 shrink-0 text-[var(--muted)]">{String(contact.type)}</span>
                <div className="flex-1">
                  <div className="text-sm font-medium text-[var(--ink)]">{String(contact.value)}</div>
                  {contact.note && <p className="text-xs text-[var(--muted)]">{String(contact.note)}</p>}
                  {!contact.verified && (
                    <p className="text-xs text-[var(--muted)]">Not verified — check this address on the organisation's website before using it.</p>
                  )}
                </div>
                <Button
                  variant="secondary"
                  onClick={() => {
                    navigator.clipboard.writeText(String(contact.value))
                  }}
                >
                  Copy
                </Button>
              </div>
            ))}
          </section>
        ))}
      </div>

      <section className="mt-10 border-t border-[var(--line)] pt-8">
        <h2 className="font-semibold mb-3">Evidence checklist</h2>
        <ul className="list-disc list-inside text-[var(--muted)] space-y-2 max-w-[65ch]">
          <li>Your complaint with its timestamp (the email you sent to your bank).</li>
          <li>The bank's ticket number, if you have one.</li>
          <li>The alert or screenshot you received.</li>
          <li>A statement line showing the debit on your account.</li>
          <li>Any replies from your bank.</li>
        </ul>
        <p className="mt-4 text-xs text-[var(--muted)]">
          Keep everything in one place. The CBN Consumer Protection Department expects you to have complained to
          your bank first and to allow up to two weeks for general complaints.
        </p>
      </section>
    </Layout>
  )
}

function renderMessage(message: string, record: CaseRecord): string {
  return message
    .replace('{problem_label}', record.problem_type.replace(/_/g, ' '))
    .replace('{bank_name}', record.bank_name)
    .replace('{amount}', `NGN ${Number(record.amount).toLocaleString()}`)
    .replace('{txn_date}', record.txn_date)
    .replace('{txn_time}', record.txn_time)
    .replace('{reference}', record.reference)
    .replace('{window_hours}', String((record.deadline as { window_hours?: number } | undefined)?.window_hours ?? ''))
    .replace('{bank_dispute_email}', record.to_email)
}
