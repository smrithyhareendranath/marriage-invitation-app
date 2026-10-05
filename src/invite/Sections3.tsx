import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import QRCode from 'qrcode'
import type { GuestMessage, SectionConfig } from '../types'
import { Img } from '../components/Img'
import { Icon } from '../components/Icon'
import type { IconName } from '../components/Icon'
import { api } from '../lib/db'
import { useMediaSrc } from '../lib/media'
import { formatDate, parseVideo, timeAgo, weekday } from '../lib/util'
import { useToast } from '../context'
import { HeartButton, Reveal, RevealText, Section, coupleNames, Ornament } from './parts'
import { useInvite } from './context'
import { useParallax } from './Sections1'

/* --------------------------------- Family --------------------------------- */

export function Family({ cfg }: { cfg: SectionConfig }) {
  const { inv } = useInvite()
  const f = inv.family
  const hasAny = f.brideParents || f.groomParents || f.members.length || f.note
  if (!hasAny) return null
  const sides = [
    { key: 'groom' as const, label: 'Family of the Groom', parents: f.groomParents },
    { key: 'bride' as const, label: 'Family of the Bride', parents: f.brideParents },
  ]
  return (
    <Section cfg={{ ...cfg, title: f.heading || cfg.title }} decor={inv.custom.decor}>
      <div className="family-grid">
        {sides.map((s, i) => {
          const members = f.members.filter((m) => m.side === s.key)
          return (
            <Reveal key={s.key} variant={i ? 'right' : 'left'} className="family-side glass">
              <p className="role">{s.label}</p>
              {s.parents && <h3>{s.parents}</h3>}
              {members.length > 0 && (
                <ul className="family-members">
                  {members.map((m) => (
                    <li key={m.id}>
                      <Img src={m.photo} alt={m.name} thumb className="avatar" empty={<Icon name="user" size={22} />} />
                      <strong>{m.name}</strong>
                      <span>{m.relation}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Reveal>
          )
        })}
      </div>
      {f.note && (
        <Reveal variant="fade" delay={200}>
          <p className="family-note">{f.note}</p>
        </Reveal>
      )}
    </Section>
  )
}

/* ---------------------------------- Video ---------------------------------- */

function VideoCard({ title, url }: { title: string; url: string }) {
  const v = parseVideo(url)
  const [play, setPlay] = useState(false)
  const file = useMediaSrc(v?.kind === 'upload' ? v.embed : '')
  if (!v) return null
  const thumb = v.kind === 'youtube' ? `https://i.ytimg.com/vi/${v.embed.split('/').pop()}/hqdefault.jpg` : ''
  return (
    <Reveal variant="zoom" className="video-card glass">
      <div className="video-frame">
        {v.kind === 'upload' ? (
          <video src={file} controls preload="metadata" playsInline />
        ) : play ? (
          <iframe
            src={`${v.embed}${v.embed.includes('?') ? '&' : '?'}autoplay=1`}
            title={title}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
          />
        ) : (
          <button className="video-poster" onClick={() => setPlay(true)} aria-label={`Play video: ${title}`}>
            {thumb ? <img src={thumb} alt="" loading="lazy" /> : <span className="vp-bg" />}
            <span className="play-badge">
              <Icon name="play" size={28} filled />
            </span>
          </button>
        )}
      </div>
      <h3>{title}</h3>
    </Reveal>
  )
}

export function Videos({ cfg }: { cfg: SectionConfig }) {
  const { inv } = useInvite()
  const vids = inv.videos.filter((v) => parseVideo(v.url))
  if (!vids.length) return null
  return (
    <Section cfg={cfg} decor={inv.custom.decor}>
      <div className="videos">
        {vids.map((v) => (
          <VideoCard key={v.id} title={v.title || 'Video'} url={v.url} />
        ))}
      </div>
    </Section>
  )
}

/* ----------------------------------- RSVP ----------------------------------- */

const isContact = (v: string) => /^\S+@\S+\.\S+$/.test(v.trim()) || /^[+\d][\d\s().-]{6,}$/.test(v.trim())

export function Rsvp({ cfg }: { cfg: SectionConfig }) {
  const { inv, mode, track } = useInvite()
  const [form, setForm] = useState({
    name: '',
    contact: '',
    attending: 'yes' as 'yes' | 'no' | 'maybe',
    guests: 1,
    meal: inv.mealOptions[0] ?? '',
    message: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const toast = useToast()
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => {
    setForm((f) => ({ ...f, [k]: v }))
    setErrors((e) => ({ ...e, [k]: '' }))
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const err: Record<string, string> = {}
    if (form.name.trim().length < 2) err.name = 'Please tell us your name.'
    if (!isContact(form.contact)) err.contact = 'Enter a valid phone number or email.'
    setErrors(err)
    if (Object.keys(err).length) return
    setBusy(true)
    try {
      if (mode === 'public') {
        await api.rsvps.submit({
          invitationId: inv.id,
          name: form.name.trim(),
          contact: form.contact.trim(),
          attending: form.attending,
          guests: form.attending === 'no' ? 0 : form.guests,
          meal: form.attending === 'no' ? '' : form.meal,
          message: form.message.trim(),
        })
        track('rsvp')
      } else await new Promise((r) => setTimeout(r, 500))
      setDone(true)
    } catch (x) {
      toast(x instanceof Error ? x.message : 'Could not send your RSVP. Please try again.', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Section cfg={cfg} decor={inv.custom.decor}>
      <Reveal variant="up" className="rsvp-card glass">
        {done ? (
          <div className="rsvp-done" role="status">
            <span className="big-heart">
              <Icon name="heart" size={44} filled />
            </span>
            <h3>Thank you for celebrating with us ❤️</h3>
            <p>
              {form.attending === 'no'
                ? 'We will miss you, but we are grateful for your love.'
                : 'Your response has been shared with the couple.'}
            </p>
            {mode === 'preview' && <p className="hint">Preview mode: this response was not saved.</p>}
            <button className="btn btn-ghost" onClick={() => setDone(false)}>
              Edit response
            </button>
          </div>
        ) : (
          <form onSubmit={submit} noValidate>
            <div className="field">
              <label htmlFor="rsvp-name">Your name</label>
              <input id="rsvp-name" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Priya Menon" autoComplete="name" aria-invalid={!!errors.name} />
              {errors.name && <small className="err">{errors.name}</small>}
            </div>
            <div className="field">
              <label htmlFor="rsvp-contact">Phone or email</label>
              <input id="rsvp-contact" value={form.contact} onChange={(e) => set('contact', e.target.value)} placeholder="So the couple can reach you" autoComplete="email" inputMode="email" aria-invalid={!!errors.contact} />
              {errors.contact && <small className="err">{errors.contact}</small>}
            </div>

            <fieldset className="field">
              <legend>Will you attend?</legend>
              <div className="seg" role="radiogroup">
                {(
                  [
                    ['yes', 'Joyfully yes'],
                    ['maybe', 'Maybe'],
                    ['no', 'Sadly no'],
                  ] as const
                ).map(([v, l]) => (
                  <label key={v} className={form.attending === v ? 'on' : ''}>
                    <input type="radio" name="attending" checked={form.attending === v} onChange={() => set('attending', v)} />
                    {l}
                  </label>
                ))}
              </div>
            </fieldset>

            {form.attending !== 'no' && (
              <div className="field-row">
                <div className="field">
                  <label htmlFor="rsvp-guests">Number of guests</label>
                  <div className="stepper">
                    <button type="button" onClick={() => set('guests', Math.max(1, form.guests - 1))} aria-label="Fewer guests">
                      −
                    </button>
                    <output id="rsvp-guests">{form.guests}</output>
                    <button type="button" onClick={() => set('guests', Math.min(10, form.guests + 1))} aria-label="More guests">
                      +
                    </button>
                  </div>
                </div>
                {inv.mealOptions.length > 0 && (
                  <div className="field">
                    <label htmlFor="rsvp-meal">Meal preference</label>
                    <select id="rsvp-meal" value={form.meal} onChange={(e) => set('meal', e.target.value)}>
                      {inv.mealOptions.map((m) => (
                        <option key={m}>{m}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}

            <div className="field">
              <label htmlFor="rsvp-msg">Message for the couple (optional)</label>
              <textarea id="rsvp-msg" rows={3} value={form.message} onChange={(e) => set('message', e.target.value)} placeholder="Share a wish or a memory…" maxLength={500} />
            </div>
            <button className="btn btn-primary block" disabled={busy}>
              {busy ? 'Sending…' : 'Send RSVP'}
            </button>
          </form>
        )}
      </Reveal>
    </Section>
  )
}

/* -------------------------------- Guestbook -------------------------------- */

const HEARTED_KEY = 'mia.v1.hearted'
const readHearted = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem(HEARTED_KEY) ?? '[]') as string[]
  } catch {
    return []
  }
}

export function Guestbook({ cfg }: { cfg: SectionConfig }) {
  const { inv, mode } = useInvite()
  const toast = useToast()
  const [msgs, setMsgs] = useState<GuestMessage[]>([])
  const [form, setForm] = useState({ name: '', text: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState<'' | 'pending' | 'live'>('')
  const [hearted, setHearted] = useState<string[]>(readHearted)

  useEffect(() => {
    let alive = true
    api.messages.approved(inv.id).then((m) => alive && setMsgs(m))
    return () => {
      alive = false
    }
  }, [inv.id])

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (form.name.trim().length < 2 || form.text.trim().length < 3) {
      setError('Please add your name and a short message.')
      return
    }
    setError('')
    setBusy(true)
    try {
      if (mode === 'public') {
        const rec = await api.messages.submit(
          { invitationId: inv.id, name: form.name.trim(), text: form.text.trim() },
          inv.privacy.moderateMessages,
        )
        if (rec.status === 'approved') setMsgs((m) => [rec, ...m])
        setSent(rec.status === 'approved' ? 'live' : 'pending')
      } else {
        await new Promise((r) => setTimeout(r, 400))
        setSent(inv.privacy.moderateMessages ? 'pending' : 'live')
      }
      setForm({ name: '', text: '' })
    } catch (x) {
      toast(x instanceof Error ? x.message : 'Could not send your message.', 'error')
    } finally {
      setBusy(false)
    }
  }

  const heart = async (m: GuestMessage) => {
    if (hearted.includes(m.id)) return
    const next = [...hearted, m.id]
    setHearted(next)
    try {
      localStorage.setItem(HEARTED_KEY, JSON.stringify(next))
    } catch {
      /* ignore */
    }
    setMsgs((l) => l.map((x) => (x.id === m.id ? { ...x, hearts: x.hearts + 1 } : x)))
    if (mode === 'public') await api.messages.heart(m.id)
  }

  return (
    <Section cfg={cfg} decor={inv.custom.decor}>
      <div className="guestbook">
        <Reveal variant="up" className="gb-form glass">
          {sent ? (
            <div className="rsvp-done" role="status">
              <span className="big-heart">
                <Icon name="heart" size={36} filled />
              </span>
              <h3>Thank you for your wishes!</h3>
              <p>
                {sent === 'pending'
                  ? 'Your message will appear once the couple has approved it.'
                  : 'Your message is now on the wall.'}
              </p>
              <button className="btn btn-ghost" onClick={() => setSent('')}>
                Write another
              </button>
            </div>
          ) : (
            <form onSubmit={submit} noValidate>
              <div className="field">
                <label htmlFor="gb-name">Your name</label>
                <input id="gb-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="How should we sign it?" maxLength={60} />
              </div>
              <div className="field">
                <label htmlFor="gb-text">Your wishes</label>
                <textarea id="gb-text" rows={4} value={form.text} onChange={(e) => setForm({ ...form, text: e.target.value })} placeholder="Write a congratulation, a blessing or a memory…" maxLength={600} />
              </div>
              {error && <small className="err">{error}</small>}
              <button className="btn btn-primary block" disabled={busy}>
                <Icon name="heart" size={16} filled /> {busy ? 'Sending…' : 'Send your wishes'}
              </button>
            </form>
          )}
        </Reveal>

        <div className="gb-list">
          {msgs.length === 0 && <p className="empty-note">Be the first to leave a message for the couple ✨</p>}
          {msgs.map((m, i) => (
            <Reveal key={m.id} variant="up" delay={(i % 3) * 70} className="gb-msg glass">
              <p className="gb-text">“{m.text}”</p>
              <footer>
                <span>
                  <strong>{m.name}</strong> · {timeAgo(m.createdAt)}
                </span>
                <HeartButton count={m.hearts} hearted={hearted.includes(m.id)} onHeart={() => heart(m)} />
              </footer>
            </Reveal>
          ))}
        </div>
      </div>
    </Section>
  )
}

/* ---------------------------------- Thanks ---------------------------------- */

export function Thanks({ cfg }: { cfg: SectionConfig }) {
  const { inv, scrollTo } = useInvite()
  const { groom, bride } = coupleNames(inv)
  const bg = useParallax<HTMLDivElement>(0.14)
  return (
    <section id="sec-thanks" className="sec sec-thanks" style={cfg.background ? { background: cfg.background } : undefined}>
      <div className="thanks-bg" ref={bg}>
        <Img src={inv.closing.photo || inv.heroPhoto} alt="" motion="kenburns" empty={<span />} />
      </div>
      <div className="thanks-veil" />
      <div className="sec-inner thanks-inner">
        <Reveal variant="zoom">
          <span className="big-heart float">
            <Icon name="heart" size={46} filled />
          </span>
        </Reveal>
        <blockquote className="closing-quote">
          {inv.closing.quote.split('\n').map((l, i) => (
            <Reveal key={i} variant="up" delay={i * 180} as="span" className="cq-line">
              {l}
            </Reveal>
          ))}
        </blockquote>
        <Reveal variant="fade" delay={500}>
          <p className="closing-thanks">{inv.closing.thanks}</p>
        </Reveal>
        <h2 className="closing-names">
          <RevealText text={`${groom.split(' ')[0]} & ${bride.split(' ')[0]}`} />
        </h2>
        {inv.weddingDate && (
          <p className="closing-date">
            {weekday(inv.weddingDate)}, {formatDate(inv.weddingDate)}
          </p>
        )}
        <button className="btn btn-light" onClick={() => scrollTo('sec-share')}>
          <Icon name="share" size={16} /> Share our joy
        </button>
      </div>
    </section>
  )
}

/* ----------------------------------- Share ----------------------------------- */

export function Share({ cfg }: { cfg: SectionConfig }) {
  const { inv, shareUrl, track, mode } = useInvite()
  const toast = useToast()
  const { groom, bride } = coupleNames(inv)
  const [qr, setQr] = useState('')
  const title = `${groom.split(' ')[0]} & ${bride.split(' ')[0]} are getting married!`
  const text = `${title} Join us in celebrating${inv.weddingDate ? ` on ${formatDate(inv.weddingDate)}` : ''}. ${shareUrl}`

  useEffect(() => {
    let alive = true
    QRCode.toDataURL(shareUrl, { margin: 1, width: 320, color: { dark: '#1f1a1d', light: '#ffffff' } })
      .then((u) => alive && setQr(u))
      .catch(() => alive && setQr(''))
    return () => {
      alive = false
    }
  }, [shareUrl])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      toast('Invitation link copied')
    } catch {
      toast('Copy failed — select the link and copy it manually', 'error')
    }
    track('share_other')
  }

  const items: { id: string; label: string; icon: IconName; href?: string; onClick?: () => void; kind: 'wa' | 'other' }[] = [
    { id: 'wa', label: 'WhatsApp', icon: 'whatsapp', href: `https://wa.me/?text=${encodeURIComponent(text)}`, kind: 'wa' },
    {
      id: 'ig',
      label: 'Instagram',
      icon: 'instagram',
      kind: 'other',
      onClick: async () => {
        await navigator.clipboard?.writeText(shareUrl).catch(() => undefined)
        toast('Link copied — paste it into your Instagram story or message')
        window.open('https://www.instagram.com/', '_blank', 'noopener')
      },
    },
    { id: 'fb', label: 'Facebook', icon: 'facebook', href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, kind: 'other' },
    { id: 'tg', label: 'Telegram', icon: 'telegram', href: `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(title)}`, kind: 'other' },
    { id: 'mail', label: 'Email', icon: 'mail', href: `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(text)}`, kind: 'other' },
    { id: 'copy', label: 'Copy link', icon: 'link', onClick: copy, kind: 'other' },
  ]

  const nativeShare = typeof navigator !== 'undefined' && 'share' in navigator

  return (
    <Section cfg={cfg} decor={inv.custom.decor}>
      <Reveal variant="up" className="share-card glass">
        <div className="share-url">
          <Icon name="link" size={16} />
          <input readOnly value={shareUrl} aria-label="Invitation link" onFocus={(e) => e.currentTarget.select()} />
          <button className="btn btn-primary sm" onClick={copy}>
            Copy
          </button>
        </div>
        <div className="share-grid">
          {items.map((it) => {
            const inner = (
              <>
                <span className="share-ico">
                  <Icon name={it.icon} size={22} />
                </span>
                <span>{it.label}</span>
              </>
            )
            const track_ = () => track(it.kind === 'wa' ? 'share_whatsapp' : 'share_other')
            return it.href ? (
              <a key={it.id} className="share-item" href={it.href} target="_blank" rel="noopener noreferrer" onClick={track_}>
                {inner}
              </a>
            ) : (
              <button
                key={it.id}
                className="share-item"
                onClick={() => {
                  if (it.id !== 'copy') track_()
                  it.onClick?.()
                }}
              >
                {inner}
              </button>
            )
          })}
        </div>
        {nativeShare && (
          <button
            className="btn btn-ghost block"
            onClick={() => {
              track('share_other')
              navigator.share({ title, text, url: shareUrl }).catch(() => undefined)
            }}
          >
            <Icon name="share" size={16} /> More ways to share
          </button>
        )}
        <div className="qr">
          {qr ? <img src={qr} alt={`QR code that opens the invitation at ${shareUrl}`} width={160} height={160} /> : <div className="skeleton" style={{ width: 160, height: 160 }} />}
          <div>
            <h4>Scan to open</h4>
            <p>Print it on your save-the-dates or show it at the venue.</p>
            {qr && (
              <a className="btn btn-ghost sm" href={qr} download={`${inv.slug || 'invitation'}-qr.png`}>
                <Icon name="download" size={14} /> Download QR
              </a>
            )}
          </div>
        </div>
        {mode === 'preview' && !inv.published && <p className="hint">Publish your invitation to activate this link.</p>}
      </Reveal>
      <footer className="invite-foot">
        <Ornament decor={inv.custom.decor} />
        <p>Made with love · Marriage Invitation App</p>
      </footer>
    </Section>
  )
}
