import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import type { Invitation } from '../types'
import { Icon } from '../components/Icon'
import type { IconName } from '../components/Icon'
import { InvitationView } from '../invite/InvitationView'
import { useAuth, useToast } from '../context'
import { api } from '../lib/db'
import { PLAN_LIMITS } from '../data/pricing'
import { blankInvitation, demoInvitation } from '../data/demo'
import { THEMES } from '../data/themes'
import { appPath, slugify } from '../lib/util'
import { BuilderContext, countPhotos } from './context'
import type { SaveState } from './context'
import { computeProgress, computeTasks } from './progress'
import { CountdownEditor, CoupleEditor } from './editors/Basics'
import { PhotosEditor } from './editors/Photos'
import { EventsEditor, FamilyEditor, MusicEditor, StoryEditor, VideosEditor } from './editors/Content'
import { GuestbookManager, RsvpManager } from './editors/Guests'
import { BuilderEditor, CustomizeEditor, ThemeEditor } from './editors/Design'
import { AnalyticsView } from './editors/Analytics'
import { Overview, SettingsEditor, ShareEditor } from './editors/Publish'
import { useTitle } from '../hooks'

interface Tab {
  id: string
  label: string
  icon: IconName
  /** Section id to scroll the live preview to. */
  section?: string
  preview: boolean
}

const GROUPS: { title: string; tabs: Tab[] }[] = [
  { title: '', tabs: [{ id: 'overview', label: 'Overview', icon: 'home', preview: false }] },
  {
    title: 'Build',
    tabs: [
      { id: 'couple', label: 'Couple details', icon: 'heart', section: 'sec-hero', preview: true },
      { id: 'photos', label: 'Photos', icon: 'image', section: 'sec-gallery', preview: true },
      { id: 'story', label: 'Love story', icon: 'sparkle', section: 'sec-story', preview: true },
      { id: 'events', label: 'Wedding events', icon: 'calendar', section: 'sec-events', preview: true },
      { id: 'venue', label: 'Venue', icon: 'map', section: 'sec-venue', preview: true },
      { id: 'countdown', label: 'Countdown', icon: 'clock', section: 'sec-countdown', preview: true },
      { id: 'family', label: 'Family', icon: 'users', section: 'sec-family', preview: true },
      { id: 'music', label: 'Music', icon: 'music', preview: true },
      { id: 'videos', label: 'Videos', icon: 'video', section: 'sec-video', preview: true },
    ],
  },
  {
    title: 'Guests',
    tabs: [
      { id: 'rsvp', label: 'RSVPs', icon: 'check', preview: false },
      { id: 'guestbook', label: 'Guestbook', icon: 'mail', preview: false },
      { id: 'analytics', label: 'Analytics', icon: 'chart', preview: false },
    ],
  },
  {
    title: 'Design',
    tabs: [
      { id: 'theme', label: 'Theme', icon: 'flower', section: 'sec-hero', preview: true },
      { id: 'customize', label: 'Customise', icon: 'edit', section: 'sec-couple', preview: true },
      { id: 'builder', label: 'Page builder', icon: 'menu', preview: true },
    ],
  },
  {
    title: 'Publish',
    tabs: [
      { id: 'share', label: 'Share', icon: 'share', section: 'sec-share', preview: true },
      { id: 'settings', label: 'Settings', icon: 'settings', preview: false },
    ],
  },
]
const ALL_TABS = GROUPS.flatMap((g) => g.tabs)

function useWide(query = '(min-width: 1180px)') {
  const [wide, setWide] = useState(() => matchMedia(query).matches)
  useEffect(() => {
    const mq = matchMedia(query)
    const on = () => setWide(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [query])
  return wide
}

function useDebounced<T>(value: T, ms: number) {
  const [v, setV] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return v
}

/* --------------------------------- onboarding --------------------------------- */

function Onboarding({ onCreated }: { onCreated(inv: Invitation): void }) {
  const { user } = useAuth()
  const toast = useToast()
  const [groom, setGroom] = useState('')
  const [bride, setBride] = useState('')
  const [date, setDate] = useState('')
  const [theme, setTheme] = useState('floral')
  const [sample, setSample] = useState(true)
  const [busy, setBusy] = useState(false)

  const create = async () => {
    if (!user) return
    setBusy(true)
    try {
      let inv = sample ? demoInvitation(user.id) : blankInvitation(user.id, bride.trim(), groom.trim(), theme)
      if (sample) {
        inv = { ...inv, id: `inv_${Date.now().toString(36)}`, slug: '', published: false, featured: false }
        // keep the sample story but apply the chosen theme
        const t = THEMES.find((x) => x.id === theme)!
        inv.custom = { themeId: t.id, primary: t.primary, secondary: t.secondary, fontPairId: t.fontPairId, background: t.bg, decor: t.decor, animation: t.animation }
        if (groom.trim()) inv.couple.groom.name = groom.trim()
        if (bride.trim()) inv.couple.bride.name = bride.trim()
      }
      if (date) inv.weddingDate = date
      inv.slug = slugify(`${inv.couple.groom.name.split(' ')[0]}-${inv.couple.bride.name.split(' ')[0]}`) || 'our-wedding'
      onCreated(await api.invitations.create(inv))
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not create your invitation', 'error')
      setBusy(false)
    }
  }

  return (
    <main className="onboard">
      <div className="onboard-card">
        <span className="notice-ico"><Icon name="heart" size={30} filled /></span>
        <h1>Let’s create your invitation</h1>
        <p className="muted">Three quick questions — you can change everything later.</p>
        <div className="two-col">
          <div className="field"><label htmlFor="ob-groom">Groom’s name</label><input id="ob-groom" value={groom} onChange={(e) => setGroom(e.target.value)} placeholder="e.g. Arjun Menon" /></div>
          <div className="field"><label htmlFor="ob-bride">Bride’s name</label><input id="ob-bride" value={bride} onChange={(e) => setBride(e.target.value)} placeholder="e.g. Anjali Nair" /></div>
        </div>
        <div className="field"><label htmlFor="ob-date">Wedding date</label><input id="ob-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
        <div className="field">
          <label>Pick a style</label>
          <div className="theme-mini" role="radiogroup" aria-label="Theme">
            {THEMES.map((t) => (
              <button key={t.id} type="button" role="radio" aria-checked={theme === t.id} className={theme === t.id ? 'on' : ''} onClick={() => setTheme(t.id)}>
                <span style={{ background: t.cover }}><i style={{ background: t.primary }} /><i style={{ background: t.secondary }} /></span>
                <small>{t.name}</small>
              </button>
            ))}
          </div>
        </div>
        <label className="toggle">
          <input type="checkbox" checked={sample} onChange={(e) => setSample(e.target.checked)} />
          <span className="toggle-track" aria-hidden="true" />
          <span className="toggle-text"><strong>Start with sample content</strong><small>Fills in a love story, events, photos and family so you can see how it looks. Replace anything you like.</small></span>
        </label>
        <button className="btn btn-primary block lg" onClick={create} disabled={busy}>{busy ? 'Creating…' : 'Create my invitation'}</button>
      </div>
    </main>
  )
}

/* ---------------------------------- dashboard ---------------------------------- */

export function Dashboard() {
  const { user, loading, refresh, logout } = useAuth()
  const { tab = 'overview' } = useParams()
  const nav = useNavigate()
  const toast = useToast()
  const [inv, setInv] = useState<Invitation | null | undefined>(undefined)
  const [saveState, setSaveState] = useState<SaveState>('saved')
  const [navOpen, setNavOpen] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [device, setDevice] = useState<'mobile' | 'desktop'>('mobile')
  const [coverKey, setCoverKey] = useState(0)
  const [showCover, setShowCover] = useState(false)
  const wide = useWide()
  const dirty = useRef(false)
  const latest = useRef<Invitation | null>(null)
  const previewRef = useRef<HTMLDivElement>(null)

  useTitle('Dashboard · Marriage Invitation App')

  useEffect(() => {
    if (!user) return
    let alive = true
    api.invitations.forOwner(user.id).then((list) => alive && setInv(list[0] ?? null))
    return () => {
      alive = false
    }
  }, [user])

  latest.current = inv ?? null

  const persist = useCallback(async () => {
    const cur = latest.current
    if (!cur || !dirty.current) return
    dirty.current = false
    setSaveState('saving')
    try {
      await api.invitations.save(cur)
      setSaveState(dirty.current ? 'dirty' : 'saved')
    } catch (e) {
      dirty.current = true
      setSaveState('error')
      toast(e instanceof Error ? e.message : 'Could not save', 'error')
    }
  }, [toast])

  // autosave
  useEffect(() => {
    if (!dirty.current) return
    const t = setTimeout(() => void persist(), 900)
    return () => clearTimeout(t)
  }, [inv, persist])

  useEffect(() => {
    const flush = () => {
      if (dirty.current && latest.current) void api.invitations.save(latest.current)
    }
    window.addEventListener('beforeunload', flush)
    return () => {
      window.removeEventListener('beforeunload', flush)
      flush()
    }
  }, [])

  const update = useCallback((patch: Partial<Invitation> | ((i: Invitation) => Invitation)) => {
    setInv((cur) => {
      if (!cur) return cur
      dirty.current = true
      return typeof patch === 'function' ? patch(cur) : { ...cur, ...patch }
    })
    setSaveState('dirty')
  }, [])

  const setPublished = useCallback(
    async (v: boolean) => {
      if (!latest.current) return
      if (v && (!latest.current.couple.bride.name || !latest.current.couple.groom.name)) {
        toast('Add both names before publishing', 'error')
        nav('/dashboard/couple')
        return
      }
      dirty.current = true
      setInv((c) => (c ? { ...c, published: v } : c))
      latest.current = { ...latest.current, published: v }
      await persist()
      toast(v ? 'Your invitation is live 🎉' : 'Invitation unpublished', v ? 'ok' : 'info')
    },
    [nav, persist, toast],
  )

  const preview = useDebounced(inv, 450)
  const currentTab = ALL_TABS.find((t) => t.id === tab)

  // scroll the live preview to the section being edited
  useEffect(() => {
    if (!currentTab?.section) return
    const t = setTimeout(() => {
      const root = previewRef.current?.querySelector<HTMLElement>('.invite-scroll')
      const el = previewRef.current?.querySelector<HTMLElement>(`#${currentTab.section}`)
      if (!root || !el) return
      const top = el.getBoundingClientRect().top - root.getBoundingClientRect().top + root.scrollTop
      root.scrollTo({ top: Math.max(0, top - 8), behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
    }, 250)
    return () => clearTimeout(t)
  }, [currentTab, preview?.id])

  const limits = user ? PLAN_LIMITS[user.plan] : PLAN_LIMITS.free
  const ctx = useMemo(
    () =>
      inv && user
        ? {
            inv,
            user,
            limits,
            saveState,
            photoCount: countPhotos(inv),
            update,
            saveNow: persist,
            setPublished,
            go: (t: string) => {
              setNavOpen(false)
              nav(`/dashboard/${t}`)
              document.querySelector('.dash-editor')?.scrollTo({ top: 0 })
            },
            refreshUser: refresh,
          }
        : null,
    [inv, user, limits, saveState, update, persist, setPublished, nav, refresh],
  )

  if (loading) return <div className="page-loading"><span className="big-heart float"><Icon name="heart" size={40} filled /></span></div>
  if (!user) return <Navigate to="/login" replace state={{ from: '/dashboard' }} />
  if (user.role === 'admin' && !inv) return <Navigate to="/admin" replace />
  if (inv === undefined) return <div className="page-loading"><span className="big-heart float"><Icon name="heart" size={40} filled /></span></div>
  if (inv === null) return <Onboarding onCreated={(i) => { setInv(i); nav('/dashboard/overview') }} />
  if (!ctx) return null
  if (!currentTab) return <Navigate to="/dashboard/overview" replace />

  const progress = computeProgress(computeTasks(inv))
  const viewPreview = currentTab.preview
  const content = (() => {
    switch (tab) {
      case 'overview': return <Overview />
      case 'couple': return <CoupleEditor />
      case 'photos': return <PhotosEditor />
      case 'story': return <StoryEditor />
      case 'events': return <EventsEditor mode="events" />
      case 'venue': return <EventsEditor mode="venue" />
      case 'countdown': return <CountdownEditor />
      case 'family': return <FamilyEditor />
      case 'music': return <MusicEditor />
      case 'videos': return <VideosEditor />
      case 'rsvp': return <RsvpManager />
      case 'guestbook': return <GuestbookManager />
      case 'analytics': return <AnalyticsView />
      case 'theme': return <ThemeEditor />
      case 'customize': return <CustomizeEditor />
      case 'builder': return <BuilderEditor />
      case 'share': return <ShareEditor />
      default: return <SettingsEditor />
    }
  })()

  const savingLabel = saveState === 'saving' ? 'Saving…' : saveState === 'dirty' ? 'Unsaved changes' : saveState === 'error' ? 'Save failed — retry' : 'All changes saved'

  const frame = (
    <div className="preview-pane">
      <div className="preview-bar">
        <div className="seg" role="radiogroup" aria-label="Preview size">
          <label className={device === 'mobile' ? 'on' : ''}><input type="radio" checked={device === 'mobile'} onChange={() => setDevice('mobile')} /><Icon name="smartphone" size={15} /> Mobile</label>
          <label className={device === 'desktop' ? 'on' : ''}><input type="radio" checked={device === 'desktop'} onChange={() => setDevice('desktop')} /><Icon name="monitor" size={15} /> Desktop</label>
        </div>
        <button className="btn btn-ghost sm" onClick={() => { setShowCover(true); setCoverKey((k) => k + 1) }}><Icon name="play" size={14} /> Replay opening</button>
      </div>
      <div className={`device device-${device}`} ref={previewRef}>
        {preview && <InvitationView key={`${coverKey}-${showCover}`} inv={preview} mode="preview" skipCover={!showCover} />}
      </div>
      <p className="hint center">Live preview · changes appear as you type</p>
    </div>
  )

  return (
    <BuilderContext.Provider value={ctx}>
      <div className="dash">
        {navOpen && <div className="scrim" onClick={() => setNavOpen(false)} />}
        <aside className={`dash-side ${navOpen ? 'open' : ''}`} aria-label="Dashboard navigation">
          <Link to="/" className="brand"><Icon name="heart" size={20} filled /> <span>Marriage Invitation</span></Link>
          <div className="side-progress" role="button" tabIndex={0} onClick={() => ctx.go('overview')} onKeyDown={(e) => e.key === 'Enter' && ctx.go('overview')}>
            <div className="bar"><i style={{ width: `${progress}%` }} /></div>
            <small>{progress}% complete</small>
          </div>
          <nav>
            {GROUPS.map((g) => (
              <div key={g.title || 'main'} className="nav-group">
                {g.title && <p>{g.title}</p>}
                {g.tabs.map((t) => (
                  <button key={t.id} className={tab === t.id ? 'on' : ''} onClick={() => ctx.go(t.id)} aria-current={tab === t.id ? 'page' : undefined}>
                    <Icon name={t.icon} size={18} /> {t.label}
                  </button>
                ))}
              </div>
            ))}
          </nav>
          <div className="side-foot">
            <div className="user"><span className="avatar-dot">{user.name[0]?.toUpperCase()}</span><div><strong>{user.name}</strong><small>{user.plan[0].toUpperCase() + user.plan.slice(1)} plan</small></div></div>
            <button className="icon-btn" onClick={async () => { await logout(); nav('/') }} aria-label="Log out" title="Log out"><Icon name="logout" size={18} /></button>
          </div>
        </aside>

        <div className="dash-main">
          <header className="dash-top">
            <button className="icon-btn menu-btn" onClick={() => setNavOpen(true)} aria-label="Open menu"><Icon name="menu" size={22} /></button>
            <div className="dash-title">
              <strong>{inv.couple.groom.name.split(' ')[0] || 'Groom'} &amp; {inv.couple.bride.name.split(' ')[0] || 'Bride'}</strong>
              <small className={`save ${saveState}`} role="status" aria-live="polite">
                <i /> {savingLabel}
                {saveState === 'error' && <button className="link" onClick={() => void persist()}>Retry</button>}
              </small>
            </div>
            <div className="dash-actions">
              {viewPreview && <button className="btn btn-ghost sm only-narrow" onClick={() => setPreviewOpen(true)}><Icon name="eye" size={16} /> Preview</button>}
              <a className="btn btn-ghost sm hide-narrow" href={appPath(`/invite/${inv.slug}`)} target="_blank" rel="noopener noreferrer"><Icon name="external" size={15} /> Open</a>
              <button className={`btn sm ${inv.published ? 'btn-ghost' : 'btn-primary'}`} onClick={() => void setPublished(!inv.published)}>
                <Icon name={inv.published ? 'eyeoff' : 'rocket'} size={15} /> {inv.published ? 'Unpublish' : 'Publish'}
              </button>
            </div>
          </header>
          <div className={`dash-body ${viewPreview ? 'with-preview' : ''}`}>
            <div className="dash-editor" key={tab}>{content}</div>
            {viewPreview && wide && <aside className="dash-preview" aria-label="Live preview">{frame}</aside>}
          </div>
        </div>

        {previewOpen && !wide && (
          <div className="preview-overlay" role="dialog" aria-modal="true" aria-label="Invitation preview">
            <button className="btn btn-primary sm close" onClick={() => setPreviewOpen(false)}><Icon name="x" size={16} /> Close preview</button>
            {frame}
          </div>
        )}
      </div>
    </BuilderContext.Provider>
  )
}
