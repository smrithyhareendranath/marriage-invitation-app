import { useRef, useState } from 'react'
import type { FamilyMember, Milestone, WeddingEvent } from '../../types'
import { Icon } from '../../components/Icon'
import { Img } from '../../components/Img'
import { ai } from '../../lib/ai'
import { emptyEvent } from '../../data/demo'
import { directionsUrl, formatDate, parseVideo, uid } from '../../lib/util'
import { removeMedia, saveFile } from '../../lib/media'
import { useToast } from '../../context'
import { useMusic, BUILTIN_MUSIC } from '../../invite/music'
import { Card, ConfirmButton, EmptyState, Field, MoveButtons, PageHead, Segmented, Toggle, UpgradeNote, useSortable } from '../ui'
import { MultiUploader, PhotoPicker } from '../Uploader'
import { AiButton } from './Basics'
import { useBuilder } from '../context'

/* ---------------------------------- Story ---------------------------------- */

const STORY_STARTERS: Omit<Milestone, 'id'>[] = [
  { date: '2019', title: 'First Met', description: 'We met for the first time…', photos: [], video: '', location: '' },
  { date: '2020', title: 'First Conversation', description: 'That simple conversation became something special.', photos: [], video: '', location: '' },
  { date: '2022', title: 'The Proposal', description: 'One question changed everything.', photos: [], video: '', location: '' },
  { date: String(new Date().getFullYear() + 1), title: 'The Wedding', description: 'And now, forever begins…', photos: [], video: '', location: '' },
]

function MilestoneCard({ m, i, total, onChange, onRemove, onMove, dragProps, over }: {
  m: Milestone; i: number; total: number
  onChange(m: Milestone): void; onRemove(): void; onMove(d: -1 | 1): void
  dragProps: object; over: boolean
}) {
  const { limits } = useBuilder()
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  const set = <K extends keyof Milestone>(k: K, v: Milestone[K]) => onChange({ ...m, [k]: v })
  const videoOk = !m.video || !!parseVideo(m.video)
  return (
    <article className={`item-card ${over ? 'over' : ''}`} {...dragProps}>
      <header className="item-head">
        <span className="drag-handle" aria-hidden="true"><Icon name="drag" size={18} /></span>
        <strong>{m.title || 'Untitled milestone'}</strong>
        <span className="spacer" />
        <MoveButtons index={i} length={total} onMove={onMove} label="milestone" />
        <ConfirmButton onConfirm={onRemove} label="" confirmLabel="Delete?" />
      </header>
      <div className="three-col">
        <Field label="Date or year"><input value={m.date} onChange={(e) => set('date', e.target.value)} placeholder="2019" maxLength={30} /></Field>
        <Field label="Title"><input value={m.title} onChange={(e) => set('title', e.target.value)} placeholder="First Met" maxLength={60} /></Field>
        <Field label="Location (optional)"><input value={m.location} onChange={(e) => set('location', e.target.value)} placeholder="Where was it?" maxLength={80} /></Field>
      </div>
      <Field label="Your story">
        <textarea rows={3} value={m.description} onChange={(e) => set('description', e.target.value)} placeholder="Tell this part of your story…" maxLength={700} />
      </Field>
      <div className="row-end">
        <AiButton label="Make it more romantic" busy={busy} onRun={async () => {
          if (!m.description.trim()) return toast('Write a line or two first', 'info')
          setBusy(true)
          set('description', await ai.improve(m.description))
          setBusy(false)
        }} />
      </div>
      <div className="thumb-row">
        {m.photos.map((p, pi) => (
          <div key={p + pi} className="thumb">
            <Img src={p} alt={`${m.title} photo ${pi + 1}`} thumb />
            <button className="icon-btn sm thumb-x" aria-label="Remove photo" onClick={() => { void removeMedia(p); set('photos', m.photos.filter((_, k) => k !== pi)) }}>
              <Icon name="x" size={14} />
            </button>
          </div>
        ))}
      </div>
      <MultiUploader compact remaining={9999} onUploaded={(f) => set('photos', [...m.photos, ...f.map((x) => x.src)])} />
      <Field label="Video (optional)" hint={limits.video ? 'Paste a YouTube or Vimeo link.' : 'Videos are part of the Premium plan.'} error={videoOk ? undefined : 'We only support YouTube and Vimeo links here.'}>
        <input value={m.video.startsWith('media:') ? 'Uploaded video' : m.video} disabled={!limits.video} onChange={(e) => set('video', e.target.value)} placeholder="https://youtu.be/…" inputMode="url" />
      </Field>
    </article>
  )
}

export function StoryEditor() {
  const { inv, update } = useBuilder()
  const sortable = useSortable(inv.story, (story) => update({ story }))
  const add = (base?: Omit<Milestone, 'id'>) =>
    update((i) => ({ ...i, story: [...i.story, { id: uid('ms'), date: '', title: '', description: '', photos: [], video: '', location: '', ...base }] }))
  return (
    <>
      <PageHead
        title="Our love story"
        desc="Add as many milestones as you like — they appear as an animated timeline."
        actions={<button className="btn btn-primary" onClick={() => add()}><Icon name="plus" size={16} /> Add milestone</button>}
      />
      {inv.story.length === 0 ? (
        <EmptyState icon="heart" title="Your story starts here" action={
          <div className="row-center">
            <button className="btn btn-primary" onClick={() => STORY_STARTERS.forEach((s) => add(s))}>Start with suggested milestones</button>
            <button className="btn btn-ghost" onClick={() => add()}>Add my own</button>
          </div>
        }>
          First met, the proposal, the wedding — add the moments that matter to you.
        </EmptyState>
      ) : (
        <div className="stack">
          {inv.story.map((m, i) => (
            <MilestoneCard key={m.id} m={m} i={i} total={inv.story.length} over={sortable.over === i}
              dragProps={sortable.props(i)}
              onChange={(next) => update((x) => ({ ...x, story: x.story.map((s) => (s.id === m.id ? next : s)) }))}
              onRemove={() => { m.photos.forEach((p) => void removeMedia(p)); update((x) => ({ ...x, story: x.story.filter((s) => s.id !== m.id) })) }}
              onMove={(d) => sortable.move(i, d)} />
          ))}
          <button className="btn btn-ghost block" onClick={() => add()}><Icon name="plus" size={16} /> Add another milestone</button>
        </div>
      )}
    </>
  )
}

/* ------------------------------ Events & venues ------------------------------ */

const EVENT_NAMES = ['Engagement', 'Mehendi', 'Haldi', 'Sangeet', 'Wedding Ceremony', 'Reception', 'After party']
const DRESS = ['Traditional', 'Formal', 'Semi-formal', 'Cocktail', 'Festive colours', 'Pastel tones']

function EventCard({ ev, i, total, mode, onChange, onRemove, onMove, dragProps, over }: {
  ev: WeddingEvent; i: number; total: number; mode: 'events' | 'venue'
  onChange(e: WeddingEvent): void; onRemove(): void; onMove(d: -1 | 1): void
  dragProps: object; over: boolean
}) {
  const set = <K extends keyof WeddingEvent>(k: K, v: WeddingEvent[K]) => onChange({ ...ev, [k]: v })
  const urlOk = !ev.mapsUrl || /^https?:\/\//i.test(ev.mapsUrl)
  const listId = `ev-names-${ev.id}`
  return (
    <article className={`item-card ${over ? 'over' : ''}`} {...(mode === 'events' ? dragProps : {})}>
      <header className="item-head">
        {mode === 'events' && <span className="drag-handle" aria-hidden="true"><Icon name="drag" size={18} /></span>}
        <strong>{ev.name || 'Untitled event'}</strong>
        {ev.date && <small className="muted">{formatDate(ev.date)}</small>}
        <span className="spacer" />
        {mode === 'events' && (<><MoveButtons index={i} length={total} onMove={onMove} label="event" /><ConfirmButton onConfirm={onRemove} label="" confirmLabel="Delete?" /></>)}
      </header>
      {mode === 'events' ? (
        <>
          <div className="three-col">
            <Field label="Event name">
              <input list={listId} value={ev.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Sangeet" />
              <datalist id={listId}>{EVENT_NAMES.map((n) => <option key={n} value={n} />)}</datalist>
            </Field>
            <Field label="Date"><input type="date" value={ev.date} onChange={(e) => set('date', e.target.value)} /></Field>
            <Field label="Dress code (optional)">
              <input list={`${listId}-d`} value={ev.dressCode} onChange={(e) => set('dressCode', e.target.value)} placeholder="e.g. Traditional" />
              <datalist id={`${listId}-d`}>{DRESS.map((n) => <option key={n} value={n} />)}</datalist>
            </Field>
          </div>
          <div className="two-col">
            <Field label="Starts"><input type="time" value={ev.time} onChange={(e) => set('time', e.target.value)} /></Field>
            <Field label="Ends (optional)"><input type="time" value={ev.endTime} onChange={(e) => set('endTime', e.target.value)} /></Field>
          </div>
          <Field label="Description"><textarea rows={3} value={ev.description} onChange={(e) => set('description', e.target.value)} placeholder="What should guests expect?" maxLength={500} /></Field>
        </>
      ) : (
        <>
          <div className="two-col">
            <Field label="Venue name"><input value={ev.venue} onChange={(e) => set('venue', e.target.value)} placeholder="e.g. Grand Palace Convention Centre" /></Field>
            <Field label="Google Maps link (optional)" tip="Open the place in Google Maps → Share → Copy link." error={urlOk ? undefined : 'Please paste a full link starting with https://'}>
              <input value={ev.mapsUrl} onChange={(e) => set('mapsUrl', e.target.value)} placeholder="https://maps.app.goo.gl/…" inputMode="url" />
            </Field>
          </div>
          <Field label="Complete address"><textarea rows={2} value={ev.address} onChange={(e) => set('address', e.target.value)} placeholder="Street, city, state, PIN" /></Field>
          <Field label="Parking information (optional)"><input value={ev.parking} onChange={(e) => set('parking', e.target.value)} placeholder="e.g. Free valet parking at the main gate" /></Field>
          {(ev.venue || ev.address) && (
            <a className="btn btn-ghost sm" href={directionsUrl(ev)} target="_blank" rel="noopener noreferrer"><Icon name="map" size={15} /> Test directions link</a>
          )}
        </>
      )}
    </article>
  )
}

export function EventsEditor({ mode }: { mode: 'events' | 'venue' }) {
  const { inv, update } = useBuilder()
  const sortable = useSortable(inv.events, (events) => update({ events }))
  const add = (name = '') => update((i) => ({ ...i, events: [...i.events, emptyEvent(name || 'New event')] }))
  return (
    <>
      <PageHead
        title={mode === 'events' ? 'Wedding events' : 'Venues & directions'}
        desc={mode === 'events' ? 'Add every celebration — each gets its own card, countdown and calendar button.' : 'Tell guests where to go. Each venue gets a map preview and a “Get Directions” button.'}
        actions={mode === 'events' ? <button className="btn btn-primary" onClick={() => add()}><Icon name="plus" size={16} /> Add event</button> : undefined}
      />
      {mode === 'events' && (
        <div className="chips-row" aria-label="Quick add">
          {EVENT_NAMES.filter((n) => !inv.events.some((e) => e.name === n)).map((n) => (
            <button key={n} className="chip" onClick={() => add(n)}><Icon name="plus" size={13} /> {n}</button>
          ))}
        </div>
      )}
      {inv.events.length === 0 ? (
        <EmptyState icon="calendar" title="No events yet" action={<button className="btn btn-primary" onClick={() => add('Wedding Ceremony')}>Add your wedding ceremony</button>}>
          Add the ceremony, reception and any other celebrations.
        </EmptyState>
      ) : (
        <div className="stack">
          {inv.events.map((ev, i) => (
            <EventCard key={ev.id} ev={ev} i={i} total={inv.events.length} mode={mode} over={sortable.over === i}
              dragProps={sortable.props(i)}
              onChange={(next) => update((x) => ({ ...x, events: x.events.map((e) => (e.id === ev.id ? next : e)) }))}
              onRemove={() => update((x) => ({ ...x, events: x.events.filter((e) => e.id !== ev.id) }))}
              onMove={(d) => sortable.move(i, d)} />
          ))}
        </div>
      )}
    </>
  )
}

/* ---------------------------------- Family ---------------------------------- */

export function FamilyEditor() {
  const { inv, update } = useBuilder()
  const f = inv.family
  const setF = (patch: Partial<typeof f>) => update((i) => ({ ...i, family: { ...i.family, ...patch } }))
  const setMember = (id: string, patch: Partial<FamilyMember>) => setF({ members: f.members.map((m) => (m.id === id ? { ...m, ...patch } : m)) })
  return (
    <>
      <PageHead title="Family" desc="Honour the people who made this day possible." />
      <Card title="Wording">
        <Field label="Section heading"><input value={f.heading} onChange={(e) => setF({ heading: e.target.value })} placeholder="With the blessings of our families" /></Field>
        <div className="two-col">
          <Field label="Groom's parents"><input value={f.groomParents} onChange={(e) => setF({ groomParents: e.target.value })} placeholder="e.g. Shri. Ramesh Menon & Smt. Sreedevi Menon" /></Field>
          <Field label="Bride's parents"><input value={f.brideParents} onChange={(e) => setF({ brideParents: e.target.value })} placeholder="e.g. Shri. Gopalakrishnan Nair & Smt. Latha Nair" /></Field>
        </div>
        <Field label="A closing note (optional)"><textarea rows={2} value={f.note} onChange={(e) => setF({ note: e.target.value })} placeholder="e.g. Together with our beloved grandparents…" maxLength={300} /></Field>
      </Card>
      <Card title="Family members" hint="Parents, grandparents, siblings — add photos to make it personal."
        actions={<button className="btn btn-primary sm" onClick={() => setF({ members: [...f.members, { id: uid('fm'), name: '', relation: '', photo: '', side: 'groom' }] })}><Icon name="plus" size={15} /> Add member</button>}>
        {f.members.length === 0 ? (
          <EmptyState icon="users" title="No family members yet">Add a few so their faces appear on your invitation.</EmptyState>
        ) : (
          <div className="member-grid">
            {f.members.map((m) => (
              <div key={m.id} className="member-card">
                <PhotoPicker value={m.photo} onChange={(v) => setMember(m.id, { photo: v })} label="photo" alt={m.name || 'Family member'} aspect={1} shape="round" allowAspect={false} placeholder="Add photo" />
                <Field label="Name"><input value={m.name} onChange={(e) => setMember(m.id, { name: e.target.value })} /></Field>
                <Field label="Relation"><input value={m.relation} onChange={(e) => setMember(m.id, { relation: e.target.value })} placeholder="e.g. Father of the bride" /></Field>
                <Segmented label="Side" value={m.side} onChange={(v) => setMember(m.id, { side: v })} options={[{ value: 'groom', label: 'Groom' }, { value: 'bride', label: 'Bride' }]} />
                <ConfirmButton onConfirm={() => { void removeMedia(m.photo); setF({ members: f.members.filter((x) => x.id !== m.id) }) }} label="Remove" confirmLabel="Remove?" />
              </div>
            ))}
          </div>
        )}
      </Card>
    </>
  )
}

/* ----------------------------------- Music ----------------------------------- */

export function MusicEditor() {
  const { inv, update, limits, go } = useBuilder()
  const toast = useToast()
  const input = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const m = inv.music
  const preview = useMusic(m.src, true)

  const setMusic = (patch: Partial<typeof m>) => update((i) => ({ ...i, music: { ...i.music, ...patch } }))
  const upload = async (f?: File) => {
    if (!f) return
    setUploading(true)
    try {
      const ref = await saveFile(f, 'audio')
      if (m.src.startsWith('media:')) void removeMedia(m.src)
      setMusic({ src: ref, title: f.name.replace(/\.[^.]+$/, ''), enabled: true })
      toast('Music uploaded')
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Upload failed', 'error')
    } finally {
      setUploading(false)
    }
  }

  return (
    <>
      <PageHead title="Background music" desc="Music starts only after a guest taps “Open Invitation” — never automatically." />
      {!limits.music && <UpgradeNote>Custom music is a Premium feature. <button className="link" onClick={() => go('settings')}>See plans</button></UpgradeNote>}
      <Card title="Choose your music">
        <Toggle checked={m.enabled && !!m.src} onChange={(v) => setMusic({ enabled: v, src: m.src || (v ? BUILTIN_MUSIC : ''), title: m.title || 'Serenade (built-in)' })} label="Play background music" desc="Guests can pause it and change the volume at any time." />
        <div className="music-options">
          <button className={`option ${m.src === BUILTIN_MUSIC ? 'on' : ''}`} onClick={() => setMusic({ src: BUILTIN_MUSIC, title: 'Serenade (built-in)', enabled: true })}>
            <Icon name="music" size={20} /><strong>Serenade</strong><small>Soft built-in melody</small>
          </button>
          <button className={`option ${m.src.startsWith('media:') ? 'on' : ''}`} disabled={!limits.music || uploading} onClick={() => input.current?.click()}>
            <Icon name="upload" size={20} /><strong>{uploading ? 'Uploading…' : 'Upload your own'}</strong><small>MP3, M4A or WAV · up to 15 MB</small>
          </button>
        </div>
        <input ref={input} type="file" accept="audio/*" hidden onChange={(e) => { void upload(e.target.files?.[0]); e.target.value = '' }} />
        {m.src && (
          <div className="music-now">
            <button className="btn btn-ghost sm" onClick={preview.toggle}><Icon name={preview.playing ? 'pause' : 'play'} size={15} /> {preview.playing ? 'Pause preview' : 'Preview'}</button>
            <span><strong>{m.title || 'Your track'}</strong></span>
            <label className="vol"><Icon name="volume" size={15} />
              <input type="range" min={0} max={1} step={0.05} value={preview.volume} onChange={(e) => preview.setVolume(Number(e.target.value))} aria-label="Preview volume" />
            </label>
            <ConfirmButton onConfirm={() => { if (preview.playing) preview.toggle(); if (m.src.startsWith('media:')) void removeMedia(m.src); setMusic({ src: '', title: '', enabled: false }) }} label="Remove" confirmLabel="Remove?" />
          </div>
        )}
        <small className="hint">Only upload music you have the rights to share.</small>
      </Card>
    </>
  )
}

/* ----------------------------------- Videos ----------------------------------- */

export function VideosEditor() {
  const { inv, update, limits, go } = useBuilder()
  const toast = useToast()
  const input = useRef<HTMLInputElement>(null)
  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('')
  const [uploading, setUploading] = useState(false)
  const sortable = useSortable(inv.videos, (videos) => update({ videos }))

  const add = (u: string, t: string, kind: 'youtube' | 'vimeo' | 'upload') => {
    update((i) => ({ ...i, videos: [...i.videos, { id: uid('vid'), title: t || 'Video', url: u, kind }] }))
    setUrl('')
    setTitle('')
  }
  const addUrl = () => {
    const v = parseVideo(url)
    if (!v || v.kind === 'upload') return toast('Paste a valid YouTube or Vimeo link', 'error')
    add(url.trim(), title.trim(), v.kind)
  }
  const upload = async (f?: File) => {
    if (!f) return
    setUploading(true)
    try {
      add(await saveFile(f, 'video'), title.trim() || f.name.replace(/\.[^.]+$/, ''), 'upload')
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Upload failed', 'error')
    } finally {
      setUploading(false)
    }
  }

  return (
    <>
      <PageHead title="Video memories" desc="Share your pre-wedding shoot, save-the-date or a favourite memory." />
      {!limits.video && <UpgradeNote>Videos are a Premium feature. <button className="link" onClick={() => go('settings')}>See plans</button></UpgradeNote>}
      <Card title="Add a video">
        <div className="two-col">
          <Field label="Title"><input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Our pre-wedding film" disabled={!limits.video} /></Field>
          <Field label="YouTube or Vimeo link"><input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://youtu.be/…" inputMode="url" disabled={!limits.video} /></Field>
        </div>
        <div className="row-end">
          <button className="btn btn-ghost" disabled={!limits.video || uploading} onClick={() => input.current?.click()}><Icon name="upload" size={16} /> {uploading ? 'Uploading…' : 'Upload a video file'}</button>
          <button className="btn btn-primary" disabled={!limits.video || !url.trim()} onClick={addUrl}><Icon name="plus" size={16} /> Add video</button>
        </div>
        <input ref={input} type="file" accept="video/*" hidden onChange={(e) => { void upload(e.target.files?.[0]); e.target.value = '' }} />
        <small className="hint">Uploaded videos are limited to 60 MB. For longer films, use YouTube or Vimeo.</small>
      </Card>
      <Card title={`Your videos (${inv.videos.length})`}>
        {inv.videos.length === 0 ? <EmptyState icon="video" title="No videos yet">Add one above and it appears as an animated card.</EmptyState> : (
          <ul className="list">
            {inv.videos.map((v, i) => (
              <li key={v.id} className="list-row" {...sortable.props(i)}>
                <Icon name="video" size={18} />
                <input value={v.title} onChange={(e) => update((x) => ({ ...x, videos: x.videos.map((y) => (y.id === v.id ? { ...y, title: e.target.value } : y)) }))} aria-label="Video title" />
                <small className="muted">{v.kind === 'upload' ? 'Uploaded file' : v.kind}</small>
                <MoveButtons index={i} length={inv.videos.length} onMove={(d) => sortable.move(i, d)} label="video" />
                <ConfirmButton onConfirm={() => { if (v.kind === 'upload') void removeMedia(v.url); update((x) => ({ ...x, videos: x.videos.filter((y) => y.id !== v.id) })) }} label="" confirmLabel="Delete?" />
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  )
}
