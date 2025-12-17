import styles from './TeamManagementModal.module.css'
import { Modal } from './Modal'
import { formatPokemonName } from '../lib/pokeapi'
import { Icon } from './Icon'
import releaseIcon from '../assets/icons/release.png'
import { MAX_TEAM_SIZE } from '../constants/game'

export function TeamManagementModal({
  open,
  captured,
  favorites,
  onToggleFavorite,
  onRelease,
  pendingPokemonName,
}: {
  open: boolean
  captured: Array<{
    id: number
    name: string
    sprite: string | null
    shiny: boolean
    capturedAt: string
  }>
  favorites: Set<number>
  onToggleFavorite: (pokemonId: number) => void
  onRelease: (pokemonId: number, capturedAt: string) => void
  pendingPokemonName: string
}) {
  return (
    <Modal
      open={open}
      title={`Team full: Rule of ${MAX_TEAM_SIZE}`}
    >
      <p className={styles.text}>
        You tried to capture <strong>{pendingPokemonName}</strong>, but your team already has{' '}
        {MAX_TEAM_SIZE} Pokémon. Release one to continue.
      </p>

      <div className={styles.grid} role="list">
        {captured.map((p) => {
          const name = formatPokemonName(p.name)
          const isFav = favorites.has(p.id)
          return (
            <div key={`${p.id}:${p.capturedAt}`} className={styles.slot} role="listitem">
              {p.sprite ? <img className={styles.sprite} src={p.sprite} alt={name} /> : null}
              <div className={styles.info}>
                <div className={styles.nameRow}>
                  <strong className={styles.name}>
                    {name}
                    {p.shiny ? <span className={styles.shiny}>Shiny</span> : null}
                  </strong>
                  <button
                    type="button"
                    className={`${styles.fav} ${isFav ? styles.favActive : ''}`}
                    aria-pressed={isFav}
                    onClick={() => onToggleFavorite(p.id)}
                  >
                    <Icon className={styles.iconOnly} name="star" />
                  </button>
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
        })}
      </div>
    </Modal>
  )
}
