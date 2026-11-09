import * as React from 'react'
import { Layout } from '@/components/Layout'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Checkbox } from '@/components/ui/Checkbox'
import { ErrorSummary } from '@/components/ui/ErrorSummary'
import { routeTitle, navigate } from '@/router'
import { getConfig } from '@/lib/api'
import type { ParsedFields } from '@/lib/types'
import { getDraft, saveDraft } from '@/lib/draft'
import { Banner } from '@/components/ui/Banner'

const CHANNELS: { key: string; label: string }[] = [
  { key: 'atm', label: 'ATM cash withdrawal' },
  { key: 'pos', label: 'POS payment' },
  { key: 'transfer', label: 'Bank transfer' },
  { key: 'web', label: 'Web checkout' },
]

export default function Check() {
  const [banks, setBanks] = React.useState<Array<{ key: string; name: string }> | null>(null)
  const [draft] = React.useState(() => getDraft())
  const [fields, setFields] = React.useState<ParsedFields>(() => ({ ...draft.fields }))
  const [errors, setErrors] = React.useState<{ field: string; message: string }[]>([])

  React.useEffect(() => {
    void getConfig().then((cfg) => setBanks(cfg.banks)).catch(() => setBanks(null))
  }, [])

  const bankMatch = banks?.find((b) => b.name.toLowerCase() === fields.bank.toLowerCase())
  const bankUnknown = !fields.bank || fields.bank.toLowerCase() === 'unknown'

  const validate = (): boolean => {
    const next: { field: string; message: string }[] = []
    const nextMissing: string[] = []
    if (!/^\d+(\.\d{1,2})?$/.test(fields.amount) || Number(fields.amount) <= 0) {
      next.push({ field: 'amount', message: 'Enter a valid amount.' })
      nextMissing.push('amount')
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fields.date)) {
      next.push({ field: 'date', message: 'Enter the transaction date (YYYY-MM-DD).' })
      nextMissing.push('date')
    }
    if (!/^\d{2}:\d{2}$/.test(fields.time)) {
      next.push({ field: 'time', message: 'Enter the transaction time (HH:MM).' })
      nextMissing.push('time')
    }
    if (!CHANNELS.some((c) => c.key === fields.channel)) {
      next.push({ field: 'channel', message: 'Choose the channel.' })
      nextMissing.push('channel')
    }
    if (!fields.bank || fields.bank.toLowerCase() === 'unknown') {
      next.push({ field: 'bank', message: 'Enter or choose the bank.' })
      nextMissing.push('bank')
    }
    if (!fields.reference.trim()) {
      next.push({ field: 'reference', message: 'Enter the transaction reference.' })
      nextMissing.push('reference')
    }
    setErrors(next)
    return next.length === 0
  }

  const continueToProblem = () => {
    if (!validate()) return
    if (!(document.getElementById('match-check') as HTMLInputElement)!.checked) {
      setErrors([...errors, { field: 'match', message: 'Confirm the details match your alert before continuing.' }])
      return
    }
    saveDraft({
      mode: draft.mode,
      alertText: draft.alertText,
      extractedText: draft.extractedText,
      fields,
      missing: [],
      problemType: draft.problemType,
    })
    navigate('/problem')
  }

  return (
    <Layout title={routeTitle('/check')} step={{ step: 2, total: 4 }}>
      <ErrorSummary errors={errors} />

      {draft.apiError && (
        <Banner kind="error" title={draft.apiError} body={<>You can still type the details yourself below.</>} />
      )}

      <h1 className="text-2xl font-semibold">Check the details</h1>
      <p className="mt-2 max-w-[65ch] text-[var(--muted)]">
        Confirm the transaction details read from your alert. Fix anything that is wrong, then tick the box to
        confirm they match your alert.
      </p>

      {draft.extractedText && (
        <>
          <div className="mt-6 border border-[var(--line)] rounded-md bg-[#f7f7f5] p-4">
            <h2 className="font-semibold text-[var(--ink)] mb-2">Text from your screenshot</h2>
            <p className="text-sm text-[var(--muted)] whitespace-pre-wrap break-words">{draft.extractedText}</p>
          </div>
        </>
      )}

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          label="Amount (NGN)"
          id="amount"
          value={fields.amount}
          onChange={(e) => setFields({ ...fields, amount: e.target.value })}
          error={errors.find((e) => e.field === 'amount')?.message}
        />
        <Input
          label="Date"
          type="date"
          id="date"
          value={fields.date}
          onChange={(e) => setFields({ ...fields, date: e.target.value })}
          error={errors.find((e) => e.field === 'date')?.message}
        />
        <Input
          label="Time (24-hour)"
          type="time"
          id="time"
          value={fields.time}
          onChange={(e) => setFields({ ...fields, time: e.target.value })}
          error={errors.find((e) => e.field === 'time')?.message}
        />
        <Select
          label="Channel"
          id="channel"
          value={fields.channel}
          onChange={(e) => setFields({ ...fields, channel: e.target.value as ParsedFields['channel'] })}
          error={errors.find((e) => e.field === 'channel')?.message}
        >
          <option value="">Choose a channel</option>
          {CHANNELS.map((c) => (
            <option key={c.key} value={c.key}>
              {c.label}
            </option>
          ))}
        </Select>
        <div className="flex flex-col">
          <label htmlFor="bank" className="block text-sm font-medium text-[var(--ink)] mb-1.5">
            Bank
          </label>
          {bankUnknown && banks ? (
            <>
              <Select
                id="bank"
                value={bankMatch ? bankMatch.name : ''}
                onChange={(e) => setFields({ ...fields, bank: e.target.value })}
                error={errors.find((e) => e.field === 'bank')?.message}
              >
                <option value="">Choose your bank</option>
                {banks.map((b) => (
                  <option key={b.key} value={b.name}>
                    {b.name}
                  </option>
                ))}
                <option value="__other__">Another bank — I’ll type it</option>
              </Select>
              {fields.bank === '__other__' && (
                <Input
                  id="bank-other"
                  label="Bank name"
                  value={fields.bank}
                  onChange={(e) => setFields({ ...fields, bank: e.target.value })}
                />
              )}
            </>
          ) : (
            <Input
              id="bank"
              value={fields.bank}
              onChange={(e) => setFields({ ...fields, bank: e.target.value })}
              error={errors.find((e) => e.field === 'bank')?.message}
            />
          )}
        </div>
        <div className="flex flex-col">
          <label htmlFor="reference" className="block text-sm font-medium text-[var(--ink)] mb-1.5">
            Reference
          </label>
          <Input
            id="reference"
            value={fields.reference}
            onChange={(e) => setFields({ ...fields, reference: e.target.value })}
            error={errors.find((e) => e.field === 'reference')?.message}
          />
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-2">
        <Checkbox
          id="match-check"
          label="These match my alert."
          hint="Only continue when the amount, date, time, channel, bank and reference are correct."
        />
      </div>

      <div className="mt-8 flex gap-3">
        <Button onClick={continueToProblem}>Continue</Button>
      </div>

      <p className="mt-6 text-xs text-[var(--muted)] max-w-[65ch]">
        Missing fields are highlighted above. You can still continue and correct them on the next screens; the
        complaint works best when every field is filled in.
      </p>
    </Layout>
  )
}
