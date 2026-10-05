import { useEffect, useRef } from 'react'
import type { AnimationStyle } from '../types'
import { useReducedMotion } from '../hooks'

interface Props {
  kind: AnimationStyle
  color: string
  color2: string
  /** Burst of particles on mount (used when the invitation opens). */
  burst?: number
  active?: boolean
}

interface P {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  rot: number
  vr: number
  sway: number
  phase: number
  hue: 0 | 1
  life: number
}

/**
 * One lightweight canvas for petals / sparkles / hearts. Particle count adapts to the device,
 * everything pauses when the tab is hidden, and it renders nothing under prefers-reduced-motion.
 */
export function Particles({ kind, color, color2, burst = 0, active = true }: Props) {
  const ref = useRef<HTMLCanvasElement>(null)
  const reduced = useReducedMotion()

  useEffect(() => {
    const canvas = ref.current
    if (!canvas || reduced || kind === 'none' || !active) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const lowEnd = (navigator.hardwareConcurrency ?? 8) <= 4
    const count = kind === 'sparkles' ? (lowEnd ? 14 : 26) : lowEnd ? 9 : 16
    let w = 0
    let h = 0
    const dpr = Math.min(window.devicePixelRatio || 1, 2)

    const resize = () => {
      const r = canvas.getBoundingClientRect()
      w = r.width
      h = r.height
      canvas.width = Math.max(1, Math.floor(w * dpr))
      canvas.height = Math.max(1, Math.floor(h * dpr))
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)

    const spawn = (fromTop: boolean, big = false): P => ({
      x: Math.random() * (w || 400),
      y: fromTop ? -20 - Math.random() * 60 : Math.random() * (h || 700),
      vx: (Math.random() - 0.5) * 0.4,
      vy: kind === 'sparkles' ? -0.1 - Math.random() * 0.25 : 0.5 + Math.random() * 0.9,
      size: (kind === 'sparkles' ? 2 + Math.random() * 3 : 8 + Math.random() * 9) * (big ? 1.2 : 1),
      rot: Math.random() * Math.PI * 2,
      vr: (Math.random() - 0.5) * 0.04,
      sway: 0.6 + Math.random() * 1.2,
      phase: Math.random() * 6.28,
      hue: Math.random() > 0.5 ? 0 : 1,
      life: 1,
    })

    const parts: P[] = Array.from({ length: count }, () => spawn(false))
    for (let i = 0; i < burst; i++) {
      const p = spawn(true, true)
      p.y = (h || 700) * 0.9
      p.vy = -(2 + Math.random() * 4)
      p.vx = (Math.random() - 0.5) * 5
      p.life = 0.99
      parts.push(p)
    }

    const draw = (p: P, t: number) => {
      ctx.save()
      ctx.translate(p.x, p.y)
      ctx.rotate(p.rot)
      ctx.fillStyle = p.hue ? color2 : color
      if (kind === 'petals') {
        ctx.globalAlpha = 0.55 * Math.min(1, p.life + 0.3)
        ctx.beginPath()
        ctx.ellipse(0, 0, p.size * 0.55, p.size, 0, 0, Math.PI * 2)
        ctx.fill()
      } else if (kind === 'hearts') {
        ctx.globalAlpha = 0.5
        const s = p.size / 10
        ctx.scale(s, s)
        ctx.beginPath()
        ctx.moveTo(0, 4)
        ctx.bezierCurveTo(-10, -4, -4, -11, 0, -5)
        ctx.bezierCurveTo(4, -11, 10, -4, 0, 4)
        ctx.fill()
      } else {
        ctx.globalAlpha = (0.35 + 0.65 * Math.abs(Math.sin(t / 700 + p.phase))) * 0.9
        ctx.beginPath()
        const r = p.size
        ctx.moveTo(0, -r)
        ctx.quadraticCurveTo(0, 0, r, 0)
        ctx.quadraticCurveTo(0, 0, 0, r)
        ctx.quadraticCurveTo(0, 0, -r, 0)
        ctx.quadraticCurveTo(0, 0, 0, -r)
        ctx.fill()
      }
      ctx.restore()
    }

    let raf = 0
    let last = performance.now()
    const tick = (t: number) => {
      const dt = Math.min(2, (t - last) / 16.67)
      last = t
      ctx.clearRect(0, 0, w, h)
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i]
        p.phase += 0.015 * dt
        p.x += (p.vx + Math.sin(p.phase) * 0.35 * p.sway * (kind === 'sparkles' ? 0.3 : 1)) * dt
        p.y += p.vy * dt
        p.rot += p.vr * dt
        if (p.life < 1) {
          p.vy += 0.07 * dt
          p.life -= 0.006 * dt
          if (p.life <= 0.3 && p.y > h) parts.splice(i, 1)
          else if (p.life <= 0) parts.splice(i, 1)
          else draw(p, t)
          continue
        }
        if (kind === 'sparkles' ? p.y < -10 : p.y > h + 20) {
          Object.assign(p, spawn(kind !== 'sparkles'))
          if (kind === 'sparkles') p.y = h + 10
        }
        draw(p, t)
      }
      raf = requestAnimationFrame(tick)
    }

    const onVis = () => {
      cancelAnimationFrame(raf)
      if (!document.hidden) {
        last = performance.now()
        raf = requestAnimationFrame(tick)
      }
    }
    document.addEventListener('visibilitychange', onVis)
    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [kind, color, color2, burst, reduced, active])

  if (kind === 'none' || reduced || !active) return null
  return (
    <div className="particles" aria-hidden="true">
      <canvas ref={ref} />
    </div>
  )
}
