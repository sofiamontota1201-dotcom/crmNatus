// Utilities to convert object keys between snake_case and camelCase recursively

const toCamel = (s: string) => s.replace(/[_-](\w)/g, (_, c) => (c ? c.toUpperCase() : ''))
const toSnake = (s: string) => s
  .replace(/([A-Z])/g, '_$1')
  .replace(/[-\s]+/g, '_')
  .toLowerCase()

function isPlainObject(value: any): value is Record<string, any> {
  return Object.prototype.toString.call(value) === '[object Object]'
}

export function toCamelCaseKeys<T = any>(input: any): T {
  if (Array.isArray(input)) return input.map((i) => toCamelCaseKeys(i)) as any
  if (!isPlainObject(input)) return input
  const out: Record<string, any> = {}
  for (const [key, value] of Object.entries(input)) {
    out[toCamel(key)] = toCamelCaseKeys(value)
  }
  return out as T
}

export function toSnakeCaseKeys<T = any>(input: any): T {
  if (Array.isArray(input)) return input.map((i) => toSnakeCaseKeys(i)) as any
  if (!isPlainObject(input)) return input
  const out: Record<string, any> = {}
  for (const [key, value] of Object.entries(input)) {
    out[toSnake(key)] = toSnakeCaseKeys(value)
  }
  return out as T
}

