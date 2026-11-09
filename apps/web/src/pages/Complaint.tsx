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
import type { CaseRecord, Config } from '@/lib/types'

const PROBLEM_LABELS: Record<string, string> = {
  failed_transfer: 'failed transfer',
  duplicate_debit: 'duplicate debit',
  pos_web_failure: 'POS or web payment failure',
  atm_failure: 'ATM cash not dispensed',
  wrong_account: 'transfer sent to the wrong account',
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
  const problemLabel = PROBLEM_LABELS[draft.problemType ?? ''] || draft.problemType || ''
  const subject = `Dispute: ${problemLabel} NGN ${Number(record?.amount || 0).toLocaleString()} Ref ${record?.reference || ''}`
  const body = complaintText

  React.useEffect(() => {
    let mounted = true
    const load = async () => {
      try {
        if (draft.caseId) {
          const rec = await getCase(draft.caseId)
          setRecord(rec)
          setCaseId(draft.caseId)
          setComplaintText(rec.complaint_text)
          setToEmail(rec.to_email)
        } else {
          setLoading(true)
          const rec = await createCase({
            problem_type: draft.problemType!,
            channel: draft.fields.channel,
            bank_key: draft.fields.bank ? (config?.banks?.find((b: { key: string; name: string }) => b.name.toLowerCase() === draft.fields.bank.toLowerCase())?.key ?? null) : null,
            bank_name: draft.fields.bank,
            amount: Number(draft.fields.amount) || 0,
            txn_date: draft.fields.date,
            txn_time: draft.fields.time,
            reference: draft.fields.reference,
            account_last4: draft.fields.accountLast4 || null,
            to_email: '',
          })
          setRecord(rec)
          setCaseId(rec.id)
          setComplaintText(rec.complaint_text)
          setToEmail(rec.to_email)
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
  }, [draft.caseId, draft.problemType, draft.fields, config])

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
                <dd className="mt-1 font-mono text-lg font-semibold tracking-tight tabular-nums text-slate-950">
                  ₦{Number(record.amount).toLocaleString('en-NG')}
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

          <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)] sm:p-6">
            <Textarea
              label="Complaint to your bank"
              id="complaint"
              value={complaintText}
              onChange={(e) => setComplaintText(e.target.value)}
              onBlur={(e) => void saveField('complaint_text', e.target.value)}
              error={errors.find((e) => e.field === 'complaint_text')?.message}
              rows={14}
              className="bg-slate-50/70 font-serif leading-7 focus:bg-white"
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

            <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-600">
              Attach your alert screenshot before sending, if you have one.
            </p>

          <div className="flex flex-wrap gap-3">
            <Button onClick={() => void openMail('mailto')}>
              Email to my bank
            </Button>
            <Button variant="secondary" onClick={() => void openMail('gmail')}>
              Open Gmail
            </Button>
            <Button variant="secondary" onClick={() => navigator.clipboard.writeText(body).then(() => setMailCopied(true))}>
              Copy complaint
            </Button>
            <Button variant="secondary" onClick={() => navigator.clipboard.writeText(toEmail || '').then(() => setMailCopied(true))}>
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
