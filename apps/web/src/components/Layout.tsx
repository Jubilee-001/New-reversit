import * as React from 'react'
import { Menu, X } from 'lucide-react'
import { StepIndicator } from '@/components/ui/StepIndicator'

interface LayoutProps {
  children?: React.ReactNode
  step?: { step: number; total: number } | null
  title?: string
}

export function Layout({ children, step, title }: LayoutProps) {
  const [menuOpen, setMenuOpen] = React.useState(false)

  React.useEffect(() => {
    if (title) document.title = title
  }, [title])

  React.useEffect(() => {
    if (!menuOpen) return
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', closeOnEscape)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [menuOpen])

  return (
    <div className="flex min-h-screen flex-col bg-[var(--canvas)] font-['Instrument_Sans']">
      <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
          <a href="/" className="flex items-center gap-3 rounded-lg focus-visible:outline-[var(--focus)]" aria-label="ReverseIt home">
            <span className="grid size-9 place-items-center rounded-xl bg-indigo-600 text-sm font-bold tracking-tight text-white shadow-sm">
              R
            </span>
            <span className="leading-tight">
              <span className="block font-['Plus_Jakarta_Sans'] text-base font-bold tracking-tight text-slate-950">ReverseIt</span>
              <span className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">complaint support</span>
            </span>
          </a>
          <nav aria-label="Main navigation" className="hidden items-center gap-1 md:flex">
            <a href="/start" className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-950 focus-visible:outline-[var(--focus)]">
              Start Complaint
            </a>
            <a href="/#timelines" className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-950 focus-visible:outline-[var(--focus)]">
              CBN Timelines
            </a>
            <a href="/cases" className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-950 focus-visible:outline-[var(--focus)]">
              My cases
            </a>
          </nav>
          <button
            type="button"
            className="grid size-10 place-items-center rounded-xl border border-slate-200 text-slate-700 transition-colors hover:bg-slate-50 md:hidden"
            aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={menuOpen}
            aria-controls="mobile-navigation"
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X size={19} aria-hidden="true" /> : <Menu size={19} aria-hidden="true" />}
          </button>
        </div>
      </header>
      {menuOpen && (
        <div className="fixed inset-x-0 bottom-0 top-[calc(4.5rem+env(safe-area-inset-top))] z-30 bg-slate-950/25 md:hidden" onClick={() => setMenuOpen(false)}>
          <nav id="mobile-navigation" aria-label="Mobile navigation" aria-modal="true" role="dialog" className="absolute right-3 top-3 flex w-[min(22rem,calc(100vw-1.5rem))] flex-col gap-0 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl" onClick={(event) => event.stopPropagation()}>
            <a href="/start" onClick={() => setMenuOpen(false)} className="flex min-h-11 items-center rounded-xl px-4 text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-50">Start Complaint</a>
            <a href="/#timelines" onClick={() => setMenuOpen(false)} className="flex min-h-11 items-center rounded-xl px-4 text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-50">CBN Timelines</a>
            <a href="/cases" onClick={() => setMenuOpen(false)} className="flex min-h-11 items-center rounded-xl px-4 text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-50">My Cases</a>
          </nav>
        </div>
      )}
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
