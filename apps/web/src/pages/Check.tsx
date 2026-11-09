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

      <div className="mb-7 max-w-2xl">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-indigo-700">Verify extraction</p>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Check the details</h1>
        <p className="mt-2 text-slate-600">
          Review the receipt summary, then correct any details below before continuing.
        </p>
      </div>

      {draft.extractedText && (
        <details className="mb-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <summary className="cursor-pointer px-4 py-3.5 text-sm font-semibold text-slate-800 marker:text-indigo-600">
            View text extracted from screenshot
          </summary>
          <p className="border-t border-slate-100 bg-slate-50/70 px-4 py-4 font-mono text-xs leading-6 text-slate-600 whitespace-pre-wrap break-words">
            {draft.extractedText}
          </p>
        </details>
      )}

      {/* UX: a receipt-like audit summary makes extracted financial data scannable before editing. */}
      <section aria-label="Extracted transaction summary" className="mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.05)]">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-6">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Transaction record</p>
            <h2 className="mt-1 font-semibold tracking-tight text-slate-950">Extraction summary</h2>
          </div>
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-800">
            Verify details
          </span>
        </div>
        <div className="grid gap-px bg-slate-100 sm:grid-cols-2">
          <SummaryItem label="Amount" value={formatAmount(fields.amount)} strong />
          <SummaryItem label="Transaction date" value={fields.date || '—'} mono />
          <SummaryItem label="Time · 24 hour" value={fields.time || '—'} mono />
          <SummaryItem label="Bank" value={fields.bank || '—'} />
          <div className="bg-white px-5 py-3.5 sm:col-span-2 sm:px-6">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Reference</p>
            <p className="mt-1 break-all font-mono text-sm font-medium tracking-tight text-slate-900">{fields.reference || '—'}</p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)] sm:p-6">
        <div className="mb-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Edit extracted fields</p>
          <p className="mt-1 text-sm text-slate-600">These details stay editable. Please check them against your alert.</p>
        </div>
        <div className="grid grid-cols-1 gap-x-5 gap-y-5 sm:grid-cols-2">
          <Input
            label="Amount (NGN)"
            id="amount"
            value={fields.amount}
            onChange={(e) => setFields({ ...fields, amount: e.target.value })}
            className="font-mono tabular-nums"
            error={errors.find((e) => e.field === 'amount')?.message}
          />
          <Input
            label="Date"
            type="date"
            id="date"
            value={fields.date}
            onChange={(e) => setFields({ ...fields, date: e.target.value })}
            className="font-mono tabular-nums"
            error={errors.find((e) => e.field === 'date')?.message}
          />
          <Input
            label="Time (24-hour)"
            type="time"
            id="time"
            value={fields.time}
            onChange={(e) => setFields({ ...fields, time: e.target.value })}
            className="font-mono tabular-nums"
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
            <label htmlFor="bank" className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-600">
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
          <Input
            label="Reference"
            id="reference"
            value={fields.reference}
            onChange={(e) => setFields({ ...fields, reference: e.target.value })}
            className="font-mono tracking-tight"
            error={errors.find((e) => e.field === 'reference')?.message}
          />
        </div>

        <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
          <Checkbox
            id="match-check"
            label="These details match my alert."
            hint="Confirm the amount, date, time, channel, bank and reference before moving on."
          />
        </div>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center">
          <Button onClick={continueToProblem}>Continue</Button>
          <p className="text-xs leading-5 text-slate-500">
            Missing fields can still be entered manually.
          </p>
        </div>
      </section>

    </Layout>
  )
}

function SummaryItem({ label, value, mono, strong }: { label: string; value: string; mono?: boolean; strong?: boolean }) {
  return (
    <div className="bg-white px-5 py-3.5 sm:px-6">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{label}</p>
      <p className={`mt-1 truncate text-sm text-slate-900 ${
        mono ? 'font-mono tracking-tight tabular-nums' : ''
      } ${strong ? 'text-lg font-semibold' : 'font-medium'}`}>
        {value}
      </p>
    </div>
  )
}

function formatAmount(value: string): string {
  const amount = Number(value)
  return value && Number.isFinite(amount) ? `₦${amount.toLocaleString('en-NG')}` : value || '—'
}
