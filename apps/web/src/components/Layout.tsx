import * as React from 'react'
import { StepIndicator } from '@/components/ui/StepIndicator'

interface LayoutProps {
  children?: React.ReactNode
  step?: { step: number; total: number } | null
  title?: string
}

export function Layout({ children, step, title }: LayoutProps) {
  React.useEffect(() => {
    if (title) document.title = title
  }, [title])
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-[var(--line)] bg-[var(--surface)]">
        <div className="mx-auto w-full max-w-3xl px-4 py-4 flex items-center gap-2">
          <span className="font-semibold text-lg tracking-tight">ReverseIt</span>
          <span className="text-xs text-[var(--muted)] uppercase tracking-wider">complaint help</span>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">
        {step && <StepIndicator step={step.step} total={step.total} />}
        {children}
      </main>
      <footer className="border-t border-[var(--line)] bg-[var(--surface)] mt-auto">
        <div className="mx-auto w-full max-w-3xl px-4 py-6 text-sm text-[var(--muted)]">
          ReverseIt is not a bank, not legal advice, and is not affiliated with the CBN or any bank.
        </div>
      </footer>
    </div>
  )
}
