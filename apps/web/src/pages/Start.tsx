import * as React from 'react'
import { Layout } from '@/components/Layout'
import { Button } from '@/components/ui/Button'
import { Banner } from '@/components/ui/Banner'
import { ErrorSummary } from '@/components/ui/ErrorSummary'
import { navigate, routeTitle } from '@/router'
import { parseText, extractImageText } from '@/lib/api'
import { saveDraft } from '@/lib/draft'

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
    setErrors([])
    if (!text.trim()) {
      setErrors([{ field: 'text', message: 'Paste your debit alert text before continuing.' }])
      return
    }
    setLoading(true)
    try {
      const result = await parseText(text)
      setParseOk(!result.error)
      const apiError = result.error ? PARSE_FAILURE_MESSAGE : null
      saveDraft({
        mode: 'paste',
        alertText: text,
        fields: {
          amount: String(result.amount ?? ''),
          date: result.date ?? '',
          time: result.time ?? '',
          channel: (result.channel ?? '') as ('' | 'atm' | 'pos' | 'transfer' | 'web'),
          bank: result.bank ?? '',
          reference: result.reference ?? '',
          accountLast4: '',
        },
        missing: result.missing ?? [],
        apiError,
      })
      if (result.error) {
        setApiError(apiError)
      }
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
    setErrors([])
    setLoading(true)
    try {
      const result = (await extractImageText(file)) as { text: string; error?: string }
      if ('error' in result && result.error) {
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
        setExtractedText((result as { text: string }).text)
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
    setText(extractedText)
    setShowingExtracted(false)
    setLoading(true)
    try {
      const result = await parseText(extractedText)
      const apiError = result.error ? PARSE_FAILURE_MESSAGE : null
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
          reference: result.reference ?? '',
          accountLast4: '',
        },
        missing: result.missing ?? [],
        apiError,
      })
      if (result.error) {
        setApiError(apiError)
      }
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

      <h1 className="text-2xl font-semibold">Add your alert</h1>
      <p className="mt-2 max-w-[65ch] text-[var(--muted)]">
        Paste your debit alert text, or upload a screenshot of the alert. ReverseIt reads the amount, date, time,
        channel, bank and reference. Voice is not supported — type or upload instead.
      </p>

      <div className="mt-6 border border-[var(--line)] rounded-md p-4 space-y-4">
        <div className="flex items-start gap-3">
          <input
            id="mode-paste"
            type="radio"
            name="mode"
            checked={mode === 'paste'}
            onChange={() => setMode('paste')}
            className="mt-0.5 shrink-0 text-[var(--accent)]"
          />
          <label htmlFor="mode-paste" className="cursor-pointer">
            <span className="font-medium text-[var(--ink)]">Paste alert text</span>
          </label>
        </div>
        <div className="flex items-start gap-3">
          <input
            id="mode-image"
            type="radio"
            name="mode"
            checked={mode === 'image'}
            onChange={() => setMode('image')}
            className="mt-0.5 shrink-0 text-[var(--accent)]"
          />
          <label htmlFor="mode-image" className="cursor-pointer">
            <span className="font-medium text-[var(--ink)]">Upload screenshot</span>
          </label>
        </div>
      </div>

      {mode === 'paste' ? (
        <>
          <TextareaField
            label="Alert text"
            placeholder="Paste the debit alert SMS or message here"
            value={text}
            onChange={(e) => setText(e.target.value)}
            error={errors.find((e) => e.field === 'text')?.message}
          />
          {isCreditAlert && (
            <Banner kind="warn" title="This looks like money received, not a debit." body={
              <>ReverseIt is for debits that went wrong. If money was received into your account, contact your bank directly.</>
            } />
          )}
          <div className="mt-4 flex gap-3">
            <Button onClick={handlePaste} disabled={loading}>
              {loading ? 'Reading…' : 'Read my alert'}
            </Button>
            <Button variant="secondary" onClick={goManual} disabled={loading}>
              Type the details myself
            </Button>
          </div>
        </>
      ) : (
        <>
          <TextareaField
            label="Screenshot text (check it)"
            placeholder="Extracted text appears here after upload"
            value={extractedText}
            onChange={(e) => setExtractedText(e.target.value)}
          />
          {showingExtracted ? (
            <>
              <p className="mt-2 text-xs text-[var(--muted)]">
                We turned your screenshot into text. Check it, then continue — nothing is parsed until you do.
              </p>
              <div className="mt-4 flex gap-3">
                <Button onClick={useExtractedText}>Use this text</Button>
                <Button variant="secondary" onClick={() => setShowingExtracted(false)}>
                  Try again / type instead
                </Button>
              </div>
            </>
          ) : (
            <>
              <input
                id="screenshot"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) void handleUpload(file)
                }}
              />
              <p className="mt-2 text-xs text-[var(--muted)]">
                PNG, JPG or WebP, up to 4 MB. The image is sent to the AI provider for text extraction and deleted
                immediately afterwards; nothing is logged.
              </p>
            </>
          )}
        </>
      )}

      {apiError && (
        <Banner kind="error" title={apiError} body={
          <>You can still type the details yourself below.</>
        } />
      )}

      {parseOk && (
        <Banner kind="info" title="Alert read" body={
          <>Your alert was read. Check the details on the next screen and correct anything that is wrong before continuing.</>
        } />
      )}

      <div className="mt-4 flex gap-3">
        <Button variant="secondary" onClick={goManual} disabled={loading}>
          Type the details myself
        </Button>
      </div>

      <div className="mt-8">
        <h3 className="font-semibold mb-3">Or try a made-up sample</h3>
        <p className="text-xs text-[var(--muted)] mb-3">
          These are fictional examples only — they run through the real parser and are never treated as real cases.
        </p>
        <div className="space-y-2">
          {EXAMPLES.map((example) => (
            <Button key={example.label} variant="text" onClick={() => handleExample(example.text)} className="w-full text-left">
              {example.label}
            </Button>
          ))}
        </div>
      </div>

      <p className="mt-6 text-xs text-[var(--muted)] max-w-[65ch]">
        What we send: your alert text or screenshot is sent to Groq (an AI provider) to extract the transaction
        details. Your case is stored on our server until you delete it. We never store full account numbers and never
        write alert text or images to logs.
      </p>
    </Layout>
  )
}

function TextareaField({ label, placeholder, value, onChange, error }: { label: string; placeholder: string; value: string; onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void; error?: string }) {
  return (
    <>
      <label className="block text-sm font-medium text-[var(--ink)] mb-1.5">{label}</label>
      <textarea
        className="block w-full rounded-md border border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-[var(--ink)] focus-visible:outline-3 focus-visible:outline-[var(--focus)]"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        rows={6}
      />
      {error && <p className="mt-2 text-xs text-[var(--danger)]">{error}</p>}
    </>
  )
}
