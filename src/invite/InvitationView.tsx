import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import type { Invitation, Photo, SectionConfig } from '../types'
import { Icon } from '../components/Icon'
import { Img } from '../components/Img'
import { Lightbox } from '../components/Lightbox'
import { Particles } from '../components/Particles'
import { useReducedMotion } from '../hooks'
import { luminance, mix, themeVars } from '../lib/color'
import { formatDate, weekday } from '../lib/util'
import { getTheme } from '../data/themes'
import { SECTION_DEFAULTS } from '../data/demo'
import { InviteContext } from './context'
import { useMusic } from './music'
import { coupleNames, Reveal } from './parts'
import { Countdown, Couple, Hero, Story } from './Sections1'
import { Events, Gallery, Venue } from './Sections2'
import { Family, Guestbook, Rsvp, Share, Thanks, Videos } from './Sections3'
import type { AnalyticsKind } from '../types'
import { api } from '../lib/db'

interface Props {
  inv: Invitation
  mode: 'public' | 'preview'
  /** Skip the opening cover (dashboard preview). */
  skipCover?: boolean
  onTrack?(kind: AnalyticsKind): void
}

function coverStyle(inv: Invitation): { background: string; dark: boolean } {
  const c = inv.custom
  const preset = getTheme(c.themeId)
  let background = preset.cover
  if (c.primary.toLowerCase() !== preset.primary.toLowerCase() || c.secondary.toLowerCase() !== preset.secondary.toLowerCase()) {
    background = `linear-gradient(160deg, ${mix(c.primary, '#000000', 0.5)} 0%, ${c.primary} 60%, ${c.secondary} 140%)`
  }
  const hexes = background.match(/#[0-9a-f]{6}/gi) ?? [c.primary]
  const avg = hexes.reduce((s, h) => s + luminance(h), 0) / hexes.length
  return { background, dark: avg < 0.32 }
}

function SectionSwitch({ cfg }: { cfg: SectionConfig }) {
  switch (cfg.id) {
    case 'hero':
      return <Hero cfg={cfg} />
    case 'couple':
      return <Couple cfg={cfg} />
    case 'story':
      return <Story cfg={cfg} />
    case 'countdown':
      return <Countdown cfg={cfg} />
    case 'events':
      return <Events cfg={cfg} />
    case 'venue':
      return <Venue cfg={cfg} />
    case 'gallery':
      return <Gallery cfg={cfg} />
    case 'family':
      return <Family cfg={cfg} />
    case 'video':
      return <Videos cfg={cfg} />
    case 'rsvp':
      return <Rsvp cfg={cfg} />
    case 'guestbook':
      return <Guestbook cfg={cfg} />
    case 'thanks':
      return <Thanks cfg={cfg} />
    case 'share':
      return <Share cfg={cfg} />
  }
}

export function InvitationView({ inv, mode, skipCover, onTrack }: Props) {
  const reduced = useReducedMotion()
  const shellRef = useRef<HTMLDivElement>(null)
  const [phase, setPhase] = useState<'closed' | 'opening' | 'open'>(skipCover ? 'open' : 'closed')
  const [burst, setBurst] = useState(0)
  const [lightbox, setLightbox] = useState<{ photos: Photo[]; index: number; slideshow: boolean } | null>(null)
  const [navOpen, setNavOpen] = useState(false)
  const music = useMusic(inv.music.src, inv.music.enabled)
  const vars = useMemo(() => themeVars(inv.custom), [inv.custom])
  const cover = useMemo(() => coverStyle(inv), [inv])

  useEffect(() => {
    if (skipCover) setPhase('open')
  }, [skipCover])

  // keep the cover from letting the page scroll underneath it
  useEffect(() => {
    if (mode !== 'public' || phase === 'open') return
    const o = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = o
    }
  }, [mode, phase])

  // in preview the "viewport" is the preview pane, not the window
  useEffect(() => {
    const el = shellRef.current
    if (!el || mode !== 'preview') return
    const ro = new ResizeObserver(() => el.style.setProperty('--vh', `${el.clientHeight}px`))
    ro.observe(el)
    return () => ro.disconnect()
  }, [mode])

  const track = useCallback(
    (kind: AnalyticsKind) => {
      if (mode === 'public') void api.analytics.track(inv.id, kind)
      onTrack?.(kind)
    },
    [inv.id, mode, onTrack],
  )

  const scrollTo = useCallback(
    (id: string) => {
      setNavOpen(false)
      shellRef.current?.querySelector(`#${id}`)?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' })
    },
    [reduced],
  )

  const open = () => {
    music.startFromGesture()
    if (reduced) {
      setPhase('open')
      return
    }
    setPhase('opening')
    setTimeout(() => {
      setPhase('open')
      setBurst((b) => b + 28)
    }, 1500)
  }

  const shareUrl = `${typeof location !== 'undefined' ? location.origin : ''}/invite/${inv.slug || 'your-names'}`

  const ctx = useMemo(
    () => ({
      inv,
      mode,
      track,
      scrollTo,
      shareUrl,
      openPhotos: (photos: Photo[], index: number, slideshow = false) => setLightbox({ photos, index, slideshow }),
    }),
    [inv, mode, track, scrollTo, shareUrl],
  )

  const { groom, bride } = coupleNames(inv)
  const sections = inv.sections.filter((s) => s.visible)
  const isDark = luminance(vars['--bg']) < 0.25

  return (
    <InviteContext.Provider value={ctx}>
      <div
        ref={shellRef}
        className={`invite-shell ${mode === 'preview' ? 'is-preview' : ''} ${isDark ? 'is-dark' : ''}`}
        style={vars as CSSProperties}
        data-decor={inv.custom.decor}
        data-phase={phase}
      >
        <div className="invite-scroll">
          <Particles kind={inv.custom.animation} color={vars['--primary']} color2={vars['--secondary']} burst={burst} active={phase === 'open'} />

          {phase === 'open' && (
            <div className="float-top">
              <button className="fab" onClick={() => setNavOpen((o) => !o)} aria-expanded={navOpen} aria-label="Sections menu">
                <Icon name={navOpen ? 'x' : 'menu'} size={20} />
              </button>
              {navOpen && (
                <nav className="fab-menu glass" aria-label="Sections">
                  {sections.map((s) => (
                    <button key={s.id} onClick={() => scrollTo(s.id === 'hero' ? 'sec-hero' : `sec-${s.id}`)}>
                      {SECTION_DEFAULTS[s.id].label}
                    </button>
                  ))}
                </nav>
              )}
            </div>
          )}

          <main>
            {sections.map((s) => (
              <SectionSwitch key={s.id} cfg={s} />
            ))}
          </main>

          <div className="float-bottom">
            {music.available && phase !== 'closed' && (
              <div className={`music ${music.playing ? 'on' : ''}`}>
                <label className="music-vol">
                  <span className="sr-only">Music volume</span>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={music.volume}
                    onChange={(e) => music.setVolume(Number(e.target.value))}
                  />
                </label>
                <button className="fab" onClick={music.toggle} aria-pressed={music.playing} aria-label={music.playing ? 'Pause music' : 'Play music'}>
                  {music.playing ? (
                    <span className="eq" aria-hidden="true">
                      <i />
                      <i />
                      <i />
                    </span>
                  ) : (
                    <Icon name="music" size={20} />
                  )}
                </button>
              </div>
            )}
          </div>
        </div>

        {phase !== 'open' && (
          <div className={`cover ${phase === 'opening' ? 'opening' : ''} ${cover.dark ? 'cover-dark' : 'cover-light'}`} style={{ background: cover.background }}>
            <div className="door door-l" style={{ background: cover.background }} />
            <div className="door door-r" style={{ background: cover.background }} />
            <Particles kind={inv.custom.animation === 'none' ? 'none' : 'sparkles'} color={cover.dark ? '#ffffff' : vars['--primary']} color2={cover.dark ? vars['--secondary'] : vars['--secondary']} />
            <div className="cover-content">
              <div className="cover-photo">
                <Img src={inv.heroPhoto || inv.couple.groom.photo} alt={`${groom} and ${bride}`} eager motion="kenburns" empty={<Icon name="heart" size={40} filled />} />
              </div>
              <p className="eyebrow">Together with their families</p>
              <h1 className="cover-names">
                <span>{groom.split(' ')[0]}</span>
                <Icon name="heart" size={22} filled className="cover-heart" />
                <span>{bride.split(' ')[0]}</span>
              </h1>
              {inv.weddingDate && (
                <p className="cover-date">
                  {weekday(inv.weddingDate)} · {formatDate(inv.weddingDate)}
                </p>
              )}
              {inv.quote && <p className="cover-quote">“{inv.quote}”</p>}
              <p className="cover-welcome">{inv.welcome}</p>
              <button className="btn open-btn" onClick={open} disabled={phase === 'opening'}>
                <Icon name="mail" size={18} /> Open Invitation
              </button>
              <Reveal variant="fade" className="cover-cue">
                <span>Tap to begin</span>
              </Reveal>
            </div>
          </div>
        )}

        {lightbox && (
          <Lightbox
            photos={lightbox.photos}
            index={lightbox.index}
            startSlideshow={lightbox.slideshow}
            onIndex={(i) => setLightbox({ ...lightbox, index: i })}
            onClose={() => setLightbox(null)}
          />
        )}
      </div>
    </InviteContext.Provider>
  )
}
