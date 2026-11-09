import * as React from 'react'
import { Layout } from '@/components/Layout'
import { Button } from '@/components/ui/Button'
import { RadioGroup } from '@/components/ui/Radio'
import { Banner } from '@/components/ui/Banner'
import { ErrorSummary } from '@/components/ui/ErrorSummary'
import { routeTitle, navigate } from '@/router'
import { getConfig } from '@/lib/api'
import type { Config, DeadlineItem, ProblemType } from '@/lib/types'
import { getDraft, saveDraft } from '@/lib/draft'
import { AlertCircle, Building2, CheckCircle2 } from 'lucide-react'

const PROBLEMS: { key: string; label: string; hint: string }[] = [
  {
    key: 'failed_transfer',
    label: 'Failed transfer',
    hint: 'A transfer I sent never arrived.',
  },
  {
    key: 'duplicate_debit',
    label: 'Duplicate debit',
    hint: 'My account was debited twice for the same transaction.',
  },
  {
    key: 'pos_web_failure',
    label: 'POS or web payment failure',
    hint: 'The payment failed, but money still left my account.',
  },
  {
    key: 'atm_failure',
    label: 'ATM cash not dispensed',
    hint: 'The ATM debited me but did not give out cash.',
  },
  {
    key: 'wrong_account',
    label: 'Sent to the wrong account',
    hint: 'I transferred money to the wrong account.',
  },
]

function resolveDeadline(problemType: string, channel: string, deadlines: DeadlineItem[]) {
  const entry = (key: string) => deadlines.find((e) => e.key === key) || ({} as DeadlineItem)
  if (problemType === 'duplicate_debit') {
    const base = entry('duplicate_debit')
    const hours = (base.window_by_channel as Record<string, number | undefined> | undefined)?.[channel]
    return { ...base, window_hours: hours, is_estimate: !base.verified }
  }
  if (problemType === 'pos_web_failure') {
    const key = channel === 'web' ? 'web_checkout_failure' : 'pos_failure'
    return { ...entry(key), is_estimate: !entry(key).verified }
  }
  if (problemType === 'atm_failure') {
    const notOnUs = entry('atm_not_dispensed_not_on_us')
    const onUs = entry('atm_not_dispensed_on_us')
    return {
      key: 'atm_not_dispensed',
      label: 'ATM cash not dispensed',
      window_hours: notOnUs.window_hours,
      verified: true,
      is_estimate: false,
      source: notOnUs.source,
      note: `If the ATM belongs to your bank the window is ${onUs.window_hours} hours. If it belongs to another bank it is ${notOnUs.window_hours} hours. ${notOnUs.note}`,
    }
  }
  const base = entry(problemType === 'wrong_account' ? 'wrong_account' : 'failed_transfer')
  return { ...base, is_estimate: !base.verified }
}

export default function Problem() {
  const [config, setConfig] = React.useState<{ deadlines: DeadlineItem[] } | null>(null)
  const [draft] = React.useState(() => getDraft())
  const [selected, setSelected] = React.useState<string | null>(null)
  const [errors, setErrors] = React.useState<{ field: string; message: string }[]>([])

  React.useEffect(() => {
    void getConfig().then((cfg: Config) => setConfig(cfg)).catch(() => setConfig(null))
  }, [])

  const channel = draft.fields.channel

  const options = PROBLEMS.map((p) => {
    const deadline = config ? resolveDeadline(p.key, channel, config.deadlines) : null
    return { ...p, deadline }
  })
  const selectedIssue = options.find((option) => option.key === selected)
  const selectedDeadline = selectedIssue?.deadline

  const continueToComplaint = () => {
    if (!selected) {
      setErrors([{ field: 'problem', message: 'Choose what went wrong.' }])
      return
    }
    saveDraft({ mode: draft.mode, alertText: draft.alertText, extractedText: draft.extractedText, fields: draft.fields, missing: draft.missing, problemType: selected as ProblemType })
    navigate('/complaint')
  }

  return (
    <Layout title={routeTitle('/problem')} step={{ step: 3, total: 4 }}>
      <ErrorSummary errors={errors} />

      <div className="mb-7 max-w-2xl">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-indigo-700">Issue details</p>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-950">What went wrong?</h1>
        <p className="mt-2 text-slate-600">
          Choose the option that best describes your transaction. We’ll show the relevant CBN response window.
        </p>
      </div>

      <RadioGroup
        name="problem"
        options={options.map((o) => ({
          value: o.key,
          label: o.label,
          hint: o.hint,
          deadline: o.deadline
            ? {
                hours: o.deadline.window_hours as number | null,
                verified: o.deadline.verified as boolean,
                isEstimate: o.deadline.is_estimate as boolean,
                note: o.deadline.note as string,
                label: o.deadline.label as string,
              }
            : undefined,
        }))}
        value={selected ?? ''}
        onChange={setSelected}
      />

      {selectedIssue && selectedDeadline && (
        <section className="mt-6 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-indigo-50 text-indigo-700">
              <Building2 size={19} aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-indigo-700">Response window reference</p>
              <h2 className="mt-1 font-['Plus_Jakarta_Sans'] text-lg font-bold tracking-tight text-slate-900">
                {selectedDeadline.window_hours === null ? 'No fixed response window in the reference data' : `${selectedDeadline.window_hours} hours for this channel`}
              </h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                The response clock starts when you tell ReverseIt that you sent your complaint—not at the transaction timestamp. This is a tracking aid, not a finding that a bank is in breach.
              </p>
            </div>
          </div>

          <details className="mt-5 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
            <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold text-slate-800 marker:content-none">
              <AlertCircle size={16} className="text-indigo-700" aria-hidden="true" />
              Reference source and important qualification
            </summary>
            <div className="mt-3 space-y-2 border-t border-slate-200 pt-3 text-xs leading-5 text-slate-600">
              <p><span className="font-semibold text-slate-800">Source:</span> {selectedDeadline.source || 'No specific source identified.'}</p>
              {selectedDeadline.note && <p>{selectedDeadline.note}</p>}
              <p>This summary is informational and may not reflect newer guidance. Check the current CBN source and your bank’s response.</p>
            </div>
          </details>

          <div className="mt-6">
            <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">Dispute and escalation path</h3>
            <ol className="mt-4 grid gap-3 md:grid-cols-3">
              <li className="rounded-xl border border-indigo-200 bg-indigo-50/60 p-4">
                <span className="inline-flex items-center gap-2 text-xs font-semibold text-indigo-800"><CheckCircle2 size={15} aria-hidden="true" />Stage 1 · Your bank</span>
                <p className="mt-2 text-sm font-semibold text-slate-900">Bank dispute desk</p>
                <p className="mt-1 text-xs leading-5 text-slate-600">Complain to your bank first and keep the sent email and any ticket number.</p>
              </li>
              <li className="rounded-xl border border-slate-200 bg-white p-4">
                <span className="inline-flex items-center gap-2 text-xs font-semibold text-amber-800"><AlertCircle size={15} aria-hidden="true" />Stage 2 · Bank follow-up</span>
                <p className="mt-2 text-sm font-semibold text-slate-900">Head office complaints unit</p>
                <p className="mt-1 text-xs leading-5 text-slate-600">Use your bank’s escalation channel if it does not acknowledge the complaint or its response window has passed.</p>
              </li>
              <li className="rounded-xl border border-slate-200 bg-white p-4">
                <span className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700"><Building2 size={15} aria-hidden="true" />Stage 3 · External escalation</span>
                <p className="mt-2 text-sm font-semibold text-slate-900">CBN Consumer Protection Department</p>
                <p className="mt-1 text-xs leading-5 text-slate-600">Follow the CBN complaint guide and retain your bank correspondence. General complaints may allow up to two weeks.</p>
              </li>
            </ol>
            <p className="mt-3 text-[11px] leading-5 text-slate-500">The stages and timing shown here follow the project’s escalation reference data; they are not legal advice or a guarantee of eligibility.</p>
          </div>
        </section>
      )}

      {selected === 'wrong_account' && (
        <Banner kind="info" title="No fixed deadline for wrong account" body={
          <>There is no CBN deadline for a transfer sent to the wrong account. Whether the money can be recovered depends on the recipient and whether the funds are still available. Your bank can still start a recall request for you.</>
        } />
      )}

      <div className="mt-8 flex gap-3">
        <Button onClick={continueToComplaint} disabled={!selected}>
          Continue
        </Button>
      </div>
    </Layout>
  )
}
