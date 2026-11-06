import * as React from 'react'

export interface BannerProps {
  kind: 'info' | 'error' | 'warn'
  title: string
  body?: React.ReactNode
}

export function Banner({ kind, title, body }: BannerProps) {
  const styles: Record<string, string> = {
    info: 'bg-[#eef3f5] border border-[#b9c6cc] text-[var(--ink)]',
    error: 'bg-[#fbeeec] border border-[#e0b3ad] text-[var(--danger)]',
    warn: 'bg-[#fff8e6] border border-[#e3cd8c] text-[#6b4f00]',
  }
  return (
    <div className={`rounded-md border p-4 ${styles[kind]}`}>
      <h3 className="font-semibold">{title}</h3>
      {body && <p className="mt-1.5 text-sm">{body}</p>}
    </div>
  )
}
