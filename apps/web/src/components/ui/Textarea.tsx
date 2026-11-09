import * as React from 'react'
import { Label } from './Label'

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string
  label?: string
}

export function Textarea({ className = '', error, label, id, ...props }: TextareaProps) {
  return (
    <div className="w-full">
      {label && <Label htmlFor={id}>{label}</Label>}
      <textarea
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error && id ? `${id}-error` : undefined}
        className={`block w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm leading-6 text-slate-950 shadow-sm transition-all placeholder:text-slate-400 hover:border-slate-300 focus:border-indigo-600 focus:outline-none focus:ring-4 focus:ring-indigo-600/10 ${
          error ? 'border-rose-500 focus:border-rose-600 focus:ring-rose-500/10' : ''
        } ${className}`.trim()}
        {...props}
      />
      {error && <p id={id ? `${id}-error` : undefined} className="mt-1.5 text-xs font-medium text-rose-700">{error}</p>}
    </div>
  )
}
