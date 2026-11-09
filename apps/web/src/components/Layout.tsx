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
    <div className="flex min-h-screen flex-col bg-[var(--canvas)]">
      <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
          <a href="/" className="flex items-center gap-3 rounded-lg focus-visible:outline-[var(--focus)]" aria-label="ReverseIt home">
            <span className="grid size-9 place-items-center rounded-xl bg-indigo-600 text-sm font-bold tracking-tight text-white shadow-sm">
              R
            </span>
            <span className="leading-tight">
              <span className="block text-base font-semibold tracking-tight text-slate-950">ReverseIt</span>
              <span className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">complaint support</span>
            </span>
          </a>
          <nav aria-label="Main navigation" className="flex items-center gap-1">
            <a href="/start" className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-950 focus-visible:outline-[var(--focus)]">
              Start
            </a>
            <a href="/cases" className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-950 focus-visible:outline-[var(--focus)]">
              My cases
            </a>
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-7 sm:px-6 sm:py-10 lg:px-8">
        {step && <StepIndicator step={step.step} total={step.total} />}
        {children}
      </main>
      <footer className="mt-auto border-t border-slate-200/80 bg-white">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-2 px-4 py-5 text-xs leading-5 text-slate-600 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <span className="font-medium text-slate-700">ReverseIt · complaint support</span>
          <span>Not a bank or legal adviser. Not affiliated with the CBN or any bank.</span>
        </div>
      </footer>
    </div>
  )
}
