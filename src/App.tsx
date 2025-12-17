import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocalStorageState } from './hooks/useLocalStorageState'
import { useEncounterFlow } from './hooks/useEncounterFlow'
import { useToasts } from './hooks/useToasts'
import {
  ensureNotificationPermission,
  type NotificationPermissionState,
} from './lib/notifications'
import { formatPokemonName } from './lib/pokeapi'
import { MAX_TEAM_SIZE } from './constants/game'
import { resetAppData } from './lib/resetAppData'
import { storageKeys } from './lib/storage'
import { playSfx } from './lib/sfx'
import { EncounterCard } from './components/EncounterCard'
import { StatsBar } from './components/StatsBar'
import { TeamManagementModal } from './components/TeamManagementModal'
import { TeamPanel } from './components/TeamPanel'
import { Toasts } from './components/Toasts'
import { Icon } from './components/Icon'
import { SettingsModal } from './components/SettingsModal'
import { PokedexView } from './views/PokedexView'
import styles from './App.module.css'
import type { CapturedPokemon, Pokedex, Preferences, Stats, Theme } from './types'

import playerIcon from './assets/icons/player.png'
type View = 'game' | 'pokedex'

const defaultTheme: Theme =
  window.matchMedia?.('(prefers-color-scheme: dark)')?.matches ? 'dark' : 'light'

const initialPreferences: Preferences = {
  theme: defaultTheme,
  soundEnabled: true,
  soundVolume: 0.65,
}
const initialStats: Stats = {
  encounters: 0,
  captures: 0,
  shinyEncounters: 0,
  flees: 0,
  failedEncounters: 0,
  throws: 0,
}

export default function App() {
  const [view, setView] = useState<View>('game')
  const [preferences, setPreferences] = useLocalStorageState<Preferences>(
    storageKeys.preferences,
    initialPreferences,
  )
  const [favorites, setFavorites] = useLocalStorageState<number[]>(
    storageKeys.favorites,
    [],
  )
  const [captured, setCaptured] = useLocalStorageState<CapturedPokemon[]>(
    storageKeys.captured,
    [],
  )
  const [stats, setStats] = useLocalStorageState<Stats>(storageKeys.stats, initialStats)
  const [pokedex, setPokedex] = useLocalStorageState<Pokedex>(storageKeys.pokedex, {})

  const { toasts, addToast } = useToasts()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermissionState>(
    () => {
      if (!('Notification' in window)) return 'unsupported'
      return Notification.permission
    },
  )

  const teamIsFull = captured.length >= MAX_TEAM_SIZE
  const {
    encounter,
    pendingCapture,
    throwFx,
    attemptsLeft,
    maxAttempts,
    currentSprite,
    newEncounter,
    onThrow,
    onFlee,
    releasePokemon,
    confirmReleaseForPending,
  } = useEncounterFlow({
    preferences,
    captured,
    setCaptured,
    setStats,
    setPokedex,
    addToast,
    teamIsFull,
    maxTeamSize: MAX_TEAM_SIZE,
  })

  useEffect(() => {
    document.documentElement.dataset.theme = preferences.theme
  }, [preferences.theme])

  useEffect(() => {
    if (captured.length <= MAX_TEAM_SIZE) return
    setCaptured((current) => current.slice(0, MAX_TEAM_SIZE))
  }, [captured.length, setCaptured])

  useEffect(() => {
    const unique = Array.from(new Set(favorites))
    if (unique.length === favorites.length) return
    setFavorites(unique)
  }, [favorites, setFavorites])

  const resetStorage = useCallback(async () => {
    await resetAppData(addToast)
  }, [addToast])

  const playUiSound = useCallback(() => {
    void playSfx('ui', {
      enabled: preferences.soundEnabled,
      volume: preferences.soundVolume,
    })
  }, [preferences.soundEnabled, preferences.soundVolume])

  const toggleTheme = useCallback(() => {
    setPreferences((current) => ({
      ...current,
      theme: current.theme === 'dark' ? 'light' : 'dark',
    }))
  }, [setPreferences])

  const toggleSound = useCallback(() => {
    setPreferences((current) => ({ ...current, soundEnabled: !current.soundEnabled }))
  }, [setPreferences])

  const setSoundVolume = useCallback(
    (volume: number) => {
      const safe = Number.isFinite(volume) ? volume : 0
      setPreferences((current) => ({ ...current, soundVolume: Math.min(1, Math.max(0, safe)) }))
    },
    [setPreferences],
  )

  const enableNotifications = useCallback(async () => {
    const permission = await ensureNotificationPermission()
    setNotificationPermission(permission)
    if (permission === 'granted') addToast('Notifications enabled.', 'success')
    else if (permission === 'denied') addToast('Notifications blocked in your browser.', 'warning')
    else if (permission === 'unsupported') addToast('Notifications not supported here.', 'warning')
  }, [addToast])

  const favoriteSet = useMemo(() => new Set(favorites), [favorites])
  const teamIdSet = useMemo(() => new Set(captured.map((p) => p.id)), [captured])
  const isFavorite = useCallback((pokemonId: number) => favoriteSet.has(pokemonId), [favoriteSet])
  const toggleFavorite = useCallback(
    (pokemonId: number) => {
      setFavorites((current) =>
        current.includes(pokemonId)
          ? current.filter((id) => id !== pokemonId)
          : [...current, pokemonId],
      )
    },
    [setFavorites],
  )

  return (
    <div className={styles.app}>
      <div className={styles.topDockWrap} aria-label="Top controls">
        <div className={styles.centerLogoWrap} aria-label="PokeChu">
          <img
            className={styles.centerLogo}
            src={`${import.meta.env.BASE_URL}icons/PokeChu.gif`}
            alt="PokeChu"
          />
        </div>
        <div className={styles.dock}>
          <button
            type="button"
            className={styles.iconButton}
            onClick={() => setSettingsOpen(true)}
            aria-label="Open settings"
            title="Settings"
          >
            <img className={styles.imgIcon} src={playerIcon} alt="" aria-hidden="true" />
          </button>
          <button
            type="button"
            className={`${styles.iconButton} ${
              notificationPermission === 'granted' ? styles.iconButtonActive : ''
            }`}
            onClick={enableNotifications}
            disabled={notificationPermission === 'granted' || notificationPermission === 'unsupported'}
            aria-label={
              notificationPermission === 'granted'
                ? 'Notifications enabled'
                : notificationPermission === 'unsupported'
                  ? 'Notifications not supported'
                  : 'Enable notifications'
            }
            title={
              notificationPermission === 'granted'
                ? 'Notifications on'
                : notificationPermission === 'unsupported'
                  ? 'Notifications unsupported'
                  : 'Enable notifications'
            }
          >
            <Icon className={styles.svgIcon} name="bell" />
          </button>
          <button
            type="button"
            className={styles.iconButton}
            onClick={toggleTheme}
            aria-label={`Theme: ${preferences.theme}. Toggle theme`}
            title={preferences.theme === 'dark' ? 'Dark mode' : 'Light mode'}
          >
            <Icon className={styles.svgIcon} name={preferences.theme === 'dark' ? 'moon' : 'sun'} />
          </button>
        </div>
      </div>

      {view === 'game' ? <StatsBar stats={stats} teamSize={captured.length} /> : null}

      {view === 'game' ? (
        <main className={styles.main}>
          <section className={styles.primary}>
            <EncounterCard
              key={
                encounter.status === 'ready'
                  ? `${encounter.pokemon.id}-${encounter.shiny}`
                  : encounter.status
              }
              encounter={encounter}
              spriteUrl={currentSprite}
              attemptsLeft={attemptsLeft}
              maxAttempts={maxAttempts}
              isFavorite={encounter.pokemon ? isFavorite(encounter.pokemon.id) : false}
              onToggleFavorite={() => encounter.pokemon && toggleFavorite(encounter.pokemon.id)}
              onThrow={onThrow}
              onFlee={onFlee}
              disabled={Boolean(pendingCapture) || Boolean(throwFx)}
              throwFx={throwFx}
              onRetry={newEncounter}
            />
          </section>

          <aside className={styles.secondary}>
            <TeamPanel
              captured={captured}
              favorites={favoriteSet}
              onToggleFavorite={toggleFavorite}
              onRelease={releasePokemon}
              pokedex={pokedex}
              onOpenPokedex={() => {
                playUiSound()
                setView('pokedex')
              }}
            />
          </aside>
        </main>
      ) : (
        <main className={`${styles.main} ${styles.mainSingle}`}>
          <PokedexView
            pokedex={pokedex}
            favorites={favoriteSet}
            teamIds={teamIdSet}
            onToggleFavorite={toggleFavorite}
            onBack={() => setView('game')}
            onPlayUiSound={playUiSound}
          />
        </main>
      )}

      <TeamManagementModal
        open={Boolean(pendingCapture)}
        captured={captured}
        favorites={favoriteSet}
        onToggleFavorite={toggleFavorite}
        onRelease={confirmReleaseForPending}
        pendingPokemonName={
          pendingCapture ? formatPokemonName(pendingCapture.pokemon.name) : ''
        }
      />

      <Toasts toasts={toasts} />

      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        soundEnabled={preferences.soundEnabled}
        soundVolume={preferences.soundVolume}
        onToggleSound={toggleSound}
        onSetSoundVolume={setSoundVolume}
        notificationPermission={notificationPermission}
        onEnableNotifications={enableNotifications}
        onResetStorage={resetStorage}
      />
    </div>
  )
}
