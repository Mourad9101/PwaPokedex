export type Theme = 'light' | 'dark'

export type Preferences = {
  theme: Theme
  soundEnabled: boolean
  soundVolume: number
}

export type Stats = {
  encounters: number
  captures: number
  shinyEncounters: number
  flees: number
  failedEncounters: number
  throws: number
}

export type CapturedPokemon = {
  id: number
  name: string
  sprite: string | null
  types: string[]
  shiny: boolean
  capturedAt: string
}

export type PokedexEntry = {
  id: number
  name: string
  timesEncountered: number
  shinySeen: boolean
  capturedEver: boolean
  releasedCount: number
}

export type Pokedex = Record<number, PokedexEntry>

export type ToastTone = 'info' | 'success' | 'warning' | 'shiny'

export type Toast = { id: string; message: string; tone: ToastTone }

