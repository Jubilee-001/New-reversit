export type ToastKind = 'success' | 'error' | 'info'

export interface ToastMessage {
  id: number
  message: string
  kind: ToastKind
}

const TOAST_EVENT = 'reverseit:toast'
let nextToastId = 0

export function notify(message: string, kind: ToastKind = 'success'): void {
  window.dispatchEvent(new CustomEvent<ToastMessage>(TOAST_EVENT, {
    detail: { id: ++nextToastId, message, kind },
  }))
}

export function toastEventName(): string {
  return TOAST_EVENT
}
