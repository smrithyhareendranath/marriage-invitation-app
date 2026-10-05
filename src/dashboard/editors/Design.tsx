import { useEffect, useState } from 'react'
import type { AnimationStyle, DecorStyle, Invitation, SectionConfig } from '../../types'
import { Icon } from '../../components/Icon'
import { ai } from '../../lib/ai'
import type { Palette } from '../../lib/ai'
import { api } from '../../lib/db'
import { BACKGROUND_SWATCHES, FONT_PAIRS, THEMES, customFromTheme, getFontPair, getTheme } from '../../data/themes'
import { FREE_THEME_IDS } from '../../data/pricing'
import { SECTION_DEFAULTS, defaultSections } from '../../data/demo'
import { contrast } from '../../lib/color'
import { removeMedia } from '../../lib/media'
import { Card, ColorInput, ConfirmButton, Field, MoveButtons, PageHead, Segmented, Toggle, UpgradeNote, useSortable } from '../ui'
import { PhotoPicker } from '../Uploader'
import { AiButton } from './Basics'
import { useBuilder } from '../context'
import { useToast } from '../../context'

/* ---------------------------------- Themes ---------------------------------- */

export function ThemeEditor() {
  const { inv, update, limits, go } = useBuilder()
  const toast = useToast()
  const [disabled, setDisabled] = useState<string[]>([])
  const [mood, setMood] = useState('')
  const [picks, setPicks] = useState<string[]>([])
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    api.settings.get().then((s) => setDisabled(s.disabledThemes))
  }, [])

  const choose = (id: string) => {
    if (!limits.premiumThemes && !FREE_THEME_IDS.includes(id)) return toast('This theme is part of Premium', 'info')
    update((i) => ({ ...i, custom: customFromTheme(getTheme(id)) }))
  }

  return (
    <>
      <PageHead title="Theme" desc="Pick a starting style. You can fine-tune every colour and font afterwards." />
      <Card title="Suggest designs for me" hint="Describe the mood of your wedding — for example “romantic garden, soft pink” or “kerala traditional”.">
        <div className="inline-form">
          <input value={mood} onChange={(e) => setMood(e.target.value)} placeholder="Describe your wedding style…" aria-label="Wedding style" />
          <AiButton label="Suggest" busy={busy} onRun={async () => { setBusy(true); setPicks(await ai.themes({ mood })); setBusy(false) }} />
        </div>
      </Card>
      {!limits.premiumThemes && <UpgradeNote>Free plan includes Floral, Minimal and Elegant White. <button className="link" onClick={() => go('settings')}>Unlock all themes</button></UpgradeNote>}
      <div className="theme-grid">
        {THEMES.filter((t) => !disabled.includes(t.id) || inv.custom.themeId === t.id).map((t) => {
          const locked = !limits.premiumThemes && !FREE_THEME_IDS.includes(t.id)
          const on = inv.custom.themeId === t.id
          return (
            <button key={t.id} className={`theme-card ${on ? 'on' : ''} ${locked ? 'locked' : ''}`} onClick={() => choose(t.id)} aria-pressed={on}>
              <span className="theme-swatch" style={{ background: t.cover }}>
                <i style={{ background: t.primary }} />
                <i style={{ background: t.secondary }} />
                <i style={{ background: t.bg, border: '1px solid rgba(0,0,0,.12)' }} />
              </span>
              <strong style={{ fontFamily: getFontPair(t.fontPairId).heading }}>{t.name}</strong>
              <small>{t.tagline}</small>
              {picks.includes(t.id) && <span className="badge">Suggested</span>}
              {locked && <span className="badge lock"><Icon name="lock" size={11} /> Premium</span>}
              {on && <span className="check"><Icon name="check" size={14} /></span>}
            </button>
          )
        })}
      </div>
    </>
  )
}

/* -------------------------------- Customisation -------------------------------- */

const DECOR: { value: DecorStyle; label: string }[] = [
  { value: 'floral', label: 'Floral' },
  { value: 'royal', label: 'Royal' },
  { value: 'minimal', label: 'Minimal' },
  { value: 'kerala', label: 'Kasavu' },
  { value: 'garden', label: 'Garden' },
  { value: 'gold', label: 'Gold' },
]
const ANIM: { value: AnimationStyle; label: string }[] = [
  { value: 'petals', label: 'Falling petals' },
  { value: 'sparkles', label: 'Sparkles' },
  { value: 'hearts', label: 'Hearts' },
  { value: 'none', label: 'None' },
]

export function CustomizeEditor() {
  const { inv, update } = useBuilder()
  const c = inv.custom
  const set = (patch: Partial<typeof c>) => update((i) => ({ ...i, custom: { ...i.custom, ...patch } }))
  const [mood, setMood] = useState('')
  const [palettes, setPalettes] = useState<Palette[]>([])
  const [busy, setBusy] = useState(false)
  const fonts = getFontPair(c.fontPairId)
  const ratio = contrast(c.primary, c.background)
  return (
    <>
      <PageHead title="Customise" desc="Make the colours, fonts and effects entirely yours." actions={<button className="btn btn-ghost" onClick={() => update((i) => ({ ...i, custom: customFromTheme(getTheme(i.custom.themeId)) }))}>Reset to theme</button>} />
      <Card title="Colours">
        <div className="three-col">
          <Field label="Primary colour"><ColorInput label="Primary" value={c.primary} onChange={(v) => set({ primary: v })} /></Field>
          <Field label="Secondary colour"><ColorInput label="Secondary" value={c.secondary} onChange={(v) => set({ secondary: v })} /></Field>
          <Field label="Background"><ColorInput label="Background" value={c.background} onChange={(v) => set({ background: v })} /></Field>
        </div>
        <div className="swatches" role="group" aria-label="Background presets">
          {BACKGROUND_SWATCHES.map((s) => <button key={s} className={`swatch ${c.background.toLowerCase() === s ? 'on' : ''}`} style={{ background: s }} onClick={() => set({ background: s })} aria-label={`Background ${s}`} />)}
        </div>
        {ratio < 3 && <p className="hint warn"><Icon name="alert" size={14} /> Your primary colour is hard to see on this background — we lighten or darken it automatically for text.</p>}
      </Card>
      <Card title="Colour palette ideas" hint="Describe a feeling and get palettes to try — for example “soft blush”, “gold & dark”, “kerala traditional”.">
        <div className="inline-form">
          <input value={mood} onChange={(e) => setMood(e.target.value)} placeholder="Describe the mood…" aria-label="Palette mood" />
          <AiButton label="Suggest palettes" busy={busy} onRun={async () => { setBusy(true); setPalettes(await ai.palettes({ mood })); setBusy(false) }} />
        </div>
        {palettes.length > 0 && (
          <div className="palette-row">
            {palettes.map((p) => (
              <button key={p.name} className="palette" onClick={() => set({ primary: p.primary, secondary: p.secondary, background: p.background })}>
                <span><i style={{ background: p.primary }} /><i style={{ background: p.secondary }} /><i style={{ background: p.background }} /></span>
                <strong>{p.name}</strong>
              </button>
            ))}
          </div>
        )}
      </Card>
      <Card title="Fonts">
        <div className="font-grid">
          {FONT_PAIRS.map((f) => (
            <button key={f.id} className={`font-card ${c.fontPairId === f.id ? 'on' : ''}`} onClick={() => set({ fontPairId: f.id })} aria-pressed={c.fontPairId === f.id}>
              <span style={{ fontFamily: f.script, fontSize: 30 }}>Arjun &amp; Anjali</span>
              <strong style={{ fontFamily: f.heading }}>{f.name}</strong>
              <small style={{ fontFamily: f.body }}>Together with their families</small>
            </button>
          ))}
        </div>
        <p className="hint">Current pairing: {fonts.name}</p>
      </Card>
      <Card title="Decoration & animation">
        <Field label="Decorative style"><Segmented label="Decorative style" value={c.decor} onChange={(v) => set({ decor: v })} options={DECOR} /></Field>
        <Field label="Floating effect" hint="Animations pause automatically for guests who prefer reduced motion."><Segmented label="Animation" value={c.animation} onChange={(v) => set({ animation: v })} options={ANIM} /></Field>
      </Card>
    </>
  )
}

/* ------------------------------- Page builder ------------------------------- */

export function BuilderEditor() {
  const { inv, update } = useBuilder()
  const [open, setOpen] = useState<string>('')
  const movable = inv.sections.filter((s) => s.id !== 'hero')
  const hero = inv.sections.find((s) => s.id === 'hero')
  const sortable = useSortable(movable, (next) => update((i) => ({ ...i, sections: [...(hero ? [hero] : []), ...next] })))
  const patch = (id: string, p: Partial<SectionConfig>) => update((i) => ({ ...i, sections: i.sections.map((s) => (s.id === id ? { ...s, ...p } : s)) }))
  const setClosing = (p: Partial<Invitation['closing']>) => update((i) => ({ ...i, closing: { ...i.closing, ...p } }))

  const row = (s: SectionConfig, i: number | null) => (
    <li key={s.id} className={`sec-row ${s.visible ? '' : 'off'} ${i !== null && sortable.over === i ? 'over' : ''}`} {...(i !== null ? sortable.props(i) : {})}>
      <div className="sec-row-main">
        <span className="drag-handle" aria-hidden="true">{i === null ? <Icon name="lock" size={16} /> : <Icon name="drag" size={18} />}</span>
        <strong>{SECTION_DEFAULTS[s.id].label}</strong>
        <span className="spacer" />
        {i !== null && <MoveButtons index={i} length={movable.length} onMove={(d) => sortable.move(i, d)} label={SECTION_DEFAULTS[s.id].label} />}
        <button className="icon-btn" onClick={() => patch(s.id, { visible: !s.visible })} aria-label={s.visible ? `Hide ${SECTION_DEFAULTS[s.id].label}` : `Show ${SECTION_DEFAULTS[s.id].label}`} aria-pressed={!s.visible} title={s.visible ? 'Visible' : 'Hidden'}>
          <Icon name={s.visible ? 'eye' : 'eyeoff'} size={18} />
        </button>
        <button className="icon-btn" onClick={() => setOpen(open === s.id ? '' : s.id)} aria-expanded={open === s.id} aria-label={`Edit ${SECTION_DEFAULTS[s.id].label} text and background`}>
          <Icon name="edit" size={18} />
        </button>
      </div>
      {open === s.id && (
        <div className="sec-row-edit">
          {s.id !== 'hero' && (
            <>
              <Field label="Heading"><input value={s.title} onChange={(e) => patch(s.id, { title: e.target.value })} /></Field>
              <Field label="Subheading"><input value={s.subtitle} onChange={(e) => patch(s.id, { subtitle: e.target.value })} /></Field>
            </>
          )}
          <Field label="Section background" hint="Leave empty to use the theme background.">
            <div className="bg-row">
              <ColorInput label="Section background" value={s.background || inv.custom.background} onChange={(v) => patch(s.id, { background: v })} />
              <button className="btn btn-ghost sm" onClick={() => patch(s.id, { background: '' })} disabled={!s.background}>Reset</button>
            </div>
          </Field>
          <button className="link" onClick={() => patch(s.id, { title: SECTION_DEFAULTS[s.id].title, subtitle: SECTION_DEFAULTS[s.id].subtitle })}>Restore default text</button>
        </div>
      )}
    </li>
  )

  return (
    <>
      <PageHead title="Page builder" desc="Add, hide and reorder sections of your invitation. Drag on desktop or use the arrows." actions={<ConfirmButton onConfirm={() => update({ sections: defaultSections() })} label="Reset layout" confirmLabel="Reset everything?" icon="rotate" />} />
      <Card title="Sections" hint="Hidden sections stay saved — switch them back on any time. The opening section always stays first.">
        <ul className="sec-list">
          {hero && row(hero, null)}
          {movable.map((s, i) => row(s, i))}
        </ul>
      </Card>
      <Card title="Closing message" hint="The last emotional moment of your invitation.">
        <Field label="Closing quote" hint="Each line appears on its own."><textarea rows={3} value={inv.closing.quote} onChange={(e) => setClosing({ quote: e.target.value })} /></Field>
        <Field label="Thank-you note"><input value={inv.closing.thanks} onChange={(e) => setClosing({ thanks: e.target.value })} /></Field>
        <PhotoPicker value={inv.closing.photo} onChange={(v) => { if (!v && inv.closing.photo) void removeMedia(inv.closing.photo); setClosing({ photo: v }) }} label="closing photo" alt="Closing photo of the couple" aspect={null} shape="wide" placeholder="Optional final photo shown behind your closing message" />
      </Card>
      <Card title="Hide everything but the essentials?">
        <Toggle checked={inv.sections.every((s) => s.visible)} onChange={(v) => update((i) => ({ ...i, sections: i.sections.map((s) => ({ ...s, visible: v || ['hero', 'events', 'rsvp'].includes(s.id) })) }))} label="Show all sections" desc="Turn off to keep only the opening, events and RSVP." />
      </Card>
    </>
  )
}
