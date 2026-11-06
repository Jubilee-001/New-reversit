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

      <h1 className="text-2xl font-semibold">What went wrong</h1>
      <p className="mt-2 max-w-[65ch] text-[var(--muted)]">
        Choose the one option that fits. The timeline shown is the CBN window that applies to that problem.
      </p>

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
