import styles from './StatsBar.module.css'
import { Icon } from './Icon'

type Stats = {
  encounters: number
  captures: number
  shinyEncounters: number
  flees: number
  failedEncounters: number
  throws: number
}

export function StatsBar({ stats, teamSize }: { stats: Stats; teamSize: number }) {
  return (
    <section className={styles.bar} aria-label="Game statistics">
      <div className={styles.item}>
        <span className={styles.label}>
          <Icon className={styles.labelIcon} name="search" />
          Encounters
        </span>
        <span className={styles.value}>{stats.encounters}</span>
      </div>
      <div className={styles.item}>
        <span className={styles.label}>
          <Icon className={styles.labelIcon} name="pokeball" />
          Captured
        </span>
        <span className={styles.value}>{stats.captures}</span>
      </div>
      <div className={styles.item}>
        <span className={styles.label}>
          <Icon className={styles.labelIcon} name="star" />
          Shiny
        </span>
        <span className={styles.value}>{stats.shinyEncounters}</span>
      </div>
      <div className={styles.item}>
        <span className={styles.label}>
          <Icon className={styles.labelIcon} name="pokeball" />
          Throws
        </span>
        <span className={styles.value}>{stats.throws}</span>
      </div>
      <div className={styles.item}>
        <span className={styles.label}>
          <Icon className={styles.labelIcon} name="run" />
          Flees
        </span>
        <span className={styles.value}>{stats.flees}</span>
      </div>
      <div className={styles.item}>
        <span className={styles.label}>
          <Icon className={styles.labelIcon} name="book" />
          Team
        </span>
        <span className={styles.value}>{teamSize}/6</span>
      </div>
    </section>
  )
}
