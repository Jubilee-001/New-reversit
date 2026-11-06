const CASES_KEY = 'reverseit_case_ids'

export function saveCaseId(id: string): void {
  try {
    const ids = getCaseIds()
    if (!ids.includes(id)) {
      ids.push(id)
      localStorage.setItem(CASES_KEY, JSON.stringify(ids))
    }
  } catch {
    // localStorage may be unavailable or quota-exceeded; the case link still works.
  }
}

export function getCaseIds(): string[] {
  try {
    const raw = localStorage.getItem(CASES_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'string') : []
  } catch {
    return []
  }
}

export function removeCaseId(id: string): void {
  try {
    localStorage.setItem(
      CASES_KEY,
      JSON.stringify(getCaseIds().filter((existing) => existing !== id)),
    )
  } catch {
    // ignore
  }
}
