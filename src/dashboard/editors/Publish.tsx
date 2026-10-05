import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import QRCode from 'qrcode'
import type { Plan, PricingPlan } from '../../types'
import { Icon } from '../../components/Icon'
import { api, planRank } from '../../lib/db'
import { DEFAULT_PRICING } from '../../data/pricing'
import { appPath, downloadText, inviteUrl, slugify } from '../../lib/util'
import { useAuth, useToast } from '../../context'
import { Card, ConfirmButton, Field, PageHead, Toggle } from '../ui'
import { useBuilder } from '../context'
import { computeProgress, computeTasks, nextTask } from '../progress'

/* ---------------------------------- Overview ---------------------------------- */

function Ring({ pct }: { pct: number }) {
  const r = 38
  const c = 2 * Math.PI * r
  return (
    <svg className="ring-chart" viewBox="0 0 90 90" role="img" aria-label={`${pct}% complete`}>
      <circle cx="45" cy="45" r={r} className="ring-bg" />
      <circle cx="45" cy="45" r={r} className="ring-fg" strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)} transform="rotate(-90 45 45)" />
      <text x="45" y="50" textAnchor="middle">{pct}%</text>
    </svg>
  )
}

export function Overview() {
  const { inv, go, user, setPublished } = useBuilder()
  const [counts, setCounts] = useState({ views: 0, rsvps: 0, pending: 0 })
  const tasks = computeTasks(inv)
  const pct = computeProgress(tasks)
  const next = nextTask(tasks)

  useEffect(() => {
    let alive = true
    Promise.all([api.analytics.list(inv.id), api.rsvps.list(inv.id), api.messages.list(inv.id)]).then(([a, r, m]) => {
      if (alive) setCounts({ views: a.filter((e) => e.kind === 'view').length, rsvps: r.length, pending: m.filter((x) => x.status === 'pending').length })
    })
    return () => {
      alive = false
    }
  }, [inv.id])

  return (
    <>
      <PageHead title={`Welcome back, ${user.name.split(' ')[0]} ❤️`} desc="Here is how your invitation is coming along." />
      <Card className="assistant">
        <div className="assistant-main">
          <Ring pct={pct} />
          <div>
            <p className="eyebrow">Wedding assistant</p>
            <h2>Your invitation is {pct}% complete.</h2>
            <p className="assistant-tip">
              <Icon name="sparkle" size={16} /> {next ? next.tip : 'Everything is in place — your invitation is ready for the world. Congratulations!'}
            </p>
            {next && (
              <button className="btn btn-primary" onClick={() => go(next.tab)}>
                {next.label} <Icon name="right" size={16} />
              </button>
            )}
          </div>
        </div>
        <ul className="checklist">
          {tasks.map((t) => (
            <li key={t.id} className={t.done ? 'done' : ''}>
              <button onClick={() => go(t.tab)}>
                <span className="tick">{t.done && <Icon name="check" size={13} />}</span>
                <span>{t.label}</span>
                <small>{t.done ? t.doneTip : ''}</small>
              </button>
            </li>
          ))}
        </ul>
      </Card>

      <div className="stats">
        <div className="stat"><strong>{counts.views}</strong><span>Invitation views</span></div>
        <div className="stat good"><strong>{counts.rsvps}</strong><span>RSVPs received</span></div>
        <div className={`stat ${counts.pending ? 'warn' : ''}`}><strong>{counts.pending}</strong><span>Messages to review</span></div>
        <div className={`stat ${inv.published ? 'good' : ''}`}><strong>{inv.published ? 'Live' : 'Draft'}</strong><span>Invitation status</span></div>
      </div>

      <div className="two-col">
        <Card title="Quick actions">
          <div className="quick">
            <button onClick={() => go('photos')}><Icon name="image" size={20} />Add photos</button>
            <button onClick={() => go('events')}><Icon name="calendar" size={20} />Add events</button>
            <button onClick={() => go('theme')}><Icon name="flower" size={20} />Change theme</button>
            <button onClick={() => go('share')}><Icon name="share" size={20} />Share</button>
          </div>
        </Card>
        <Card title={inv.published ? 'Your invitation is live' : 'Ready to go live?'}>
          <p className="hint">{inv.published ? 'Guests can open your link right now.' : 'Publishing creates your private shareable link. You can unpublish at any time.'}</p>
          <button className={`btn ${inv.published ? 'btn-ghost' : 'btn-primary'}`} onClick={() => void setPublished(!inv.published)}>
            <Icon name={inv.published ? 'eyeoff' : 'rocket'} size={16} /> {inv.published ? 'Unpublish' : 'Publish invitation'}
          </button>
        </Card>
      </div>
    </>
  )
}

/* ------------------------------------ Share ------------------------------------ */

export function ShareEditor() {
  const { inv, update, setPublished, limits, go } = useBuilder()
  const toast = useToast()
  const url = inviteUrl(inv.slug)
  const [qr, setQr] = useState('')
  const [slug, setSlug] = useState(inv.slug)
  const [slugState, setSlugState] = useState<'' | 'ok' | 'taken' | 'invalid'>('')

  useEffect(() => {
    QRCode.toDataURL(url, { margin: 1, width: 420, color: { dark: '#1f1a1d', light: '#ffffff' } }).then(setQr).catch(() => setQr(''))
  }, [url])

  const text = `You are invited to our wedding! ${url}`
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      toast('Link copied')
    } catch {
      toast('Copy failed — please copy the link manually', 'error')
    }
  }

  const checkSlug = async (v: string) => {
    const s = slugify(v)
    setSlug(s)
    if (s.length < 3) return setSlugState('invalid')
    setSlugState((await api.invitations.slugAvailable(s, inv.id)) ? 'ok' : 'taken')
  }

  return (
    <>
      <PageHead title="Share" desc="Send your invitation to family and friends." />
      <Card title="Publish status" actions={<span className={`pill ${inv.published ? 'yes' : 'maybe'}`}>{inv.published ? 'Live' : 'Draft'}</span>}>
        <p className="hint">{inv.published ? 'Anyone with your link can open your invitation (unless you made it private).' : 'Your invitation is a draft. Publish it so guests can open the link.'}</p>
        <div className="row-end">
          <a className="btn btn-ghost" href={appPath(`/invite/${inv.slug}`)} target="_blank" rel="noopener noreferrer"><Icon name="external" size={16} /> Open full page</a>
          <button className={`btn ${inv.published ? 'btn-ghost' : 'btn-primary'}`} onClick={() => void setPublished(!inv.published)}>{inv.published ? 'Unpublish' : 'Publish invitation'}</button>
        </div>
      </Card>
      <Card title="Your invitation link">
        <div className="share-url">
          <Icon name="link" size={16} />
          <input readOnly value={url} aria-label="Invitation link" onFocus={(e) => e.currentTarget.select()} />
          <button className="btn btn-primary sm" onClick={copy}>Copy</button>
        </div>
        <Field label="Customise your link" tip="Letters, numbers and dashes only." hint={limits.customSlug ? undefined : 'Custom links are part of Premium.'} error={slugState === 'taken' ? 'That link is already taken.' : slugState === 'invalid' ? 'Use at least 3 letters or numbers.' : undefined}>
          <div className="slug-row">
            <span>{location.host}{appPath("/invite/")}</span>
            <input value={slug} disabled={!limits.customSlug} onChange={(e) => void checkSlug(e.target.value)} aria-label="Custom link" />
            <button className="btn btn-ghost sm" disabled={!limits.customSlug || slugState !== 'ok'} onClick={() => { update({ slug }); setSlugState(''); toast('Link updated') }}>Save</button>
          </div>
          {!limits.customSlug && <button className="link" onClick={() => go('settings')}>Upgrade to customise</button>}
        </Field>
      </Card>
      <div className="two-col">
        <Card title="Share on">
          <div className="share-grid">
            {[
              { l: 'WhatsApp', i: 'whatsapp' as const, h: `https://wa.me/?text=${encodeURIComponent(text)}` },
              { l: 'Facebook', i: 'facebook' as const, h: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}` },
              { l: 'Telegram', i: 'telegram' as const, h: `https://t.me/share/url?url=${encodeURIComponent(url)}` },
              { l: 'Email', i: 'mail' as const, h: `mailto:?subject=${encodeURIComponent('You are invited!')}&body=${encodeURIComponent(text)}` },
            ].map((s) => (
              <a key={s.l} className="share-item" href={s.h} target="_blank" rel="noopener noreferrer">
                <span className="share-ico"><Icon name={s.i} size={22} /></span>{s.l}
              </a>
            ))}
            <button className="share-item" onClick={async () => { await copy(); window.open('https://www.instagram.com/', '_blank', 'noopener') }}>
              <span className="share-ico"><Icon name="instagram" size={22} /></span>Instagram
            </button>
            <button className="share-item" onClick={copy}><span className="share-ico"><Icon name="link" size={22} /></span>Copy link</button>
          </div>
        </Card>
        <Card title="QR code">
          <div className="qr big">
            {qr ? <img src={qr} alt={`QR code for ${url}`} width={180} height={180} /> : <div className="skeleton" style={{ width: 180, height: 180 }} />}
            <div>
              <p className="hint">Print it on save-the-dates, invitations or table cards.</p>
              {qr && <a className="btn btn-ghost sm" href={qr} download={`${inv.slug}-qr.png`}><Icon name="download" size={14} /> Download PNG</a>}
            </div>
          </div>
        </Card>
      </div>
    </>
  )
}

/* ---------------------------------- Settings ---------------------------------- */

export function SettingsEditor() {
  const { inv, update, user, refreshUser } = useBuilder()
  const { logout } = useAuth()
  const nav = useNavigate()
  const toast = useToast()
  const [plans, setPlans] = useState<PricingPlan[]>(DEFAULT_PRICING)
  const [name, setName] = useState(user.name)

  useEffect(() => {
    api.settings.get().then((s) => setPlans(s.pricing))
  }, [])

  const setPrivacy = (p: Partial<typeof inv.privacy>) => update((i) => ({ ...i, privacy: { ...i.privacy, ...p } }))

  const exportData = async () => {
    const data = await api.exportAll(user.id)
    downloadText('my-wedding-data.json', JSON.stringify(data, null, 2), 'application/json')
    toast('Your data was exported')
  }

  const changePlan = async (plan: Plan) => {
    await api.auth.updateUser(user.id, { plan })
    await refreshUser()
    toast(`You are now on the ${plan[0].toUpperCase() + plan.slice(1)} plan (demo — no payment taken)`)
  }

  return (
    <>
      <PageHead title="Settings" desc="Privacy, plan and your account." />
      <Card title="Privacy">
        <Segmented2 value={inv.privacy.visibility} onChange={(v) => setPrivacy({ visibility: v })} />
        <Field label="Password protection (optional)" tip="Guests must enter this password before they can view the invitation." hint="Share the password with guests along with the link. Leave empty for no password.">
          <input type="text" value={inv.privacy.password} onChange={(e) => setPrivacy({ password: e.target.value })} placeholder="e.g. forever2026" autoComplete="off" />
        </Field>
        <Toggle checked={inv.privacy.moderateMessages} onChange={(v) => setPrivacy({ moderateMessages: v })} label="Approve guestbook messages first" />
        <p className="hint"><Icon name="shield" size={14} /> RSVPs and guest contact details are never shown publicly — only you can see them.</p>
      </Card>

      <Card title="Your plan" hint="Demo mode: switching plans is instant and free. Prices are editable from the admin panel.">
        <div className="plan-row">
          {plans.map((p) => (
            <button key={p.id} className={`plan-card ${user.plan === p.id ? 'on' : ''}`} onClick={() => void changePlan(p.id)}>
              <strong>{p.name}</strong>
              <span>{p.price === 0 ? 'Free' : `$${p.price}`}</span>
              <small>{user.plan === p.id ? 'Current plan' : planRank[p.id] > planRank[user.plan] ? 'Upgrade' : 'Switch'}</small>
            </button>
          ))}
        </div>
      </Card>

      <Card title="Account">
        <div className="inline-form">
          <input value={name} onChange={(e) => setName(e.target.value)} aria-label="Display name" />
          <button className="btn btn-ghost sm" disabled={!name.trim() || name === user.name} onClick={async () => { await api.auth.updateUser(user.id, { name: name.trim() }); await refreshUser(); toast('Name updated') }}>Save</button>
        </div>
        <p className="hint">Signed in as {user.email} ({user.provider === 'google' ? 'Google' : 'email & password'})</p>
        <div className="row-end">
          <button className="btn btn-ghost" onClick={exportData}><Icon name="download" size={16} /> Export my data</button>
          <button className="btn btn-ghost" onClick={async () => { await logout(); nav('/') }}><Icon name="logout" size={16} /> Log out</button>
        </div>
      </Card>

      <Card title="Danger zone" className="danger-card">
        <div className="danger-row">
          <div><strong>Delete this invitation</strong><p className="hint">Removes the invitation, its photos, RSVPs and messages permanently.</p></div>
          <ConfirmButton label="Delete invitation" confirmLabel="Yes, delete it" onConfirm={async () => { await api.invitations.remove(inv.id); toast('Invitation deleted'); window.location.assign(appPath("/dashboard")) }} />
        </div>
        <div className="danger-row">
          <div><strong>Delete my account</strong><p className="hint">Deletes your account and everything in it. This cannot be undone.</p></div>
          <ConfirmButton label="Delete account" confirmLabel="Yes, delete everything" onConfirm={async () => { await api.auth.deleteAccount(user.id); await logout(); nav('/') }} />
        </div>
      </Card>
    </>
  )
}

function Segmented2({ value, onChange }: { value: 'public' | 'private'; onChange(v: 'public' | 'private'): void }) {
  return (
    <div className="radio-cards" role="radiogroup" aria-label="Who can view the invitation">
      {([
        ['public', 'globe', 'Public', 'Anyone with your link can view it once published.'],
        ['private', 'lock', 'Private', 'Only you can view it. Guests see a private notice.'],
      ] as const).map(([v, icon, t, d]) => (
        <label key={v} className={value === v ? 'on' : ''}>
          <input type="radio" name="vis" checked={value === v} onChange={() => onChange(v)} />
          <Icon name={icon} size={20} />
          <strong>{t}</strong>
          <small>{d}</small>
        </label>
      ))}
    </div>
  )
}
