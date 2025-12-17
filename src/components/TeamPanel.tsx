import styles from './TeamPanel.module.css'
import { formatPokemonName } from '../lib/pokeapi'
import { Icon } from './Icon'
import releaseIcon from '../assets/icons/release.png'
import pokedexIcon from '../assets/icons/pokedex.png'
import type { CapturedPokemon, Pokedex } from '../types'
import { MAX_TEAM_SIZE } from '../constants/game'

export function TeamPanel({
  captured,
  favorites,
  onToggleFavorite,
  onRelease,
  pokedex,
  onOpenPokedex,
}: {
  captured: CapturedPokemon[]
  favorites: Set<number>
  onToggleFavorite: (pokemonId: number) => void
  onRelease: (pokemonId: number, capturedAt: string) => void
  pokedex: Pokedex
  onOpenPokedex: () => void
}) {
  const encounteredCount = Object.keys(pokedex ?? {}).length

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <h2 className={styles.title}>Current Team</h2>
        <div className={styles.headerRight}>
          <button
            type="button"
            className={styles.pokedexButton}
            onClick={() => {
              onOpenPokedex()
            }}
            title="Open Pokédex"
          >
            <img className={styles.pokedexIcon} src={pokedexIcon} alt="" aria-hidden="true" />
            Pokédex <span className={styles.pokedexMeta}>{encounteredCount} seen</span>
          </button>
          <span className={styles.badge}>
            {captured.length}/{MAX_TEAM_SIZE}
          </span>
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
    </div>
  )
}
