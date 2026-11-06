// Times are stored in UTC (ISO-8601 with Z) and displayed in WAT (Africa/Lagos).

const WAT_OPTIONS: Intl.DateTimeFormatOptions = {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZoneName: 'short',
}

export function formatWAT(iso: string | null): string {
  if (!iso) return '—'
  try {
    return new Intl.DateTimeFormat('en-GB', { ...WAT_OPTIONS, timeZone: 'Africa/Lagos' }).format(new Date(iso))
  } catch {
    return iso
  }
}

export function formatWATShort(iso: string | null): string {
  if (!iso) return '—'
  try {
    return new Intl.DateTimeFormat('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Africa/Lagos',
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

export function hoursLeft(deadlineAt: string | null, now: Date = new Date()): number | null {
  if (!deadlineAt) return null
  const deadline = new Date(deadlineAt)
  if (Number.isNaN(deadline.getTime())) return null
  const seconds = (deadline.getTime() - now.getTime()) / 1000
  if (seconds <= 0) return 0
  return Math.floor(seconds / 3600)
}

export function countdownText(deadlineAt: string | null): { hours: number | null; passed: boolean } {
  const left = hoursLeft(deadlineAt)
  return { hours: left ?? null, passed: left !== null && left <= 0 }
}

// Converts a `<input type="datetime-local">` value (local time) to an ISO-8601 UTC string.
export function localToUtcIso(local: string): string | null {
  if (!local) return null
  // "2026-10-13T14:30" -> treat as local, convert to UTC
  const [datePart, timePart] = local.split('T')
  if (!datePart || !timePart) return null
  const [y, m, d] = datePart.split('-').map(Number)
  const [h, min] = timePart.split(':').map(Number)
  if (!y || !m || !d || h === undefined || min === undefined) return null
  const localMs = Date.UTC(y, (m ?? 1) - 1, d ?? 1, h ?? 0, min ?? 0) - new Date().getTimezoneOffset() * 60 * 1000
  return new Date(localMs).toISOString()
}

// Clamp a user-entered send time to [createdAt, now + 2 minutes tolerance], returned as UTC ISO.
export function clampSentAt(local: string, createdAt: string): { value: string | null; error: string | null } {
  const value = localToUtcIso(local)
  if (!value) return { value: null, error: 'Enter a valid date and time.' }
  const now = new Date()
  const created = new Date(createdAt)
  const toleranceMs = 2 * 60 * 1000
  const max = new Date(now.getTime() + toleranceMs)
  const sent = new Date(value)
  if (sent < created) {
    return { value: null, error: 'The send time cannot be before you started this case.' }
  }
  if (sent > max) {
    return { value: null, error: 'The send time cannot be in the future.' }
  }
  return { value, error: null }
}
