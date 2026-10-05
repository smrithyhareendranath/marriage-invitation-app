import { useEffect, useRef } from 'react'
import type { Person, SectionConfig } from '../types'
import { Img } from '../components/Img'
import { Icon } from '../components/Icon'
import { useCountdown, useReducedMotion } from '../hooks'
import { formatDate, parseVideo, weekday } from '../lib/util'
import { useMediaSrc } from '../lib/media'
import { Reveal, Section, coupleNames, weddingTarget, RevealText, Ornament } from './parts'
import { useInvite } from './context'

/** Writes --py (px) on the element as the page scrolls; consumed by CSS for gentle parallax. */
export function useParallax<T extends HTMLElement>(strength = 0.18) {
  const ref = useRef<T>(null)
  const reduced = useReducedMotion()
  useEffect(() => {
    const el = ref.current
    if (!el || reduced) return
    let raf = 0
    const update = () => {
      raf = 0
      const r = el.getBoundingClientRect()
      const vh = window.innerHeight || 800
      const center = r.top + r.height / 2 - vh / 2
      el.style.setProperty('--py', `${(-center * strength).toFixed(1)}px`)
    }
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update)
    }
    update()
    document.addEventListener('scroll', onScroll, { capture: true, passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      document.removeEventListener('scroll', onScroll, { capture: true })
      window.removeEventListener('resize', onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [strength, reduced])
  return ref
}

/* --------------------------------- Hero --------------------------------- */

export function Hero({ cfg }: { cfg: SectionConfig }) {
  const { inv, scrollTo } = useInvite()
  const { groom, bride } = coupleNames(inv)
  const bg = useParallax<HTMLDivElement>(0.22)
  const date = inv.weddingDate
  return (
    <section id="sec-hero" className="hero" aria-label={cfg.title}>
      <div className="hero-bg" ref={bg}>
        <Img src={inv.heroPhoto} alt={`${groom} and ${bride}`} motion="kenburns" eager empty={<span />} />
      </div>
      <div className="hero-veil" />
      <div className="hero-content">
        <Reveal variant="fade">
          <p className="eyebrow">We are getting married</p>
        </Reveal>
        <h1 className="names">
          <RevealText text={groom.split(' ')[0]} />
          <span className="amp" aria-hidden="true">
            <Icon name="heart" size={26} filled />
          </span>
          <RevealText text={bride.split(' ')[0]} />
        </h1>
        {date && (
          <Reveal variant="up" delay={250}>
            <p className="hero-date">
              {weekday(date)} · {formatDate(date)}
            </p>
          </Reveal>
        )}
        {inv.quote && (
          <Reveal variant="up" delay={400}>
            <p className="hero-quote">“{inv.quote}”</p>
          </Reveal>
        )}
        {inv.welcome && (
          <Reveal variant="up" delay={520}>
            <p className="hero-welcome">{inv.welcome}</p>
          </Reveal>
        )}
      </div>
      <button className="scroll-cue" onClick={() => scrollTo('sec-couple')} aria-label="Scroll down">
        <span>Scroll</span>
        <Icon name="down" size={20} />
      </button>
    </section>
  )
}

/* -------------------------------- Couple -------------------------------- */

function PersonCard({ person, role, i }: { person: Person; role: string; i: number }) {
  const { track } = useInvite()
  const link = (href: string, icon: 'instagram' | 'facebook', label: string) =>
    href ? (
      <a
        key={icon}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`${person.name} on ${label}`}
        onClick={() => track('link_click')}
      >
        <Icon name={icon} size={18} />
      </a>
    ) : null
  return (
    <Reveal variant={i === 0 ? 'left' : 'right'} className="person" delay={i * 120}>
      <div className="person-photo">
        <Img src={person.photo} alt={`Portrait of ${person.name}`} motion="float" thumb={false} />
        <span className="ring" aria-hidden="true" />
      </div>
      <p className="role">{role}</p>
      <h3>{person.name || role}</h3>
      {person.bio && <p className="bio">{person.bio}</p>}
      {(person.profession || person.hometown) && (
        <ul className="chips">
          {person.profession && <li>{person.profession}</li>}
          {person.hometown && (
            <li>
              <Icon name="map" size={13} /> {person.hometown}
            </li>
          )}
        </ul>
      )}
      <div className="socials">
        {link(person.instagram, 'instagram', 'Instagram')}
        {link(person.facebook, 'facebook', 'Facebook')}
      </div>
    </Reveal>
  )
}

export function Couple({ cfg }: { cfg: SectionConfig }) {
  const { inv } = useInvite()
  return (
    <Section cfg={cfg} decor={inv.custom.decor}>
      <div className="couple-grid">
        <PersonCard person={inv.couple.groom} role="The Groom" i={0} />
        <div className="couple-and" aria-hidden="true">
          <Icon name="heart" size={22} filled />
        </div>
        <PersonCard person={inv.couple.bride} role="The Bride" i={1} />
      </div>
    </Section>
  )
}

/* --------------------------------- Story --------------------------------- */

function StoryVideo({ url }: { url: string }) {
  const v = parseVideo(url)
  const resolved = useMediaSrc(v?.kind === 'upload' ? v.embed : '')
  if (!v) return null
  return v.kind === 'upload' ? (
    <video className="story-video" src={resolved} controls preload="metadata" playsInline />
  ) : (
    <div className="story-video embed">
      <iframe src={v.embed} title="Story video" loading="lazy" allowFullScreen />
    </div>
  )
}

export function Story({ cfg }: { cfg: SectionConfig }) {
  const { inv, openPhotos } = useInvite()
  if (!inv.story.length) return null
  return (
    <Section cfg={cfg} decor={inv.custom.decor}>
      <ol className="timeline">
        {inv.story.map((m, i) => (
          <Reveal as="li" key={m.id} variant={i % 2 ? 'right' : 'left'} className="tl-item" delay={60}>
            <span className="tl-dot" aria-hidden="true" />
            <article className="tl-card glass">
              <span className="tl-date">{m.date}</span>
              <h3>{m.title}</h3>
              {m.location && (
                <p className="tl-loc">
                  <Icon name="map" size={13} /> {m.location}
                </p>
              )}
              {m.description && <p>{m.description}</p>}
              {m.photos.length > 0 && (
                <div className={`tl-photos n${Math.min(m.photos.length, 3)}`}>
                  {m.photos.map((p, pi) => (
                    <button
                      key={pi}
                      className="tl-photo"
                      onClick={() =>
                        openPhotos(
                          m.photos.map((src, k) => ({ id: `${m.id}-${k}`, src, alt: m.title, caption: m.title })),
                          pi,
                        )
                      }
                      aria-label={`Open photo ${pi + 1} of ${m.title}`}
                    >
                      <Img src={p} alt={`${m.title} – photo ${pi + 1}`} thumb motion="zoom" />
                    </button>
                  ))}
                </div>
              )}
              {m.video && <StoryVideo url={m.video} />}
            </article>
          </Reveal>
        ))}
      </ol>
    </Section>
  )
}

/* ------------------------------- Countdown ------------------------------- */

function Unit({ value, label }: { value: number; label: string }) {
  const text = String(value).padStart(2, '0')
  return (
    <div className="cd-unit glass">
      <div className="cd-num" aria-hidden="true">
        {text.split('').map((d, i) => (
          <span key={`${i}-${d}`} className="cd-digit">
            {d}
          </span>
        ))}
      </div>
      <span className="cd-label">{label}</span>
      <span className="sr-only">
        {value} {label}
      </span>
    </div>
  )
}

export function Countdown({ cfg }: { cfg: SectionConfig }) {
  const { inv } = useInvite()
  const target = weddingTarget(inv)
  const left = useCountdown(target)
  const bg = useParallax<HTMLDivElement>(0.12)
  if (!target || !left) return null
  const sameDay = new Date().toDateString() === target.toDateString()
  const after = new Date().getTime() - target.getTime()
  return (
    <section id="sec-countdown" className="sec sec-countdown" style={cfg.background ? { background: cfg.background } : undefined}>
      <div className="cd-bg" ref={bg} aria-hidden="true" />
      <div className="sec-inner">
        <header className="sec-head">
          <h2>
            <RevealText text={cfg.title || 'Counting down to forever'} />
          </h2>
          <Ornament decor={inv.custom.decor} />
        </header>
        {left.done ? (
          <Reveal variant="zoom">
            <p className="cd-done">
              {sameDay || after < 86400000 ? 'Today is the day! ❤️' : 'We are married! Thank you for celebrating with us ❤️'}
            </p>
          </Reveal>
        ) : (
          <div className="cd-grid" role="timer" aria-label="Time until the wedding">
            <Unit value={left.days} label="Days" />
            <span className="cd-sep" aria-hidden="true">:</span>
            <Unit value={left.hours} label="Hours" />
            <span className="cd-sep" aria-hidden="true">:</span>
            <Unit value={left.minutes} label="Minutes" />
            <span className="cd-sep" aria-hidden="true">:</span>
            <Unit value={left.seconds} label="Seconds" />
          </div>
        )}
        <p className="cd-date">{formatDate(inv.weddingDate, { weekday: 'long' })}</p>
      </div>
    </section>
  )
}
