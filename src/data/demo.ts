import type {
  Album,
  Invitation,
  Person,
  SectionConfig,
  SectionId,
  WeddingEvent,
} from '../types'
import { customFromTheme, getTheme } from './themes'
import { uid } from '../lib/util'

/* ------------------------- generated placeholder artwork ------------------------- */

type Kind = 'portrait' | 'couple' | 'scene' | 'floral' | 'family'

const PALETTES: [string, string][] = [
  ['#f8c9d6', '#c2547a'],
  ['#fde3c8', '#d9822b'],
  ['#d9e8d4', '#5f9470'],
  ['#e2d9fa', '#7d62c4'],
  ['#fbe6a8', '#b8872f'],
  ['#cfe4f3', '#4f86b8'],
  ['#f5d0c5', '#b8574a'],
  ['#e9d5ee', '#9a5aa8'],
]

const ICONS: Record<Kind, string> = {
  portrait:
    '<circle cx="200" cy="165" r="62" fill="#fff" fill-opacity=".55"/><path d="M80 380c8-86 58-128 120-128s112 42 120 128z" fill="#fff" fill-opacity=".55"/>',
  couple:
    '<circle cx="158" cy="170" r="48" fill="#fff" fill-opacity=".55"/><path d="M62 360c6-70 40-104 96-104s90 34 96 104z" fill="#fff" fill-opacity=".55"/><circle cx="252" cy="160" r="52" fill="#fff" fill-opacity=".4"/><path d="M150 360c6-76 44-112 102-112s98 36 104 112z" fill="#fff" fill-opacity=".4"/><path d="M200 112c-9-22-40-14-34 10 5 18 34 34 34 34s29-16 34-34c6-24-25-32-34-10z" fill="#fff" fill-opacity=".85" transform="translate(0 -30) scale(1)"/>',
  scene:
    '<circle cx="290" cy="130" r="38" fill="#fff" fill-opacity=".6"/><path d="M0 330 110 210l70 80 60-60 160 140v600H0z" fill="#fff" fill-opacity=".5"/>',
  floral:
    '<g fill="#fff" fill-opacity=".55"><circle cx="200" cy="140" r="34"/><circle cx="240" cy="180" r="34"/><circle cx="200" cy="220" r="34"/><circle cx="160" cy="180" r="34"/></g><circle cx="200" cy="180" r="22" fill="#fff" fill-opacity=".9"/><path d="M200 230v130" stroke="#fff" stroke-opacity=".6" stroke-width="6"/>',
  family:
    '<circle cx="120" cy="170" r="38" fill="#fff" fill-opacity=".55"/><path d="M50 360c5-64 30-96 70-96s65 32 70 96z" fill="#fff" fill-opacity=".55"/><circle cx="200" cy="150" r="42" fill="#fff" fill-opacity=".45"/><path d="M120 360c5-74 36-108 80-108s75 34 80 108z" fill="#fff" fill-opacity=".45"/><circle cx="290" cy="185" r="32" fill="#fff" fill-opacity=".55"/><path d="M230 360c4-56 24-86 60-86s56 30 60 86z" fill="#fff" fill-opacity=".55"/>',
}

export function placeholder(kind: Kind, seed: number, w = 400, h = 500): string {
  const [a, b] = PALETTES[Math.abs(seed) % PALETTES.length]
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 ${Math.round((400 * h) / w)}" preserveAspectRatio="xMidYMid slice"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient><radialGradient id="r" cx=".3" cy=".2" r=".9"><stop offset="0" stop-color="#fff" stop-opacity=".45"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs><rect width="400" height="${Math.round((400 * h) / w)}" fill="url(#g)"/><rect width="400" height="${Math.round((400 * h) / w)}" fill="url(#r)"/><g transform="translate(0 ${Math.round((400 * h) / w / 2 - 250)})">${ICONS[kind]}</g></svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

/* --------------------------------- defaults --------------------------------- */

export const SECTION_DEFAULTS: Record<SectionId, { title: string; subtitle: string; label: string }> = {
  hero: { title: 'Welcome', subtitle: '', label: 'Opening' },
  couple: { title: 'The Couple', subtitle: 'Two people, one beautiful beginning', label: 'Couple' },
  story: { title: 'Our Love Story', subtitle: 'Every love story is beautiful, but ours is our favourite', label: 'Love story' },
  countdown: { title: 'Counting down to forever', subtitle: '', label: 'Countdown' },
  events: { title: 'Wedding Celebrations', subtitle: 'Join us for every moment', label: 'Events' },
  venue: { title: 'Venue & Directions', subtitle: 'Find your way to us', label: 'Venue' },
  gallery: { title: 'Our Memories', subtitle: 'A few of our favourite moments', label: 'Photo album' },
  family: { title: 'With the blessings of our families', subtitle: '', label: 'Family' },
  video: { title: 'Video Memories', subtitle: 'Moments in motion', label: 'Videos' },
  rsvp: { title: 'Kindly RSVP', subtitle: 'Let us know if you can celebrate with us', label: 'RSVP' },
  guestbook: { title: 'Leave Us a Message', subtitle: 'Your wishes make our day brighter', label: 'Guestbook' },
  thanks: { title: 'Thank You', subtitle: '', label: 'Closing' },
  share: { title: 'Share Our Happiness', subtitle: 'Pass the joy along to people we love', label: 'Share' },
}

export const SECTION_ORDER: SectionId[] = [
  'hero',
  'couple',
  'story',
  'countdown',
  'events',
  'venue',
  'gallery',
  'family',
  'video',
  'rsvp',
  'guestbook',
  'thanks',
  'share',
]

export function defaultSections(): SectionConfig[] {
  return SECTION_ORDER.map((id) => ({
    id,
    visible: true,
    title: SECTION_DEFAULTS[id].title,
    subtitle: SECTION_DEFAULTS[id].subtitle,
    background: '',
  }))
}

export const emptyPerson = (name = ''): Person => ({
  name,
  photo: '',
  bio: '',
  profession: '',
  hometown: '',
  instagram: '',
  facebook: '',
})

export const emptyEvent = (name = 'New event'): WeddingEvent => ({
  id: uid('ev'),
  name,
  date: '',
  time: '10:00',
  endTime: '',
  venue: '',
  address: '',
  mapsUrl: '',
  parking: '',
  dressCode: '',
  description: '',
})

export const ALBUM_SUGGESTIONS = [
  'Our Story',
  'Pre-Wedding',
  'Engagement',
  'Family',
  'Friends',
  'Memories',
  'Wedding Day',
]

/* ------------------------------ new-invitation seed ------------------------------ */

export function blankInvitation(ownerId: string, bride: string, groom: string, themeId = 'floral'): Invitation {
  const theme = getTheme(themeId)
  const now = new Date().toISOString()
  return {
    id: uid('inv'),
    ownerId,
    slug: '',
    published: false,
    couple: { bride: emptyPerson(bride), groom: emptyPerson(groom) },
    weddingDate: '',
    quote: 'Two hearts, one beautiful journey...',
    heroPhoto: '',
    welcome: 'Together with their families, they invite you to celebrate their wedding.',
    invitedBy: '',
    story: [],
    events: [{ ...emptyEvent('Wedding Ceremony') }],
    albums: [{ id: uid('alb'), name: 'Our Story', cover: '', photos: [] }],
    videos: [],
    family: {
      heading: 'With the blessings of our families',
      brideParents: '',
      groomParents: '',
      note: '',
      members: [],
    },
    music: { src: '', title: '', enabled: false },
    closing: {
      quote: 'Two souls, one heart,\none beautiful journey,\nand a lifetime to go.',
      thanks: 'Thank you for being a part of our special day.',
      photo: '',
    },
    sections: defaultSections(),
    custom: customFromTheme(theme),
    privacy: { visibility: 'public', password: '', moderateMessages: true },
    mealOptions: ['Vegetarian', 'Non-vegetarian', 'Vegan', 'No preference'],
    expectedGuests: 150,
    createdAt: now,
    updatedAt: now,
  }
}

/* ------------------------------ Arjun & Anjali demo ------------------------------ */

const photo = (kind: Kind, seed: number, w: number, h: number, alt: string, caption = '') => ({
  id: uid('ph'),
  src: placeholder(kind, seed, w, h),
  alt,
  caption,
})

export function demoInvitation(ownerId: string): Invitation {
  const base = blankInvitation(ownerId, 'Anjali Nair', 'Arjun Menon', 'floral')
  const albums: Album[] = [
    {
      id: uid('alb'),
      name: 'Our Story',
      cover: placeholder('couple', 0, 400, 500),
      photos: [
        photo('couple', 0, 400, 500, 'Arjun and Anjali on campus', 'Where it all began'),
        photo('scene', 5, 400, 300, 'Sunset by the backwaters', 'Backwater sunset'),
        photo('couple', 3, 400, 400, 'Laughing together at a cafe'),
        photo('floral', 1, 400, 560, 'Jasmine flowers', 'Her favourite flowers'),
        photo('scene', 2, 400, 280, 'Road trip to the hills', 'The great road trip'),
        photo('couple', 6, 400, 520, 'The proposal'),
      ],
    },
    {
      id: uid('alb'),
      name: 'Pre-Wedding',
      cover: placeholder('couple', 4, 400, 500),
      photos: [
        photo('couple', 4, 400, 520, 'Pre-wedding portrait'),
        photo('scene', 4, 400, 300, 'Golden hour shoot'),
        photo('couple', 7, 400, 420, 'Walking through tea gardens'),
        photo('floral', 7, 400, 500, 'Bouquet'),
      ],
    },
    {
      id: uid('alb'),
      name: 'Family',
      cover: placeholder('family', 2, 400, 500),
      photos: [
        photo('family', 2, 400, 360, 'Both families together'),
        photo('family', 5, 400, 500, 'With grandparents'),
        photo('portrait', 1, 400, 460, 'Anjali with her mother'),
      ],
    },
  ]

  return {
    ...base,
    id: 'inv_demo_arjun_anjali',
    slug: 'arjun-anjali',
    published: true,
    featured: true,
    couple: {
      groom: {
        name: 'Arjun Menon',
        photo: placeholder('portrait', 1, 400, 500),
        bio: 'A dreamer with a camera and a terrible sense of direction, Arjun believes the best things happen when you take the long way home.',
        profession: 'Software Engineer',
        hometown: 'Kochi, Kerala',
        instagram: 'https://instagram.com/',
        facebook: 'https://facebook.com/',
      },
      bride: {
        name: 'Anjali Nair',
        photo: placeholder('portrait', 0, 400, 500),
        bio: 'Anjali finds poetry in monsoon mornings and strong filter coffee. She is the calm to Arjunâ€™s chaos and the reason he is always on time.',
        profession: 'Architect',
        hometown: 'Thiruvananthapuram, Kerala',
        instagram: 'https://instagram.com/',
        facebook: '',
      },
    },
    weddingDate: '2026-12-20',
    heroPhoto: placeholder('couple', 0, 800, 1000),
    invitedBy: 'The families of Shri. Ramesh Menon & Smt. Latha Nair',
    story: [
      {
        id: uid('ms'),
        date: '2019',
        title: 'First Met',
        description:
          'We met as college friends in a crowded canteen queue. Neither of us knew that one borrowed pen would turn into a lifetime.',
        photos: [placeholder('scene', 0, 600, 400)],
        video: '',
        location: 'Kochi',
      },
      {
        id: uid('ms'),
        date: '2020',
        title: 'First Conversation',
        description:
          'That simple late-night conversation became something special. Hours felt like minutes, and we never ran out of things to say.',
        photos: [placeholder('couple', 3, 600, 400), placeholder('scene', 2, 600, 400)],
        video: '',
        location: 'Online, between two cities',
      },
      {
        id: uid('ms'),
        date: '2022',
        title: 'The Proposal',
        description: 'One question changed everything. She said yes before he could even finish asking.',
        photos: [placeholder('couple', 6, 600, 400)],
        video: '',
        location: 'Munnar',
      },
      {
        id: uid('ms'),
        date: '2026',
        title: 'The Wedding',
        description: 'And now, forever beginsâ€¦',
        photos: [placeholder('floral', 4, 600, 400)],
        video: '',
        location: 'Grand Palace Convention Centre',
      },
    ],
    events: [
      {
        id: uid('ev'),
        name: 'Mehendi',
        date: '2026-12-18',
        time: '16:00',
        endTime: '19:00',
        venue: 'Anjaliâ€™s Residence',
        address: 'Palarivattom, Kochi, Kerala 682025',
        mapsUrl: '',
        parking: 'Street parking available; please carpool where possible.',
        dressCode: 'Colourful festive wear',
        description: 'An afternoon of henna, music and laughter with the closest family and friends.',
      },
      {
        id: uid('ev'),
        name: 'Haldi & Sangeet',
        date: '2026-12-19',
        time: '17:00',
        endTime: '22:30',
        venue: 'Lotus Garden Banquet',
        address: 'Edappally, Kochi, Kerala 682024',
        mapsUrl: '',
        parking: 'Free valet parking at the main gate.',
        dressCode: 'Yellow for Haldi Â· Glam for Sangeet',
        description: 'Turmeric, dance performances, and an evening of music you will not want to miss.',
      },
      {
        id: uid('ev'),
        name: 'Wedding Ceremony',
        date: '2026-12-20',
        time: '10:30',
        endTime: '13:00',
        venue: 'Grand Palace Convention Centre',
        address: 'MG Road, Ernakulam, Kochi, Kerala 682011',
        mapsUrl: '',
        parking: 'Basement parking for 300 cars. Additional parking opposite the venue.',
        dressCode: 'Traditional Â· Kasavu saree / Mundu',
        description:
          'The muhurtham is at 11:15 AM. Please be seated by 10:45 AM. A traditional Kerala sadya will follow the ceremony.',
      },
      {
        id: uid('ev'),
        name: 'Reception',
        date: '2026-12-20',
        time: '18:30',
        endTime: '22:00',
        venue: 'Grand Palace Convention Centre â€” Crystal Hall',
        address: 'MG Road, Ernakulam, Kochi, Kerala 682011',
        mapsUrl: '',
        parking: 'Basement parking for 300 cars.',
        dressCode: 'Formal / Cocktail',
        description: 'Dinner, dancing and heartfelt toasts to celebrate the newlyweds.',
      },
    ],
    albums,
    videos: [
      {
        id: uid('vid'),
        title: 'Save the Date',
        url: 'https://www.youtube.com/watch?v=ScMzIvxBSi4',
        kind: 'youtube',
      },
    ],
    family: {
      heading: 'With the blessings of our families',
      brideParents: 'Shri. Gopalakrishnan Nair & Smt. Latha Nair',
      groomParents: 'Shri. Ramesh Menon & Smt. Sreedevi Menon',
      note: 'Together with our beloved grandparents, whose blessings have guided us.',
      members: [
        { id: uid('fm'), name: 'Gopalakrishnan Nair', relation: 'Father of the bride', side: 'bride', photo: placeholder('portrait', 2, 300, 300) },
        { id: uid('fm'), name: 'Latha Nair', relation: 'Mother of the bride', side: 'bride', photo: placeholder('portrait', 6, 300, 300) },
        { id: uid('fm'), name: 'Ramesh Menon', relation: 'Father of the groom', side: 'groom', photo: placeholder('portrait', 5, 300, 300) },
        { id: uid('fm'), name: 'Sreedevi Menon', relation: 'Mother of the groom', side: 'groom', photo: placeholder('portrait', 3, 300, 300) },
      ],
    },
    closing: {
      quote: 'Two souls, one heart,\none beautiful journey,\nand a lifetime to go.',
      thanks: 'Thank you for being a part of our special day.',
      photo: placeholder('couple', 6, 800, 1000),
    },
    expectedGuests: 400,
    music: { src: 'builtin:serenade', title: 'Serenade (built-in)', enabled: true },
    privacy: { visibility: 'public', password: '', moderateMessages: false },
  }
}

export const DEMO_STORY_TEXT =
  'We met as college friends, became best friends, and slowly realized that what we had was something much more beautiful. After years of memories, laughter, adventures and countless conversations, we decided to begin the greatest journey of our lives together.'

