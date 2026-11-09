import * as React from 'react'
import {
  ArrowDown,
  ArrowRight,
  BadgeCheck,
  Building2,
  Check,
  CheckCircle2,
  Clock3,
  FileCheck2,
  FileText,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
  Upload,
  X,
} from 'lucide-react'
import { getConfig } from '@/lib/api'
import type { DeadlineItem } from '@/lib/types'
import { routeTitle } from '@/router'

const ECOSYSTEM = [
  'OPay',
  'Moniepoint',
  'PalmPay',
  'Kuda',
  'GTBank',
  'Access Bank',
  'Zenith Bank',
  'UBA',
  'First Bank',
]

const FAQS = [
  {
    question: 'What if my bank does not respond within the shown timeline?',
    answer:
      'Keep your sent email and any acknowledgement as evidence. Your case page shows the timeline and available next steps. ReverseIt can prepare an escalation pack, but it does not contact the bank or decide whether a bank is in breach.',
  },
  {
    question: 'Do you charge fees?',
    answer:
      'There is no fee to use ReverseIt to prepare a complaint and track a case. Your email or mobile network provider may charge its usual rates.',
  },
  {
    question: 'Does ReverseIt guarantee a refund?',
    answer:
      'No. We help you document the problem and write to your bank. Your bank reviews the complaint and decides the outcome.',
  },
  {
    question: 'Do I need to share my BVN, PIN or bank password?',
    answer:
      'No. Never share your PIN, password, OTP or BVN here. ReverseIt does not connect to your bank account or move money.',
  },
  {
    question: 'How does the transaction parser work?',
    answer:
      'The parser tries deterministic rules first and can use Groq AI when the text needs more help. You review and correct extracted fields before a complaint is created.',
  },
  {
    question: 'When does my response-window countdown begin?',
    answer:
      'The countdown starts only after you confirm that you sent your complaint. The applicable window depends on the issue and payment channel; some displayed windows are estimates.',
  },
]

const FALLBACK_TIMELINES = [
  { key: 'atm_not_dispensed_on_us', label: 'ATM dispense error · your bank', window_hours: 24, verified: true },
  { key: 'atm_not_dispensed_not_on_us', label: 'ATM dispense error · another bank', window_hours: 48, verified: true },
  { key: 'pos_failure', label: 'POS terminal failure', window_hours: 72, verified: true },
  { key: 'web_checkout_failure', label: 'Web checkout failure', window_hours: 72, verified: true },
  { key: 'failed_transfer', label: 'Interbank transfer (NIP)', window_hours: 48, verified: false },
]

function timelineRows(deadlines: DeadlineItem[]) {
  return FALLBACK_TIMELINES.map((fallback) => {
    const item = deadlines.find((deadline) => deadline.key === fallback.key)
    return {
      ...fallback,
      label: item?.label ?? fallback.label,
    hours: item ? item.window_hours : fallback.window_hours,
      verified: item?.verified ?? fallback.verified,
      note: item?.note,
    }
  })
}

export default function Landing() {
  const [deadlines, setDeadlines] = React.useState<DeadlineItem[]>([])
  const [lastChecked, setLastChecked] = React.useState<string | null>(null)

  React.useEffect(() => {
    document.title = routeTitle('/')
    void getConfig()
      .then((config) => {
        setDeadlines(config.deadlines)
        setLastChecked(config.deadline_last_checked)
      })
      .catch((error: unknown) => {
        // The curated fallback matrix remains available if config cannot load.
        console.error('Unable to load response-window configuration:', error)
      })
  }, [])

  const timelines = timelineRows(deadlines)

  return (
    <div className="min-h-screen overflow-hidden bg-[#F8FAFC] text-slate-950">
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <a href="/" className="flex shrink-0 items-center gap-2.5 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-indigo-600" aria-label="ReverseIt home">
            <span className="grid size-9 place-items-center rounded-xl bg-indigo-600 text-sm font-bold text-white shadow-sm shadow-indigo-950/15">R</span>
            <span className="text-base font-semibold tracking-tight">ReverseIt</span>
            <span className="hidden rounded-full border border-indigo-100 bg-indigo-50 px-2.5 py-1 text-[10px] font-semibold tracking-wide text-indigo-800 sm:inline-flex">
              CBN SLA Tracker
            </span>
          </a>

          <nav aria-label="Main navigation" className="hidden items-center gap-1 md:flex">
            <a href="#how-it-works" className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-950">How it works</a>
            <a href="#timelines" className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-950">CBN timelines</a>
            <a href="/cases" className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-950">My cases</a>
          </nav>

          <div className="flex shrink-0 items-center gap-2">
            <a href="/cases" className="hidden rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 sm:inline-flex">
              Track case
            </a>
            <a href="/start" className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:bg-indigo-700 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 sm:px-4 sm:text-sm">
              Start a complaint <ArrowRight size={15} aria-hidden="true" />
            </a>
          </div>
        </div>
        <nav aria-label="Section navigation" className="mx-auto flex min-h-11 max-w-7xl items-center justify-center gap-1 border-t border-slate-100 px-3 md:hidden">
          <a href="#how-it-works" className="inline-flex min-h-10 items-center rounded-lg px-3 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-950">
            How it works
          </a>
          <a href="#timelines" className="inline-flex min-h-10 items-center rounded-lg px-3 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-950">
            CBN timelines
          </a>
          <a href="/cases" className="inline-flex min-h-10 items-center rounded-lg px-3 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-950">
            My cases
          </a>
        </nav>
      </header>

      <main>
        <section className="relative isolate">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
            <div className="absolute -right-36 -top-32 size-[34rem] rounded-full bg-indigo-100/70 blur-3xl" />
            <div className="absolute -left-40 top-56 size-80 rounded-full bg-cyan-100/50 blur-3xl" />
          </div>
          <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 pb-16 pt-12 sm:px-6 sm:pb-20 sm:pt-16 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:px-8 lg:pb-24 lg:pt-20">
            <div className="max-w-2xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white/80 px-3.5 py-2 text-xs font-semibold text-emerald-900 shadow-sm">
                <span className="relative flex size-2">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-40 motion-reduce:animate-none" />
                  <span className="relative inline-flex size-2 rounded-full bg-emerald-600" />
                </span>
                <span aria-hidden="true">🇳🇬</span>
                Built for Nigerian bank &amp; POS debits
              </span>

              <h1 className="mt-7 max-w-[13ch] text-4xl font-semibold leading-[1.06] tracking-[-0.045em] text-slate-950 sm:text-5xl lg:text-6xl">
                A debit went wrong. Build a formal paper trail.
              </h1>
              <p className="mt-6 max-w-xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
                Turn a failed ATM, POS or transfer debit into a clear complaint to your bank. Review the details, understand the relevant response window, and keep a record of what you sent.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <a href="/start" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 transition-all hover:-translate-y-0.5 hover:bg-indigo-700 hover:shadow-xl focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">
                  Start your complaint <span className="text-indigo-200">·</span> Free <ArrowRight size={17} aria-hidden="true" />
                </a>
                <a href="#timelines" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-800 shadow-sm transition-all hover:border-indigo-200 hover:bg-indigo-50/50 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">
                  View response windows <ArrowDown size={16} aria-hidden="true" />
                </a>
              </div>

              <ul className="mt-8 flex flex-wrap gap-x-5 gap-y-3 text-xs font-medium text-slate-600 sm:text-sm">
                <TrustPoint>Bank login not required</TrustPoint>
                <TrustPoint>You review before sending</TrustPoint>
                <TrustPoint>No funds moved</TrustPoint>
              </ul>

              <p className="mt-5 max-w-lg text-xs leading-5 text-slate-500">
                ReverseIt does not guarantee a refund or contact your bank for you. Your bank decides the outcome.
              </p>
            </div>

            {/* The receipt-to-complaint mockup is built with HTML/CSS and uses no fragile remote imagery. */}
            <div className="relative mx-auto w-full max-w-xl lg:ml-auto">
              <div aria-hidden="true" className="absolute -inset-4 rounded-[2rem] bg-gradient-to-br from-indigo-100 via-white to-emerald-100 opacity-80 blur-xl" />
              <div className="relative rounded-[1.75rem] border border-slate-200/90 bg-white p-4 shadow-[0_24px_70px_rgba(15,23,42,0.12)] sm:p-6">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-3">
                    <span className="grid size-10 place-items-center rounded-xl bg-slate-950 text-xs font-bold tracking-tight text-white">OP</span>
                    <div>
                      <p className="text-sm font-semibold text-slate-950">Transaction alert</p>
                      <p className="text-xs text-slate-500">Receipt preview · 10:42 AM</p>
                    </div>
                  </div>
                  <span className="rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-rose-800">Failed</span>
                </div>

                <div className="py-6 text-center">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Amount debited</p>
                  <p className="mt-2 font-mono text-4xl font-semibold tracking-tight tabular-nums text-slate-950 sm:text-5xl">−₦45,000.00</p>
                  <p className="mt-2 text-sm font-medium text-slate-600">POS payment · Merchant unavailable</p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Sparkles size={15} className="text-indigo-600" aria-hidden="true" />
                      <p className="text-xs font-semibold text-slate-900">Details extracted</p>
                    </div>
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700">
                      <CheckCircle2 size={13} aria-hidden="true" /> Ready to review
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <ExtractionChip label="Session ID" value="100004…" mono />
                    <ExtractionChip label="Date" value="Normalized" />
                    <ExtractionChip label="Channel" value="POS" />
                    <ExtractionChip label="Bank" value="Identified" />
                  </div>
                </div>

                <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50/80 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-amber-950">
                      <Clock3 size={16} aria-hidden="true" />
                      <span className="text-xs font-semibold">Response window</span>
                    </div>
                    <span className="rounded-full border border-amber-200 bg-white/80 px-2.5 py-1 font-mono text-[10px] font-semibold tabular-nums text-amber-900">Up to 72 hours*</span>
                  </div>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-amber-200/70">
                    <div className="h-full w-[38%] animate-pulse rounded-full bg-gradient-to-r from-amber-500 to-orange-500 motion-reduce:animate-none" />
                  </div>
                  <p className="mt-2 text-[10px] leading-4 text-amber-900/80">Shown for illustration. Your case window depends on the issue and channel.</p>
                </div>

                <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-3 text-xs font-semibold text-emerald-900">
                  <FileCheck2 size={16} aria-hidden="true" />
                  Complaint draft ready for your review
                  <Check size={15} className="ml-auto" aria-hidden="true" />
                </div>
              </div>
              <p className="mt-3 text-center text-[10px] text-slate-500">*Example window only. See applicable timelines and notes below.</p>
            </div>
          </div>
        </section>

        <section aria-label="Supported banks and payment services" className="border-y border-slate-200 bg-white/80">
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
            <p className="text-center text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Made for alerts from Nigerian banks and payment apps
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              {ECOSYSTEM.map((name) => (
                <span key={name} className="rounded-full border border-slate-200 bg-slate-50 px-3.5 py-1.5 text-xs font-semibold text-slate-600">
                  {name}
                </span>
              ))}
            </div>
            <p className="mt-3 text-center text-[10px] text-slate-500">Names are examples of commonly used services, not endorsements or integrations.</p>
          </div>
        </section>

        <section id="how-it-works" className="scroll-mt-24 py-16 sm:py-20 lg:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <SectionHeading
              eyebrow="A clearer next step"
              title="From alert to a complaint you can act on"
              description="Keep control at every step: inspect the extracted details, choose the issue, then review and send the draft yourself."
            />
            <div className="mt-10 grid gap-4 lg:grid-cols-3">
              <WorkflowCard
                number="01"
                icon={<Upload size={19} aria-hidden="true" />}
                title="Smart ingest"
                description="Upload a receipt screenshot or paste an SMS alert. Rules look for transaction details first, with Groq AI available as a fallback."
                footnote="You can review and correct every extracted field."
              />
              <WorkflowCard
                number="02"
                icon={<Building2 size={19} aria-hidden="true" />}
                title="Regulatory context"
                description="Match the transaction issue to the response window in our CBN reference data, with the source and uncertainty shown where applicable."
                footnote="Windows are informational and may need checking against newer guidance."
              />
              <WorkflowCard
                number="03"
                icon={<FileText size={19} aria-hidden="true" />}
                title="A formal paper trail"
                description="Create an editable complaint with your transaction reference attached. Send it using your own email and keep the case record."
                footnote="You decide when to send and what to include."
              />
            </div>
          </div>
        </section>

        <section id="timelines" className="scroll-mt-24 border-y border-slate-200 bg-white py-16 sm:py-20 lg:py-24">
          <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[0.72fr_1.28fr] lg:gap-14 lg:px-8">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-indigo-700">CBN response windows</p>
              <h2 className="mt-3 text-3xl font-semibold leading-tight tracking-tight text-slate-950 sm:text-4xl">
                Know the timeline for your transaction.
              </h2>
              <p className="mt-4 text-sm leading-6 text-slate-600">
                Reference windows help you track a complaint after you tell us it was sent. They are not a promise of a refund or a legal finding.
              </p>
              <div className="mt-6 flex items-start gap-3 rounded-2xl border border-indigo-100 bg-indigo-50/70 p-4">
                <BadgeCheck size={18} className="mt-0.5 shrink-0 text-indigo-700" aria-hidden="true" />
                <div>
                  <p className="text-xs font-semibold text-indigo-950">Source note</p>
                  <p className="mt-1 text-xs leading-5 text-indigo-900/80">
                    The current reference set cites CBN circular PSM/DIR/CON/CWO/07/127, dated 31 May 2020 and effective 8 June 2020.
                  </p>
                </div>
              </div>
              <p className="mt-3 text-[11px] leading-5 text-slate-500">
                Last checked: {lastChecked ?? '—'}. Guidance can change; confirm current requirements with your bank or the CBN.
              </p>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.05)]">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 border-b border-slate-100 bg-slate-50/80 px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-slate-500 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:px-5">
                <span>Transaction issue</span>
                <span className="text-right">Window</span>
                <span className="hidden sm:block sm:text-right">Reference status</span>
              </div>
              <div className="divide-y divide-slate-100">
                {timelines.map((item) => (
                  <div key={item.key} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-4 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:px-5">
                    <div className="flex min-w-0 items-start gap-3">
                      <span className={`mt-0.5 grid size-8 shrink-0 place-items-center rounded-xl ${
                        item.verified ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800'
                      }`}>
                        {item.verified ? <CheckCircle2 size={16} aria-hidden="true" /> : <TriangleAlert size={16} aria-hidden="true" />}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900">{item.label}</p>
                        {item.note && <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-slate-500">{item.note}</p>}
                      </div>
                    </div>
                    <span className="whitespace-nowrap font-mono text-sm font-semibold tracking-tight tabular-nums text-slate-950">
                      {item.hours === null ? 'No fixed window' : `${item.hours} hours`}
                    </span>
                    <span className={`col-start-1 ml-11 w-fit rounded-full border px-2.5 py-1 text-[9px] font-semibold uppercase tracking-wider sm:col-start-auto sm:ml-0 ${
                      item.verified
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                        : 'border-amber-200 bg-amber-50 text-amber-900'
                    }`}>
                      {item.verified ? 'Source cited' : 'Estimate'}
                    </span>
                  </div>
                ))}
              </div>
              <div className="border-t border-slate-100 bg-slate-50/70 px-4 py-3 text-[11px] leading-5 text-slate-600 sm:px-5">
                POS and web checkout windows are shown conservatively as 72 hours in the current reference data. Failed NIP transfer timing is an estimate; check the cited sources and latest guidance.
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 sm:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <SectionHeading
              eyebrow="Built around your control"
              title="Clear about what we do—and what we don’t."
              description="A useful complaint tool should help you act without asking you to hand over control of your account."
            />
            <div className="mt-9 grid overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.05)] md:grid-cols-2">
              <div className="p-6 sm:p-8">
                <div className="flex items-center gap-2 text-emerald-800">
                  <ShieldCheck size={19} aria-hidden="true" />
                  <h3 className="font-semibold text-slate-950">What ReverseIt does</h3>
                </div>
                <ul className="mt-5 space-y-4">
                  <PromiseItem icon={<Check size={15} />} text="Helps prepare an editable complaint draft." />
                  <PromiseItem icon={<Check size={15} />} text="Shows a relevant response window and source notes." />
                  <PromiseItem icon={<Check size={15} />} text="Keeps a case record and follow-up timeline." />
                </ul>
              </div>
              <div className="border-t border-slate-200 bg-slate-50/80 p-6 md:border-l md:border-t-0 sm:p-8">
                <div className="flex items-center gap-2 text-slate-500">
                  <LockKeyhole size={18} aria-hidden="true" />
                  <h3 className="font-semibold text-slate-900">What ReverseIt never does</h3>
                </div>
                <ul className="mt-5 space-y-4">
                  <PromiseItem muted icon={<X size={15} />} text="Ask for your BVN, PIN, password or OTP." />
                  <PromiseItem muted icon={<X size={15} />} text="Move money or log in to your bank account." />
                  <PromiseItem muted icon={<X size={15} />} text="Send a complaint or promise that you’ll get a refund." />
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section id="faq" className="scroll-mt-24 border-y border-slate-200 bg-white py-16 sm:py-20">
          <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:px-6 lg:grid-cols-[0.7fr_1.3fr] lg:gap-16 lg:px-8">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-indigo-700">Questions, answered</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">Good to know before you start.</h2>
              <p className="mt-4 text-sm leading-6 text-slate-600">
                The complaint stays yours to review, edit and send.
              </p>
            </div>
            <div className="divide-y divide-slate-200 border-y border-slate-200">
              {FAQS.map((faq) => (
                <details key={faq.question} className="group py-4">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-semibold text-slate-900 marker:content-none focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-indigo-600">
                    {faq.question}
                    <span aria-hidden="true" className="grid size-7 shrink-0 place-items-center rounded-full border border-slate-200 text-slate-500 transition-transform group-open:rotate-45">
                      <span className="text-lg font-normal leading-none">+</span>
                    </span>
                  </summary>
                  <p className="max-w-2xl pr-8 pt-3 text-sm leading-6 text-slate-600">{faq.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
          <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 rounded-[1.75rem] bg-slate-950 px-6 py-8 text-white shadow-xl shadow-slate-950/10 sm:px-10 sm:py-10 lg:flex-row lg:items-center">
            <div className="max-w-2xl">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-indigo-300">Start with the alert</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Make your next step a documented one.</h2>
              <p className="mt-2 text-sm leading-6 text-slate-300">Review the details. Choose what went wrong. Send only when you’re ready.</p>
            </div>
            <a href="/start" className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition-all hover:-translate-y-0.5 hover:bg-indigo-50 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-white">
              Start a complaint <ArrowRight size={17} aria-hidden="true" />
            </a>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-[1.3fr_0.7fr_0.7fr]">
            <div>
              <a href="/" className="inline-flex items-center gap-2.5">
                <span className="grid size-8 place-items-center rounded-lg bg-indigo-600 text-xs font-bold text-white">R</span>
                <span className="font-semibold tracking-tight text-slate-950">ReverseIt</span>
              </a>
              <p className="mt-3 max-w-sm text-xs leading-5 text-slate-600">
                Independent consumer assistance for documenting a failed debit and preparing a complaint to your bank.
              </p>
            </div>
            <div>
              <h2 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Explore</h2>
              <div className="mt-3 flex flex-col items-start gap-2 text-sm text-slate-700">
                <a href="#how-it-works" className="hover:text-indigo-700">How it works</a>
                <a href="#timelines" className="hover:text-indigo-700">CBN timelines</a>
                <a href="#faq" className="hover:text-indigo-700">FAQs</a>
              </div>
            </div>
            <div>
              <h2 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Your account</h2>
              <div className="mt-3 flex flex-col items-start gap-2 text-sm text-slate-700">
                <a href="/start" className="hover:text-indigo-700">Start a complaint</a>
                <a href="/cases" className="hover:text-indigo-700">My cases</a>
              </div>
            </div>
          </div>
          <div className="mt-8 flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-3xl text-[11px] leading-5 text-slate-500">
              ReverseIt is an independent consumer assistance tool. It is not affiliated with the CBN or commercial banks, is not legal advice, and does not guarantee a refund. Check current guidance with official sources.
            </p>
            <span className="inline-flex w-fit shrink-0 items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[10px] font-semibold text-slate-700" aria-label="Parser service information">
              <span className="size-1.5 rounded-full bg-indigo-500" aria-hidden="true" />
              Rules-first parser · AI fallback
            </span>
          </div>
        </div>
      </footer>
    </div>
  )
}

function TrustPoint({ children }: { children: React.ReactNode }) {
  return (
    <li className="inline-flex items-center gap-1.5">
      <CheckCircle2 size={14} className="shrink-0 text-emerald-700" aria-hidden="true" />
      {children}
    </li>
  )
}

function ExtractionChip({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
      <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-500">{label}</p>
      <p className={`mt-0.5 text-xs font-semibold text-slate-900 ${mono ? 'font-mono tracking-tight tabular-nums' : ''}`}>{value}</p>
    </div>
  )
}

function SectionHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return (
    <div className="max-w-2xl">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-indigo-700">{eyebrow}</p>
      <h2 className="mt-3 text-3xl font-semibold leading-tight tracking-tight text-slate-950 sm:text-4xl">{title}</h2>
      <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>
    </div>
  )
}

function WorkflowCard({ number, icon, title, description, footnote }: { number: string; icon: React.ReactNode; title: string; description: string; footnote: string }) {
  return (
    <article className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)] transition-all duration-200 hover:-translate-y-1 hover:border-indigo-200 hover:shadow-lg sm:p-6">
      <div className="flex items-center justify-between">
        <span className="grid size-10 place-items-center rounded-xl bg-indigo-50 text-indigo-700 transition-colors group-hover:bg-indigo-600 group-hover:text-white">{icon}</span>
        <span className="font-mono text-xs font-semibold tracking-tight tabular-nums text-slate-400">{number}</span>
      </div>
      <h3 className="mt-5 text-lg font-semibold tracking-tight text-slate-950">{title}</h3>
      <p className="mt-2 min-h-20 text-sm leading-6 text-slate-600">{description}</p>
      <p className="mt-4 border-t border-slate-100 pt-4 text-xs leading-5 text-slate-500">{footnote}</p>
    </article>
  )
}

function PromiseItem({ icon, text, muted = false }: { icon: React.ReactNode; text: string; muted?: boolean }) {
  return (
    <li className="flex items-start gap-3">
      <span className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-full ${
        muted ? 'bg-slate-200 text-slate-600' : 'bg-emerald-100 text-emerald-800'
      }`}>
        {icon}
      </span>
      <span className={`text-sm leading-6 ${muted ? 'text-slate-600' : 'text-slate-800'}`}>{text}</span>
    </li>
  )
}
