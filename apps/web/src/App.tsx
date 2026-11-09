import * as React from 'react'
import { Layout } from '@/components/Layout'
import Landing from '@/pages/Landing'
import Start from '@/pages/Start'
import Check from '@/pages/Check'
import Problem from '@/pages/Problem'
import Complaint from '@/pages/Complaint'
import CaseView from '@/pages/CaseView'
import CaseEscalate from '@/pages/CaseEscalate'
import Cases from '@/pages/Cases'
import { startRouter } from '@/router'
import { ToastViewport } from '@/components/ui/ToastViewport'

const PAGES: Record<string, React.ComponentType> = {
  '/': Landing,
  '/start': Start,
  '/check': Check,
  '/problem': Problem,
  '/complaint': Complaint,
  '/case/:id': CaseView,
  '/case/:id/escalate': CaseEscalate,
  '/cases': Cases,
}

export function App() {
  const [match, setMatch] = React.useState<{ route: { path: string; title: string }; params: Record<string, string> } | null>(null)

  React.useEffect(() => {
    startRouter(setMatch)
  }, [])

  let page: React.ReactNode
  if (!match) {
    page = <Layout title="ReverseIt" />
  } else {
    const Page = PAGES[match.route.path] as React.ComponentType<{ params: Record<string, string> }>
    page = Page ? (
      <Page params={match.params} />
    ) : (
      <Layout title="Not found — ReverseIt">
        <h1 className="font-['Plus_Jakarta_Sans'] text-2xl font-bold">Page not found</h1>
        <p className="mt-2 text-[var(--muted)]">The page you requested does not exist.</p>
      </Layout>
    )
  }
  return <>{page}<ToastViewport /></>
}
