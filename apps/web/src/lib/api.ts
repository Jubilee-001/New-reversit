import type { CaseRecord, Config } from '@/lib/types'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '/api'

class ApiError extends Error {
  public status: number
  public body: unknown
  constructor(status: number, body: unknown) {
    super(`API error ${status}`)
    this.name = 'ApiError'
    this.status = status
    this.body = body
  }
}

async function request(path: string, init: RequestInit = {}): Promise<Response> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(init.headers as Record<string, string> | undefined) }
  const res = await fetch(`${API_BASE}${path}`, { ...init, headers })
  if (!res.ok) {
    let body: unknown
    try {
      body = await res.json()
    } catch {
      body = await res.text()
    }
    throw new ApiError(res.status, body)
  }
  const contentType = res.headers.get('content-type') ?? ''
  if (contentType.includes('application/json')) {
    return res
  }
  return res
}

export { ApiError }

export async function getJson<T = unknown>(path: string): Promise<T> {
  const res = await request(path)
  return (await res.json()) as T
}

export async function postJson<T = unknown>(path: string, body: unknown): Promise<T> {
  const res = await request(path, {
    method: 'POST',
    body: JSON.stringify(body),
  })
  return (await res.json()) as T
}

export async function patchJson<T = unknown>(path: string, body: unknown): Promise<T> {
  const res = await request(path, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
  return (await res.json()) as T
}

export async function delJson(path: string): Promise<void> {
  await request(path, { method: 'DELETE' })
}

export async function postFormData(path: string, formData: FormData): Promise<unknown> {
  const res = await request(path, { method: 'POST', body: formData, headers: {} })
  return (await res.json()) as unknown
}

// ----- Endpoints -----

export function parseText(text: string) {
  return postJson<{ amount?: number; date?: string; time?: string; channel?: string; bank?: string; reference?: string; error?: string; missing?: string[] }>('/parse-text', { text })
}

export function extractImageText(file: File) {
  const formData = new FormData()
  formData.append('file', file)
  return postFormData('/extract-image-text', formData) as Promise<{ text: string; error?: string }>
}

export function getConfig() {
  return getJson<Config>('/config')
}

export function createCase(payload: {
  problem_type: string
  channel: string
  bank_key?: string | null
  bank_name: string
  amount: number
  txn_date: string
  txn_time: string
  reference: string
  account_last4?: string | null
  to_email?: string | null
}) {
  return postJson<CaseRecord>('/cases', payload)
}

export function getCase(id: string) {
  return getJson<CaseRecord>(`/cases/${encodeURIComponent(id)}`)
}

export function patchCase(id: string, patch: { complaint_text?: string; to_email?: string }) {
  return patchJson<CaseRecord>(`/cases/${encodeURIComponent(id)}`, patch)
}

export function deleteCase(id: string) {
  return delJson(`/cases/${encodeURIComponent(id)}`)
}

export function mailOpened(id: string) {
  return postJson<CaseRecord>(`/cases/${encodeURIComponent(id)}/mail-opened`, {})
}

export function confirmSent(id: string, sentAt?: string | null) {
  return postJson<CaseRecord>(`/cases/${encodeURIComponent(id)}/confirm-sent`, { sent_at: sentAt ?? null })
}

export function bankReply(id: string, ticket?: string | null, note?: string | null) {
  return postJson<CaseRecord>(`/cases/${encodeURIComponent(id)}/bank-reply`, { ticket, note })
}

export function resolveCase(id: string) {
  return postJson<CaseRecord>(`/cases/${encodeURIComponent(id)}/resolve`, {})
}

export function escalateCase(id: string, tier: number) {
  return postJson<CaseRecord>(`/cases/${encodeURIComponent(id)}/escalate`, { tier })
}