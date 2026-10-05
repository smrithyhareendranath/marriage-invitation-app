export type Plan = 'free' | 'premium' | 'luxury'

export interface User {
  id: string
  name: string
  email: string
  plan: Plan
  role: 'couple' | 'admin'
  provider: 'password' | 'google'
  createdAt: string
  suspended?: boolean
}

export interface Person {
  name: string
  photo: string
  bio: string
  profession: string
  hometown: string
  instagram: string
  facebook: string
}

export interface Milestone {
  id: string
  date: string
  title: string
  description: string
  photos: string[]
  video: string
  location: string
}

export interface WeddingEvent {
  id: string
  name: string
  date: string // yyyy-mm-dd
  time: string // HH:mm
  endTime: string
  venue: string
  address: string
  mapsUrl: string
  parking: string
  dressCode: string
  description: string
}

export interface Photo {
  id: string
  src: string
  alt: string
  caption: string
}

export interface Album {
  id: string
  name: string
  cover: string
  photos: Photo[]
}

export interface VideoItem {
  id: string
  title: string
  url: string
  kind: 'youtube' | 'vimeo' | 'upload'
}

export interface FamilyMember {
  id: string
  name: string
  relation: string
  photo: string
  side: 'bride' | 'groom'
}

export type SectionId =
  | 'hero'
  | 'couple'
  | 'story'
  | 'countdown'
  | 'events'
  | 'venue'
  | 'gallery'
  | 'family'
  | 'video'
  | 'rsvp'
  | 'guestbook'
  | 'thanks'
  | 'share'

export interface SectionConfig {
  id: SectionId
  visible: boolean
  title: string
  subtitle: string
  background: string // css color / gradient or '' for default
}

export type AnimationStyle = 'petals' | 'sparkles' | 'hearts' | 'none'
export type DecorStyle = 'floral' | 'royal' | 'minimal' | 'kerala' | 'garden' | 'gold'

export interface Customization {
  themeId: string
  primary: string
  secondary: string
  fontPairId: string
  background: string
  decor: DecorStyle
  animation: AnimationStyle
}

export interface Privacy {
  visibility: 'public' | 'private'
  password: string
  moderateMessages: boolean
}

export interface Invitation {
  id: string
  ownerId: string
  slug: string
  published: boolean
  couple: { bride: Person; groom: Person }
  weddingDate: string // yyyy-mm-dd
  quote: string
  heroPhoto: string
  welcome: string
  invitedBy: string
  story: Milestone[]
  events: WeddingEvent[]
  albums: Album[]
  videos: VideoItem[]
  family: {
    heading: string
    brideParents: string
    groomParents: string
    note: string
    members: FamilyMember[]
  }
  music: { src: string; title: string; enabled: boolean }
  closing: { quote: string; thanks: string; photo: string }
  sections: SectionConfig[]
  custom: Customization
  privacy: Privacy
  mealOptions: string[]
  expectedGuests: number
  createdAt: string
  updatedAt: string
  featured?: boolean
  reported?: boolean
}

export interface Rsvp {
  id: string
  invitationId: string
  name: string
  contact: string
  attending: 'yes' | 'no' | 'maybe'
  guests: number
  meal: string
  message: string
  createdAt: string
}

export interface GuestMessage {
  id: string
  invitationId: string
  name: string
  text: string
  status: 'pending' | 'approved' | 'rejected'
  hearts: number
  reported?: boolean
  createdAt: string
}

export type AnalyticsKind =
  | 'view'
  | 'rsvp'
  | 'share_whatsapp'
  | 'share_other'
  | 'link_click'
  | 'map_click'
  | 'gallery_view'

export interface AnalyticsEvent {
  id: string
  invitationId: string
  kind: AnalyticsKind
  visitor: string
  at: string
}

export interface ThemePreset {
  id: string
  name: string
  tagline: string
  primary: string
  secondary: string
  bg: string
  surface: string
  text: string
  muted: string
  dark: boolean
  fontPairId: string
  decor: DecorStyle
  animation: AnimationStyle
  cover: string // css gradient for the opening screen
}

export interface FontPair {
  id: string
  name: string
  heading: string
  body: string
  script: string
}

export interface PricingPlan {
  id: Plan
  name: string
  price: number
  period: string
  blurb: string
  features: string[]
  highlight?: boolean
}
