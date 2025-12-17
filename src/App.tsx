import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocalStorageState } from './hooks/useLocalStorageState'
import {
  ensureNotificationPermission,
  notify,
  type NotificationPermissionState,
} from './lib/notifications'
import { fetchPokemonById, formatPokemonName, getCachedPokemonIds } from './lib/pokeapi'
import { randomFloatInclusive, randomIntInclusive } from './lib/random'
import { GEN_1_MAX_ID, MAX_TEAM_SIZE, MAX_THROWS_PER_ENCOUNTER, SHINY_PROBABILITY } from './constants/game'
import { makeId } from './lib/id'
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

import playerIcon from './assets/icons/player.png'

type Theme = 'light' | 'dark'
type View = 'game' | 'pokedex'

type Preferences = {
  theme: Theme
  soundEnabled: boolean
  soundVolume: number
}

type Stats = {
  encounters: number
  captures: number
  shinyEncounters: number
  flees: number
  failedEncounters: number
  throws: number
}

type PokemonApi = Awaited<ReturnType<typeof fetchPokemonById>>

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

type EncounterState =
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
      pokemon: PokemonApi
      shiny: boolean
      attemptsUsed: number
      error: null
    }

type PendingCapture = {
  pokemon: PokemonApi
  shiny: boolean
}

type ToastTone = 'info' | 'success' | 'warning' | 'shiny'
type Toast = { id: string; message: string; tone: ToastTone }

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

  const [encounter, setEncounter] = useState<EncounterState>({
    status: 'loading',
    pokemon: null,
    shiny: false,
    attemptsUsed: 0,
    error: null,
  })
  const [pendingCapture, setPendingCapture] = useState<PendingCapture | null>(null)
  const [throwFx, setThrowFx] = useState<{ id: string; variant: 'capture' | 'break' } | null>(null)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermissionState>(
    () => {
      if (!('Notification' in window)) return 'unsupported'
      return Notification.permission
    },
  )
  const abortRef = useRef<AbortController | null>(null)
  const shinyNotifiedRef = useRef(false)
  const throwFxIdRef = useRef<string | null>(null)

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

  const addToast = useCallback((message: string, tone: ToastTone = 'info') => {
    const id = makeId()
    setToasts((current) => [{ id, message, tone }, ...current].slice(0, 4))
    window.setTimeout(() => {
      setToasts((current) => current.filter((t) => t.id !== id))
    }, 3200)
  }, [])

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

  const teamIsFull = captured.length >= MAX_TEAM_SIZE
  const attemptsLeft = MAX_THROWS_PER_ENCOUNTER - encounter.attemptsUsed

  const recordPokedexEncounter = useCallback(
    (pokemon: PokemonApi, shiny: boolean) => {
      setPokedex((current) => {
        const existing = current[pokemon.id]
        const next = {
          id: pokemon.id,
          name: pokemon.name,
          timesEncountered: (existing?.timesEncountered ?? 0) + 1,
          shinySeen: Boolean(existing?.shinySeen) || shiny,
          capturedEver: Boolean(existing?.capturedEver),
          releasedCount: existing?.releasedCount ?? 0,
        }
        return { ...current, [pokemon.id]: next }
      })
    },
    [setPokedex],
  )

  const recordPokedexCapture = useCallback(
    (pokemon: PokemonApi) => {
      setPokedex((current) => {
        const existing = current[pokemon.id]
        if (!existing) return current
        return { ...current, [pokemon.id]: { ...existing, capturedEver: true } }
      })
    },
    [setPokedex],
  )

  const recordPokedexRelease = useCallback(
    (pokemonId: number) => {
      setPokedex((current) => {
        const existing = current[pokemonId]
        if (!existing) return current
        return {
          ...current,
          [pokemonId]: {
            ...existing,
            releasedCount: (existing.releasedCount ?? 0) + 1,
          },
        }
      })
    },
    [setPokedex],
  )

  const newEncounter = useCallback(async () => {
    abortRef.current?.abort?.()
    const abortController = new AbortController()
    abortRef.current = abortController
    shinyNotifiedRef.current = false

    const cachedIds = !navigator.onLine ? getCachedPokemonIds() : []
    const candidateIds = cachedIds.filter((id) => id >= 1 && id <= GEN_1_MAX_ID)
    const pokemonId =
      candidateIds.length > 0
        ? candidateIds[randomIntInclusive(0, candidateIds.length - 1)]
        : randomIntInclusive(1, GEN_1_MAX_ID)
    const shiny = Math.random() < SHINY_PROBABILITY

    setStats((current) => ({
      ...current,
      encounters: current.encounters + 1,
      shinyEncounters: current.shinyEncounters + (shiny ? 1 : 0),
    }))
    setEncounter({
      status: 'loading',
      pokemon: null,
      shiny,
      attemptsUsed: 0,
      error: null,
    })

    try {
      const pokemon = await fetchPokemonById(pokemonId, { signal: abortController.signal })
      recordPokedexEncounter(pokemon, shiny)
      setEncounter((current) => ({ ...current, status: 'ready', pokemon }))
    } catch (error: unknown) {
      if (abortController.signal.aborted) return
      setEncounter((current) => ({
        ...current,
        status: 'error',
        error: error instanceof Error ? error.message : 'Failed to load Pokémon',
      }))
      addToast('Could not load Pokémon (offline?). Try again.', 'warning')
    }
  }, [addToast, recordPokedexEncounter, setStats])

  useEffect(() => {
    newEncounter()
    return () => abortRef.current?.abort?.()
  }, [newEncounter])

  useEffect(() => {
    if (encounter.status !== 'ready') return
    if (!encounter.shiny) return
    if (shinyNotifiedRef.current) return
    shinyNotifiedRef.current = true

    const formattedName = formatPokemonName(encounter.pokemon.name)
    addToast(`Shiny encounter: ${formattedName}!`, 'shiny')
    notify('Shine bright like a diamond', {
      body: `${formattedName} appeared!`,
    })
  }, [addToast, encounter.pokemon, encounter.shiny, encounter.status])

  const currentSprite = useMemo(() => {
    if (!encounter.pokemon) return null
    const sprites = encounter.pokemon.sprites
    if (encounter.shiny && sprites.shiny) return sprites.shiny
    return sprites.default
  }, [encounter.pokemon, encounter.shiny])

  const capturePokemonNow = useCallback(
    (pokemonToCapture: PokemonApi, shiny: boolean) => {
      const sprite =
        shiny && pokemonToCapture.sprites.shiny
          ? pokemonToCapture.sprites.shiny
          : pokemonToCapture.sprites.default

      const captureRecord: CapturedPokemon = {
        id: pokemonToCapture.id,
        name: pokemonToCapture.name,
        sprite,
        types: pokemonToCapture.types,
        shiny,
        capturedAt: new Date().toISOString(),
      }

      setCaptured((current) => [...current, captureRecord])
      recordPokedexCapture(pokemonToCapture)
      setStats((current) => ({ ...current, captures: current.captures + 1 }))

      const formattedName = formatPokemonName(pokemonToCapture.name)
      addToast(`It's a catch! ${formattedName} joined your team.`, 'success')
      notify("It's a catch!", { body: `${formattedName} was captured.` })
    },
    [addToast, recordPokedexCapture, setCaptured, setStats],
  )

  const onThrow = useCallback(() => {
    if (encounter.status !== 'ready') return
    if (pendingCapture) return
    if (throwFx) return
    if (encounter.attemptsUsed >= MAX_THROWS_PER_ENCOUNTER) return

    void playSfx('throw', { enabled: preferences.soundEnabled, volume: preferences.soundVolume })
    setStats((current) => ({ ...current, throws: current.throws + 1 }))

    const successChance = randomFloatInclusive(0.1, 0.15)
    const didCapture = Math.random() < successChance

    setEncounter((current) => ({ ...current, attemptsUsed: current.attemptsUsed + 1 }))

    if (didCapture) {
      if (teamIsFull) {
        const fxId = makeId()
        throwFxIdRef.current = fxId
        setThrowFx({ id: fxId, variant: 'break' })
        window.setTimeout(() => {
          if (throwFxIdRef.current !== fxId) return
          setThrowFx(null)
          throwFxIdRef.current = null
          setPendingCapture({ pokemon: encounter.pokemon, shiny: encounter.shiny })
          void playSfx('break', { enabled: preferences.soundEnabled, volume: preferences.soundVolume })
          addToast('Your team is full (6). Release one Pokémon to continue.', 'warning')
        }, 980)
        return
      }
      const fxId = makeId()
      throwFxIdRef.current = fxId
      setThrowFx({ id: fxId, variant: 'capture' })

      window.setTimeout(() => {
        if (throwFxIdRef.current !== fxId) return
        void playSfx('shake', { enabled: preferences.soundEnabled, volume: preferences.soundVolume })
      }, 820)
      window.setTimeout(() => {
        if (throwFxIdRef.current !== fxId) return
        void playSfx('shake', { enabled: preferences.soundEnabled, volume: preferences.soundVolume })
      }, 1040)
      window.setTimeout(() => {
        if (throwFxIdRef.current !== fxId) return
        void playSfx('shake', { enabled: preferences.soundEnabled, volume: preferences.soundVolume })
      }, 1260)

      window.setTimeout(() => {
        if (throwFxIdRef.current !== fxId) return
        capturePokemonNow(encounter.pokemon, encounter.shiny)
        void playSfx('capture', { enabled: preferences.soundEnabled, volume: preferences.soundVolume })
      }, 1480)

      window.setTimeout(() => {
        if (throwFxIdRef.current !== fxId) return
        setThrowFx(null)
        throwFxIdRef.current = null
        newEncounter()
      }, 1780)
      return
    }

    const remaining = attemptsLeft - 1
    if (remaining > 0) {
      const fxId = makeId()
      throwFxIdRef.current = fxId
      setThrowFx({ id: fxId, variant: 'break' })
      window.setTimeout(() => {
        if (throwFxIdRef.current !== fxId) return
        setThrowFx(null)
        throwFxIdRef.current = null
      }, 980)
      window.setTimeout(() => {
        if (throwFxIdRef.current !== fxId) return
        void playSfx('break', { enabled: preferences.soundEnabled, volume: preferences.soundVolume })
      }, 780)
      addToast('Oh no! It broke free.', 'warning')
      return
    }

    setStats((current) => ({ ...current, failedEncounters: current.failedEncounters + 1 }))
    {
      const fxId = makeId()
      throwFxIdRef.current = fxId
      setThrowFx({ id: fxId, variant: 'break' })
      window.setTimeout(() => {
        if (throwFxIdRef.current !== fxId) return
        setThrowFx(null)
        throwFxIdRef.current = null
      }, 980)
      window.setTimeout(() => {
        if (throwFxIdRef.current !== fxId) return
        void playSfx('break', { enabled: preferences.soundEnabled, volume: preferences.soundVolume })
      }, 780)
    }
    addToast('It fled after 3 failed throws...', 'warning')
    window.setTimeout(() => newEncounter(), 650)
  }, [
    addToast,
    attemptsLeft,
    capturePokemonNow,
    encounter.attemptsUsed,
    encounter.pokemon,
    encounter.shiny,
    encounter.status,
    newEncounter,
    pendingCapture,
    preferences.soundEnabled,
    preferences.soundVolume,
    setStats,
    throwFx,
    teamIsFull,
  ])

  const onFlee = useCallback(() => {
    if (encounter.status === 'loading') return
    if (pendingCapture) return
    if (throwFx) return
    setStats((current) => ({ ...current, flees: current.flees + 1 }))
    addToast('You fled. Searching for another Pokémon...', 'info')
    newEncounter()
  }, [addToast, encounter.status, newEncounter, pendingCapture, setStats, throwFx])

  const releasePokemon = useCallback(
    (pokemonId: number, capturedAt: string) => {
      setCaptured((current) =>
        current.filter((p) => !(p.id === pokemonId && p.capturedAt === capturedAt)),
      )
      recordPokedexRelease(pokemonId)
      addToast('Pokémon released.', 'info')
    },
    [addToast, recordPokedexRelease, setCaptured],
  )

  const confirmReleaseForPending = useCallback(
    (pokemonId: number, capturedAt: string) => {
      releasePokemon(pokemonId, capturedAt)
      if (!pendingCapture) return
      capturePokemonNow(pendingCapture.pokemon, pendingCapture.shiny)
      setPendingCapture(null)
      window.setTimeout(() => newEncounter(), 600)
    },
    [capturePokemonNow, newEncounter, pendingCapture, releasePokemon],
  )

  return (
    <div className={styles.app}>
      <div className={styles.topDockWrap} aria-label="Top controls">
        <div className={styles.centerLogoWrap} aria-label="PokeChu">
          <img className={styles.centerLogo} src="/icons/PokeChu.gif" alt="PokeChu" />
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
              maxAttempts={MAX_THROWS_PER_ENCOUNTER}
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
