import { useCallback, useEffect, useMemo, useState } from 'react'
import type { GuestMessage, Rsvp } from '../../types'
import { Icon } from '../../components/Icon'
import { api } from '../../lib/db'
import { downloadText, timeAgo, toCsv } from '../../lib/util'
import { useToast } from '../../context'
import { Card, ConfirmButton, EmptyState, Field, PageHead, Toggle, UpgradeNote } from '../ui'
import { useBuilder } from '../context'

function Stat({ label, value, tone = '' }: { label: string; value: number | string; tone?: string }) {
  return (
    <div className={`stat ${tone}`}>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  )
}

/* ---------------------------------- RSVP ---------------------------------- */

export function RsvpManager() {
  const { inv, update, limits, go } = useBuilder()
  const toast = useToast()
  const [rows, setRows] = useState<Rsvp[] | null>(null)
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<'all' | Rsvp['attending']>('all')
  const [meal, setMeal] = useState('')

  const load = useCallback(() => api.rsvps.list(inv.id).then(setRows), [inv.id])
  useEffect(() => {
    void load()
  }, [load])

  const stats = useMemo(() => {
    const r = rows ?? []
    const yes = r.filter((x) => x.attending === 'yes')
    const maybe = r.filter((x) => x.attending === 'maybe')
    const meals = new Map<string, number>()
    for (const x of [...yes, ...maybe]) if (x.meal) meals.set(x.meal, (meals.get(x.meal) ?? 0) + x.guests)
    return {
      responses: r.length,
      yes: yes.length,
      no: r.filter((x) => x.attending === 'no').length,
      maybe: maybe.length,
      guests: yes.reduce((n, x) => n + x.guests, 0),
      meals: [...meals.entries()],
    }
  }, [rows])

  const shown = (rows ?? []).filter(
    (r) =>
      (filter === 'all' || r.attending === filter) &&
      (!meal || r.meal === meal) &&
      (!q || `${r.name} ${r.contact} ${r.message}`.toLowerCase().includes(q.toLowerCase())),
  )

  const exportCsv = () => {
    if (!limits.rsvpExport) return toast('Exporting RSVPs is a Premium feature', 'info')
    downloadText(
      `${inv.slug || 'invitation'}-rsvps.csv`,
      toCsv(shown.map((r) => ({ Name: r.name, Contact: r.contact, Attending: r.attending, Guests: r.guests, Meal: r.meal, Message: r.message, Received: r.createdAt }))),
      'text/csv',
    )
  }

  const addMeal = (v: string) => {
    const t = v.trim()
    if (t && !inv.mealOptions.includes(t)) update({ mealOptions: [...inv.mealOptions, t] })
  }

  return (
    <>
      <PageHead
        title="RSVPs"
        desc="Responses from your guests. Only you can see this list."
        actions={<button className="btn btn-ghost" onClick={exportCsv}><Icon name="download" size={16} /> Export CSV</button>}
      />
      {!limits.rsvpExport && <UpgradeNote>Exporting your guest list is part of Premium. <button className="link" onClick={() => go('settings')}>See plans</button></UpgradeNote>}
      <div className="stats">
        <Stat label="Invited (expected)" value={inv.expectedGuests} />
        <Stat label="Responses" value={stats.responses} />
        <Stat label="Attending" value={stats.yes} tone="good" />
        <Stat label="Not attending" value={stats.no} tone="bad" />
        <Stat label="Maybe" value={stats.maybe} tone="warn" />
        <Stat label="Total guests coming" value={stats.guests} tone="good" />
      </div>

      <Card title="Guest responses">
        <div className="toolbar">
          <label className="search">
            <Icon name="search" size={16} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, contact or message" aria-label="Search RSVPs" />
          </label>
          <select value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)} aria-label="Filter by response">
            <option value="all">All responses</option>
            <option value="yes">Attending</option>
            <option value="no">Not attending</option>
            <option value="maybe">Maybe</option>
          </select>
          <select value={meal} onChange={(e) => setMeal(e.target.value)} aria-label="Filter by meal">
            <option value="">Any meal</option>
            {inv.mealOptions.map((m) => <option key={m}>{m}</option>)}
          </select>
        </div>
        {rows === null ? (
          <div className="skeleton" style={{ height: 120 }} />
        ) : shown.length === 0 ? (
          <EmptyState icon="users" title={rows.length ? 'No matches' : 'No RSVPs yet'}>
            {rows.length ? 'Try a different search or filter.' : 'Share your invitation — responses appear here as soon as guests reply.'}
          </EmptyState>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr><th>Guest</th><th>Response</th><th>Guests</th><th>Meal</th><th>Message</th><th>Received</th><th><span className="sr-only">Actions</span></th></tr>
              </thead>
              <tbody>
                {shown.map((r) => (
                  <tr key={r.id}>
                    <td data-label="Guest"><strong>{r.name}</strong><small>{r.contact}</small></td>
                    <td data-label="Response"><span className={`pill ${r.attending}`}>{r.attending === 'yes' ? 'Attending' : r.attending === 'no' ? 'Not attending' : 'Maybe'}</span></td>
                    <td data-label="Guests">{r.guests || '—'}</td>
                    <td data-label="Meal">{r.meal || '—'}</td>
                    <td data-label="Message" className="msg">{r.message || '—'}</td>
                    <td data-label="Received">{timeAgo(r.createdAt)}</td>
                    <td><ConfirmButton onConfirm={() => api.rsvps.remove(r.id).then(load)} label="" confirmLabel="Delete?" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div className="two-col">
        <Card title="Meal preferences" hint="Options guests can choose from. Counts include attending and maybe guests.">
          <ul className="meal-list">
            {inv.mealOptions.map((m) => (
              <li key={m}>
                <span>{m}</span>
                <b>{stats.meals.find(([k]) => k === m)?.[1] ?? 0}</b>
                <button className="icon-btn sm" aria-label={`Remove ${m}`} onClick={() => update({ mealOptions: inv.mealOptions.filter((x) => x !== m) })}><Icon name="x" size={14} /></button>
              </li>
            ))}
          </ul>
          <form className="inline-form" onSubmit={(e) => { e.preventDefault(); const f = e.currentTarget.elements.namedItem('meal') as HTMLInputElement; addMeal(f.value); f.value = '' }}>
            <input name="meal" placeholder="Add an option, e.g. Jain" aria-label="New meal option" />
            <button className="btn btn-primary sm">Add</button>
          </form>
        </Card>
        <Card title="Guest count">
          <Field label="How many guests are you inviting?" hint="Used for the “Invited” total above.">
            <input type="number" min={0} value={inv.expectedGuests} onChange={(e) => update({ expectedGuests: Math.max(0, Number(e.target.value) || 0) })} />
          </Field>
          <p className="hint">{stats.guests} of {inv.expectedGuests} confirmed ({inv.expectedGuests ? Math.round((stats.guests / inv.expectedGuests) * 100) : 0}%).</p>
        </Card>
      </div>
    </>
  )
}

/* -------------------------------- Guestbook -------------------------------- */

export function GuestbookManager() {
  const { inv, update } = useBuilder()
  const [msgs, setMsgs] = useState<GuestMessage[] | null>(null)
  const [tab, setTab] = useState<GuestMessage['status']>('pending')
  const load = useCallback(() => api.messages.list(inv.id).then(setMsgs), [inv.id])
  useEffect(() => {
    void load()
  }, [load])

  const counts = (s: GuestMessage['status']) => (msgs ?? []).filter((m) => m.status === s).length
  const list = (msgs ?? []).filter((m) => m.status === tab)
  const set = (m: GuestMessage, s: GuestMessage['status']) => api.messages.setStatus(m.id, s).then(load)

  return (
    <>
      <PageHead title="Guestbook" desc="Read, approve and manage the messages guests leave for you." />
      <Card title="Moderation">
        <Toggle
          checked={inv.privacy.moderateMessages}
          onChange={(v) => update((i) => ({ ...i, privacy: { ...i.privacy, moderateMessages: v } }))}
          label="Approve messages before they appear"
          desc="When on, new messages wait here until you approve them."
        />
      </Card>
      <Card title="Messages">
        <div className="album-tabs" role="tablist">
          {(['pending', 'approved', 'rejected'] as const).map((s) => (
            <button key={s} role="tab" aria-selected={tab === s} className={`chip ${tab === s ? 'on' : ''}`} onClick={() => setTab(s)}>
              {s[0].toUpperCase() + s.slice(1)} <small>{counts(s)}</small>
            </button>
          ))}
        </div>
        {msgs === null ? (
          <div className="skeleton" style={{ height: 100 }} />
        ) : list.length === 0 ? (
          <EmptyState icon="heart" title={`No ${tab} messages`}>{tab === 'pending' ? 'You are all caught up ✨' : 'Nothing here yet.'}</EmptyState>
        ) : (
          <ul className="msg-list">
            {list.map((m) => (
              <li key={m.id} className="msg-item">
                <div>
                  <p>“{m.text}”</p>
                  <small>— <strong>{m.name}</strong> · {timeAgo(m.createdAt)} · {m.hearts} ♥{m.reported && ' · reported'}</small>
                </div>
                <div className="msg-actions">
                  {m.status !== 'approved' && <button className="btn btn-primary sm" onClick={() => set(m, 'approved')}><Icon name="check" size={14} /> Approve</button>}
                  {m.status !== 'rejected' && <button className="btn btn-ghost sm" onClick={() => set(m, 'rejected')}><Icon name="x" size={14} /> Reject</button>}
                  <ConfirmButton onConfirm={() => api.messages.remove(m.id).then(load)} label="" confirmLabel="Delete?" />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  )
}
