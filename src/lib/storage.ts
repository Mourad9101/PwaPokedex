const STORAGE_PREFIX = 'pokechu.'

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value == null) return false
  if (typeof value !== 'object') return false
  if (Array.isArray(value)) return false
  return Object.getPrototypeOf(value) === Object.prototype
}

function safeJsonParse<T>(value: string | null, fallback: T): T {
  if (value == null) return fallback
  try {
    const parsed: unknown = JSON.parse(value)

    if (isPlainObject(fallback) && isPlainObject(parsed)) {
      return { ...(fallback as Record<string, unknown>), ...(parsed as Record<string, unknown>) } as T
    }

    return parsed as T
  } catch {
    return fallback
  }
}

export const storageKeys = Object.freeze({
  captured: `${STORAGE_PREFIX}captured`,
  favorites: `${STORAGE_PREFIX}favorites`,
  preferences: `${STORAGE_PREFIX}preferences`,
  stats: `${STORAGE_PREFIX}stats`,
  pokedex: `${STORAGE_PREFIX}pokedex`,
  pokemonCache: `${STORAGE_PREFIX}pokemonCache`,
})

export function readStorageJson<T>(key: string, fallback: T): T {
  return safeJsonParse(localStorage.getItem(key), fallback)
}

export function writeStorageJson<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value))
}
