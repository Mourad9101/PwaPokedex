import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { notify } from '../lib/notifications'
import { fetchPokemonById, formatPokemonName, getCachedPokemonIds } from '../lib/pokeapi'
import { randomFloatInclusive, randomIntInclusive } from '../lib/random'
import { playSfx } from '../lib/sfx'
import { makeId } from '../lib/id'
import { GEN_1_MAX_ID, MAX_THROWS_PER_ENCOUNTER, SHINY_PROBABILITY } from '../constants/game'
import type { CapturedPokemon, Pokedex, Preferences, Stats, ToastTone } from '../types'

type PokemonApi = Awaited<ReturnType<typeof fetchPokemonById>>

export type EncounterState =
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

function updatePokedexOnEncounter(current: Pokedex, pokemon: PokemonApi, shiny: boolean): Pokedex {
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
}

function updatePokedexOnCapture(current: Pokedex, pokemonId: number): Pokedex {
  const existing = current[pokemonId]
  if (!existing) return current
  return { ...current, [pokemonId]: { ...existing, capturedEver: true } }
}

function updatePokedexOnRelease(current: Pokedex, pokemonId: number): Pokedex {
  const existing = current[pokemonId]
  if (!existing) return current
  return {
    ...current,
    [pokemonId]: {
      ...existing,
      releasedCount: (existing.releasedCount ?? 0) + 1,
    },
  }
}

export function useEncounterFlow({
  preferences,
  captured,
  setCaptured,
  setStats,
  setPokedex,
  addToast,
  teamIsFull,
  maxTeamSize,
}: {
  preferences: Pick<Preferences, 'soundEnabled' | 'soundVolume'>
  captured: CapturedPokemon[]
  setCaptured: React.Dispatch<React.SetStateAction<CapturedPokemon[]>>
  setStats: React.Dispatch<React.SetStateAction<Stats>>
  setPokedex: React.Dispatch<React.SetStateAction<Pokedex>>
  addToast: (message: string, tone?: ToastTone) => void
  teamIsFull: boolean
  maxTeamSize: number
}) {
  const [encounter, setEncounter] = useState<EncounterState>({
    status: 'loading',
    pokemon: null,
    shiny: false,
    attemptsUsed: 0,
    error: null,
  })
  const [pendingCapture, setPendingCapture] = useState<PendingCapture | null>(null)
  const [throwFx, setThrowFx] = useState<{ id: string; variant: 'capture' | 'break' } | null>(null)

  const abortRef = useRef<AbortController | null>(null)
  const shinyNotifiedRef = useRef(false)
  const throwFxIdRef = useRef<string | null>(null)

  const attemptsLeft = MAX_THROWS_PER_ENCOUNTER - encounter.attemptsUsed

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
      setPokedex((current) => updatePokedexOnEncounter(current, pokemon, shiny))
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
  }, [addToast, setPokedex, setStats])

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
      setPokedex((current) => updatePokedexOnCapture(current, pokemonToCapture.id))
      setStats((current) => ({ ...current, captures: current.captures + 1 }))

      const formattedName = formatPokemonName(pokemonToCapture.name)
      addToast(`It's a catch! ${formattedName} joined your team.`, 'success')
      notify("It's a catch!", { body: `${formattedName} was captured.` })
    },
    [addToast, setCaptured, setPokedex, setStats],
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
          addToast(`Your team is full (${maxTeamSize}). Release one Pokémon to continue.`, 'warning')
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
    maxTeamSize,
    newEncounter,
    pendingCapture,
    preferences.soundEnabled,
    preferences.soundVolume,
    setStats,
    teamIsFull,
    throwFx,
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
      setCaptured((current) => current.filter((p) => !(p.id === pokemonId && p.capturedAt === capturedAt)))
      setPokedex((current) => updatePokedexOnRelease(current, pokemonId))
      addToast('Pokémon released.', 'info')
    },
    [addToast, setCaptured, setPokedex],
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

  return {
    encounter,
    pendingCapture,
    throwFx,
    attemptsLeft,
    maxAttempts: MAX_THROWS_PER_ENCOUNTER,
    currentSprite,
    newEncounter,
    onThrow,
    onFlee,
    releasePokemon,
    confirmReleaseForPending,
  } as const
}
