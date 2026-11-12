import * as React from 'react'
import { Layout } from '@/components/Layout'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Textarea'
import { Input } from '@/components/ui/Input'
import { Banner } from '@/components/ui/Banner'
import { ErrorSummary } from '@/components/ui/ErrorSummary'
import { routeTitle, navigate } from '@/router'
import { createCase, getCase, patchCase, mailOpened, getConfig } from '@/lib/api'
import { getDraft, saveDraft } from '@/lib/draft'
import { buildSendLinks } from '@/lib/mailto'
import { isKnownDisputeEmail, suggestedDisputeEmail } from '@/lib/bankDispatch'
import { resolveBank } from '@/lib/bankAssets'
import { updateComplaintBankSalutation } from '@/lib/complaint'
import { clampSentAt } from '@/lib/dates'
import { saveCaseId } from '@/lib/storage'
import { notify } from '@/lib/toast'
import type { CaseRecord, Config } from '@/lib/types'
import { ArrowRight } from 'lucide-react'

function formatAmount(amount: number): string {
  return `₦${amount.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatDateForApi(value: string): string {
  const trimmed = value.trim()
  const iso = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`
  const dayFirst = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/)
  if (dayFirst) return `${dayFirst[3]}-${dayFirst[2].padStart(2, '0')}-${dayFirst[1].padStart(2, '0')}`
  return ''
}

function formatTimeForApi(value: string): string {
  const trimmed = value.trim()
  const time24 = trimmed.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/)
  if (time24) return `${time24[1].padStart(2, '0')}:${time24[2]}`
  const time12 = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i)
  if (!time12) return ''
  const hour = Number(time12[1]) % 12 + (time12[3].toUpperCase() === 'PM' ? 12 : 0)
  return `${String(hour).padStart(2, '0')}:${time12[2]}`
}

function buildReviewLetter(fields: ReturnType<typeof getDraft>['fields'], problemType: string | null): string {
  const bankName = fields.bank.trim() || 'your bank'
  const date = formatDateForApi(fields.date) || fields.date || '[transaction date]'
  const time = formatTimeForApi(fields.time) || fields.time || '[transaction time]'
  const amount = parseFloat(String(fields.amount).replace(/[^0-9.]/g, '')) || 0
  const problem = problemType?.replace(/_/g, ' ') || 'failed transaction'
  return [
    `Dear ${bankName},`,
    '',
    'I am writing to formally complain about a debit on my account.',
    '',
    'Transaction details:',
    `- Date and time: ${date} at ${time}`,
    `- Amount: NGN ${amount.toFixed(2)}`,
    `- Channel: ${fields.channel || '[payment channel]'}`,
    `- Reference: ${fields.reference.trim() || '[transaction reference]'}`,
    '',
    `What went wrong: ${problem}.`,
    '',
    'Please investigate this transaction, correct the debit where appropriate, and acknowledge this complaint with a ticket or reference number.',
    '',
    'Thank you,',
    '[Your name]',
  ].join('\n')
}

export default function Complaint() {
  const [draft] = React.useState(() => getDraft())
  const [caseId, setCaseId] = React.useState<string | null>(null)
  const [record, setRecord] = React.useState<CaseRecord | null>(null)
  const [complaintText, setComplaintText] = React.useState(() => buildReviewLetter(draft.fields, draft.problemType))
  const [toEmail, setToEmail] = React.useState(() => suggestedDisputeEmail(draft.fields.bank))
  const [toEmailManuallyEdited, setToEmailManuallyEdited] = React.useState(false)
  const [config, setConfig] = React.useState<Config | null>(null)
  const configRef = React.useRef<Config | null>(null)
  const [errors, setErrors] = React.useState<{ field: string; message: string }[]>([])
  const [apiError, setApiError] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(() => Boolean(draft.caseId))
  const [showSentEarlier, setShowSentEarlier] = React.useState(false)
  const [sentAtLocal, setSentAtLocal] = React.useState('')
  const [mailCopied, setMailCopied] = React.useState(false)
  const [returnBanner, setReturnBanner] = React.useState(false)

  const bankName = (record?.bank_name || draft.fields.bank).trim()
  const reference = record?.reference ?? draft.fields.reference
  const channel = record?.channel ?? draft.fields.channel
  const amount = record?.amount ?? (parseFloat(String(draft.fields.amount).replace(/[^0-9.]/g, '')) || 0)
  const txnDate = record?.txn_date ?? formatDateForApi(draft.fields.date)
  const txnTime = record?.txn_time ?? formatTimeForApi(draft.fields.time)
  const bank = config?.banks?.find(
    (item) => item.key === record?.bank_key || item.name.toLowerCase() === bankName.toLowerCase(),
  )
  const resolvedBank = resolveBank(bankName, record?.bank_key ?? bank?.key)
  const suggestedEmail = suggestedDisputeEmail(bankName, config?.banks)
  const dispatchEmail = toEmailManuallyEdited ? toEmail : suggestedEmail || toEmail
  const amountText = formatAmount(Number(amount || 0))
  const circularLabel = record?.deadline.source.match(/CBN circular [^,;]+/i)?.[0] ?? 'CBN response window'
  const subject = `URGENT: Failed ${channel.toUpperCase() || 'payment'} debit of ${amountText} - Session ID: ${reference || ''} - ${circularLabel}`
  const body = updateComplaintBankSalutation(complaintText, bankName)

  React.useEffect(() => {
    let mounted = true
    if (!draft.caseId) return () => { mounted = false }
    void getCase(draft.caseId)
      .then((rec) => {
        if (!mounted) return
        saveCaseId(rec.id)
        setRecord(rec)
        setCaseId(rec.id)
        setComplaintText(rec.complaint_text)
        setToEmail(rec.to_email || suggestedDisputeEmail(rec.bank_name, configRef.current?.banks))
        setToEmailManuallyEdited(
          Boolean(rec.to_email && !isKnownDisputeEmail(rec.to_email, configRef.current?.banks)),
        )
      })
      .catch(() => {
        if (mounted) setApiError("We couldn’t load your saved case. Your review details are still available.")
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })
    return () => { mounted = false }
  }, [draft.caseId])

  React.useEffect(() => {
    void getConfig()
      .then((cfg: Config) => {
        configRef.current = cfg
        setConfig(cfg)
      })
      .catch(() => setConfig(null))
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
    if (!caseId) {
      if (field === 'complaint_text') setComplaintText(value)
      else setToEmail(value)
      return
    }
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

    const to = dispatchEmail || (record as CaseRecord).to_email
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
      await patchCase(caseId, { status: 'sent' })
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
      await patchCase(caseId, { status: 'sent', sent_at: clamped.value })
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

  const handleCreateCase = async () => {
    if (caseId || loading) return
    setApiError(null)
    setLoading(true)
    let caseCreated = false
    const sanitizedAmount = parseFloat(String(draft.fields.amount).replace(/[^0-9.]/g, '')) || 0
    const referenceValue = draft.fields.reference.trim()
    const payload = {
      problem_type: draft.problemType ?? '',
      channel: draft.fields.channel,
      bank_key: draft.fields.bank
        ? (config?.banks.find((item) => item.name.toLowerCase() === draft.fields.bank.toLowerCase())?.key ?? null)
        : null,
      bank_name: draft.fields.bank.trim(),
      amount: sanitizedAmount,
      txn_date: formatDateForApi(draft.fields.date),
      txn_time: formatTimeForApi(draft.fields.time),
      reference: referenceValue || null,
      account_last4: draft.fields.accountLast4 || null,
      to_email: dispatchEmail.trim(),
    }
    console.log('Submitting Case Payload:', payload)
    try {
      if (!payload.problem_type || !payload.channel || !payload.bank_name || !payload.txn_date || !payload.txn_time || !payload.reference || !payload.amount) {
        throw new Error('Review the transaction details in the previous steps and try again.')
      }
      const created = await createCase(payload)
      caseCreated = true
      saveCaseId(created.id)
      saveDraft({ caseId: created.id })
      setRecord(created)
      setCaseId(created.id)
      setComplaintText(created.complaint_text)
      setToEmail(created.to_email || suggestedDisputeEmail(created.bank_name, config?.banks))
      setToEmailManuallyEdited(Boolean(created.to_email && !isKnownDisputeEmail(created.to_email)))
      const updated = await patchCase(created.id, {
        complaint_text: body,
        to_email: dispatchEmail.trim() || created.to_email,
      })
      setRecord(updated)
      setComplaintText(updated.complaint_text)
      setToEmail(updated.to_email || suggestedDisputeEmail(updated.bank_name, config?.banks))
      setToEmailManuallyEdited(Boolean(updated.to_email && !isKnownDisputeEmail(updated.to_email)))
      notify('Complaint drafted and saved to My Cases')
      if (!updated.to_email) {
        setApiError('Your case is saved. Add the bank’s dispute email address before sending.')
        return
      }
      try {
        await mailOpened(updated.id)
      } catch {
        setApiError('Your case is saved, but we couldn’t record that the email was opened.')
      }
      const links = buildSendLinks(dispatchEmail || updated.to_email, subject, body)
      const mailto = links.mailtoTooLong
        ? links.mailto.replace(/&body=.*$/, '')
        : links.mailto
      if (links.mailtoTooLong) {
        try {
          await navigator.clipboard.writeText(body)
          setMailCopied(true)
        } catch {
          setApiError('The complaint is too long for the email link. Copy it from the review letter.')
        }
      }
      window.location.href = mailto
    } catch (error) {
      setApiError(caseCreated
        ? 'Your case was created, but we couldn’t save the latest letter changes. You can try editing the letter again.'
        : error instanceof Error && error.message !== 'Failed to fetch'
          ? error.message
          : "We couldn’t create your case. Please check your details and try again.")
    } finally {
      setLoading(false)
    }
  }

  const needsRecovery = !record
    && !draft.fields.amount.trim()
    && !draft.fields.bank.trim()
    && (!draft.caseId || !loading)

  return (
    <Layout title={routeTitle('/complaint')} step={{ step: 4, total: 4 }}>
      <ErrorSummary errors={errors} />
      {apiError && !needsRecovery && <Banner kind="error" title={apiError} />}
      {mailCopied && (
        <Banner kind="info" title="Complaint copied" body={
          <>The complaint text was copied to your clipboard. Paste it into the email body.</>
        } />
      )}

      {needsRecovery ? (
        <section className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm sm:p-10">
          <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-indigo-50 text-indigo-700">
            <ArrowRight size={22} aria-hidden="true" />
          </div>
          <h1 className="mt-4 font-['Plus_Jakarta_Sans'] text-2xl font-bold tracking-tight text-slate-950">No active dispute in progress</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">Your review details aren’t available in this browser session. Return to the verification step to start again.</p>
          <Button className="mt-6" onClick={() => navigate('/check')}>
            Start New Complaint <ArrowRight size={16} aria-hidden="true" />
          </Button>
        </section>
      ) : (
        <>
          {loading && (
            <p className="mb-4 text-sm text-slate-500" role="status">
              {caseId || draft.caseId ? 'Loading your saved draft…' : 'Saving your case…'}
            </p>
          )}
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
                <h2 className="mt-1 font-semibold text-slate-950">{bankName || 'Bank not provided'}</h2>
              </div>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 font-mono text-[10px] font-semibold text-slate-600">
                {channel.toUpperCase() || 'CHANNEL'}
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
                  {txnDate || draft.fields.date || '—'} · {txnTime || draft.fields.time || '—'}
                </dd>
              </div>
              <div className="bg-white px-5 py-3.5 sm:col-span-2">
                <dt className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Reference</dt>
                <dd className="mt-1 break-all font-mono text-sm font-medium tracking-tight text-slate-900">{reference || '—'}</dd>
              </div>
            </dl>
          </section>

          <section aria-label="Formal complaint letter and dispatch" className="mx-auto max-w-3xl rounded-xl border border-slate-200/80 bg-white p-6 font-['Instrument_Sans'] leading-relaxed shadow-[0_20px_50px_rgba(0,0,0,0.06)] sm:p-12">
            <header className="mb-7 border-b border-slate-200 pb-5">
              <div className="flex items-center gap-4">
                {resolvedBank.logo && (
                  <img
                    src={resolvedBank.logo}
                    alt={`${resolvedBank.fullName} logo`}
                    className="h-14 w-20 shrink-0 object-contain"
                    referrerPolicy="no-referrer"
                    onError={(event) => {
                      event.currentTarget.hidden = true
                    }}
                  />
                )}
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-indigo-700">Formal dispute letter</p>
                  {resolvedBank.fullName !== 'Commercial Bank / Dispute Desk' && (
                    <p className="mt-1 font-['Plus_Jakarta_Sans'] text-sm font-semibold text-slate-700">
                      {resolvedBank.fullName}
                    </p>
                  )}
                </div>
              </div>
              <h2 className="mt-2 font-['Plus_Jakarta_Sans'] text-xl font-bold tracking-tight text-slate-900">Complaint to {bankName ? resolvedBank.shortName : 'your bank'}</h2>
              <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
                <LetterMetadata label="Date" value={new Intl.DateTimeFormat('en-NG', { dateStyle: 'long' }).format(new Date())} />
                <LetterMetadata label="Customer bank" value={bankName ? resolvedBank.fullName : '—'} />
                <LetterMetadata label="Session ID / RRN" value={reference || '—'} mono />
                <LetterMetadata label="Disputed amount" value={amountText} mono />
              </dl>
            </header>
            <Textarea
              label="Complaint to your bank"
              id="complaint"
              value={body}
              onChange={(e) => setComplaintText(updateComplaintBankSalutation(e.target.value, bankName))}
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
                value={dispatchEmail}
                onChange={(e) => {
                  setToEmail(e.target.value)
                  setToEmailManuallyEdited(
                    e.target.value.trim() !== suggestedDisputeEmail(bankName, config?.banks),
                  )
                }}
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
              <Button variant="secondary" onClick={() => void copyText(reference, 'Session ID copied to clipboard')}>
                Copy Session ID
              </Button>
              {!caseId ? (
                <Button onClick={() => void handleCreateCase()} disabled={loading}>
                  {loading ? 'Saving case…' : 'Save Case & Send Complaint'}
                  {!loading && <ArrowRight size={16} aria-hidden="true" />}
                </Button>
              ) : (
                <>
                  <Button onClick={() => void openMail('mailto')}>Open in Email App</Button>
                  <Button variant="secondary" onClick={saveAndTrack}>Save &amp; Track Case</Button>
                  <Button variant="secondary" onClick={() => void openMail('gmail')}>Open Gmail</Button>
                </>
              )}
              <Button variant="secondary" onClick={() => void copyText(dispatchEmail || '', 'Bank email copied to clipboard')}>
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
      )}
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
