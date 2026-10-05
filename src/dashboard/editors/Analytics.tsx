import { useEffect, useMemo, useState } from 'react'
import type { AnalyticsEvent } from '../../types'
import { api } from '../../lib/db'
import { Card, PageHead, Segmented, UpgradeNote } from '../ui'
import { BarList, LineChart } from '../charts'
import { useBuilder } from '../context'

const DAY = 86400000

export function AnalyticsView() {
  const { inv, limits, go } = useBuilder()
  const [events, setEvents] = useState<AnalyticsEvent[] | null>(null)
  const [days, setDays] = useState<'7' | '14' | '30'>('14')

  useEffect(() => {
    let alive = true
    api.analytics.list(inv.id).then((e) => alive && setEvents(e))
    return () => {
      alive = false
    }
  }, [inv.id])

  const data = useMemo(() => {
    const n = Number(days)
    const start = new Date()
    start.setHours(0, 0, 0, 0)
    start.setTime(start.getTime() - (n - 1) * DAY)
    const inRange = (events ?? []).filter((e) => new Date(e.at) >= start)
    const count = (k: AnalyticsEvent['kind']) => inRange.filter((e) => e.kind === k).length
    const perDay = Array.from({ length: n }, (_, i) => {
      const d = new Date(start.getTime() + i * DAY)
      const next = d.getTime() + DAY
      return {
        label: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        value: inRange.filter((e) => e.kind === 'view' && new Date(e.at).getTime() >= d.getTime() && new Date(e.at).getTime() < next).length,
      }
    })
    return {
      perDay,
      views: count('view'),
      unique: new Set(inRange.filter((e) => e.kind === 'view').map((e) => e.visitor)).size,
      rsvp: count('rsvp'),
      wa: count('share_whatsapp'),
      other: count('share_other'),
      links: count('link_click'),
      maps: count('map_click'),
      gallery: count('gallery_view'),
    }
  }, [events, days])

  if (!limits.analytics)
    return (
      <>
        <PageHead title="Analytics" desc="See how guests engage with your invitation." />
        <UpgradeNote>Analytics are part of Premium. <button className="link" onClick={() => go('settings')}>See plans</button></UpgradeNote>
      </>
    )

  return (
    <>
      <PageHead title="Analytics" desc="See how guests engage with your invitation." actions={<Segmented<'7' | '14' | '30'> label="Date range" value={days} onChange={setDays} options={[{ value: '7', label: '7 days' }, { value: '14', label: '14 days' }, { value: '30', label: '30 days' }]} />} />
      {events === null ? (
        <div className="skeleton" style={{ height: 260 }} />
      ) : (
        <>
          <div className="stats">
            <div className="stat"><strong>{data.views}</strong><span>Invitation views</span></div>
            <div className="stat"><strong>{data.unique}</strong><span>Unique visitors</span></div>
            <div className="stat good"><strong>{data.rsvp}</strong><span>RSVP submissions</span></div>
            <div className="stat"><strong>{data.wa}</strong><span>WhatsApp shares</span></div>
            <div className="stat"><strong>{data.links}</strong><span>Link clicks</span></div>
            <div className="stat"><strong>{data.maps}</strong><span>Map clicks</span></div>
          </div>
          <Card>
            <LineChart data={data.perDay} title="Invitation views" />
          </Card>
          <Card>
            <BarList
              title="What guests did"
              data={[
                { label: 'Opened invitation', value: data.views },
                { label: 'Viewed gallery', value: data.gallery },
                { label: 'Opened maps', value: data.maps },
                { label: 'Clicked links', value: data.links },
                { label: 'Shared on WhatsApp', value: data.wa },
                { label: 'Shared elsewhere', value: data.other },
                { label: 'Sent an RSVP', value: data.rsvp },
              ]}
            />
          </Card>
        </>
      )}
    </>
  )
}
