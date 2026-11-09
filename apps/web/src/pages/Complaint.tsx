import * as React from 'react'
import { Layout } from '@/components/Layout'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Textarea'
import { Input } from '@/components/ui/Input'
import { Banner } from '@/components/ui/Banner'
import { ErrorSummary } from '@/components/ui/ErrorSummary'
import { routeTitle, navigate } from '@/router'
import { createCase, getCase, patchCase, mailOpened, confirmSent, getConfig } from '@/lib/api'
import { getDraft, saveDraft } from '@/lib/draft'
import { buildSendLinks } from '@/lib/mailto'
import { clampSentAt } from '@/lib/dates'
import { saveCaseId } from '@/lib/storage'
import { notify } from '@/lib/toast'
import type { CaseRecord, Config } from '@/lib/types'

const DISPUTE_EMAILS: Record<string, string> = {
  gtbank: 'complaints@gtbank.com',
  'access bank': 'contactcenter@accessbankplc.com',
  zenith: 'zenithdirect@zenithbank.com',
  opay: 'support@opay-inc.com',
  moniepoint: 'support@moniepoint.com',
  kuda: 'help@kuda.com',
  'first bank': 'firstcontact@firstbanknigeria.com',
  uba: 'cfc@ubagroup.com',
}

function suggestedDisputeEmail(bankName: string): string {
  const name = bankName.toLowerCase()
  const entry = Object.entries(DISPUTE_EMAILS).find(([key]) => name.includes(key))
  return entry?.[1] ?? ''
}

function formatAmount(amount: number): string {
  return `₦${amount.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function Complaint() {
  const [caseId, setCaseId] = React.useState<string | null>(null)
  const [record, setRecord] = React.useState<CaseRecord | null>(null)
  const [complaintText, setComplaintText] = React.useState('')
  const [toEmail, setToEmail] = React.useState('')
  const [config, setConfig] = React.useState<Config | null>(null)
  const [draft] = React.useState(() => getDraft())
  const [errors, setErrors] = React.useState<{ field: string; message: string }[]>([])
  const [apiError, setApiError] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [showSentEarlier, setShowSentEarlier] = React.useState(false)
  const [sentAtLocal, setSentAtLocal] = React.useState('')
  const [mailCopied, setMailCopied] = React.useState(false)
  const [returnBanner, setReturnBanner] = React.useState(false)

  const bank = config?.banks?.find(
    (b: { key: string; name: string }) => b.key === record?.bank_key || b.name.toLowerCase() === record?.bank_name.toLowerCase(),
  )
  const amountText = formatAmount(Number(record?.amount || 0))
  const circularLabel = record?.deadline.source.match(/CBN circular [^,;]+/i)?.[0] ?? 'CBN response window'
  const subject = `URGENT: Failed ${record?.channel.toUpperCase() ?? 'payment'} debit of ${amountText} - Session ID: ${record?.reference || ''} - ${circularLabel}`
  const body = complaintText

  React.useEffect(() => {
    let mounted = true
    const load = async () => {
      try {
        if (draft.caseId) {
          const rec = await getCase(draft.caseId)
          saveCaseId(rec.id)
          setRecord(rec)
          setCaseId(draft.caseId)
          setComplaintText(rec.complaint_text)
          setToEmail(rec.to_email || suggestedDisputeEmail(rec.bank_name))
        } else {
          setLoading(true)
          const currentConfig = await getConfig()
          setConfig(currentConfig)
          const rec = await createCase({
            problem_type: draft.problemType!,
            channel: draft.fields.channel,
            bank_key: draft.fields.bank ? (currentConfig.banks?.find((b: { key: string; name: string }) => b.name.toLowerCase() === draft.fields.bank.toLowerCase())?.key ?? null) : null,
            bank_name: draft.fields.bank,
            amount: Number(draft.fields.amount) || 0,
            txn_date: draft.fields.date,
            txn_time: draft.fields.time,
            reference: draft.fields.reference,
            account_last4: draft.fields.accountLast4 || null,
            to_email: '',
          })
          saveCaseId(rec.id)
          notify('Complaint drafted and saved to My Cases')
          setRecord(rec)
          setCaseId(rec.id)
          setComplaintText(rec.complaint_text)
          setToEmail(rec.to_email || suggestedDisputeEmail(rec.bank_name))
          saveDraft({ caseId: rec.id })
        }
      } catch {
        setApiError("We couldn’t create your case. Please check your details and try again.")
      } finally {
        setLoading(false)
      }
    }
    if (mounted) void load()
    return () => {
      mounted = false
    }
  }, [draft.caseId, draft.problemType, draft.fields])

  React.useEffect(() => {
    void getConfig().then((cfg: Config) => setConfig(cfg)).catch(() => setConfig(null))
  }, [])

  const isDraftReady = record?.status === 'draft_ready'

  const bannerVisibleRef = React.useRef(false)

  // Return prompt: on mount and whenever the tab/window regains focus while the case is a draft.
  React.useEffect(() => {
    if (!caseId || !isDraftReady) return
    const sync = () => {
      if (bannerVisibleRef.current) setReturnBanner(true)
    }
    sync()
    const handle = () => {
      bannerVisibleRef.current = true
      if (isDraftReady) setReturnBanner(true)
    }
    window.addEventListener('visibilitychange', handle)
    window.addEventListener('focus', handle)
    window.addEventListener('pageshow', handle)
    return () => {
      window.removeEventListener('visibilitychange', handle)
      window.removeEventListener('focus', handle)
      window.removeEventListener('pageshow', handle)
    }
  }, [caseId, isDraftReady])

  const saveField = async (field: 'complaint_text' | 'to_email', value: string) => {
    if (!caseId) return
    try {
      const updated = await patchCase(caseId, { [field]: value })
      setRecord(updated)
    } catch {
      setApiError("We couldn’t save that change. Try again.")
    }
  }

  const openMail = async (kind: 'mailto' | 'gmail') => {
    if (!caseId || !record) return
    setApiError(null)
    try {
      await mailOpened(caseId)
      try {
        sessionStorage.setItem(`reverseit_mail_opened_${caseId}`, 'true')
      } catch {
        // ignore
      }
      const updated = await getCase(caseId)
      setRecord(updated)
    } catch {
      setApiError("We couldn’t record that you opened the email. You can still send it yourself.")
    }

    const to = toEmail || (record as CaseRecord).to_email
    if (!to) {
      setApiError('Enter the bank’s dispute email address before sending.')
      return
    }

    const links = buildSendLinks(to, subject, body)
    const tooLong = kind === 'mailto' ? links.mailtoTooLong : links.gmailTooLong
    const url = tooLong
      ? kind === 'mailto'
        ? links.mailto.replace(/&body=.*$/, '')
        : links.gmail.replace(/&body=.*$/, '')
      : kind === 'mailto'
        ? links.mailto
        : links.gmail

    if (tooLong) {
      try {
        await navigator.clipboard.writeText(body)
        setMailCopied(true)
        setTimeout(() => setMailCopied(false), 5000)
      } catch {
        // clipboard unavailable; body remains visible to copy manually
      }
    }

    try {
      window.open(url, kind === 'gmail' ? '_blank' : '_self')
    } catch {
      setApiError("We couldn’t open your email app. Copy the complaint above and paste it into your email.")
    }
  }

  const confirmSentNow = async () => {
    if (!caseId) return
    try {
      await confirmSent(caseId, null)
      setReturnBanner(false)
      navigate(`/case/${caseId}`)
    } catch {
      setApiError("We couldn’t record that you sent it. Try again.")
    }
  }

  const confirmSentEarlier = async () => {
    if (!caseId || !record) return
    const clamped = clampSentAt(sentAtLocal, record.created_at)
    if (clamped.error) {
      setErrors([{ field: 'sent_at', message: clamped.error }])
      return
    }
    try {
      await confirmSent(caseId, clamped.value)
      setReturnBanner(false)
      navigate(`/case/${caseId}`)
    } catch {
      setApiError("We couldn’t record that you sent it. Try again.")
    }
  }

  const handlePrint = () => {
    window.print()
  }

  const copyText = async (value: string, confirmation: string) => {
    try {
      await navigator.clipboard.writeText(value)
      notify(confirmation)
    } catch {
      notify('Clipboard access is unavailable. Select and copy the text manually.', 'error')
    }
  }

  const saveAndTrack = () => {
    if (!caseId) return
    saveCaseId(caseId)
    notify('Complaint drafted and saved to My Cases')
    navigate('/cases')
  }

  return (
    <Layout title={routeTitle('/complaint')} step={{ step: 4, total: 4 }}>
      <ErrorSummary errors={errors} />
      {apiError && <Banner kind="error" title={apiError} />}
      {mailCopied && (
        <Banner kind="info" title="Complaint copied" body={
          <>The complaint text was copied to your clipboard. Paste it into the email body.</>
        } />
      )}

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm" role="status">
          Creating your case…
        </div>
      ) : record ? (
        <>
          <div className="mb-7 max-w-2xl">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-indigo-700">Final review</p>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Review and send</h1>
            <p className="mt-2 text-slate-600">
              Review the transaction record and complaint, then send it from your own email. Confirm the bank address on its official website.
            </p>
          </div>

          {/* UX: keeps the transaction identifiers visible while the user reviews and dispatches the complaint. */}
          <section aria-label="Transaction summary" className="mb-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.05)]">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Transaction record</p>
                <h2 className="mt-1 font-semibold text-slate-950">{record.bank_name}</h2>
              </div>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 font-mono text-[10px] font-semibold text-slate-600">
                {record.channel.toUpperCase()}
              </span>
            </div>
            <dl className="grid gap-px bg-slate-100 sm:grid-cols-2">
              <div className="bg-white px-5 py-3.5">
                <dt className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Amount</dt>
                <dd className="mt-1 font-['JetBrains_Mono'] text-lg font-semibold tracking-tight tabular-nums text-slate-950">
                  {amountText}
                </dd>
              </div>
              <div className="bg-white px-5 py-3.5">
                <dt className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Date &amp; time</dt>
                <dd className="mt-1 font-mono text-sm font-medium tracking-tight tabular-nums text-slate-900">
                  {record.txn_date} · {record.txn_time}
                </dd>
              </div>
              <div className="bg-white px-5 py-3.5 sm:col-span-2">
                <dt className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Reference</dt>
                <dd className="mt-1 break-all font-mono text-sm font-medium tracking-tight text-slate-900">{record.reference}</dd>
              </div>
            </dl>
          </section>

          <section aria-label="Formal complaint letter and dispatch" className="mx-auto max-w-3xl rounded-xl border border-slate-200/80 bg-white p-6 font-['Instrument_Sans'] leading-relaxed shadow-[0_20px_50px_rgba(0,0,0,0.06)] sm:p-12">
            <header className="mb-7 border-b border-slate-200 pb-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-indigo-700">Formal dispute letter</p>
              <h2 className="mt-2 font-['Plus_Jakarta_Sans'] text-xl font-bold tracking-tight text-slate-900">Complaint to {record.bank_name}</h2>
              <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
                <LetterMetadata label="Date" value={new Intl.DateTimeFormat('en-NG', { dateStyle: 'long' }).format(new Date())} />
                <LetterMetadata label="Customer bank" value={record.bank_name} />
                <LetterMetadata label="Session ID / RRN" value={record.reference} mono />
                <LetterMetadata label="Disputed amount" value={amountText} mono />
              </dl>
            </header>
            <Textarea
              label="Complaint to your bank"
              id="complaint"
              value={complaintText}
              onChange={(e) => setComplaintText(e.target.value)}
              onBlur={(e) => void saveField('complaint_text', e.target.value)}
              error={errors.find((e) => e.field === 'complaint_text')?.message}
              rows={14}
              className="bg-white font-['Instrument_Sans'] leading-7 focus:bg-white"
            />

            <div>
              <Input
                label="Send to (bank’s dispute email address)"
                id="to-email"
                type="email"
                value={toEmail}
                onChange={(e) => setToEmail(e.target.value)}
                onBlur={(e) => void saveField('to_email', e.target.value)}
                error={errors.find((e) => e.field === 'to_email')?.message}
              />
              {bank && !bank.verified && (
                <p className="mt-2 text-xs leading-5 text-amber-900">
                  Check this address on {bank.name}’s website before sending.
                </p>
              )}
              {!bank && (
                <p className="mt-2 text-xs leading-5 text-slate-600">
                  We don’t have a dispute address for this bank. Type the address from your bank’s website.
                </p>
              )}
            </div>

            <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-950">
              Verify the recipient on your bank’s official website before sending. Attach your alert screenshot and any available transaction evidence.
            </p>

            <div className="flex flex-wrap gap-3 border-t border-slate-100 pt-5">
              <Button onClick={() => void copyText(body, 'Complaint text copied to clipboard')}>
                Copy Text
              </Button>
              <Button variant="secondary" onClick={() => void copyText(record.reference, 'Session ID copied to clipboard')}>
                Copy Session ID
              </Button>
              <Button onClick={() => void openMail('mailto')}>
                Open in Email App
              </Button>
              <Button variant="secondary" onClick={saveAndTrack}>
                Save &amp; Track Case
              </Button>
              <Button variant="secondary" onClick={() => void openMail('gmail')}>
                Open Gmail
              </Button>
              <Button variant="secondary" onClick={() => void copyText(toEmail || '', 'Bank email copied to clipboard')}>
                Copy bank email
              </Button>
              <Button variant="secondary" onClick={handlePrint}>
                Print or save as PDF
              </Button>
            </div>
          </section>

          {returnBanner && (
            <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5 sm:p-6">
              <h2 className="mb-3 font-semibold tracking-tight text-emerald-950">Did you send your complaint?</h2>
              <div className="space-y-3">
                <Button onClick={confirmSentNow}>Yes, just now</Button>
                <Button variant="secondary" onClick={() => setShowSentEarlier(true)}>
                  I sent it earlier
                </Button>
                <Button variant="text" onClick={() => setReturnBanner(false)}>
                  Not yet
                </Button>
              </div>
              {showSentEarlier && (
                <div className="mt-4 border-t border-[var(--line)] pt-4">
                  <p className="text-sm text-[var(--muted)] mb-3">
                    When did you send it? It must be after you started this case and not in the future.
                  </p>
                  <Input
                    id="sent-at"
                    type="datetime-local"
                    value={sentAtLocal}
                    onChange={(e) => setSentAtLocal(e.target.value)}
                    error={errors.find((e) => e.field === 'sent_at')?.message}
                  />
                  <div className="mt-3 flex gap-3">
                    <Button onClick={confirmSentEarlier}>Confirm</Button>
                    <Button variant="text" onClick={() => setShowSentEarlier(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
              <p className="mt-4 text-xs text-[var(--muted)]">
                Keep your sent email. It is your evidence.
              </p>
            </div>
          )}
        </>
      ) : null}
    </Layout>
  )
}

function LetterMetadata({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{label}</dt>
      <dd className={`mt-0.5 break-words text-slate-800 ${mono ? "font-['JetBrains_Mono'] text-xs font-medium tabular-nums" : 'text-sm font-medium'}`}>{value}</dd>
    </div>
  )
}
