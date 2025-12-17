import styles from './TypePill.module.css'
import { formatPokemonName } from '../lib/pokeapi'

export function TypePill({ type }: { type: string }) {
  const normalized = String(type || '').toLowerCase()
  return (
    <span className={`${styles.pill} ${styles[`type_${normalized}`] ?? styles.type_unknown}`}>
      {formatPokemonName(normalized)}
    </span>
  )
}
