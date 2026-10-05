import { useState } from 'react'
import type { CSSProperties, ElementType, ReactNode } from 'react'
import type { Invitation, SectionConfig } from '../types'
import { useInView } from '../hooks'
import { Icon } from '../components/Icon'
import { parseLocal } from '../lib/util'

export function Reveal({
  children,
  delay = 0,
  variant = 'up',
  as: Tag = 'div',
  className = '',
  style,
}: {
  children: ReactNode
  delay?: number
  variant?: 'up' | 'fade' | 'zoom' | 'left' | 'right'
  as?: ElementType
  className?: string
  style?: CSSProperties
}) {
  const [ref, seen] = useInView<HTMLElement>()
  return (
    <Tag
      ref={ref}
      className={`reveal rv-${variant} ${seen ? 'in' : ''} ${className}`}
      style={{ transitionDelay: `${delay}ms`, ...style }}
    >
      {children}
    </Tag>
  )
}

/** Word-by-word text reveal for headings. */
export function RevealText({ text, className = '' }: { text: string; className?: string }) {
  const [ref, seen] = useInView<HTMLElement>()
  return (
    <span ref={ref} className={`reveal-text ${seen ? 'in' : ''} ${className}`} aria-label={text}>
      {text.split(' ').map((w, i) => (
        <span key={i} className="rt-word" aria-hidden="true" style={{ transitionDelay: `${i * 70}ms` }}>
          {w}
          {' '}
        </span>
      ))}
    </span>
  )
}

export function Ornament({ decor }: { decor: string }) {
  if (decor === 'minimal') return <div className="orn orn-line" aria-hidden="true" />
  if (decor === 'kerala') return <div className="orn orn-kasavu" aria-hidden="true" />
  if (decor === 'royal' || decor === 'gold')
    return (
      <div className="orn orn-diamond" aria-hidden="true">
        <i />
        <b />
        <i />
      </div>
    )
  return (
    <div className="orn orn-flower" aria-hidden="true">
      <i />
      <Icon name={decor === 'garden' ? 'flower' : 'heart'} size={18} filled={decor !== 'garden'} />
      <i />
    </div>
  )
}

export function Section({
  cfg,
  decor,
  children,
  className = '',
  hideHeading,
}: {
  cfg: SectionConfig
  decor: string
  children: ReactNode
  className?: string
  hideHeading?: boolean
}) {
  return (
    <section
      id={`sec-${cfg.id}`}
      className={`sec sec-${cfg.id} ${className}`}
      style={cfg.background ? { background: cfg.background } : undefined}
      aria-label={cfg.title || cfg.id}
    >
      <div className="sec-inner">
        {!hideHeading && (cfg.title || cfg.subtitle) && (
          <header className="sec-head">
            {cfg.title && (
              <h2>
                <RevealText text={cfg.title} />
              </h2>
            )}
            <Ornament decor={decor} />
            {cfg.subtitle && (
              <Reveal variant="fade" delay={150}>
                <p className="sec-sub">{cfg.subtitle}</p>
              </Reveal>
            )}
          </header>
        )}
        {children}
      </div>
    </section>
  )
}

/** Tap-to-react heart with a small floating burst. */
export function HeartButton({
  count,
  onHeart,
  hearted,
  label = 'Send love',
}: {
  count: number
  onHeart(): void
  hearted: boolean
  label?: string
}) {
  const [bursts, setBursts] = useState<number[]>([])
  return (
    <button
      type="button"
      className={`heart-btn ${hearted ? 'on' : ''}`}
      aria-pressed={hearted}
      aria-label={`${label} (${count})`}
      onClick={() => {
        onHeart()
        const id = Date.now() + Math.random()
        setBursts((b) => [...b, id])
        setTimeout(() => setBursts((b) => b.filter((x) => x !== id)), 900)
      }}
    >
      <Icon name="heart" size={16} filled={hearted} />
      <span>{count}</span>
      {bursts.map((b) => (
        <i key={b} className="burst" aria-hidden="true">
          {[0, 1, 2, 3, 4].map((n) => (
            <Icon key={n} name="heart" size={10} filled style={{ ['--a' as string]: `${n * 28 - 56}deg` }} />
          ))}
        </i>
      ))}
    </button>
  )
}

/** The moment we count down to: the wedding event on the wedding date (or 10:00 as a fallback). */
export function weddingTarget(inv: Invitation): Date | null {
  if (!inv.weddingDate) return null
  const ev =
    inv.events.find((e) => e.date === inv.weddingDate && /wedding|ceremony|marriage|muhurtham/i.test(e.name)) ??
    inv.events.find((e) => e.date === inv.weddingDate)
  return parseLocal(inv.weddingDate, ev?.time || '10:00')
}

export const coupleNames = (inv: Invitation) => ({
  groom: inv.couple.groom.name.trim() || 'Groom',
  bride: inv.couple.bride.name.trim() || 'Bride',
})
