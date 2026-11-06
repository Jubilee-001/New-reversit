import type { CaseRecord, Config, DeadlineView } from '@/lib/types'

export type RoutePath =
  | '/'
  | '/start'
  | '/check'
  | '/problem'
  | '/complaint'
  | '/case/:id'
  | '/case/:id/escalate'
  | '/cases'

export interface RouteDef {
  path: RoutePath
  title: string
  // Complaint flow pages are "Step X of 4"; null for all other pages.
  step: number | null
}

export const ROUTES: RouteDef[] = [
  { path: '/', title: 'ReverseIt — help with a failed debit', step: null },
  { path: '/start', title: 'Add your alert — ReverseIt', step: 1 },
  { path: '/check', title: 'Check the details — ReverseIt', step: 2 },
  { path: '/problem', title: 'What went wrong — ReverseIt', step: 3 },
  { path: '/complaint', title: 'Review and send — ReverseIt', step: 4 },
  { path: '/case/:id', title: 'Your case — ReverseIt', step: null },
  { path: '/case/:id/escalate', title: 'Escalate your case — ReverseIt', step: null },
  { path: '/cases', title: 'My cases — ReverseIt', step: null },
]

const COMPLAINT_STEPS: RoutePath[] = ['/start', '/check', '/problem', '/complaint']

export function stepFor(path: RoutePath): number | null {
  const index = COMPLAINT_STEPS.indexOf(path)
  return index === -1 ? null : index + 1
}

export function totalSteps(): number {
  return COMPLAINT_STEPS.length
}

export function routeTitle(path: RoutePath): string {
  return ROUTES.find((r) => r.path === path)?.title ?? 'ReverseIt'
}

export function matchRoute(pathname: string): { route: RouteDef; params: Record<string, string> } | null {
  for (const route of ROUTES) {
    const pattern = '^' + route.path.replace('/:id', '/([^/]+)') + '$'
    const match = pathname.match(new RegExp(pattern))
    if (match) {
      const params: Record<string, string> = {}
      if (route.path.includes(':id')) {
        params.id = match[1]
      }
      return { route, params }
    }
  }
  return null
}

let current: { route: RouteDef; params: Record<string, string> } | null = null
const listeners: Array<(match: { route: RouteDef; params: Record<string, string> }) => void> = []

export function navigate(to: RoutePath | string, params?: Record<string, string>): void {
  const path = typeof to === 'string' ? to : to
  const pathname = params && path.includes(':id') ? path.replace(':id', params.id) : path
  window.history.pushState({}, '', pathname)
  const match = matchRoute(pathname)
  if (match) {
    current = match
    listeners.forEach((fn) => fn(match))
  }
}

export function back(): void {
  window.history.back()
}

export function startRouter(onRoute: (match: { route: RouteDef; params: Record<string, string> }) => void): void {
  listeners.push(onRoute)
  const handle = () => {
    const match = matchRoute(window.location.pathname)
    if (match) {
      current = match
      onRoute(match)
    }
  }
  window.addEventListener('popstate', handle)
  handle()
}

export function currentRoute(): { route: RouteDef; params: Record<string, string> } | null {
  return current
}

export type { CaseRecord, Config, DeadlineView }
