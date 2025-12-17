import { readStorageJson, storageKeys, writeStorageJson } from './storage'

const POKEAPI_BASE = 'https://pokeapi.co/api/v2'

export type PokemonDetails = {
  id: number
  name: string
  types: string[]
  sprites: {
    default: string | null
    shiny: string | null
  }
}

type PokemonCacheEntry = {
  storedAt: number
  value: PokemonDetails
}

type PokemonCache = Record<number, PokemonCacheEntry>

const POKEMON_CACHE_MAX_ENTRIES = 200
const POKEMON_CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 30

function now() {
  return Date.now()
}

function safeReadPokemonCache(): PokemonCache {
  if (!('localStorage' in globalThis)) return {}
  return readStorageJson<PokemonCache>(storageKeys.pokemonCache, {})
}

function prunePokemonCache(cache: PokemonCache): PokemonCache {
  const entries = Object.entries(cache)
    .map(([id, entry]) => [Number(id), entry])
    .filter(([id, entry]) => Number.isFinite(id) && entry && typeof entry.storedAt === 'number')

  const cutoff = now() - POKEMON_CACHE_TTL_MS
  const fresh = entries.filter(([, entry]) => entry.storedAt >= cutoff)

  fresh.sort((a, b) => (b[1].storedAt ?? 0) - (a[1].storedAt ?? 0))
  const trimmed = fresh.slice(0, POKEMON_CACHE_MAX_ENTRIES)

  return Object.fromEntries(trimmed)
}

function writePokemonCache(cache: PokemonCache) {
  if (!('localStorage' in globalThis)) return
  writeStorageJson(storageKeys.pokemonCache, cache)
}

function readCachedPokemon(id: number): PokemonDetails | null {
  try {
    const cache = prunePokemonCache(safeReadPokemonCache())
    const entry = cache[id]
    if (!entry?.value) return null
    return entry.value
  } catch {
    return null
  }
}

function storeCachedPokemon(pokemon: PokemonDetails) {
  try {
    const current = prunePokemonCache(safeReadPokemonCache())
    const next = prunePokemonCache({
      ...current,
      [pokemon.id]: { storedAt: now(), value: pokemon },
    })
    writePokemonCache(next)
  } catch {
    // Ignore storage errors (quota/private mode).
  }
}

export function getCachedPokemonIds(): number[] {
  try {
    const cache = prunePokemonCache(safeReadPokemonCache())
    return Object.keys(cache)
      .map((id) => Number(id))
      .filter((id) => Number.isFinite(id))
  } catch {
    return []
  }
}

export async function fetchPokemonById(
  id: number,
  { signal }: { signal?: AbortSignal } = {},
): Promise<PokemonDetails> {
  const cached = readCachedPokemon(id)
  const isOffline = 'navigator' in globalThis && globalThis.navigator && !globalThis.navigator.onLine
  if (isOffline && cached) return cached

  try {
    const response = await fetch(`${POKEAPI_BASE}/pokemon/${id}`, { signal })
    if (!response.ok) {
      if (cached) return cached
      throw new Error(`PokeAPI error ${response.status}`)
    }
    const pokemon = await response.json()

    const types = (pokemon.types ?? [])
      .slice()
      .sort((a, b) => (a.slot ?? 0) - (b.slot ?? 0))
      .map((t) => t.type?.name)
      .filter(Boolean)

    const details: PokemonDetails = {
      id: pokemon.id,
      name: pokemon.name,
      types,
      sprites: {
        default: pokemon.sprites?.front_default ?? null,
        shiny: pokemon.sprites?.front_shiny ?? null,
      },
    }

    storeCachedPokemon(details)
    return details
  } catch (error) {
    if (cached) return cached
    throw error
  }
}

export function formatPokemonName(name: string): string {
  if (!name) return ''
  return name
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}
