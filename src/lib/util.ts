import type { WeddingEvent } from '../types'

export const uid = (prefix = 'id') =>
  `${prefix}_${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-4)}`

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
}

/** Parse yyyy-mm-dd (+ optional HH:mm) as a local-time Date. */
export function parseLocal(date: string, time = '00:00'): Date {
  const [y, m, d] = date.split('-').map(Number)
  const [hh, mm] = (time || '00:00').split(':').map(Number)
  return new Date(y || 1970, (m || 1) - 1, d || 1, hh || 0, mm || 0, 0)
}

export function formatDate(date: string, opts?: Intl.DateTimeFormatOptions): string {
  if (!date) return ''
  return parseLocal(date).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    ...opts,
  })
}

export function weekday(date: string): string {
  if (!date) return ''
  return parseLocal(date).toLocaleDateString(undefined, { weekday: 'long' })
}

export function formatTime(time: string): string {
  if (!time) return ''
  const [h, m] = time.split(':').map(Number)
  const d = new Date()
  d.setHours(h, m, 0, 0)
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

export function timeLeft(target: Date, now = new Date()) {
  const diff = Math.max(0, target.getTime() - now.getTime())
  const s = Math.floor(diff / 1000)
  return {
    done: diff === 0,
    days: Math.floor(s / 86400),
    hours: Math.floor((s % 86400) / 3600),
    minutes: Math.floor((s % 3600) / 60),
    seconds: s % 60,
  }
}

export function directionsUrl(ev: Pick<WeddingEvent, 'mapsUrl' | 'venue' | 'address'>): string {
  const q = [ev.venue, ev.address].filter(Boolean).join(', ')
  if (ev.mapsUrl && /^https?:\/\//i.test(ev.mapsUrl)) return ev.mapsUrl
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(q)}`
}

export function mapEmbedUrl(ev: Pick<WeddingEvent, 'venue' | 'address'>): string {
  const q = [ev.venue, ev.address].filter(Boolean).join(', ')
  return `https://www.google.com/maps?q=${encodeURIComponent(q)}&output=embed`
}

const icsStamp = (d: Date) =>
  `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCDate()).padStart(2, '0')}T${String(d.getUTCHours()).padStart(2, '0')}${String(d.getUTCMinutes()).padStart(2, '0')}00Z`

const icsEscape = (s: string) => s.replace(/([,;\\])/g, '\\$1').replace(/\r?\n/g, '\\n')

export function buildIcs(ev: WeddingEvent, title: string): string {
  const start = parseLocal(ev.date, ev.time || '10:00')
  const end = ev.endTime ? parseLocal(ev.date, ev.endTime) : new Date(start.getTime() + 3 * 3600_000)
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Marriage Invitation App//EN',
    'BEGIN:VEVENT',
    `UID:${ev.id}@marriage-invitation-app`,
    `DTSTAMP:${icsStamp(new Date())}`,
    `DTSTART:${icsStamp(start)}`,
    `DTEND:${icsStamp(end)}`,
    `SUMMARY:${icsEscape(`${ev.name} – ${title}`)}`,
    `LOCATION:${icsEscape([ev.venue, ev.address].filter(Boolean).join(', '))}`,
    `DESCRIPTION:${icsEscape(ev.description || '')}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')
}

export function googleCalendarUrl(ev: WeddingEvent, title: string): string {
  const start = parseLocal(ev.date, ev.time || '10:00')
  const end = ev.endTime ? parseLocal(ev.date, ev.endTime) : new Date(start.getTime() + 3 * 3600_000)
  const p = new URLSearchParams({
    action: 'TEMPLATE',
    text: `${ev.name} – ${title}`,
    dates: `${icsStamp(start)}/${icsStamp(end)}`,
    details: ev.description || '',
    location: [ev.venue, ev.address].filter(Boolean).join(', '),
  })
  return `https://calendar.google.com/calendar/render?${p.toString()}`
}

export function downloadText(filename: string, text: string, mime = 'text/plain') {
  const blob = new Blob([text], { type: `${mime};charset=utf-8` })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function toCsv(rows: Record<string, unknown>[]): string {
  if (!rows.length) return ''
  const cols = Object.keys(rows[0])
  const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`
  return [cols.join(','), ...rows.map((r) => cols.map((c) => esc(r[c])).join(','))].join('\n')
}

export function debounce<A extends unknown[]>(fn: (...a: A) => void, ms: number) {
  let t: ReturnType<typeof setTimeout> | undefined
  const d = (...a: A) => {
    if (t) clearTimeout(t)
    t = setTimeout(() => fn(...a), ms)
  }
  d.cancel = () => t && clearTimeout(t)
  return d
}

export function parseVideo(url: string): { kind: 'youtube' | 'vimeo' | 'upload'; embed: string } | null {
  const u = url.trim()
  if (!u) return null
  const yt = u.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/)
  if (yt) return { kind: 'youtube', embed: `https://www.youtube-nocookie.com/embed/${yt[1]}` }
  const vm = u.match(/vimeo\.com\/(?:video\/)?(\d+)/)
  if (vm) return { kind: 'vimeo', embed: `https://player.vimeo.com/video/${vm[1]}` }
  if (u.startsWith('media:') || /\.(mp4|webm|mov)(\?|$)/i.test(u)) return { kind: 'upload', embed: u }
  return null
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('')
}

export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || ''
}

export function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n))
}

export function reorder<T>(list: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) return list
  const copy = list.slice()
  const [item] = copy.splice(from, 1)
  copy.splice(to, 0, item)
  return copy
}

export function timeAgo(iso: string): string {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000))
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

/** Path prefix the app is served under (e.g. "/repo-name" on GitHub Pages, "" at a domain root). */
export const BASE = import.meta.env.BASE_URL.replace(/\/$/, '')

export const appPath = (p: string) => `${BASE}${p}`

export const inviteUrl = (slug: string) =>
  `${typeof location !== 'undefined' ? location.origin : ''}${appPath(`/invite/${slug}`)}`
