import { useCallback, useEffect, useRef, useState } from 'react'
import { resolveMedia } from '../lib/media'

/** Built-in ambient track so music works without uploading anything. */
export const BUILTIN_MUSIC = 'builtin:serenade'

interface Player {
  play(): Promise<void>
  pause(): void
  setVolume(v: number): void
  dispose(): void
}

/** Soft evolving pad (I–vi–IV–V) synthesised with WebAudio – no audio file required. */
function synthPlayer(): Player {
  let ctx: AudioContext | null = null
  let master: GainNode | null = null
  let timer: ReturnType<typeof setInterval> | undefined
  let step = 0
  let volume = 0.6
  const chords = [
    [261.63, 329.63, 392.0, 523.25],
    [220.0, 261.63, 329.63, 440.0],
    [174.61, 220.0, 261.63, 349.23],
    [196.0, 246.94, 293.66, 392.0],
  ]
  const bell = [523.25, 659.25, 783.99, 880.0, 783.99, 659.25]

  const note = (freq: number, when: number, dur: number, gain: number, type: OscillatorType) => {
    if (!ctx || !master) return
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.type = type
    o.frequency.value = freq
    g.gain.setValueAtTime(0, when)
    g.gain.linearRampToValueAtTime(gain, when + Math.min(1.2, dur * 0.3))
    g.gain.linearRampToValueAtTime(0, when + dur)
    o.connect(g).connect(master)
    o.start(when)
    o.stop(when + dur + 0.1)
  }

  const schedule = () => {
    if (!ctx) return
    const t = ctx.currentTime + 0.05
    chords[step % chords.length].forEach((f, i) => note(f / (i === 0 ? 2 : 1), t, 4.6, 0.07, 'sine'))
    for (let i = 0; i < 3; i++) note(bell[(step * 3 + i) % bell.length], t + 0.9 + i * 1.1, 1.8, 0.05, 'triangle')
    step++
  }

  return {
    async play() {
      if (!ctx) {
        ctx = new AudioContext()
        const filter = ctx.createBiquadFilter()
        filter.type = 'lowpass'
        filter.frequency.value = 1800
        master = ctx.createGain()
        master.gain.value = volume
        master.connect(filter).connect(ctx.destination)
      }
      await ctx.resume()
      if (!timer) {
        schedule()
        timer = setInterval(schedule, 4200)
      }
    },
    pause() {
      if (timer) clearInterval(timer)
      timer = undefined
      void ctx?.suspend()
    },
    setVolume(v) {
      volume = v
      if (master && ctx) master.gain.setTargetAtTime(v, ctx.currentTime, 0.05)
    },
    dispose() {
      if (timer) clearInterval(timer)
      void ctx?.close()
      ctx = null
    },
  }
}

function fileSrcPlayer(src: string): Player {
  let audio: HTMLAudioElement | null = null
  let volume = 0.6
  const ensure = async () => {
    if (audio) return audio
    audio = new Audio(await resolveMedia(src))
    audio.loop = true
    audio.preload = 'auto'
    audio.volume = volume
    return audio
  }
  return {
    async play() {
      await (await ensure()).play()
    },
    pause() {
      audio?.pause()
    },
    setVolume(v) {
      volume = v
      if (audio) audio.volume = v
    },
    dispose() {
      audio?.pause()
      audio = null
    },
  }
}

const PREF_KEY = 'mia.v1.music'

interface Pref {
  volume: number
  /** false once the guest has explicitly paused the music. */
  wants: boolean
}

function readPref(): Pref {
  try {
    return { volume: 0.6, wants: true, ...(JSON.parse(localStorage.getItem(PREF_KEY) ?? '{}') as Partial<Pref>) }
  } catch {
    return { volume: 0.6, wants: true }
  }
}
function writePref(p: Pref) {
  try {
    localStorage.setItem(PREF_KEY, JSON.stringify(p))
  } catch {
    /* ignore */
  }
}

export function useMusic(src: string, enabled: boolean) {
  const playerRef = useRef<Player | null>(null)
  const [playing, setPlaying] = useState(false)
  const [volume, setVol] = useState(() => readPref().volume)
  const available = enabled && !!src

  useEffect(() => {
    playerRef.current?.dispose()
    playerRef.current = null
    setPlaying(false)
    if (!available) return
    const p = src === BUILTIN_MUSIC ? synthPlayer() : fileSrcPlayer(src)
    p.setVolume(readPref().volume)
    playerRef.current = p
    return () => {
      p.dispose()
      if (playerRef.current === p) playerRef.current = null
    }
  }, [src, available])

  const play = useCallback(async () => {
    try {
      await playerRef.current?.play()
      setPlaying(true)
      writePref({ ...readPref(), wants: true })
    } catch {
      setPlaying(false) // blocked or failed – the guest can try again with the button
    }
  }, [])

  const pause = useCallback(() => {
    playerRef.current?.pause()
    setPlaying(false)
    writePref({ ...readPref(), wants: false })
  }, [])

  const toggle = useCallback(() => (playing ? pause() : void play()), [playing, pause, play])

  const setVolume = useCallback((v: number) => {
    setVol(v)
    playerRef.current?.setVolume(v)
    writePref({ ...readPref(), volume: v })
  }, [])

  /** Call from a user gesture (e.g. "Open Invitation"). Respects a previous "paused" choice. */
  const startFromGesture = useCallback(() => {
    if (readPref().wants) void play()
  }, [play])

  return { available, playing, volume, toggle, setVolume, startFromGesture }
}

export type MusicApi = ReturnType<typeof useMusic>
