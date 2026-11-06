import * as React from 'react'

export function Label({ children, className = '', ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label className={`block text-sm font-medium text-[var(--ink)] mb-1.5 ${className}`.trim()} {...props}>
      {children}
    </label>
  )
}
