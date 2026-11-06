import * as React from 'react'
import { Label } from './Label'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string
  label?: string
}

export function Input({ className = '', error, label, ...props }: InputProps) {
  return (
    <>
      {label && <Label>{label}</Label>}
      <input
        className={`block w-full rounded-md border border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-[var(--ink)] focus-visible:outline-3 focus-visible:outline-[var(--focus)] ${
          error ? 'border-[var(--danger)]' : ''
        } ${className}`.trim()}
        {...props}
      />
      {error && <p className="mt-2 text-xs text-[var(--danger)]">{error}</p>}
    </>
  )
}
