import * as React from 'react'
import { Layout } from '@/components/Layout'
import { Button } from '@/components/ui/Button'
import { Banner } from '@/components/ui/Banner'
import { ErrorSummary } from '@/components/ui/ErrorSummary'
import { navigate, routeTitle } from '@/router'
import { parseText, extractImageText } from '@/lib/api'
import { saveDraft } from '@/lib/draft'
import type { ParseResult } from '@/lib/types'
import { ArrowRight, FileText, ImagePlus, LockKeyhole, UploadCloud } from 'lucide-react'
import { notify } from '@/lib/toast'

const EXAMPLES: { label: string; text: string }[] = [
  {
    label: 'POS alert (made-up sample)',
    text: 'FirstBank Debit Alert: NGN8,500.50 was withdrawn from your account ******6789 via POS on 2026-10-12 16:30 at SUPER MART. Reference: FBK123456789.',
  },
  {
    label: 'ATM alert (made-up sample)',
    text: 'GTBank: Your account ending in 4521 has been debited NGN15,000.00 on 13/10/2026 at 09:15 via ATM. Ref: GTB20261013001.',
  },
  {
    label: 'Transfer alert (made-up sample)',
    text: 'AccessBank Notification: Transfer of NGN3,200.00 to account 0123456789 completed on 12-Oct-2026 at 10:30 via transfer. Reference: ACC20261012TRF.',
  },
]

type Mode = 'paste' | 'image'

const PARSE_FAILURE_MESSAGE = "We couldn’t read this right now. Try again in a minute, or type the details yourself."

function hasUsableParseData(result: ParseResult): boolean {
  return Boolean(result.amount)
    || [result.date, result.time, result.channel, result.bank, result.reference, result.session_id]
      .some((value) => Boolean(value?.trim()))
}

export default function Start() {
  const [mode, setMode] = React.useState<Mode>('paste')
  const [text, setText] = React.useState('')
  const [extractedText, setExtractedText] = React.useState('')
  const [showingExtracted, setShowingExtracted] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [apiError, setApiError] = React.useState<string | null>(null)
  const [parseOk, setParseOk] = React.useState(false)
  const [errors, setErrors] = React.useState<{ field: string; message: string }[]>([])

  const isCreditAlert = /(credit|credited|received)/i.test(text) && !/(debit|debited|\bdr\b|withdrawal)/i.test(text)

  const handleExample = (sampleText: string) => {
    setText(sampleText)
    setApiError(null)
    setErrors([])
  }

  const handlePaste = async (e: React.FormEvent) => {
    e.preventDefault()
    setApiError(null)
    setParseOk(false)
    setErrors([])
    if (!text.trim()) {
      setErrors([{ field: 'text', message: 'Paste your debit alert text before continuing.' }])
      return
    }
    setLoading(true)
    try {
      const result = await parseText(text)
      const hasUsableData = hasUsableParseData(result)
      setParseOk(hasUsableData)
      const apiError = hasUsableData ? null : PARSE_FAILURE_MESSAGE
      saveDraft({
        mode: 'paste',
        alertText: text,
        fields: {
          amount: String(result.amount ?? ''),
          date: result.date ?? '',
          time: result.time ?? '',
          channel: (result.channel ?? '') as ('' | 'atm' | 'pos' | 'transfer' | 'web'),
          bank: result.bank ?? '',
          reference: result.reference ?? result.session_id ?? '',
          accountLast4: '',
        },
        missing: result.missing ?? [],
        apiError,
      })
      setApiError(apiError)
      navigate('/check')
    } catch {
      const apiError = PARSE_FAILURE_MESSAGE
      setApiError(apiError)
      saveDraft({
        mode: 'paste',
        alertText: text,
        fields: {
          amount: '',
          date: '',
          time: '',
          channel: '',
          bank: '',
          reference: '',
          accountLast4: '',
        },
        missing: [],
        apiError,
      })
      navigate('/check')
    } finally {
      setLoading(false)
    }
  }

  const handleUpload = async (file: File) => {
    setApiError(null)
    setParseOk(false)
    setErrors([])
    saveDraft({ apiError: null })
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 4 * 1024 * 1024) {
      notify('Invalid image. Upload a PNG, JPG or WEBP file up to 4 MB.', 'error')
      return
    }
    setLoading(true)
    try {
      const result = (await extractImageText(file)) as { text: string; error?: string }
      if (!result.text?.trim()) {
        const apiError = PARSE_FAILURE_MESSAGE
        setApiError(apiError)
        saveDraft({
          mode: 'image',
          alertText: '',
          extractedText: '',
          fields: { amount: '', date: '', time: '', channel: '', bank: '', reference: '', accountLast4: '' },
          missing: [],
          apiError,
        })
        navigate('/check')
      } else {
        setExtractedText(result.text)
        setShowingExtracted(true)
      }
    } catch {
      const apiError = PARSE_FAILURE_MESSAGE
      setApiError(apiError)
      saveDraft({
        mode: 'image',
        alertText: '',
        extractedText: '',
        fields: { amount: '', date: '', time: '', channel: '', bank: '', reference: '', accountLast4: '' },
        missing: [],
        apiError,
      })
      navigate('/check')
    } finally {
      setLoading(false)
    }
  }

  const useExtractedText = async () => {
    setApiError(null)
    setParseOk(false)
    saveDraft({ apiError: null })
    setText(extractedText)
    setShowingExtracted(false)
    if (!extractedText.trim()) {
      notify('Invalid image or missing reference. Try another image or enter the details manually.', 'error')
      return
    }
    setLoading(true)
    try {
      const result = await parseText(extractedText)
      const hasUsableData = hasUsableParseData(result)
      const apiError = hasUsableData ? null : PARSE_FAILURE_MESSAGE
      if (!(result.reference ?? result.session_id)?.trim()) {
        notify('Transaction reference not found. Check the alert and enter it manually.', 'error')
      }
      saveDraft({
        mode: 'image',
        alertText: extractedText,
        extractedText,
        fields: {
          amount: String(result.amount ?? ''),
          date: result.date ?? '',
          time: result.time ?? '',
          channel: (result.channel ?? '') as ('' | 'atm' | 'pos' | 'transfer' | 'web'),
          bank: result.bank ?? '',
          reference: result.reference ?? result.session_id ?? '',
          accountLast4: '',
        },
        missing: result.missing ?? [],
        apiError,
      })
      setApiError(apiError)
      navigate('/check')
    } catch {
      const apiError = PARSE_FAILURE_MESSAGE
      setApiError(apiError)
      saveDraft({
        mode: 'image',
        alertText: extractedText,
        extractedText,
        fields: { amount: '', date: '', time: '', channel: '', bank: '', reference: '', accountLast4: '' },
        missing: [],
        apiError,
      })
      navigate('/check')
    } finally {
      setLoading(false)
    }
  }

  const goManual = () => {
    setApiError(null)
    saveDraft({
      mode: 'manual',
      alertText: text,
      fields: { amount: '', date: '', time: '', channel: '', bank: '', reference: '', accountLast4: '' },
      missing: [],
      apiError: null,
    })
    navigate('/check')
  }

  return (
    <Layout title={routeTitle('/start')} step={{ step: 1, total: 4 }}>
      <ErrorSummary errors={errors} />

      <section className="mb-7 max-w-2xl">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-indigo-700">Transaction details</p>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Add your alert</h1>
        <p className="mt-2 max-w-[65ch] text-slate-600">
          Paste a debit alert or upload a screenshot. We’ll extract the key details for you to check before continuing.
        </p>
      </section>

      {/* UX: clear, keyboard-accessible mode cards make the two input paths easy to compare. */}
      <fieldset className="mb-5 grid gap-3 sm:grid-cols-2">
        <legend className="sr-only">Choose how to add your alert</legend>
        <label className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition-all focus-within:ring-4 focus-within:ring-indigo-600/10 ${
          mode === 'paste' ? 'border-indigo-500 bg-indigo-50/60 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300'
        }`}>
          <input
            id="mode-paste"
            type="radio"
            name="mode"
            checked={mode === 'paste'}
            onChange={() => setMode('paste')}
            className="mt-1 size-4 shrink-0 accent-indigo-600"
          />
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white text-indigo-700 shadow-sm">
            <FileText size={18} aria-hidden="true" />
          </span>
          <span>
            <span className="block font-semibold text-slate-950">Paste alert text</span>
            <span className="mt-0.5 block text-sm text-slate-600">SMS, email or transaction message</span>
          </span>
        </label>
        <label className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition-all focus-within:ring-4 focus-within:ring-indigo-600/10 ${
          mode === 'image' ? 'border-indigo-500 bg-indigo-50/60 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300'
        }`}>
          <input
            id="mode-image"
            type="radio"
            name="mode"
            checked={mode === 'image'}
            onChange={() => setMode('image')}
            className="mt-1 size-4 shrink-0 accent-indigo-600"
          />
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white text-indigo-700 shadow-sm">
            <ImagePlus size={18} aria-hidden="true" />
          </span>
          <span>
            <span className="block font-semibold text-slate-950">Upload a screenshot</span>
            <span className="mt-0.5 block text-sm text-slate-600">Receipt, banking app or transaction slip</span>
          </span>
        </label>
      </fieldset>

      {mode === 'paste' ? (
        <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.05)] sm:p-6">
          <TextareaField
            id="alert-text"
            label="Alert text"
            placeholder="Paste the full debit alert here…"
            value={text}
            onChange={(e) => setText(e.target.value)}
            error={errors.find((e) => e.field === 'text')?.message}
          />
          {isCreditAlert && (
            <Banner
              kind="warn"
              title="This looks like money received, not a debit."
              body={<>ReverseIt is for debits that went wrong. If money was received into your account, contact your bank directly.</>}
            />
          )}
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <Button onClick={handlePaste} disabled={loading}>
              {loading ? 'Reading…' : <>Read my alert <ArrowRight className="ml-2" size={16} aria-hidden="true" /></>}
            </Button>
            <Button variant="secondary" onClick={goManual} disabled={loading}>
              Type the details myself
            </Button>
          </div>
        </section>
      ) : (
        <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.05)] sm:p-6">
          {showingExtracted ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-700">
                  <FileText size={18} aria-hidden="true" />
                </span>
                <div>
                  <h2 className="font-semibold text-slate-950">Text extracted from screenshot</h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Review the text before we read the transaction details. You can edit anything that looks incorrect.
                  </p>
                </div>
              </div>
              <TextareaField
                id="extracted-text"
                label="Extracted text"
                placeholder="Extracted text appears here after upload"
                value={extractedText}
                onChange={(e) => setExtractedText(e.target.value)}
              />
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button onClick={useExtractedText} disabled={loading || !extractedText.trim()}>
                  {loading ? 'Reading…' : <>Use this text <ArrowRight className="ml-2" size={16} aria-hidden="true" /></>}
                </Button>
                <Button variant="secondary" onClick={() => setShowingExtracted(false)}>
                  Try another image
                </Button>
              </div>
            </div>
          ) : (
            <ImageDropzone onFile={handleUpload} disabled={loading} />
          )}
        </section>
      )}

      {apiError && (
        <Banner kind="error" title={apiError} body={<>You can still type the details yourself below.</>} />
      )}

      {parseOk && (
        <Banner kind="info" title="Alert read" body={
          <>Your alert was read. Check the details on the next screen and correct anything that is wrong before continuing.</>
        } />
      )}

      <div className="mt-5 flex justify-center">
        <Button variant="text" onClick={goManual} disabled={loading}>
          Enter transaction details manually
        </Button>
      </div>

      <section className="mt-9 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)] sm:p-6">
        <h2 className="font-semibold tracking-tight text-slate-950">Try a sample alert</h2>
        <p className="mt-1 text-sm text-slate-600">
          Fictional examples only — useful for seeing how the extraction works.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {EXAMPLES.map((example) => (
            <Button key={example.label} variant="secondary" onClick={() => handleExample(example.text)} className="!min-h-10 !px-3 !py-2 text-xs">
              {example.label}
            </Button>
          ))}
        </div>
      </section>

      <p className="mt-5 flex items-start gap-2 text-xs leading-5 text-slate-600">
        <LockKeyhole className="mt-0.5 shrink-0 text-slate-500" size={14} aria-hidden="true" />
        <span>
          Your alert is sent to Groq to extract transaction details. We don’t store full account numbers or log alert text or images.
        </span>
      </p>
    </Layout>
  )
}

function ImageDropzone({ onFile, disabled }: { onFile: (file: File) => void; disabled: boolean }) {
  const [dragActive, setDragActive] = React.useState(false)

  const acceptFile = (file?: File) => {
    if (file && !disabled) onFile(file)
  }

  return (
    <label
      htmlFor="screenshot"
      onDragEnter={(event) => {
        event.preventDefault()
        if (!disabled) setDragActive(true)
      }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragActive(false)
      }}
      onDrop={(event) => {
        event.preventDefault()
        setDragActive(false)
        acceptFile(event.dataTransfer.files[0])
      }}
      className={`group flex min-h-64 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-5 py-9 text-center transition-all duration-200 focus-within:ring-4 focus-within:ring-indigo-600/15 ${
        dragActive
          ? 'scale-[1.01] border-indigo-500 bg-indigo-50'
          : 'border-slate-300 bg-slate-50/70 hover:border-indigo-400 hover:bg-indigo-50/40'
      } ${disabled ? 'cursor-wait opacity-70' : ''}`}
    >
      <input
        id="screenshot"
        type="file"
        accept="image/png,image/jpeg,image/webp"
        disabled={disabled}
        onChange={(event) => {
          acceptFile(event.target.files?.[0])
          event.target.value = ''
        }}
        className="sr-only"
        aria-label="Choose a transaction screenshot"
      />
      <span className={`mb-4 grid size-14 place-items-center rounded-2xl transition-colors ${
        dragActive ? 'bg-indigo-600 text-white' : 'bg-white text-indigo-700 shadow-sm'
      }`}>
        <UploadCloud size={25} aria-hidden="true" />
      </span>
      <span className="text-base font-semibold text-slate-950">
        {disabled ? 'Reading your image…' : dragActive ? 'Drop your screenshot here' : 'Drop a screenshot to upload'}
      </span>
      <span className="mt-1 text-sm text-slate-600">or click to browse your device</span>
      <span className="mt-4 rounded-full border border-slate-200 bg-white px-3 py-1 font-mono text-[10px] font-medium tracking-wide text-slate-600">
        PNG · JPG · WEBP · MAX 4 MB
      </span>
      <span className="mt-3 text-xs text-slate-500">Works with screenshots of OPay and Moniepoint slips</span>
    </label>
  )
}

function TextareaField({ id, label, placeholder, value, onChange, error }: { id: string; label: string; placeholder: string; value: string; onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void; error?: string }) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-[11px] font-semibold uppercase tracking-wider text-slate-600">{label}</label>
      <textarea
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className={`block min-h-40 w-full resize-y rounded-xl border bg-slate-50/70 px-4 py-3.5 font-mono text-sm leading-6 text-slate-900 shadow-inner shadow-slate-900/[0.02] transition-all placeholder:font-sans placeholder:text-slate-400 focus:border-indigo-600 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-600/10 ${
          error ? 'border-rose-500' : 'border-slate-200'
        }`}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        rows={6}
      />
      {error && <p id={`${id}-error`} className="mt-1.5 text-xs font-medium text-rose-700">{error}</p>}
    </div>
  )
}
