import * as React from 'react'

export function Label({ children, className = '', ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label className={`mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-600 ${className}`.trim()} {...props}>
      {children}
    </label>
  )
}
