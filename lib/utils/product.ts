export function isNumericCodeName(name?: string | null): boolean {
  if (!name) return false
  return ((name.match(/\d/g) || []).length) > 4
}

export function normalizeSearch(value: unknown): string {
  return String(value ?? '').toLowerCase().trim()
}

export function matchesSearch(...fields: unknown[]): (term: string) => boolean {
  const normalized = fields.map(normalizeSearch)
  return (term: string) => {
    const t = normalizeSearch(term)
    if (!t) return true
    return normalized.some((f) => f.includes(t))
  }
}
