export type TcgCardSummary = {
  id: string
  name: string
  image: string | null
}

export type TcgCardDetail = {
  id: string
  name: string
  image: string | null
  rarity?: string | null
  hp?: number | string | null
  types?: string[] | null
  set?: { name?: string | null } | null
}

const API_BASE = 'https://api.tcgdex.net/v2/en'

function mapPokeApiNameToTcgdexQuery(name: string): string {
  const normalized = name.trim().toLowerCase()
  switch (normalized) {
    case 'mr-mime':
      return 'Mr. Mime'
    case 'farfetchd':
      return "Farfetch'd"
    case 'nidoran-f':
      return 'Nidoran♀'
    case 'nidoran-m':
      return 'Nidoran♂'
    default:
      return normalized
  }
}

async function tcgdexFetchJson<T>(path: string, options?: { signal?: AbortSignal }): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { signal: options?.signal })
  if (!res.ok) throw new Error(`TCGdex HTTP ${res.status}`)
  return (await res.json()) as T
}

export async function searchTcgdexCardsByPokemonName(
  pokeApiName: string,
  options?: { signal?: AbortSignal },
): Promise<TcgCardSummary[]> {
  const q = mapPokeApiNameToTcgdexQuery(pokeApiName)
  const encoded = encodeURIComponent(q)
  const data = await tcgdexFetchJson<unknown>(`/cards?name=${encoded}`, options)

  if (!Array.isArray(data)) return []
  return data
    .map((item) => {
      if (!item || typeof item !== 'object') return null
      const it = item as Record<string, unknown>
      const id = typeof it.id === 'string' ? it.id : null
      const name = typeof it.name === 'string' ? it.name : null
      const image = typeof it.image === 'string' ? it.image : null
      if (!id || !name) return null
      return { id, name, image } satisfies TcgCardSummary
    })
    .filter((v): v is TcgCardSummary => Boolean(v))
}

export async function fetchTcgdexCardById(
  id: string,
  options?: { signal?: AbortSignal },
): Promise<TcgCardDetail> {
  const encoded = encodeURIComponent(id)
  const data = await tcgdexFetchJson<unknown>(`/cards/${encoded}`, options)
  if (!data || typeof data !== 'object') throw new Error('Invalid card payload')
  const it = data as Record<string, unknown>
  const cardId = typeof it.id === 'string' ? it.id : id
  const name = typeof it.name === 'string' ? it.name : id
  const image = typeof it.image === 'string' ? it.image : null
  const rarity = typeof it.rarity === 'string' ? it.rarity : null
  const hp = it.hp as unknown
  const types = Array.isArray(it.types) ? (it.types.filter((t) => typeof t === 'string') as string[]) : []
  const set =
    it.set && typeof it.set === 'object'
      ? ({ name: (it.set as Record<string, unknown>).name as string | null } as { name?: string | null })
      : null

  return { id: cardId, name, image, rarity, hp: hp as number | string | null, types, set }
}

export function tcgdexHighImageUrl(base: string | null): string | null {
  if (!base) return null
  return `${base}/high.webp`
}

