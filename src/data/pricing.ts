import type { Plan, PricingPlan } from '../types'

/** Edit this list (or change it live from the admin panel) – the landing page reads it from settings. */
export const DEFAULT_PRICING: PricingPlan[] = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    period: 'forever',
    blurb: 'Everything you need for a simple, beautiful invitation.',
    features: ['1 invitation', 'Basic themes', 'Up to 20 photos', 'Basic RSVP', 'Shareable link & QR code'],
  },
  {
    id: 'premium',
    name: 'Premium',
    price: 19,
    period: 'one-time',
    blurb: 'The full experience for your big day.',
    highlight: true,
    features: [
      'Unlimited photos & albums',
      'All premium themes',
      'Custom background music',
      'Love story & video memories',
      'RSVP management & export',
      'Analytics dashboard',
      'Custom invitation URL',
    ],
  },
  {
    id: 'luxury',
    name: 'Luxury',
    price: 49,
    period: 'one-time',
    blurb: 'White-glove polish with your own domain.',
    features: [
      'Everything in Premium',
      'Advanced customisation',
      'Premium animations',
      'Custom domain',
      'Priority support',
    ],
  },
]

export interface PlanLimits {
  photos: number
  premiumThemes: boolean
  music: boolean
  video: boolean
  story: boolean
  analytics: boolean
  customSlug: boolean
  rsvpExport: boolean
}

export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  free: {
    photos: 20,
    premiumThemes: false,
    music: false,
    video: false,
    story: true,
    analytics: false,
    customSlug: false,
    rsvpExport: false,
  },
  premium: {
    photos: Infinity,
    premiumThemes: true,
    music: true,
    video: true,
    story: true,
    analytics: true,
    customSlug: true,
    rsvpExport: true,
  },
  luxury: {
    photos: Infinity,
    premiumThemes: true,
    music: true,
    video: true,
    story: true,
    analytics: true,
    customSlug: true,
    rsvpExport: true,
  },
}

export const FREE_THEME_IDS = ['floral', 'minimal', 'white']

/** New sign-ups start on this plan so every feature can be explored in the demo. */
export const DEFAULT_SIGNUP_PLAN: Plan = 'premium'

export const TESTIMONIALS = [
  {
    quote:
      'Our guests kept telling us the invitation felt like a little film. We built it in one evening, on the sofa, from our phones.',
    name: 'Meera & Rohan',
    place: 'Bengaluru',
  },
  {
    quote:
      'The RSVP dashboard saved us hundreds of phone calls. Meal preferences, headcount, everything in one place.',
    name: 'Sarah & David',
    place: 'London',
  },
  {
    quote:
      'My grandmother opened it on WhatsApp and cried at the love story. That was worth everything.',
    name: 'Anu & Vishnu',
    place: 'Kochi',
  },
]

export const FAQS = [
  {
    q: 'Do my guests need to install anything?',
    a: 'No. Guests simply open your unique link (or scan your QR code) on any phone, tablet or computer.',
  },
  {
    q: 'Can I change the invitation after I share it?',
    a: 'Yes. Edits are autosaved and appear on your live link as soon as you hit Publish again.',
  },
  {
    q: 'Can I keep my invitation private?',
    a: 'Absolutely. Make it private, or protect it with a password you share only with your guests.',
  },
  {
    q: 'Is the guest list visible to the public?',
    a: 'Never. RSVPs and guest information are only visible inside your dashboard.',
  },
  {
    q: 'Can I add several events like Mehendi, Haldi and Sangeet?',
    a: 'Yes — add as many events as you like. Each gets its own card, countdown, calendar button and map.',
  },
]
