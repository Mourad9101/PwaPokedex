import { useMemo, useState } from 'react'
import styles from './TeamPanel.module.css'
import { formatPokemonName } from '../lib/pokeapi'
import { Icon } from './Icon'
import releaseIcon from '../assets/icons/release.png'
import pokedexIcon from '../assets/icons/pokedex.png'

type CapturedPokemon = {
  id: number
  name: string
  sprite: string | null
  types: string[]
  shiny: boolean
  capturedAt: string
}

type PokedexEntry = {
  id: number
  name: string
  timesEncountered: number
  shinySeen: boolean
  capturedEver: boolean
  releasedCount: number
}

type Pokedex = Record<number, PokedexEntry>

function sortPokedexEntries(pokedex: Pokedex): PokedexEntry[] {
  return Object.values(pokedex)
    .slice()
    .sort((a, b) => a.id - b.id)
}

export function TeamPanel({
  captured,
  favorites,
  onToggleFavorite,
  onRelease,
  pokedex,
}: {
  captured: CapturedPokemon[]
  favorites: Set<number>
  onToggleFavorite: (pokemonId: number) => void
  onRelease: (pokemonId: number, capturedAt: string) => void
  pokedex: Pokedex
}) {
  const [pokedexOpen, setPokedexOpen] = useState(false)
  const [pokedexQuery, setPokedexQuery] = useState('')
  const encounteredCount = Object.keys(pokedex ?? {}).length
  const pokedexEntries = useMemo(() => sortPokedexEntries(pokedex ?? {}), [pokedex])
  const filteredPokedexEntries = useMemo(() => {
    const query = pokedexQuery.trim().toLowerCase()
    if (!query) return pokedexEntries
    const queryNumber = Number(query)
    if (Number.isFinite(queryNumber) && queryNumber > 0) {
      return pokedexEntries.filter((entry) => entry.id === queryNumber)
    }
    return pokedexEntries.filter((entry) => entry.name.toLowerCase().includes(query))
  }, [pokedexEntries, pokedexQuery])

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <h2 className={styles.title}>Current Team</h2>
        <div className={styles.headerRight}>
          <button
            type="button"
            className={styles.pokedexButton}
            onClick={() => {
              setPokedexOpen((current) => {
                const next = !current
                if (!next) setPokedexQuery('')
                return next
              })
            }}
            aria-expanded={pokedexOpen}
            aria-controls="pokechu-pokedex"
            title={pokedexOpen ? 'Close Pokédex' : 'Open Pokédex'}
          >
            <img className={styles.pokedexIcon} src={pokedexIcon} alt="" aria-hidden="true" />
            Pokédex <span className={styles.pokedexMeta}>{encounteredCount} seen</span>
          </button>
          <span className={styles.badge}>{captured.length}/6</span>
        </div>
      </div>

      <div className={styles.teamGrid}>
        {captured.length === 0 ? (
          <p className={styles.empty}>No Pokémon captured yet.</p>
        ) : (
          captured.map((p) => {
            const name = formatPokemonName(p.name)
            const fav = favorites.has(p.id)
            return (
              <div key={`${p.id}:${p.capturedAt}`} className={styles.member}>
                {p.sprite ? <img className={styles.sprite} src={p.sprite} alt={name} /> : null}
                <div className={styles.memberInfo}>
                  <div className={styles.nameRow}>
                    <strong className={styles.name}>
                      {name} {p.shiny ? <span className={styles.shiny}>Shiny</span> : null}
                    </strong>
                    <button
                      type="button"
                      className={`${styles.fav} ${fav ? styles.favActive : ''}`}
                      aria-pressed={fav}
                      onClick={() => onToggleFavorite(p.id)}
                      title={fav ? 'Unfavorite' : 'Favorite'}
                    >
                      <Icon className={styles.iconOnly} name="star" />
                    </button>
                  </div>
                  <div className={styles.types}>
                    {(p.types ?? []).map((t) => (
                      <span key={t} className={styles.type}>
                        {formatPokemonName(t)}
                      </span>
                    ))}
                  </div>
                  <button
                    type="button"
                    className={styles.release}
                    onClick={() => onRelease(p.id, p.capturedAt)}
                  >
                    <img className={styles.releaseIcon} src={releaseIcon} alt="" aria-hidden="true" />
                    Release
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>

      {pokedexOpen ? (
        <section id="pokechu-pokedex" className={styles.pokedexDrawer} aria-label="Pokédex">
          <div className={styles.pokedexDrawerTop}>
            <div className={styles.searchRow}>
              <Icon className={styles.searchIcon} name="search" />
              <input
                className={styles.pokedexSearch}
                value={pokedexQuery}
                onChange={(event) => setPokedexQuery(event.target.value)}
                placeholder="Search by name or # (e.g. 25, pikachu)"
                inputMode="search"
                aria-label="Search Pokédex"
              />
            </div>
            <button
              type="button"
              className={styles.pokedexClose}
              onClick={() => {
                setPokedexOpen(false)
                setPokedexQuery('')
              }}
              aria-label="Close Pokédex"
              title="Close Pokédex"
            >
              ×
            </button>
          </div>

          <div className={styles.pokedexSummary}>
            {filteredPokedexEntries.length} result(s) • {encounteredCount} seen
          </div>

          <div className={styles.pokedexList} role="list">
            {filteredPokedexEntries.length === 0 ? (
              <div className={styles.pokedexEmpty}>No matches.</div>
            ) : (
              filteredPokedexEntries.map((entry) => {
                const displayName = formatPokemonName(entry.name)
                return (
                  <div key={entry.id} className={styles.dexRow} role="listitem">
                    <span className={styles.dexId}>#{String(entry.id).padStart(3, '0')}</span>
                    <span className={styles.dexName}>{displayName}</span>
                    <span className={styles.dexMeta}>
                      x{entry.timesEncountered}
                      {entry.shinySeen ? ' • shiny seen' : ''}
                      {entry.capturedEver ? ' • captured' : ''}
                      {entry.releasedCount ? ` • released ${entry.releasedCount}` : ''}
                    </span>
                  </div>
                )
              })
            )}
          </div>
        </section>
      ) : null}
    </div>
  )
}
