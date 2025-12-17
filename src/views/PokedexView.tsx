import { useEffect, useMemo, useRef, useState } from 'react'
import styles from './PokedexView.module.css'
import { Icon } from '../components/Icon'
import { formatPokemonName } from '../lib/pokeapi'
import arrowIcon from '../assets/icons/arrow.png'
import { fetchTcgdexCardById, searchTcgdexCardsByPokemonName, tcgdexHighImageUrl } from '../lib/tcgdex'
import type { Pokedex, PokedexEntry } from '../types'

type PokedexFilter = 'all' | 'team' | 'captured' | 'favorites' | 'shiny'

function sortPokedexEntries(pokedex: Pokedex): PokedexEntry[] {
  return Object.values(pokedex)
    .slice()
    .sort((a, b) => a.id - b.id)
}

export function PokedexView({
  pokedex,
  favorites,
  teamIds,
  onToggleFavorite,
  onBack,
  onPlayUiSound,
}: {
  pokedex: Pokedex
  favorites: Set<number>
  teamIds: Set<number>
  onToggleFavorite: (pokemonId: number) => void
  onBack: () => void
  onPlayUiSound?: () => void
}) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<PokedexFilter>('all')
  const [selectedId, setSelectedId] = useState<number | null>(null)

  const [tcgState, setTcgState] = useState<
    | { status: 'idle' }
    | { status: 'loading'; pokemonName: string }
    | { status: 'error'; pokemonName: string; message: string }
    | {
        status: 'ready'
        pokemonName: string
        cardId: string
        cardName: string
        imageUrl: string | null
        setName: string | null
        rarity: string | null
        hp: number | null
        types: string[]
      }
  >({ status: 'idle' })

  const tcgAbortRef = useRef<AbortController | null>(null)

  const seenCount = Object.keys(pokedex ?? {}).length
  const entries = useMemo(() => sortPokedexEntries(pokedex ?? {}), [pokedex])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    let base = entries

    if (filter === 'team') base = base.filter((e) => teamIds.has(e.id))
    if (filter === 'captured') base = base.filter((e) => e.capturedEver)
    if (filter === 'favorites') base = base.filter((e) => favorites.has(e.id))
    if (filter === 'shiny') base = base.filter((e) => e.shinySeen)

    if (!q) return base
    const queryNumber = Number(q)
    if (Number.isFinite(queryNumber) && queryNumber > 0) {
      return base.filter((entry) => entry.id === queryNumber)
    }
    return base.filter((entry) => entry.name.toLowerCase().includes(q))
  }, [entries, favorites, filter, query, teamIds])

  const selectedEntry = useMemo(() => {
    if (!selectedId) return null
    return (pokedex ?? {})[selectedId] ?? null
  }, [pokedex, selectedId])

  useEffect(() => {
    tcgAbortRef.current?.abort?.()
    tcgAbortRef.current = null
    setTcgState({ status: 'idle' })
  }, [selectedEntry?.id])

  useEffect(() => {
    if (!selectedEntry) return

    tcgAbortRef.current?.abort?.()
    const controller = new AbortController()
    tcgAbortRef.current = controller

    const pokemonName = selectedEntry.name
    setTcgState({ status: 'loading', pokemonName })

    ;(async () => {
      try {
        const summaries = await searchTcgdexCardsByPokemonName(pokemonName, { signal: controller.signal })
        const gen1Preferred =
          summaries.find((c) => Boolean(c.image) && /^(base|base1|base2|basep|jungle|fossil|teamrocket|gym)/i.test(c.id)) ??
          summaries.find((c) => Boolean(c.image)) ??
          summaries[0]
        if (!gen1Preferred?.id) throw new Error('No TCG cards found')

        const detail = await fetchTcgdexCardById(gen1Preferred.id, { signal: controller.signal })
        const imageUrl = tcgdexHighImageUrl(detail.image)

        setTcgState({
          status: 'ready',
          pokemonName,
          cardId: detail.id,
          cardName: detail.name,
          imageUrl,
          setName: detail.set?.name ?? null,
          rarity: detail.rarity ?? null,
          hp: typeof detail.hp === 'number' ? detail.hp : null,
          types: (detail.types ?? []).filter((t) => typeof t === 'string'),
        })
      } catch (error: unknown) {
        if (controller.signal.aborted) return
        setTcgState({
          status: 'error',
          pokemonName,
          message: error instanceof Error ? error.message : 'Failed to load TCG card',
        })
      }
    })()
  }, [selectedEntry])

  return (
    <section className={styles.wrap} aria-label="Pokédex">
      <div className={styles.topBar}>
        <div>
          <h2 className={styles.title}>Pokédex</h2>
          <div className={styles.meta}>{seenCount} seen</div>
        </div>
        <button
          type="button"
          className={styles.backButton}
          onClick={() => {
            onPlayUiSound?.()
            onBack()
          }}
          aria-label="Back to game"
          title="Back to game"
        >
          <img className={styles.backIcon} src={arrowIcon} alt="" aria-hidden="true" />
        </button>
      </div>

      <div className={styles.content}>
        <div className={styles.controls}>
          <div className={styles.searchRow}>
            <Icon className={styles.searchIcon} name="search" />
            <input
              className={styles.searchInput}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or # (e.g. 25, pikachu)"
              inputMode="search"
              aria-label="Search Pokédex"
            />
          </div>

          <div className={styles.filtersRow} aria-label="Filters">
            {(
              [
                ['all', 'All'],
                ['team', 'Team'],
                ['captured', 'Captured'],
                ['favorites', 'Favorites'],
                ['shiny', 'Shiny'],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                className={`${styles.filterPill} ${filter === key ? styles.filterPillActive : ''}`}
                onClick={() => {
                  onPlayUiSound?.()
                  setFilter(key)
                }}
                aria-pressed={filter === key}
              >
                {label}
              </button>
            ))}
          </div>

          <div className={styles.summary}>
            {filtered.length} result(s) • {seenCount} seen
          </div>
        </div>

        <div className={styles.list} role="list">
          {filtered.length === 0 ? (
            <div className={styles.empty}>No matches.</div>
          ) : (
            filtered.map((entry) => {
              const displayName = formatPokemonName(entry.name)
              const isSelected = entry.id === selectedId
              const isFav = favorites.has(entry.id)
              const inTeam = teamIds.has(entry.id)
              return (
                <button
                  key={entry.id}
                  type="button"
                  className={`${styles.row} ${isSelected ? styles.rowSelected : ''}`}
                  role="listitem"
                  onClick={() => {
                    onPlayUiSound?.()
                    setSelectedId(entry.id)
                  }}
                  aria-pressed={isSelected}
                >
                  <span className={styles.id}>#{String(entry.id).padStart(3, '0')}</span>
                  <span className={styles.name}>{displayName}</span>
                  <span className={styles.badges} aria-hidden="true">
                    {inTeam ? <span className={styles.badge}>Team</span> : null}
                    {entry.capturedEver ? <span className={styles.badge}>Captured</span> : null}
                    {entry.shinySeen ? <span className={styles.badge}>Shiny</span> : null}
                    {isFav ? <span className={styles.badge}>★</span> : null}
                  </span>
                  <span className={styles.rowMeta}>
                    x{entry.timesEncountered}
                    {entry.releasedCount ? ` • released ${entry.releasedCount}` : ''}
                  </span>
                </button>
              )
            })
          )}
        </div>

        <aside className={styles.right} aria-label="Details">
          {!selectedEntry ? (
            <div className={styles.detailEmpty}>Select a Pokémon to view details.</div>
          ) : (
            <div className={styles.detail}>
              <div className={styles.detailHeader}>
                <div className={styles.detailTitle}>{formatPokemonName(selectedEntry.name)}</div>
                <div className={styles.detailActions}>
                  <div className={styles.detailId}>#{String(selectedEntry.id).padStart(3, '0')}</div>
                  <button
                    type="button"
                    className={`${styles.favButton} ${favorites.has(selectedEntry.id) ? styles.favActive : ''}`}
                    aria-pressed={favorites.has(selectedEntry.id)}
                    onClick={() => {
                      onPlayUiSound?.()
                      onToggleFavorite(selectedEntry.id)
                    }}
                    title={favorites.has(selectedEntry.id) ? 'Unfavorite' : 'Favorite'}
                  >
                    <Icon name="star" width={18} height={18} />
                  </button>
                </div>
              </div>

              <div className={styles.sub}>
                Seen <strong>{selectedEntry.timesEncountered}</strong>
                {selectedEntry.capturedEver ? ' • captured' : ''}
                {selectedEntry.shinySeen ? ' • shiny seen' : ''}
                {selectedEntry.releasedCount ? ` • released ${selectedEntry.releasedCount}` : ''}
              </div>

              {tcgState.status === 'loading' ? (
                <div className={styles.detailLoading}>Loading TCG cards…</div>
              ) : tcgState.status === 'error' ? (
                <div className={styles.detailError}>
                  Could not load TCG cards.
                  <div className={styles.detailErrorHint}>{tcgState.message}</div>
                </div>
              ) : tcgState.status === 'ready' ? (
                <>
                  <div className={styles.tcgMain}>
                    <div>
                      <div className={styles.tcgTitle}>{tcgState.cardName}</div>
                      <div className={styles.tcgMeta}>
                        {tcgState.setName ? <span>{tcgState.setName}</span> : null}
                        {tcgState.rarity ? <span> • {tcgState.rarity}</span> : null}
                        {tcgState.hp ? <span> • HP {tcgState.hp}</span> : null}
                      </div>
                      {tcgState.types.length ? (
                        <div className={styles.tcgTypes}>
                          {tcgState.types.map((t) => (
                            <span key={t} className={styles.tcgType}>
                              {t}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>

                    {tcgState.imageUrl ? (
                      <img
                        className={styles.tcgImage}
                        src={tcgState.imageUrl}
                        alt={`${tcgState.cardName} TCG card`}
                        loading="lazy"
                      />
                    ) : (
                      <div className={styles.detailEmpty}>No card image available.</div>
                    )}
                  </div>
                </>
              ) : (
                <div className={styles.detailEmpty}>Select a Pokémon to see TCG cards.</div>
              )}
            </div>
          )}
        </aside>
      </div>
    </section>
  )
}
