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
    <div className={`space-y-3 ${className}`.trim()}>
      {options.map((option) => (
        <label key={option.value} className="flex items-start gap-3 rounded-md border border-[var(--line)] bg-[var(--surface)] p-3 cursor-pointer transition-colors hover:bg-[#f0f1f2] focus-within:outline-3 focus-within:outline-[var(--focus)]">
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={value === option.value}
            onChange={() => onChange(option.value)}
            className="mt-0.5 shrink-0 text-[var(--accent)]"
          />
          <div className="leading-6">
            <span className="font-medium text-[var(--ink)]">{option.label}</span>
            {option.hint && <span className="block mt-0.5 text-sm text-[var(--muted)]">{option.hint}</span>}
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
    <span className="inline-block mt-1.5 rounded-sm border px-2.5 py-0.5 text-xs font-medium leading-none">
      {hours === null
        ? `No deadline — ${label.toLowerCase()}`
        : `${hours} hours`}
      {estimate ? ' · Estimate' : ''}
    </span>
  )
}
