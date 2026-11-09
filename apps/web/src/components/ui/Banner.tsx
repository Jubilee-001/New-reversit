import * as React from 'react'

export interface BannerProps {
  kind: 'info' | 'error' | 'warn'
  title: string
  body?: React.ReactNode
}

export function Banner({ kind, title, body }: BannerProps) {
  const styles: Record<string, string> = {
    info: 'border-indigo-200 bg-indigo-50 text-indigo-950',
    error: 'border-rose-200 bg-rose-50 text-rose-900',
    warn: 'border-amber-200 bg-amber-50 text-amber-950',
  }
  return (
    <div className={`my-4 rounded-xl border p-4 ${styles[kind]}`} role={kind === 'error' ? 'alert' : 'status'}>
      <h3 className="font-semibold">{title}</h3>
      {body && <p className="mt-1.5 text-sm leading-6">{body}</p>}
    </div>
  )
}
