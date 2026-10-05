import { useState } from 'react'
import type { Person } from '../../types'
import { Icon } from '../../components/Icon'
import { ai } from '../../lib/ai'
import { DEMO_STORY_TEXT } from '../../data/demo'
import { formatDate, weekday } from '../../lib/util'
import { Card, Field, PageHead, Toggle } from '../ui'
import { PhotoPicker } from '../Uploader'
import { useBuilder } from '../context'
import { weddingTarget } from '../../invite/parts'
import { useCountdown } from '../../hooks'
import { useToast } from '../../context'

/* ------------------------------ AI assist button ------------------------------ */

export function AiButton({ label, onRun, busy }: { label: string; onRun(): void; busy?: boolean }) {
  return (
    <button type="button" className="btn btn-ai sm" onClick={onRun} disabled={busy}>
      <Icon name="sparkle" size={15} /> {busy ? 'Writing…' : label}
    </button>
  )
}

/* --------------------------------- Couple --------------------------------- */

function PersonForm({ role, person, onChange }: { role: 'Groom' | 'Bride'; person: Person; onChange(p: Person): void }) {
  const set = <K extends keyof Person>(k: K, v: Person[K]) => onChange({ ...person, [k]: v })
  const [busy, setBusy] = useState(false)
  const lower = role.toLowerCase()
  return (
    <Card title={`${role}'s details`}>
      <div className="two-col">
        <PhotoPicker value={person.photo} onChange={(v) => set('photo', v)} label={`${lower}'s photo`} alt={`Portrait of ${person.name || lower}`} aspect={4 / 5} shape="portrait" />
        <div className="stack">
          <Field label="Full name" htmlFor={`${lower}-name`}>
            <input id={`${lower}-name`} value={person.name} onChange={(e) => set('name', e.target.value)} placeholder={role === 'Groom' ? 'e.g. Arjun Menon' : 'e.g. Anjali Nair'} />
          </Field>
          <Field label="Profession (optional)">
            <input value={person.profession} onChange={(e) => set('profession', e.target.value)} placeholder="e.g. Architect" />
          </Field>
          <Field label="Hometown (optional)">
            <input value={person.hometown} onChange={(e) => set('hometown', e.target.value)} placeholder="e.g. Kochi, Kerala" />
          </Field>
        </div>
      </div>
      <Field
        label="Short bio"
        hint="Two or three sentences guests will enjoy reading."
      >
        <textarea rows={3} value={person.bio} onChange={(e) => set('bio', e.target.value)} placeholder="A few words about who you are and what you love…" maxLength={400} />
      </Field>
      <div className="row-end">
        <AiButton
          label="Improve my writing"
          busy={busy}
          onRun={async () => {
            if (!person.bio.trim()) return
            setBusy(true)
            set('bio', await ai.improve(person.bio))
            setBusy(false)
          }}
        />
      </div>
      <div className="two-col">
        <Field label="Instagram link (optional)">
          <input value={person.instagram} onChange={(e) => set('instagram', e.target.value)} placeholder="https://instagram.com/username" inputMode="url" />
        </Field>
        <Field label="Facebook link (optional)">
          <input value={person.facebook} onChange={(e) => set('facebook', e.target.value)} placeholder="https://facebook.com/username" inputMode="url" />
        </Field>
      </div>
    </Card>
  )
}

export function CoupleEditor() {
  const { inv, update } = useBuilder()
  const toast = useToast()
  const [busy, setBusy] = useState<string>('')
  const [tone, setTone] = useState('warm')
  const [qTone, setQTone] = useState('romantic')
  const [quotes, setQuotes] = useState<string[]>([])
  const [storyText, setStoryText] = useState('')

  return (
    <>
      <PageHead title="Couple details" desc="Introduce yourselves — this is the first thing guests see." />
      <Card title="The big day">
        <div className="two-col">
          <Field label="Wedding date" tip="Used for the countdown and the opening screen." htmlFor="wd">
            <input id="wd" type="date" value={inv.weddingDate} onChange={(e) => update({ weddingDate: e.target.value })} />
          </Field>
          <Field label="Invitation hosted by (optional)" hint="Shown to guests as a short line, e.g. “The families of …”">
            <input value={inv.invitedBy} onChange={(e) => update({ invitedBy: e.target.value })} placeholder="The families of …" />
          </Field>
        </div>
        <div className="two-col">
          <PhotoPicker value={inv.heroPhoto} onChange={(v) => update({ heroPhoto: v })} label="couple photo" alt="The couple together" aspect={4 / 5} shape="portrait" placeholder="Your favourite photo together — it opens the invitation" />
          <div className="stack">
            <Field label="Opening quote" hint="Appears on the cover and the first screen.">
              <textarea rows={3} value={inv.quote} onChange={(e) => update({ quote: e.target.value })} maxLength={160} />
            </Field>
            <div className="ai-box">
              <div className="ai-row">
                <select value={qTone} onChange={(e) => setQTone(e.target.value)} aria-label="Quote style">
                  <option value="romantic">Romantic</option>
                  <option value="traditional">Traditional</option>
                  <option value="fun">Fun</option>
                  <option value="minimal">Short & minimal</option>
                </select>
                <AiButton label="Suggest quotes" busy={busy === 'q'} onRun={async () => { setBusy('q'); setQuotes(await ai.quotes({ tone: qTone })); setBusy('') }} />
              </div>
              {quotes.length > 0 && (
                <ul className="suggestions">
                  {quotes.map((q) => (
                    <li key={q}>
                      <button type="button" onClick={() => { update({ quote: q }); toast('Quote applied') }}>{q}</button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
        <Field label="Invitation wording" hint="The line under your names on the cover.">
          <textarea rows={3} value={inv.welcome} onChange={(e) => update({ welcome: e.target.value })} maxLength={300} />
        </Field>
        <div className="ai-row">
          <select value={tone} onChange={(e) => setTone(e.target.value)} aria-label="Wording tone">
            <option value="warm">Warm & friendly</option>
            <option value="formal">Formal</option>
            <option value="traditional">Traditional</option>
            <option value="fun">Playful</option>
          </select>
          <AiButton
            label="Write invitation wording"
            busy={busy === 'w'}
            onRun={async () => {
              setBusy('w')
              update({ welcome: (await ai.wording({ bride: inv.couple.bride.name, groom: inv.couple.groom.name, tone })).replace(/\n/g, ' ') })
              setBusy('')
            }}
          />
          <AiButton
            label="Improve grammar"
            busy={busy === 'g'}
            onRun={async () => { setBusy('g'); update({ welcome: await ai.improve(inv.welcome) }); setBusy('') }}
          />
        </div>
      </Card>

      <PersonForm role="Groom" person={inv.couple.groom} onChange={(p) => update((i) => ({ ...i, couple: { ...i.couple, groom: p } }))} />
      <PersonForm role="Bride" person={inv.couple.bride} onChange={(p) => update((i) => ({ ...i, couple: { ...i.couple, bride: p } }))} />

      <Card title="Write your love story with AI" hint="Tell us in a sentence or two how you met — we will turn it into a story you can edit.">
        <Field label="How did you meet?">
          <textarea rows={3} value={storyText} onChange={(e) => setStoryText(e.target.value)} placeholder="We met in college and became friends before falling in love." />
        </Field>
        <div className="row-end">
          <button type="button" className="btn btn-ghost sm" onClick={() => setStoryText(DEMO_STORY_TEXT)}>Use an example</button>
          <AiButton
            label="Generate story"
            busy={busy === 's'}
            onRun={async () => {
              if (!storyText.trim()) return toast('Write a sentence or two first', 'info')
              setBusy('s')
              const text = await ai.story({ text: storyText, bride: inv.couple.bride.name.split(' ')[0], groom: inv.couple.groom.name.split(' ')[0] })
              setBusy('')
              update((i) => ({
                ...i,
                story: [...i.story, { id: `ms_${Date.now()}`, date: new Date().getFullYear().toString(), title: 'Our Story', description: text, photos: [], video: '', location: '' }],
              }))
              toast('Added to your Love Story — edit it there')
            }}
          />
        </div>
      </Card>
    </>
  )
}

/* -------------------------------- Countdown -------------------------------- */

export function CountdownEditor() {
  const { inv, update, go } = useBuilder()
  const target = weddingTarget(inv)
  const left = useCountdown(target)
  const cfg = inv.sections.find((s) => s.id === 'countdown')!
  const setCfg = (patch: Partial<typeof cfg>) =>
    update((i) => ({ ...i, sections: i.sections.map((s) => (s.id === 'countdown' ? { ...s, ...patch } : s)) }))
  return (
    <>
      <PageHead title="Countdown" desc="A live countdown to your wedding ceremony." />
      <Card title="Countdown target">
        <Field label="Wedding date" htmlFor="cd-date">
          <input id="cd-date" type="date" value={inv.weddingDate} onChange={(e) => update({ weddingDate: e.target.value })} />
        </Field>
        <p className="hint">
          Counts down to the start of your event named “Wedding”/“Ceremony” on this date (or 10:00 if none).{' '}
          <button type="button" className="link" onClick={() => go('events')}>Edit events</button>
        </p>
        {target && left ? (
          <div className="mini-count">
            <strong>{inv.weddingDate && `${weekday(inv.weddingDate)}, ${formatDate(inv.weddingDate)}`}</strong>
            <div>
              {[['Days', left.days], ['Hours', left.hours], ['Min', left.minutes], ['Sec', left.seconds]].map(([l, v]) => (
                <span key={l}><b>{String(v).padStart(2, '0')}</b>{l}</span>
              ))}
            </div>
          </div>
        ) : (
          <p className="hint">Pick a date to see your countdown.</p>
        )}
      </Card>
      <Card title="Heading">
        <Field label="Countdown heading">
          <input value={cfg.title} onChange={(e) => setCfg({ title: e.target.value })} />
        </Field>
        <Toggle checked={cfg.visible} onChange={(v) => setCfg({ visible: v })} label="Show countdown on the invitation" />
      </Card>
    </>
  )
}
