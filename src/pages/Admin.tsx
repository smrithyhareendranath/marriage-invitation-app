import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import type { AnalyticsEvent, GuestMessage, Invitation, Plan, PricingPlan, Rsvp, User } from '../types'
import { Icon } from '../components/Icon'
import type { IconName } from '../components/Icon'
import { useAuth, useToast } from '../context'
import { api } from '../lib/db'
import type { Settings } from '../lib/db'
import { THEMES } from '../data/themes'
import { mediaStore, formatBytes } from '../lib/media'
import { countPhotos } from '../dashboard/context'
import { LineChart, BarList } from '../dashboard/charts'
import { Card, ConfirmButton, EmptyState, Field, PageHead } from '../dashboard/ui'
import { timeAgo } from '../lib/util'
import { useTitle } from '../hooks'

type Tab = 'overview' | 'users' | 'invitations' | 'themes' | 'pricing' | 'reports' | 'subscriptions' | 'storage'
const TABS: { id: Tab; label: string; icon: IconName }[] = [
  { id: 'overview', label: 'Overview', icon: 'chart' },
  { id: 'users', label: 'Users', icon: 'users' },
  { id: 'invitations', label: 'Invitations', icon: 'mail' },
  { id: 'themes', label: 'Themes & templates', icon: 'flower' },
  { id: 'pricing', label: 'Pricing', icon: 'dollar' },
  { id: 'subscriptions', label: 'Subscriptions', icon: 'star' },
  { id: 'reports', label: 'Reported content', icon: 'alert' },
  { id: 'storage', label: 'Storage', icon: 'folder' },
]

interface Data {
  users: User[]
  invs: Invitation[]
  rsvps: Rsvp[]
  stats: AnalyticsEvent[]
  reported: GuestMessage[]
  settings: Settings
}

export function Admin() {
  useTitle('Admin · Marriage Invitation App')
  const { user, loading, logout } = useAuth()
  const nav = useNavigate()
  const toast = useToast()
  const [tab, setTab] = useState<Tab>('overview')
  const [d, setD] = useState<Data | null>(null)
  const [bytes, setBytes] = useState(0)
  const [navOpen, setNavOpen] = useState(false)

  const load = useCallback(async () => {
    const [users, invs, rsvps, stats, reported, settings] = await Promise.all([
      api.auth.listUsers(), api.invitations.all(), api.rsvps.all(), api.analytics.all(), api.messages.reported(), api.settings.get(),
    ])
    setD({ users, invs, rsvps, stats, reported, settings })
    setBytes(await mediaStore.usage().catch(() => 0))
  }, [])

  useEffect(() => {
    if (user?.role === 'admin') void load()
  }, [user, load])

  if (loading) return <div className="page-loading" />
  if (!user) return <Navigate to="/login" replace state={{ from: '/admin' }} />
  if (user.role !== 'admin') return <Navigate to="/dashboard" replace />

  const ownerName = (id: string) => d?.users.find((u) => u.id === id)?.name ?? 'Unknown'

  return (
    <div className="dash admin">
      {navOpen && <div className="scrim" onClick={() => setNavOpen(false)} />}
      <aside className={`dash-side ${navOpen ? 'open' : ''}`}>
        <Link to="/" className="brand"><Icon name="shield" size={20} /> <span>Admin console</span></Link>
        <nav>
          <div className="nav-group">
            {TABS.map((t) => (
              <button key={t.id} className={tab === t.id ? 'on' : ''} onClick={() => { setTab(t.id); setNavOpen(false) }}>
                <Icon name={t.icon} size={18} /> {t.label}
                {t.id === 'reports' && d && d.reported.length > 0 && <span className="count">{d.reported.length}</span>}
              </button>
            ))}
          </div>
        </nav>
        <div className="side-foot">
          <div className="user"><span className="avatar-dot">A</span><div><strong>{user.name}</strong><small>Administrator</small></div></div>
          <button className="icon-btn" onClick={async () => { await logout(); nav('/') }} aria-label="Log out"><Icon name="logout" size={18} /></button>
        </div>
      </aside>
      <div className="dash-main">
        <header className="dash-top">
          <button className="icon-btn menu-btn" onClick={() => setNavOpen(true)} aria-label="Open menu"><Icon name="menu" size={22} /></button>
          <div className="dash-title"><strong>{TABS.find((t) => t.id === tab)?.label}</strong><small className="save saved"><i /> Platform admin</small></div>
        </header>
        <div className="dash-body">
          <div className="dash-editor wide-editor">
            {!d ? <div className="skeleton" style={{ height: 300 }} /> : (
              <>
                {tab === 'overview' && <AdminOverview d={d} />}
                {tab === 'users' && <Users d={d} reload={load} />}
                {tab === 'invitations' && <Invitations d={d} reload={load} ownerName={ownerName} />}
                {tab === 'themes' && <Themes d={d} reload={load} />}
                {tab === 'pricing' && <Pricing d={d} reload={load} onSaved={() => toast('Pricing updated — the landing page reflects it immediately')} />}
                {tab === 'subscriptions' && <Subscriptions d={d} reload={load} />}
                {tab === 'reports' && <Reports d={d} reload={load} ownerName={ownerName} />}
                {tab === 'storage' && <Storage d={d} bytes={bytes} ownerName={ownerName} />}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------- overview ------------------------------- */

function AdminOverview({ d }: { d: Data }) {
  const days = 14
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  start.setTime(start.getTime() - (days - 1) * 86400000)
  const signups = Array.from({ length: days }, (_, i) => {
    const t0 = start.getTime() + i * 86400000
    return {
      label: new Date(t0).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      value: d.stats.filter((e) => e.kind === 'view' && new Date(e.at).getTime() >= t0 && new Date(e.at).getTime() < t0 + 86400000).length,
    }
  })
  const paid = d.users.filter((u) => u.plan !== 'free').length
  const price = (p: Plan) => d.settings.pricing.find((x) => x.id === p)?.price ?? 0
  const revenue = d.users.reduce((n, u) => n + price(u.plan), 0)
  return (
    <>
      <PageHead title="Platform overview" desc="How the platform is doing right now." />
      <div className="stats">
        <div className="stat"><strong>{d.users.length}</strong><span>Users</span></div>
        <div className="stat"><strong>{d.invs.length}</strong><span>Invitations</span></div>
        <div className="stat good"><strong>{d.invs.filter((i) => i.published).length}</strong><span>Published</span></div>
        <div className="stat"><strong>{d.rsvps.length}</strong><span>RSVPs collected</span></div>
        <div className="stat"><strong>{paid}</strong><span>Paid accounts</span></div>
        <div className="stat good"><strong>${revenue}</strong><span>Lifetime revenue (est.)</span></div>
      </div>
      <Card><LineChart data={signups} title="Invitation views across the platform" /></Card>
      <Card>
        <BarList title="Invitations by theme" data={THEMES.map((t) => ({ label: t.name, value: d.invs.filter((i) => i.custom.themeId === t.id).length })).filter((x) => x.value > 0)} />
      </Card>
    </>
  )
}

/* -------------------------------- users -------------------------------- */

function Users({ d, reload }: { d: Data; reload(): void }) {
  const toast = useToast()
  const { user: me } = useAuth()
  const [q, setQ] = useState('')
  const list = d.users.filter((u) => `${u.name} ${u.email}`.toLowerCase().includes(q.toLowerCase()))
  return (
    <>
      <PageHead title="Users" desc="Manage accounts, plans and access." />
      <Card>
        <label className="search"><Icon name="search" size={16} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search users" aria-label="Search users" /></label>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>User</th><th>Role</th><th>Plan</th><th>Joined</th><th>Status</th><th><span className="sr-only">Actions</span></th></tr></thead>
            <tbody>
              {list.map((u) => (
                <tr key={u.id}>
                  <td data-label="User"><strong>{u.name}</strong><small>{u.email} · {u.provider}</small></td>
                  <td data-label="Role">{u.role}</td>
                  <td data-label="Plan">
                    <select value={u.plan} aria-label={`Plan for ${u.name}`} onChange={async (e) => { await api.auth.updateUser(u.id, { plan: e.target.value as Plan }); toast('Plan updated'); reload() }}>
                      <option value="free">Free</option><option value="premium">Premium</option><option value="luxury">Luxury</option>
                    </select>
                  </td>
                  <td data-label="Joined">{timeAgo(u.createdAt)}</td>
                  <td data-label="Status"><span className={`pill ${u.suspended ? 'no' : 'yes'}`}>{u.suspended ? 'Suspended' : 'Active'}</span></td>
                  <td className="row-actions">
                    {u.id !== me?.id && u.role !== 'admin' && (
                      <>
                        <button className="btn btn-ghost sm" onClick={async () => { await api.auth.updateUser(u.id, { suspended: !u.suspended }); reload() }}>{u.suspended ? 'Reinstate' : 'Suspend'}</button>
                        <ConfirmButton label="" confirmLabel="Delete user?" onConfirm={async () => { await api.auth.deleteAccount(u.id); toast('User deleted'); reload() }} />
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  )
}

/* ----------------------------- invitations ----------------------------- */

function Invitations({ d, reload, ownerName }: { d: Data; reload(): void; ownerName(id: string): string }) {
  const toast = useToast()
  const patch = async (inv: Invitation, p: Partial<Invitation>) => { await api.invitations.save({ ...inv, ...p }); reload() }
  return (
    <>
      <PageHead title="Invitations" desc="Every invitation on the platform." />
      <Card>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Couple</th><th>Owner</th><th>Theme</th><th>Status</th><th>Featured</th><th><span className="sr-only">Actions</span></th></tr></thead>
            <tbody>
              {d.invs.map((i) => (
                <tr key={i.id}>
                  <td data-label="Couple"><strong>{i.couple.groom.name} &amp; {i.couple.bride.name}</strong><small>/invite/{i.slug}</small></td>
                  <td data-label="Owner">{ownerName(i.ownerId)}</td>
                  <td data-label="Theme">{THEMES.find((t) => t.id === i.custom.themeId)?.name}</td>
                  <td data-label="Status"><span className={`pill ${i.published ? 'yes' : 'maybe'}`}>{i.published ? 'Published' : 'Draft'}</span></td>
                  <td data-label="Featured"><input type="checkbox" checked={!!i.featured} onChange={(e) => void patch(i, { featured: e.target.checked })} aria-label={`Feature ${i.slug}`} /></td>
                  <td className="row-actions">
                    <a className="btn btn-ghost sm" href={`/invite/${i.slug}`} target="_blank" rel="noopener noreferrer">View</a>
                    {i.published && <button className="btn btn-ghost sm" onClick={() => void patch(i, { published: false })}>Unpublish</button>}
                    <ConfirmButton label="" confirmLabel="Delete?" onConfirm={async () => { await api.invitations.remove(i.id); toast('Invitation deleted'); reload() }} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  )
}

/* ------------------------------- themes ------------------------------- */

function Themes({ d, reload }: { d: Data; reload(): void }) {
  const toggle = async (key: 'disabledThemes' | 'featuredTemplates', id: string) => {
    const cur = d.settings[key]
    await api.settings.set({ [key]: cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id] })
    reload()
  }
  return (
    <>
      <PageHead title="Themes & featured templates" desc="Disable themes you do not want offered and choose which appear as featured templates." />
      <div className="theme-grid">
        {THEMES.map((t) => {
          const off = d.settings.disabledThemes.includes(t.id)
          const feat = d.settings.featuredTemplates.includes(t.id)
          return (
            <div key={t.id} className={`theme-card static ${off ? 'locked' : ''}`}>
              <span className="theme-swatch" style={{ background: t.cover }}><i style={{ background: t.primary }} /><i style={{ background: t.secondary }} /><i style={{ background: t.bg, border: '1px solid rgba(0,0,0,.12)' }} /></span>
              <strong>{t.name}</strong>
              <small>{d.invs.filter((i) => i.custom.themeId === t.id).length} invitations</small>
              <label className="check-row"><input type="checkbox" checked={!off} onChange={() => void toggle('disabledThemes', t.id)} /> Available to couples</label>
              <label className="check-row"><input type="checkbox" checked={feat} onChange={() => void toggle('featuredTemplates', t.id)} /> Featured template</label>
            </div>
          )
        })}
      </div>
    </>
  )
}

/* ------------------------------- pricing ------------------------------- */

function Pricing({ d, reload, onSaved }: { d: Data; reload(): void; onSaved(): void }) {
  const [plans, setPlans] = useState<PricingPlan[]>(d.settings.pricing)
  const set = (id: Plan, p: Partial<PricingPlan>) => setPlans((l) => l.map((x) => (x.id === id ? { ...x, ...p } : x)))
  return (
    <>
      <PageHead title="Pricing" desc="Edit plan names, prices and features. Changes appear on the landing page right away." actions={<button className="btn btn-primary" onClick={async () => { await api.settings.set({ pricing: plans }); reload(); onSaved() }}>Save pricing</button>} />
      <div className="plan-edit">
        {plans.map((p) => (
          <Card key={p.id} title={`${p.id[0].toUpperCase()}${p.id.slice(1)} plan`}>
            <Field label="Display name"><input value={p.name} onChange={(e) => set(p.id, { name: e.target.value })} /></Field>
            <div className="two-col">
              <Field label="Price (USD)"><input type="number" min={0} value={p.price} onChange={(e) => set(p.id, { price: Math.max(0, Number(e.target.value) || 0) })} /></Field>
              <Field label="Period label"><input value={p.period} onChange={(e) => set(p.id, { period: e.target.value })} /></Field>
            </div>
            <Field label="Tagline"><input value={p.blurb} onChange={(e) => set(p.id, { blurb: e.target.value })} /></Field>
            <Field label="Features (one per line)"><textarea rows={7} value={p.features.join('\n')} onChange={(e) => set(p.id, { features: e.target.value.split('\n').filter((x) => x.trim()) })} /></Field>
            <label className="check-row"><input type="checkbox" checked={!!p.highlight} onChange={(e) => set(p.id, { highlight: e.target.checked })} /> Highlight as “Most popular”</label>
          </Card>
        ))}
      </div>
    </>
  )
}

/* ---------------------------- subscriptions ---------------------------- */

function Subscriptions({ d, reload }: { d: Data; reload(): void }) {
  const counts = (['free', 'premium', 'luxury'] as Plan[]).map((p) => ({ plan: p, n: d.users.filter((u) => u.plan === p).length, price: d.settings.pricing.find((x) => x.id === p)?.price ?? 0 }))
  return (
    <>
      <PageHead title="Subscriptions" desc="Plan distribution and estimated revenue. Connect a payment provider (e.g. Stripe) to replace these demo figures." />
      <div className="stats">
        {counts.map((c) => <div key={c.plan} className="stat"><strong>{c.n}</strong><span>{c.plan[0].toUpperCase() + c.plan.slice(1)} accounts · ${c.n * c.price}</span></div>)}
      </div>
      <Card title="Paid accounts">
        {d.users.filter((u) => u.plan !== 'free').length === 0 ? <EmptyState icon="star" title="No paid accounts yet" /> : (
          <ul className="list">
            {d.users.filter((u) => u.plan !== 'free').map((u) => (
              <li key={u.id} className="list-row"><Icon name="user" size={18} /><span><strong>{u.name}</strong> <small className="muted">{u.email}</small></span><span className="pill yes">{u.plan}</span>
                <button className="btn btn-ghost sm" onClick={async () => { await api.auth.updateUser(u.id, { plan: 'free' }); reload() }}>Cancel plan</button></li>
            ))}
          </ul>
        )}
      </Card>
    </>
  )
}

/* ------------------------------- reports ------------------------------- */

function Reports({ d, reload, ownerName }: { d: Data; reload(): void; ownerName(id: string): string }) {
  const flaggedInvs = useMemo(() => d.invs.filter((i) => i.reported), [d.invs])
  return (
    <>
      <PageHead title="Reported content" desc="Messages and invitations flagged by guests." />
      <Card title="Reported guestbook messages">
        {d.reported.length === 0 ? <EmptyState icon="shield" title="Nothing reported">All clear ✨</EmptyState> : (
          <ul className="msg-list">
            {d.reported.map((m) => (
              <li key={m.id} className="msg-item">
                <div><p>“{m.text}”</p><small>— {m.name} · invitation by {ownerName(d.invs.find((i) => i.id === m.invitationId)?.ownerId ?? '')}</small></div>
                <div className="msg-actions">
                  <button className="btn btn-ghost sm" onClick={async () => { await api.messages.setStatus(m.id, 'approved'); reload() }}>Dismiss</button>
                  <ConfirmButton label="Remove" confirmLabel="Remove message?" onConfirm={async () => { await api.messages.remove(m.id); reload() }} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <Card title="Reported invitations">
        {flaggedInvs.length === 0 ? <EmptyState icon="shield" title="No reported invitations" /> : flaggedInvs.map((i) => <p key={i.id}>{i.slug}</p>)}
      </Card>
    </>
  )
}

/* ------------------------------- storage ------------------------------- */

function Storage({ d, bytes, ownerName }: { d: Data; bytes: number; ownerName(id: string): string }) {
  return (
    <>
      <PageHead title="Storage" desc="Media stored by this browser-based demo. In production this maps to your cloud bucket." />
      <div className="stats">
        <div className="stat"><strong>{formatBytes(bytes)}</strong><span>Media stored</span></div>
        <div className="stat"><strong>{d.invs.reduce((n, i) => n + countPhotos(i), 0)}</strong><span>Photos across invitations</span></div>
        <div className="stat"><strong>{d.invs.length}</strong><span>Invitations</span></div>
      </div>
      <Card title="By invitation">
        <BarList title="Photos per invitation" data={d.invs.map((i) => ({ label: `${i.slug || i.id} (${ownerName(i.ownerId)})`, value: countPhotos(i) }))} />
      </Card>
    </>
  )
}
