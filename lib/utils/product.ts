export function isNumericCodeName(name?: string | null): boolean {
  if (!name) return false
  return ((name.match(/\d/g) || []).length) > 4
}
