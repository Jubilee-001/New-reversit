import * as React from 'react'

export interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string
  hint?: string
}

export function Checkbox({ label, hint, className = '', ...props }: CheckboxProps) {
  return (
    <label className={`flex items-start gap-3 cursor-pointer ${className}`.trim()}>
      <input type="checkbox" className="mt-0.5 shrink-0 text-[var(--accent)] focus-visible:outline-3 focus-visible:outline-[var(--focus)]" {...props} />
      <div className="leading-6">
        <span className="text-[var(--ink)]">{label}</span>
        {hint && <span className="block mt-0.5 text-sm text-[var(--muted)]">{hint}</span>}
      </div>
    </label>
  )
}
