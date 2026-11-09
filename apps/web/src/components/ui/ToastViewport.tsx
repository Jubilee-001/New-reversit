import * as React from 'react'
import { CheckCircle2, Info, X, XCircle } from 'lucide-react'
import { toastEventName, type ToastMessage } from '@/lib/toast'

const TOAST_DURATION = 4500

export function ToastViewport() {
  const [toasts, setToasts] = React.useState<ToastMessage[]>([])

  React.useEffect(() => {
    const timeouts = new Map<number, number>()
    const handleToast = (event: Event) => {
      const { detail } = event as CustomEvent<ToastMessage>
      setToasts((current) => [...current, detail])
      timeouts.set(detail.id, window.setTimeout(() => {
        setToasts((current) => current.filter((toast) => toast.id !== detail.id))
        timeouts.delete(detail.id)
      }, TOAST_DURATION))
    }

    window.addEventListener(toastEventName(), handleToast)
    return () => {
      window.removeEventListener(toastEventName(), handleToast)
      timeouts.forEach(window.clearTimeout)
    }
  }, [])

  const dismiss = (id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-[100] flex flex-col items-center gap-2 px-4 sm:inset-x-auto sm:right-5 sm:items-end">
      {toasts.map((toast) => {
        const Icon = toast.kind === 'error' ? XCircle : toast.kind === 'info' ? Info : CheckCircle2
        const tone = toast.kind === 'error'
          ? 'border-rose-200 text-rose-900'
          : toast.kind === 'info'
            ? 'border-indigo-200 text-indigo-900'
            : 'border-emerald-200 text-emerald-900'
        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-xl border bg-white px-4 py-3 shadow-lg shadow-slate-950/10 ${tone}`}
            role={toast.kind === 'error' ? 'alert' : 'status'}
          >
            <Icon size={18} className="shrink-0" aria-hidden="true" />
            <p className="flex-1 text-sm font-medium">{toast.message}</p>
            <button type="button" onClick={() => dismiss(toast.id)} aria-label="Dismiss notification" className="grid size-7 shrink-0 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900">
              <X size={15} aria-hidden="true" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
