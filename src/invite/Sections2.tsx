import { useEffect, useMemo, useState } from 'react'
import type { SectionConfig, WeddingEvent } from '../types'
import { Img } from '../components/Img'
import { Icon } from '../components/Icon'
import {
  buildIcs,
  directionsUrl,
  downloadText,
  formatDate,
  formatTime,
  googleCalendarUrl,
  mapEmbedUrl,
  parseLocal,
  timeLeft,
  weekday,
} from '../lib/util'
import { Reveal, Section, coupleNames } from './parts'
import { useInvite } from './context'
import { useInView } from '../hooks'

function useNow(ms = 1000) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), ms)
    return () => clearInterval(t)
  }, [ms])
  return now
}

const sortEvents = (events: WeddingEvent[]) =>
  [...events].sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`))

/* --------------------------------- Events --------------------------------- */

function EventCard({ ev, i, now }: { ev: WeddingEvent; i: number; now: Date }) {
  const { inv, track } = useInvite()
  const [menu, setMenu] = useState(false)
  const { groom, bride } = coupleNames(inv)
  const title = `${groom.split(' ')[0]} & ${bride.split(' ')[0]}`
  const start = ev.date ? parseLocal(ev.date, ev.time || '00:00') : null
  const left = start ? timeLeft(start, now) : null
  const end = ev.date && ev.endTime ? parseLocal(ev.date, ev.endTime) : start ? new Date(start.getTime() + 3 * 3600000) : null
  const live = start && end && now >= start && now <= end
  const past = end && now > end
  const d = ev.date ? parseLocal(ev.date) : null

  return (
    <Reveal as="article" variant="up" delay={(i % 3) * 90} className="event glass">
      <div className="event-date" aria-hidden="true">
        <span className="mo">{d ? d.toLocaleDateString(undefined, { month: 'short' }) : '—'}</span>
        <span className="dy">{d ? d.getDate() : '—'}</span>
        <span className="wk">{d ? d.toLocaleDateString(undefined, { weekday: 'short' }) : ''}</span>
      </div>
      <div className="event-body">
        <h3>{ev.name}</h3>
        <ul className="event-meta">
          {ev.date && (
            <li>
              <Icon name="calendar" size={15} /> {weekday(ev.date)}, {formatDate(ev.date)}
            </li>
          )}
          {ev.time && (
            <li>
              <Icon name="clock" size={15} /> {formatTime(ev.time)}
              {ev.endTime ? ` – ${formatTime(ev.endTime)}` : ''}
            </li>
          )}
          {ev.venue && (
            <li>
              <Icon name="map" size={15} />
              <span>
                <strong>{ev.venue}</strong>
                {ev.address && <em>{ev.address}</em>}
              </span>
            </li>
          )}
          {ev.dressCode && (
            <li>
              <Icon name="shirt" size={15} /> Dress code: {ev.dressCode}
            </li>
          )}
        </ul>
        {ev.description && <p className="event-desc">{ev.description}</p>}

        {left && (
          <p className={`event-count ${live ? 'live' : ''}`} aria-live="off">
            {live ? (
              <>
                <span className="pulse" /> Happening now
              </>
            ) : past ? (
              'Completed — thank you for celebrating with us'
            ) : (
              <>
                Starts in <b>{left.days}d</b> <b>{String(left.hours).padStart(2, '0')}h</b>{' '}
                <b>{String(left.minutes).padStart(2, '0')}m</b>
              </>
            )}
          </p>
        )}

        <div className="event-actions">
          {ev.date && (
            <div className="menu-wrap">
              <button className="btn btn-ghost sm" onClick={() => setMenu((m) => !m)} aria-expanded={menu}>
                <Icon name="calendar" size={16} /> Add to calendar
              </button>
              {menu && (
                <div className="menu" role="menu" onMouseLeave={() => setMenu(false)}>
                  <a role="menuitem" href={googleCalendarUrl(ev, title)} target="_blank" rel="noopener noreferrer" onClick={() => setMenu(false)}>
                    Google Calendar
                  </a>
                  <button
                    role="menuitem"
                    onClick={() => {
                      downloadText(`${ev.name.replace(/\W+/g, '-').toLowerCase()}.ics`, buildIcs(ev, title), 'text/calendar')
                      setMenu(false)
                    }}
                  >
                    Apple / Outlook (.ics)
                  </button>
                </div>
              )}
            </div>
          )}
          {(ev.venue || ev.address || ev.mapsUrl) && (
            <a
              className="btn btn-primary sm"
              href={directionsUrl(ev)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => track('map_click')}
            >
              <Icon name="map" size={16} /> Map
            </a>
          )}
        </div>
      </div>
    </Reveal>
  )
}

export function Events({ cfg }: { cfg: SectionConfig }) {
  const { inv } = useInvite()
  const now = useNow(1000)
  const events = useMemo(() => sortEvents(inv.events.filter((e) => e.name)), [inv.events])
  if (!events.length) return null
  return (
    <Section cfg={cfg} decor={inv.custom.decor}>
      <div className="events">
        {events.map((ev, i) => (
          <EventCard key={ev.id} ev={ev} i={i} now={now} />
        ))}
      </div>
    </Section>
  )
}

/* ---------------------------------- Venue ---------------------------------- */

function MapPreview({ ev }: { ev: WeddingEvent }) {
  const [ref, seen] = useInView<HTMLDivElement>(true, '200px')
  return (
    <div ref={ref} className="map-frame">
      {seen ? (
        <iframe
          title={`Map of ${ev.venue}`}
          src={mapEmbedUrl(ev)}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          allowFullScreen
        />
      ) : (
        <div className="skeleton" />
      )}
    </div>
  )
}

export function Venue({ cfg }: { cfg: SectionConfig }) {
  const { inv, track } = useInvite()
  const venues = useMemo(() => {
    const seen = new Map<string, { ev: WeddingEvent; names: string[] }>()
    for (const ev of sortEvents(inv.events)) {
      if (!ev.venue && !ev.address && !ev.mapsUrl) continue
      const key = `${ev.venue}|${ev.address}`.toLowerCase()
      const hit = seen.get(key)
      if (hit) hit.names.push(ev.name)
      else seen.set(key, { ev, names: [ev.name] })
    }
    return [...seen.values()]
  }, [inv.events])
  if (!venues.length) return null
  return (
    <Section cfg={cfg} decor={inv.custom.decor}>
      <div className="venues">
        {venues.map(({ ev, names }, i) => (
          <Reveal key={ev.id} variant="up" delay={i * 100} className="venue glass">
            <MapPreview ev={ev} />
            <div className="venue-body">
              <p className="venue-for">{names.join(' · ')}</p>
              <h3>{ev.venue || 'Venue'}</h3>
              {ev.address && <p className="venue-addr">{ev.address}</p>}
              {ev.parking && (
                <p className="venue-parking">
                  <Icon name="car" size={15} /> {ev.parking}
                </p>
              )}
              <div className="event-actions">
                <a
                  className="btn btn-primary"
                  href={directionsUrl(ev)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => track('map_click')}
                >
                  <Icon name="map" size={16} /> Get Directions
                </a>
                <a
                  className="btn btn-ghost"
                  href={ev.mapsUrl && /^https?:\/\//.test(ev.mapsUrl) ? ev.mapsUrl : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([ev.venue, ev.address].join(' '))}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => track('map_click')}
                >
                  <Icon name="external" size={16} /> Google Maps
                </a>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </Section>
  )
}

/* --------------------------------- Gallery --------------------------------- */

const MOTIONS = ['zoom', 'float', 'kenburns', 'none', 'zoom'] as const

export function Gallery({ cfg }: { cfg: SectionConfig }) {
  const { inv, openPhotos, track } = useInvite()
  const albums = inv.albums.filter((a) => a.photos.length)
  const [active, setActive] = useState(0)
  if (!albums.length) return null
  const album = albums[Math.min(active, albums.length - 1)]
  const open = (i: number, slideshow = false) => {
    track('gallery_view')
    openPhotos(album.photos, i, slideshow)
  }
  return (
    <Section cfg={cfg} decor={inv.custom.decor}>
      <Reveal variant="fade" className="album-tabs-wrap">
        <div className="album-tabs" role="tablist" aria-label="Photo albums">
          {albums.map((a, i) => (
            <button
              key={a.id}
              role="tab"
              aria-selected={i === active}
              className={`chip ${i === active ? 'on' : ''}`}
              onClick={() => setActive(i)}
            >
              {a.name} <small>{a.photos.length}</small>
            </button>
          ))}
        </div>
        <button className="btn btn-ghost sm" onClick={() => open(0, true)}>
          <Icon name="play" size={14} /> Slideshow
        </button>
      </Reveal>

      <div className="masonry" key={album.id}>
        {album.photos.map((p, i) => (
          <Reveal key={p.id} variant="zoom" delay={(i % 4) * 70} className="masonry-item">
            <button className="photo-btn" onClick={() => open(i)} aria-label={`Open photo: ${p.alt || p.caption || i + 1}`}>
              <Img src={p.src} alt={p.alt || p.caption || `Photo ${i + 1}`} thumb motion={MOTIONS[i % MOTIONS.length]} />
              {p.caption && <span className="photo-cap">{p.caption}</span>}
            </button>
          </Reveal>
        ))}
      </div>
    </Section>
  )
}
