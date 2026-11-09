import type { Draft, ParsedFields } from '@/lib/types'

const DRAFT_KEY = 'reverseit_draft'

export interface StoredDraft {
  mode: Draft['intakeMode']
  alertText: string
  extractedText: string
  fields: ParsedFields
  missing: string[]
  problemType: Draft['problemType']
  caseId: string | null
  apiError: string | null
}

export function saveDraft(draft: Partial<StoredDraft> & { mode?: StoredDraft['mode'] }): void {
  try {
    const existing = getDraft()
    const next: StoredDraft = {
      mode: draft.mode ?? existing.mode ?? 'manual',
      alertText: draft.alertText ?? existing.alertText,
      extractedText: draft.extractedText ?? existing.extractedText,
      fields: draft.fields ?? existing.fields,
      missing: draft.missing ?? existing.missing,
      problemType: draft.problemType ?? existing.problemType,
      caseId: draft.caseId ?? existing.caseId,
      apiError: draft.apiError ?? existing.apiError ?? null,
    }
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(next))
  } catch {
    // sessionStorage unavailable; draft lives only in memory for this session.
  }
}

export function getDraft(): StoredDraft {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY)
    if (!raw) return emptyDraft()
    const parsed = JSON.parse(raw)
    return {
      mode: parsed.mode ?? 'manual',
      alertText: parsed.alertText ?? '',
      extractedText: parsed.extractedText ?? '',
      fields: parsed.fields ?? emptyFields(),
      missing: Array.isArray(parsed.missing) ? parsed.missing : [],
      problemType: parsed.problemType ?? null,
      caseId: parsed.caseId ?? null,
      apiError: typeof parsed.apiError === 'string' ? parsed.apiError : null,
    }
  } catch {
    return emptyDraft()
  }
}

export function clearDraft(): void {
  try {
    sessionStorage.removeItem(DRAFT_KEY)
  } catch {
    // ignore
  }
}

function emptyDraft(): StoredDraft {
  return {
    mode: 'manual',
    alertText: '',
    extractedText: '',
    fields: emptyFields(),
    missing: [],
    problemType: null,
    caseId: null,
    apiError: null,
  }
}

function emptyFields(): ParsedFields {
  return { amount: '', date: '', time: '', channel: '', bank: '', reference: '', accountLast4: '' }
}
