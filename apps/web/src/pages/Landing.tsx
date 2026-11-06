import * as React from 'react'
import { Layout } from '@/components/Layout'
import { Button } from '@/components/ui/Button'
import { routeTitle } from '@/router'
import { getConfig } from '@/lib/api'
import type { DeadlineItem } from '@/lib/types'

export default function Landing() {
  const [deadlines, setDeadlines] = React.useState<DeadlineItem[]>([])
  const [lastChecked, setLastChecked] = React.useState<string | null>(null)

  React.useEffect(() => {
    void getConfig().then((cfg) => {
      setDeadlines(cfg.deadlines)
      setLastChecked(cfg.deadline_last_checked)
    }).catch(() => {})
  }, [])
  return (
    <Layout title={routeTitle('/')}>
      <section className="max-w-[65ch]">
        <h1 className="text-3xl font-semibold tracking-tight">A debit went wrong. We help you complain, in writing.</h1>
        <p className="mt-4 max-w-[65ch] text-lg text-[var(--muted)]">
          ReverseIt helps you draft a formal complaint to your bank, shows the CBN timeline that applies, and keeps
          a record you can escalate with. It does not move money or contact the bank for you.
        </p>
        <div className="mt-10">
          <Button asChild>
            <a href="/start">Start your complaint</a>
          </Button>
        </div>
      </section>

      <section className="mt-14 border-t border-[var(--line)] pt-8 max-w-[65ch]">
        <h2 className="font-semibold">The problem</h2>
        <p className="mt-2 text-[var(--muted)]">
          Your bank debited you but the transaction failed — an ATM did not dispense cash, a POS payment did not go
          through, a transfer never arrived, or money left your account twice. ReverseIt is for customer debits that
          went wrong.
        </p>
      </section>

      <section className="mt-10 max-w-[65ch]">
        <h2 className="font-semibold">How it works</h2>
        <ol className="mt-4 list-decimal list-outside text-[var(--muted)] space-y-2" style={{ lineHeight: 1.6 }}>
          <li>Paste your debit alert or upload a screenshot. ReverseIt reads the amount, date, time, channel, bank and reference.</li>
          <li>Check and correct the details, then say what went wrong.</li>
          <li>ReverseIt shows the CBN timeline for your problem and drafts a formal complaint to your bank.</li>
          <li>You send the complaint from your own email, and ReverseIt tracks the deadline and your escalation options.</li>
        </ol>
      </section>

      <section className="mt-10 max-w-[65ch]">
        <h2 className="font-semibold">What you get</h2>
        <ul className="mt-4 list-disc list-inside text-[var(--muted)] space-y-2" style={{ lineHeight: 1.6 }}>
          <li>A formal, editable complaint addressed to your bank.</li>
          <li>The CBN deadline that applies to your problem, with its source.</li>
          <li>A record of your case and a countdown counted from when you say you sent it.</li>
          <li>An escalation pack if your bank does not respond in time.</li>
        </ul>
      </section>

      <section className="mt-10 border-t border-[var(--line)] pt-8 max-w-[65ch]">
        <h2 className="font-semibold">What ReverseIt does not do</h2>
        <ul className="mt-4 list-disc list-inside text-[var(--muted)] space-y-2">
          <li>It does not move money or reverse a transaction.</li>
          <li>It does not contact your bank for you — you send the complaint yourself.</li>
          <li>It does not guarantee a refund. Your bank decides the outcome.</li>
          <li>It is not a bank, not legal advice, and not affiliated with the CBN or any bank.</li>
        </ul>
      </section>

      <section className="mt-10 max-w-[65ch]">
        <h2 className="font-semibold">CBN timelines that apply</h2>
        <p className="mt-2 text-xs text-[var(--muted)]">
          Sourced from CBN circular PSM/DIR/CON/CWO/07/127 (31 May 2020, effective 8 June 2020) and CBN press
          coverage. Last checked: {lastChecked ?? '—'}. Check the latest CBN circulars — rules may have changed.
        </p>
        <table className="mt-4 w-full text-left border-collapse text-sm text-[var(--muted)]">
          <thead>
            <tr className="border-b border-[var(--line)]">
              <th className="pb-2 font-medium text-[var(--ink)]">Problem</th>
              <th className="pb-2 font-medium text-[var(--ink)]">Timeline</th>
              <th className="pb-2 font-medium text-[var(--ink)]">Status</th>
            </tr>
          </thead>
          <tbody>
            {deadlines.map((entry) => {
              const hours = entry.window_hours
              return (
                <tr key={entry.key} className="border-b border-[var(--line)]">
                  <td className="py-3">{entry.label}</td>
                  <td className="py-3">
                    {hours === null ? 'No fixed deadline' : `${hours} hours`}
                  </td>
                  <td className="py-3">
                    {entry.verified ? 'Verified' : 'Estimate'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        <p className="mt-3 text-xs text-[var(--muted)]">
          Duplicate debit uses the window for the payment channel and is shown as an estimate for transfers.
        </p>
      </section>

      <section className="mt-10 max-w-[65ch]">
        <h2 className="font-semibold">Questions</h2>
        <dl className="mt-4 space-y-4 text-[var(--muted)]">
          <div className="border-b border-[var(--line)] pb-3">
            <dt className="font-medium text-[var(--ink)]">Is ReverseIt connected to my bank?</dt>
            <dd className="mt-1">No. ReverseIt never connects to your bank or moves money. You send the complaint from your own email.</dd>
          </div>
          <div className="border-b border-[var(--line)] pb-3">
            <dt className="font-medium text-[var(--ink)]">Will I definitely get my money back?</dt>
            <dd className="mt-1">We cannot promise that. ReverseIt helps you complain and track the deadline; your bank decides the outcome.</dd>
          </div>
          <div className="border-b border-[var(--line)] pb-3">
            <dt className="font-medium text-[var(--ink)]">What does ReverseIt do with my alert?</dt>
            <dd className="mt-1">Alert text and screenshots are sent to an AI provider (Groq) to extract the transaction details. Your case is stored on our server until you delete it. Nothing is written to logs.</dd>
          </div>
          <div className="border-b border-[var(--line)] pb-3">
            <dt className="font-medium text-[var(--ink)]">Do I need an account?</dt>
            <dd className="mt-1">No. There are no accounts. Your case link is your access key, and your cases are listed in this browser only.</dd>
          </div>
          <div className="border-b border-[var(--line)] pb-3">
            <dt className="font-medium text-[var(--ink)]">Can I use this for a credit alert?</dt>
            <dd className="mt-1">No. ReverseIt is for debits that went wrong. If money was received into your account, contact your bank directly.</dd>
          </div>
          <div className="pb-3">
            <dt className="font-medium text-[var(--ink)]">How long do I have to complain?</dt>
            <dd className="mt-1">It depends on the problem. The countdown starts only when you confirm you sent the complaint to your bank.</dd>
          </div>
        </dl>
      </section>

      <div className="mt-14 max-w-[65ch]">
        <Button asChild>
          <a href="/start">Start your complaint</a>
        </Button>
      </div>
    </Layout>
  )
}
