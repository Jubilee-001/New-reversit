export interface RadioOption {
  value: string
  label: string
  hint?: string
  deadline?: { hours: number | null; verified: boolean; isEstimate: boolean; label: string }
}

export interface RadioGroupProps {
  name: string
  options: RadioOption[]
  value: string
  onChange: (value: string) => void
  error?: string
  className?: string
}

export function RadioGroup({ name, options, value, onChange, error, className = '' }: RadioGroupProps) {
  return (
    <div className={`space-y-3 ${className}`.trim()} role="radiogroup" aria-label={name}>
      {options.map((option) => (
        <label key={option.value} className={`flex cursor-pointer items-start gap-3 rounded-2xl border bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.04)] transition-all hover:border-indigo-300 hover:bg-indigo-50/30 focus-within:ring-4 focus-within:ring-indigo-600/10 ${
          value === option.value ? 'border-indigo-500 ring-4 ring-indigo-600/10' : 'border-slate-200'
        }`}>
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={value === option.value}
            onChange={() => onChange(option.value)}
            className="mt-0.5 shrink-0 text-[var(--accent)]"
          />
          <div className="min-w-0 flex-1 leading-6">
            <span className="font-semibold text-slate-900">{option.label}</span>
            {option.hint && <span className="mt-0.5 block text-sm text-slate-600">{option.hint}</span>}
            {option.deadline && (
              <DeadlineBadge hours={option.deadline.hours} verified={option.deadline.verified} isEstimate={option.deadline.isEstimate} label={option.deadline.label} />
            )}
          </div>
        </label>
      ))}
      {error && <p className="mt-2 text-xs text-[var(--danger)]">{error}</p>}
    </div>
  )
}

function DeadlineBadge({ hours, verified, isEstimate, label }: { hours: number | null; verified: boolean; isEstimate: boolean; label: string }) {
  const estimate = isEstimate || !verified
  return (
    <span className={`mt-2 inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold leading-none ${
      hours === null
        ? 'border-slate-200 bg-slate-50 text-slate-700'
        : estimate
          ? 'border-amber-200 bg-amber-50 text-amber-900'
          : 'border-emerald-200 bg-emerald-50 text-emerald-900'
    }`}>
      {hours === null
        ? `No deadline — ${label.toLowerCase()}`
        : `${hours} hours`}
      {estimate ? ' · Estimate' : ''}
    </span>
  )
}
