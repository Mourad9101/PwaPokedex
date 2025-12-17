type SfxType = 'ui' | 'throw' | 'shake' | 'capture' | 'break'

type SfxOptions = {
  enabled: boolean
  volume: number 
}

type Tone = 'sine' | 'triangle' | 'square' | 'sawtooth'

let audioContext: AudioContext | null = null
let masterGain: GainNode | null = null

function clamp01(value: number) {
  if (!Number.isFinite(value)) return 0
  return Math.min(1, Math.max(0, value))
}

function getContext() {
  if (!audioContext) {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctx) throw new Error('AudioContext not supported')
    audioContext = new Ctx()
  }
  if (!masterGain) {
    masterGain = audioContext.createGain()
    masterGain.gain.value = 0.6
    masterGain.connect(audioContext.destination)
  }
  return { ctx: audioContext, gain: masterGain }
}

async function ensureRunning() {
  const { ctx } = getContext()
  if (ctx.state !== 'running') {
    try {
      await ctx.resume()
    } catch {
      // ignore
    }
  }
}

function playTone({
  when,
  duration,
  type,
  frequencyStart,
  frequencyEnd,
  gain,
}: {
  when: number
  duration: number
  type: Tone
  frequencyStart: number
  frequencyEnd?: number
  gain: number
}) {
  const { ctx, gain: master } = getContext()

  const osc = ctx.createOscillator()
  const g = ctx.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(frequencyStart, when)
  if (typeof frequencyEnd === 'number') {
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, frequencyEnd), when + duration)
  }

  const peak = Math.max(0.0001, gain)
  g.gain.setValueAtTime(0.0001, when)
  g.gain.exponentialRampToValueAtTime(peak, when + 0.01)
  g.gain.exponentialRampToValueAtTime(0.0001, when + duration)

  osc.connect(g)
  g.connect(master)

  osc.start(when)
  osc.stop(when + duration + 0.02)
}

export async function playSfx(sfx: SfxType, options: SfxOptions) {
  if (!options.enabled) return
  const volume = clamp01(options.volume)
  if (volume <= 0) return

  try {
    await ensureRunning()
    const { ctx, gain } = getContext()
    gain.gain.value = 0.25 + volume * 0.75

    const now = ctx.currentTime + 0.01

    switch (sfx) {
      case 'ui':
        playTone({ when: now, duration: 0.05, type: 'triangle', frequencyStart: 520, gain: 0.11 })
        playTone({ when: now + 0.04, duration: 0.06, type: 'triangle', frequencyStart: 420, gain: 0.09 })
        break
      case 'throw':
        playTone({
          when: now,
          duration: 0.22,
          type: 'sawtooth',
          frequencyStart: 920,
          frequencyEnd: 240,
          gain: 0.12,
        })
        break
      case 'shake':
        playTone({ when: now, duration: 0.06, type: 'square', frequencyStart: 260, gain: 0.1 })
        break
      case 'break':
        playTone({
          when: now,
          duration: 0.12,
          type: 'square',
          frequencyStart: 240,
          frequencyEnd: 120,
          gain: 0.12,
        })
        playTone({
          when: now + 0.12,
          duration: 0.08,
          type: 'triangle',
          frequencyStart: 180,
          gain: 0.1,
        })
        break
      case 'capture':
        playTone({ when: now, duration: 0.12, type: 'triangle', frequencyStart: 440, gain: 0.12 })
        playTone({ when: now + 0.1, duration: 0.12, type: 'triangle', frequencyStart: 660, gain: 0.12 })
        playTone({ when: now + 0.2, duration: 0.16, type: 'triangle', frequencyStart: 880, gain: 0.13 })
        break
      default:
        break
    }
  } catch {
    // AudioContext may be unavailable or blocked; ignore.
  }
}
