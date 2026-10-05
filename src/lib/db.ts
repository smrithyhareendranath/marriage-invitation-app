import type {
  AnalyticsEvent,
  AnalyticsKind,
  GuestMessage,
  Invitation,
  Plan,
  PricingPlan,
  Rsvp,
  User,
} from '../types'
import { DEFAULT_PRICING, DEFAULT_SIGNUP_PLAN } from '../data/pricing'
import { demoInvitation } from '../data/demo'
import { uid, slugify } from './util'
import { removeMedia } from './media'

/**
 * Data layer
 * ----------
 * Every screen talks to the `api` object below and nothing else. This build ships a
 * localStorage adapter so the whole product is explorable with no server. To go live, implement
 * the same `Api` interface with fetch() calls to your backend (Supabase, Firebase, a REST/GraphQL
 * service…) and export it as `api` – no UI code changes are needed.
 *
 * NOTE: password hashing here is client-side and for demo purposes only. A real backend must hash
 * passwords server-side (argon2/bcrypt) and issue httpOnly session cookies / JWTs.
 */

export interface Settings {
  pricing: PricingPlan[]
  disabledThemes: string[]
  featuredTemplates: string[]
}

export interface Api {
  auth: {
    me(): Promise<User | null>
    signUp(i: { name: string; email: string; password: string }): Promise<User>
    login(i: { email: string; password: string }): Promise<User>
    loginWithGoogle(): Promise<User>
    logout(): Promise<void>
    requestPasswordReset(email: string): Promise<void>
    updateUser(id: string, patch: Partial<User>): Promise<User>
    deleteAccount(id: string): Promise<void>
    listUsers(): Promise<User[]>
  }
  invitations: {
    forOwner(ownerId: string): Promise<Invitation[]>
    bySlug(slug: string): Promise<Invitation | null>
    byId(id: string): Promise<Invitation | null>
    save(inv: Invitation): Promise<Invitation>
    create(inv: Invitation): Promise<Invitation>
    remove(id: string): Promise<void>
    all(): Promise<Invitation[]>
    slugAvailable(slug: string, exceptId?: string): Promise<boolean>
  }
  rsvps: {
    list(invitationId: string): Promise<Rsvp[]>
    submit(r: Omit<Rsvp, 'id' | 'createdAt'>): Promise<Rsvp>
    remove(id: string): Promise<void>
    all(): Promise<Rsvp[]>
  }
  messages: {
    /** Public: approved only. */
    approved(invitationId: string): Promise<GuestMessage[]>
    /** Owner: everything. */
    list(invitationId: string): Promise<GuestMessage[]>
    submit(m: { invitationId: string; name: string; text: string }, moderate: boolean): Promise<GuestMessage>
    setStatus(id: string, status: GuestMessage['status']): Promise<void>
    heart(id: string): Promise<number>
    report(id: string): Promise<void>
    remove(id: string): Promise<void>
    reported(): Promise<GuestMessage[]>
  }
  analytics: {
    track(invitationId: string, kind: AnalyticsKind): Promise<void>
    list(invitationId: string): Promise<AnalyticsEvent[]>
    all(): Promise<AnalyticsEvent[]>
  }
  settings: {
    get(): Promise<Settings>
    set(patch: Partial<Settings>): Promise<Settings>
  }
  exportAll(userId: string): Promise<unknown>
}

/* --------------------------------- storage --------------------------------- */

const K = {
  users: 'mia.v1.users',
  inv: 'mia.v1.invitations',
  rsvps: 'mia.v1.rsvps',
  msgs: 'mia.v1.messages',
  stats: 'mia.v1.analytics',
  settings: 'mia.v1.settings',
  session: 'mia.v1.session',
  seeded: 'mia.v1.seeded',
  unlocked: 'mia.v1.unlocked',
}

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (e) {
    void e
    throw new Error('Browser storage is full. Remove a few photos or videos and try again.')
  }
}

const delay = <T>(v: T, ms = 120): Promise<T> => new Promise((r) => setTimeout(() => r(v), ms))

async function hash(password: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(`${salt}:${password}`)
  const buf = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

interface StoredUser extends User {
  salt: string
  hash: string
}

const strip = (u: StoredUser): User => {
  const { salt: _s, hash: _h, ...rest } = u
  void _s
  void _h
  return rest
}

/* ---------------------------------- seeding ---------------------------------- */

export const DEMO_LOGIN = { email: 'demo@couple.app', password: 'demo1234' }
export const ADMIN_LOGIN = { email: 'admin@app.com', password: 'admin1234' }

async function seed() {
  if (read<boolean>(K.seeded, false)) return
  const demoSalt = 'demo'
  const adminSalt = 'admin'
  const demoUser: StoredUser = {
    id: 'u_demo',
    name: 'Arjun & Anjali',
    email: DEMO_LOGIN.email,
    plan: 'premium',
    role: 'couple',
    provider: 'password',
    createdAt: new Date(Date.now() - 20 * 86400000).toISOString(),
    salt: demoSalt,
    hash: await hash(DEMO_LOGIN.password, demoSalt),
  }
  const adminUser: StoredUser = {
    id: 'u_admin',
    name: 'Platform Admin',
    email: ADMIN_LOGIN.email,
    plan: 'luxury',
    role: 'admin',
    provider: 'password',
    createdAt: new Date(Date.now() - 90 * 86400000).toISOString(),
    salt: adminSalt,
    hash: await hash(ADMIN_LOGIN.password, adminSalt),
  }
  const inv = demoInvitation(demoUser.id)

  const names = [
    'Priya Menon', 'Rahul Nair', 'Sneha Pillai', 'Vikram Iyer', 'Divya Krishnan', 'Anil Kumar',
    'Meera Varma', 'Joseph Mathew', 'Fathima Rasheed', 'Suresh Babu', 'Lakshmi Devi', 'Nikhil Raj',
    'Aisha Khan', 'Gopika Das', 'Harish Chandran', 'Reshma Thomas',
  ]
  const meals = inv.mealOptions
  const rsvps: Rsvp[] = names.map((n, i) => {
    const attending: Rsvp['attending'] = i % 7 === 3 ? 'no' : i % 5 === 2 ? 'maybe' : 'yes'
    return {
      id: uid('rsvp'),
      invitationId: inv.id,
      name: n,
      contact: `${n.split(' ')[0].toLowerCase()}@example.com`,
      attending,
      guests: attending === 'no' ? 0 : 1 + (i % 4),
      meal: attending === 'no' ? '' : meals[i % meals.length],
      message: i % 3 === 0 ? 'So happy for you both! Cannot wait to celebrate.' : '',
      createdAt: new Date(Date.now() - (i + 1) * 5.5 * 3600000).toISOString(),
    }
  })

  const wishes = [
    ['Aunt Radha', 'Wishing you a lifetime of love, laughter and happiness. You two are made for each other!'],
    ['College Gang', 'From the canteen queue to the mandap — we always knew! Congratulations, you two.'],
    ['Uncle George', 'May God bless your journey together. Our love and prayers are always with you.'],
    ['Neha', 'Cannot wait to dance at the Sangeet! Mehendi designs are already planned.'],
    ['Team Infosys', 'Wishing Arjun and Anjali a beautiful married life full of joy.'],
  ]
  const messages: GuestMessage[] = wishes.map(([name, text], i) => ({
    id: uid('msg'),
    invitationId: inv.id,
    name,
    text,
    status: 'approved',
    hearts: 3 + ((i * 7) % 11),
    createdAt: new Date(Date.now() - (i + 1) * 9 * 3600000).toISOString(),
  }))

  const kinds: AnalyticsKind[] = ['view', 'view', 'view', 'link_click', 'map_click', 'gallery_view', 'share_whatsapp', 'share_other']
  const stats: AnalyticsEvent[] = []
  for (let d = 13; d >= 0; d--) {
    const dayCount = 8 + ((d * 13) % 17) + (13 - d) * 2
    for (let n = 0; n < dayCount; n++) {
      stats.push({
        id: uid('ev'),
        invitationId: inv.id,
        kind: kinds[(n * 3 + d) % kinds.length],
        visitor: `v${(n * 7 + d * 3) % 41}`,
        at: new Date(Date.now() - d * 86400000 - n * 600000).toISOString(),
      })
    }
  }
  rsvps.forEach((r) =>
    stats.push({ id: uid('ev'), invitationId: inv.id, kind: 'rsvp', visitor: `r${r.id}`, at: r.createdAt }),
  )

  write(K.users, [demoUser, adminUser])
  write(K.inv, [inv])
  write(K.rsvps, rsvps)
  write(K.msgs, messages)
  write(K.stats, stats)
  write(K.settings, { pricing: DEFAULT_PRICING, disabledThemes: [], featuredTemplates: ['floral', 'royal', 'kerala', 'darkgold'] } satisfies Settings)
  write(K.seeded, true)
}

const ready = seed()

/* ---------------------------------- adapter ---------------------------------- */

const users = () => read<StoredUser[]>(K.users, [])
const invs = () => read<Invitation[]>(K.inv, [])

export const api: Api = {
  auth: {
    async me() {
      await ready
      const id = read<string | null>(K.session, null)
      const u = users().find((x) => x.id === id && !x.suspended)
      return u ? strip(u) : null
    },
    async signUp({ name, email, password }) {
      await ready
      const e = email.trim().toLowerCase()
      if (users().some((u) => u.email === e)) throw new Error('An account with this email already exists.')
      const salt = uid('salt')
      const u: StoredUser = {
        id: uid('u'),
        name: name.trim(),
        email: e,
        plan: DEFAULT_SIGNUP_PLAN,
        role: 'couple',
        provider: 'password',
        createdAt: new Date().toISOString(),
        salt,
        hash: await hash(password, salt),
      }
      write(K.users, [...users(), u])
      write(K.session, u.id)
      return delay(strip(u))
    },
    async login({ email, password }) {
      await ready
      const e = email.trim().toLowerCase()
      const u = users().find((x) => x.email === e)
      if (!u || u.provider === 'google' || (await hash(password, u.salt)) !== u.hash)
        throw new Error('Incorrect email or password.')
      if (u.suspended) throw new Error('This account has been suspended. Please contact support.')
      write(K.session, u.id)
      return delay(strip(u))
    },
    async loginWithGoogle() {
      await ready
      // Demo stand-in for the Google OAuth popup. A real build exchanges a Google ID token with the
      // backend here and receives the same `User` shape back.
      const email = 'google.guest@gmail.com'
      let u = users().find((x) => x.email === email)
      if (!u) {
        u = {
          id: uid('u'),
          name: 'Google Guest',
          email,
          plan: DEFAULT_SIGNUP_PLAN,
          role: 'couple',
          provider: 'google',
          createdAt: new Date().toISOString(),
          salt: '',
          hash: '',
        }
        write(K.users, [...users(), u])
      }
      write(K.session, u.id)
      return delay(strip(u))
    },
    async logout() {
      localStorage.removeItem(K.session)
    },
    async requestPasswordReset(email) {
      await ready
      // A real backend emails a one-time link and never reveals whether the address exists.
      void email
      await delay(null, 500)
    },
    async updateUser(id, patch) {
      const all = users()
      const i = all.findIndex((u) => u.id === id)
      if (i < 0) throw new Error('User not found.')
      all[i] = { ...all[i], ...patch, id: all[i].id }
      write(K.users, all)
      return strip(all[i])
    },
    async deleteAccount(id) {
      const mine = invs().filter((i) => i.ownerId === id)
      for (const i of mine) await api.invitations.remove(i.id)
      write(K.users, users().filter((u) => u.id !== id))
      if (read<string | null>(K.session, null) === id) localStorage.removeItem(K.session)
    },
    async listUsers() {
      await ready
      return users().map(strip)
    },
  },

  invitations: {
    async forOwner(ownerId) {
      await ready
      return invs().filter((i) => i.ownerId === ownerId)
    },
    async bySlug(slug) {
      await ready
      return invs().find((i) => i.slug === slug) ?? null
    },
    async byId(id) {
      await ready
      return invs().find((i) => i.id === id) ?? null
    },
    async create(inv) {
      await ready
      const slug = await uniqueSlug(inv.slug || slugify(`${inv.couple.groom.name}-${inv.couple.bride.name}`) || 'our-wedding')
      const saved = { ...inv, slug }
      write(K.inv, [...invs(), saved])
      return saved
    },
    async save(inv) {
      const all = invs()
      const i = all.findIndex((x) => x.id === inv.id)
      const next = { ...inv, updatedAt: new Date().toISOString() }
      if (i < 0) all.push(next)
      else all[i] = next
      write(K.inv, all)
      return next
    },
    async remove(id) {
      const inv = invs().find((i) => i.id === id)
      if (inv) await cleanupMedia(inv)
      write(K.inv, invs().filter((i) => i.id !== id))
      write(K.rsvps, read<Rsvp[]>(K.rsvps, []).filter((r) => r.invitationId !== id))
      write(K.msgs, read<GuestMessage[]>(K.msgs, []).filter((m) => m.invitationId !== id))
      write(K.stats, read<AnalyticsEvent[]>(K.stats, []).filter((e) => e.invitationId !== id))
    },
    async all() {
      await ready
      return invs()
    },
    async slugAvailable(slug, exceptId) {
      await ready
      return !!slug && !invs().some((i) => i.slug === slug && i.id !== exceptId)
    },
  },

  rsvps: {
    async list(invitationId) {
      return read<Rsvp[]>(K.rsvps, []).filter((r) => r.invitationId === invitationId)
    },
    async submit(r) {
      const rec: Rsvp = { ...r, id: uid('rsvp'), createdAt: new Date().toISOString() }
      write(K.rsvps, [rec, ...read<Rsvp[]>(K.rsvps, [])])
      await api.analytics.track(r.invitationId, 'rsvp')
      return delay(rec, 350)
    },
    async remove(id) {
      write(K.rsvps, read<Rsvp[]>(K.rsvps, []).filter((r) => r.id !== id))
    },
    async all() {
      await ready
      return read<Rsvp[]>(K.rsvps, [])
    },
  },

  messages: {
    async approved(invitationId) {
      await ready
      return read<GuestMessage[]>(K.msgs, [])
        .filter((m) => m.invitationId === invitationId && m.status === 'approved')
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    },
    async list(invitationId) {
      return read<GuestMessage[]>(K.msgs, [])
        .filter((m) => m.invitationId === invitationId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    },
    async submit(m, moderate) {
      const rec: GuestMessage = {
        id: uid('msg'),
        invitationId: m.invitationId,
        name: m.name,
        text: m.text,
        status: moderate ? 'pending' : 'approved',
        hearts: 0,
        createdAt: new Date().toISOString(),
      }
      write(K.msgs, [rec, ...read<GuestMessage[]>(K.msgs, [])])
      return delay(rec, 300)
    },
    async setStatus(id, status) {
      write(K.msgs, read<GuestMessage[]>(K.msgs, []).map((m) => (m.id === id ? { ...m, status } : m)))
    },
    async heart(id) {
      let n = 0
      write(
        K.msgs,
        read<GuestMessage[]>(K.msgs, []).map((m) => {
          if (m.id !== id) return m
          n = m.hearts + 1
          return { ...m, hearts: n }
        }),
      )
      return n
    },
    async report(id) {
      write(K.msgs, read<GuestMessage[]>(K.msgs, []).map((m) => (m.id === id ? { ...m, reported: true } : m)))
    },
    async remove(id) {
      write(K.msgs, read<GuestMessage[]>(K.msgs, []).filter((m) => m.id !== id))
    },
    async reported() {
      await ready
      return read<GuestMessage[]>(K.msgs, []).filter((m) => m.reported)
    },
  },

  analytics: {
    async track(invitationId, kind) {
      let visitor = 'anon'
      try {
        visitor = localStorage.getItem('mia.v1.visitor') ?? ''
        if (!visitor) {
          visitor = uid('vis')
          localStorage.setItem('mia.v1.visitor', visitor)
        }
      } catch {
        /* storage blocked – still count the event */
      }
      const all = read<AnalyticsEvent[]>(K.stats, [])
      all.push({ id: uid('ev'), invitationId, kind, visitor, at: new Date().toISOString() })
      write(K.stats, all.slice(-5000))
    },
    async list(invitationId) {
      await ready
      return read<AnalyticsEvent[]>(K.stats, []).filter((e) => e.invitationId === invitationId)
    },
    async all() {
      await ready
      return read<AnalyticsEvent[]>(K.stats, [])
    },
  },

  settings: {
    async get() {
      await ready
      return read<Settings>(K.settings, { pricing: DEFAULT_PRICING, disabledThemes: [], featuredTemplates: [] })
    },
    async set(patch) {
      const next = { ...(await api.settings.get()), ...patch }
      write(K.settings, next)
      return next
    },
  },

  async exportAll(userId) {
    const mine = invs().filter((i) => i.ownerId === userId)
    const ids = new Set(mine.map((i) => i.id))
    return {
      exportedAt: new Date().toISOString(),
      user: users().filter((u) => u.id === userId).map(strip)[0],
      invitations: mine,
      rsvps: read<Rsvp[]>(K.rsvps, []).filter((r) => ids.has(r.invitationId)),
      messages: read<GuestMessage[]>(K.msgs, []).filter((m) => ids.has(m.invitationId)),
    }
  },
}

async function uniqueSlug(base: string): Promise<string> {
  let slug = slugify(base) || 'our-wedding'
  let n = 1
  while (!(await api.invitations.slugAvailable(slug))) slug = `${slugify(base)}-${++n}`
  return slug
}

export { uniqueSlug }

async function cleanupMedia(inv: Invitation) {
  const refs: string[] = [
    inv.heroPhoto,
    inv.couple.bride.photo,
    inv.couple.groom.photo,
    inv.closing.photo,
    inv.music.src,
    ...inv.story.flatMap((s) => [...s.photos, s.video]),
    ...inv.albums.flatMap((a) => [a.cover, ...a.photos.map((p) => p.src)]),
    ...inv.family.members.map((m) => m.photo),
    ...inv.videos.map((v) => v.url),
  ]
  for (const r of refs) if (r) await removeMedia(r)
}

export { cleanupMedia }

/** Passwords for protected invitations are checked here and remembered per browser session. */
export function isUnlocked(inv: Invitation): boolean {
  if (!inv.privacy.password) return true
  try {
    const set = JSON.parse(sessionStorage.getItem(K.unlocked) ?? '[]') as string[]
    return set.includes(inv.id)
  } catch {
    return false
  }
}

export function tryUnlock(inv: Invitation, pw: string): boolean {
  if (pw !== inv.privacy.password) return false
  try {
    const set = JSON.parse(sessionStorage.getItem(K.unlocked) ?? '[]') as string[]
    sessionStorage.setItem(K.unlocked, JSON.stringify([...set, inv.id]))
  } catch {
    /* ignore */
  }
  return true
}

export const planRank: Record<Plan, number> = { free: 0, premium: 1, luxury: 2 }
