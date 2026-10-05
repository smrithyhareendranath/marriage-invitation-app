import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { THEMES, customFromTheme } from '../data/themes'
import type { Invitation } from '../types'
import { api, isUnlocked, tryUnlock } from '../lib/db'
import { useAuth } from '../context'
import { InvitationView } from '../invite/InvitationView'
import { Icon } from '../components/Icon'
import { setMeta } from '../hooks'
import { formatDate } from '../lib/util'
import { themeVars } from '../lib/color'
import type { CSSProperties } from 'react'

function Notice({ icon, title, children }: { icon: 'lock' | 'heart' | 'alert'; title: string; children?: React.ReactNode }) {
  return (
    <main className="notice-page">
      <div className="notice glass">
        <span className="notice-ico">
          <Icon name={icon} size={30} />
        </span>
        <h1>{title}</h1>
        {children}
        <Link className="btn btn-ghost" to="/">
          Create your own invitation
        </Link>
      </div>
    </main>
  )
}

export function InvitePage() {
  const { slug = '' } = useParams()
  const themeParam = useSearchParams()[0].get('theme')
  const { user } = useAuth()
  const [inv, setInv] = useState<Invitation | null | undefined>(undefined)
  const [unlocked, setUnlocked] = useState(false)
  const [pw, setPw] = useState('')
  const [pwError, setPwError] = useState('')

  useEffect(() => {
    let alive = true
    setInv(undefined)
    api.invitations.bySlug(slug).then((i) => {
      if (!alive) return
      // the landing page lets visitors try any theme on the featured demo invitation
      const t = THEMES.find((x) => x.id === themeParam)
      if (i && t && i.featured) i = { ...i, custom: customFromTheme(t) }
      setInv(i)
      if (i) setUnlocked(isUnlocked(i))
    })
    return () => {
      alive = false
    }
  }, [slug, themeParam])

  const isOwner = !!inv && !!user && (user.id === inv.ownerId || user.role === 'admin')
  const visible = !!inv && (isOwner || (inv.published && inv.privacy.visibility === 'public'))
  const accessible = visible && (isOwner || unlocked)

  // page title + social preview tags (crawlers need server-side rendering – see README)
  useEffect(() => {
    if (!inv || !visible) return
    const names = `${inv.couple.groom.name.split(' ')[0]} & ${inv.couple.bride.name.split(' ')[0]}`
    const desc = `${names} are getting married${inv.weddingDate ? ` on ${formatDate(inv.weddingDate)}` : ''}. You are invited!`
    const prev = document.title
    document.title = `${names} · Wedding Invitation`
    setMeta('description', desc)
    setMeta('og:title', `${names} are getting married`, 'property')
    setMeta('og:description', desc, 'property')
    setMeta('og:type', 'website', 'property')
    setMeta('og:url', location.href, 'property')
    if (inv.heroPhoto.startsWith('http')) setMeta('og:image', inv.heroPhoto, 'property')
    setMeta('twitter:card', 'summary_large_image')
    setMeta('robots', inv.privacy.visibility === 'public' && !inv.privacy.password ? 'index,follow' : 'noindex,nofollow')
    return () => {
      document.title = prev
    }
  }, [inv, visible])

  // count one view per browser session
  useEffect(() => {
    if (!inv || !accessible || isOwner) return
    const key = `mia.v1.viewed.${inv.id}`
    try {
      if (sessionStorage.getItem(key)) return
      sessionStorage.setItem(key, '1')
    } catch {
      /* count anyway */
    }
    void api.analytics.track(inv.id, 'view')
  }, [inv, accessible, isOwner])

  if (inv === undefined) {
    return (
      <div className="page-loading" role="status" aria-label="Loading invitation">
        <span className="big-heart float">
          <Icon name="heart" size={40} filled />
        </span>
      </div>
    )
  }
  if (!inv) return <Notice icon="alert" title="Invitation not found">
      <p>This link may have been mistyped, or the couple has removed their invitation.</p>
    </Notice>
  if (!visible)
    return (
      <Notice icon="lock" title="This invitation is private">
        <p>The couple has not published this invitation yet, or has made it private. Please check back soon.</p>
      </Notice>
    )

  if (!accessible) {
    const submit = (e: FormEvent) => {
      e.preventDefault()
      if (tryUnlock(inv, pw)) setUnlocked(true)
      else setPwError('That password is not correct.')
    }
    return (
      <main className="notice-page" style={themeVars(inv.custom) as CSSProperties}>
        <form className="notice glass" onSubmit={submit}>
          <span className="notice-ico">
            <Icon name="lock" size={30} />
          </span>
          <h1>
            {inv.couple.groom.name.split(' ')[0]} & {inv.couple.bride.name.split(' ')[0]}
          </h1>
          <p>This invitation is password protected. Enter the password you received from the couple.</p>
          <div className="field">
            <label htmlFor="inv-pw">Password</label>
            <input id="inv-pw" type="password" autoFocus value={pw} onChange={(e) => { setPw(e.target.value); setPwError('') }} aria-invalid={!!pwError} />
            {pwError && <small className="err">{pwError}</small>}
          </div>
          <button className="btn btn-primary block">Open invitation</button>
        </form>
      </main>
    )
  }

  return (
    <>
      {isOwner && (!inv.published || inv.privacy.visibility === 'private') && (
        <div className="owner-banner">
          <Icon name="eye" size={16} /> Only you can see this — it is {inv.published ? 'private' : 'not published yet'}.{' '}
          <Link to="/dashboard">Back to dashboard</Link>
        </div>
      )}
      <InvitationView inv={inv} mode="public" />
    </>
  )
}
