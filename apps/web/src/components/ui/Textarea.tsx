import * as React from 'react'
import { Label } from './Label'

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string
  label?: string
}

export function Textarea({ className = '', error, label, ...props }: TextareaProps) {
  return (
    <>
      {label && <Label>{label}</Label>}
      <textarea
        className={`block w-full rounded-md border border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-[var(--ink)] focus-visible:outline-3 focus-visible:outline-[var(--focus)] ${
          error ? 'border-[var(--danger)]' : ''
        } ${className}`.trim()}
        {...props}
      />
      {error && <p className="mt-2 text-xs text-[var(--danger)]">{error}</p>}
    </>
  )
}
