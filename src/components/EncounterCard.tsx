import styles from './EncounterCard.module.css'
import { formatPokemonName } from '../lib/pokeapi'
import { formatDexNumber } from '../lib/format'
import { TypePill } from './TypePill'
import { Icon } from './Icon'
import gotchaIcon from '../assets/icons/gotcha.png'

type ThrowFx = { id: string; variant: 'capture' | 'break' }

type Encounter =
  | {
      status: 'loading'
      pokemon: null
      shiny: boolean
      attemptsUsed: number
      error: null
    }
  | {
      status: 'error'
      pokemon: null
      shiny: boolean
      attemptsUsed: number
      error: string
    }
  | {
      status: 'ready'
      pokemon: {
        id: number
        name: string
        types: string[]
      }
      shiny: boolean
      attemptsUsed: number
      error: null
    }

export function EncounterCard({
  encounter,
  spriteUrl,
  attemptsLeft,
  maxAttempts,
  isFavorite,
  onToggleFavorite,
  onThrow,
  onFlee,
  disabled,
  onRetry,
  throwFx = null,
}: {
  encounter: Encounter
  spriteUrl: string | null
  attemptsLeft: number
  maxAttempts: number
  isFavorite: boolean
  onToggleFavorite: () => void
  onThrow: () => void
  onFlee: () => void
  disabled: boolean
  onRetry: () => void
  throwFx?: ThrowFx | null
}) {
  const formattedName =
    encounter.status === 'ready' ? formatPokemonName(encounter.pokemon.name) : '...'

  return (
    <div className={styles.card}>
      <div className={styles.topRow}>
        <div className={styles.heading}>
          <h2 className={styles.name}>
            {encounter.status === 'ready' ? formattedName : 'Searching...'}
          </h2>
          {encounter.status === 'ready' && (
            <p className={styles.meta}>
              {formatDexNumber(encounter.pokemon.id)}
              {encounter.shiny ? ' • Shiny' : ''}
            </p>
          )}
        </div>

        <button
          type="button"
          className={`${styles.favoriteButton} ${isFavorite ? styles.favoriteActive : ''}`}
          onClick={onToggleFavorite}
          disabled={encounter.status !== 'ready' || disabled}
          aria-pressed={isFavorite}
          aria-label={isFavorite ? 'Unfavorite Pokémon' : 'Favorite Pokémon'}
        >
          <Icon className={styles.iconOnly} name="star" />
        </button>
      </div>

      <div className={styles.spriteFrame} data-shiny={encounter.shiny ? 'true' : 'false'}>
        {throwFx ? (
          <div
            key={throwFx.id}
            className={styles.throwOverlay}
            data-variant={throwFx.variant}
            aria-hidden="true"
          >
            <div className={styles.throwTrail} />
            <div className={styles.throwBurst} />
            <div className={styles.throwBall}>
              <div className={styles.throwTop} />
              <div className={styles.throwBottom} />
              <div className={styles.throwButton} />
            </div>
            {throwFx.variant === 'capture' ? (
              <img className={styles.throwLabel} src={gotchaIcon} alt="" aria-hidden="true" />
            ) : null}
          </div>
        ) : null}
        {encounter.status === 'loading' && <div className={styles.loading}>Loading…</div>}
        {encounter.status === 'error' && (
          <div className={styles.error}>
            <p className={styles.errorText}>{encounter.error}</p>
            <button type="button" className={styles.primaryButton} onClick={onRetry}>
              <Icon className={styles.buttonIcon} name="refresh" />
              Retry
            </button>
          </div>
        )}
        {encounter.status === 'ready' && spriteUrl && (
          <img className={styles.sprite} src={spriteUrl} alt={formattedName} />
        )}
      </div>

      {encounter.status === 'ready' && (
        <div className={styles.types}>
          {encounter.pokemon.types.map((type) => (
            <TypePill key={type} type={type} />
          ))}
        </div>
      )}

      <div className={styles.controls}>
        <div className={styles.attempts}>
          <span className={styles.srOnly}>
            Throws left: {attemptsLeft} / {maxAttempts}
          </span>
          <span className={styles.attemptsRow} aria-hidden="true">
            {Array.from({ length: maxAttempts }).map((_, index) => {
              const remaining = index < attemptsLeft
              return (
                <span
                  key={index}
                  className={`${styles.ball} ${remaining ? styles.ballActive : styles.ballUsed}`}
                  title={remaining ? 'Throw available' : 'Used'}
                >
                  <img
                    className={styles.ballIcon}
                    src={`${import.meta.env.BASE_URL}icons/pokeball.svg`}
                    alt=""
                  />
                </span>
              )
            })}
          </span>
        </div>

        <div className={styles.buttons}>
          <button
            type="button"
            className={styles.primaryButton}
            onClick={onThrow}
            disabled={encounter.status !== 'ready' || disabled || attemptsLeft <= 0}
          >
            <Icon className={styles.buttonIcon} name="pokeball" />
            Throw Pokéball
          </button>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={onFlee}
            disabled={encounter.status === 'loading' || disabled}
          >
            <Icon className={styles.buttonIcon} name="run" />
            Flee
          </button>
        </div>
      </div>
    </div>
  )
}
