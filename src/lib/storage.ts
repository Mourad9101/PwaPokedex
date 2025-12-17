const STORAGE_PREFIX = 'pokechu.'

function safeJsonParse<T>(value: string | null, fallback: T): T {
  if (value == null) return fallback
  try {
    return JSON.parse(value) as T
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
