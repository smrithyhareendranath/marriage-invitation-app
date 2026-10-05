import { THEMES } from '../data/themes'

/**
 * AI helper layer
 * ---------------
 * The dashboard only calls `ai.*`. This build ships an offline, template-based writer so every AI
 * button works with no API key. To use a real model, replace `localAi` with an implementation that
 * POSTs to your backend (which holds the Claude API key – never ship keys in the browser) and
 * returns the same shapes.
 */

export interface Palette {
  name: string
  primary: string
  secondary: string
  background: string
}

export interface AiProvider {
  story(input: { text: string; bride: string; groom: string }): Promise<string>
  wording(input: { bride: string; groom: string; tone: string }): Promise<string>
  quotes(input: { tone: string }): Promise<string[]>
  improve(text: string): Promise<string>
  caption(input: { alt: string; album: string }): Promise<string>
  palettes(input: { mood: string }): Promise<Palette[]>
  welcome(input: { bride: string; groom: string; guest: string }): Promise<string>
  themes(input: { mood: string }): Promise<string[]>
}

const wait = (ms = 700) => new Promise((r) => setTimeout(r, ms + Math.random() * 400))
const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)]

function polish(text: string): string {
  const t = text
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.!?;:])/g, '$1')
    .replace(/([,.!?;:])(?=[A-Za-z])/g, '$1 ')
    .replace(/\bi\b/g, 'I')
    .replace(/\bi'm\b/gi, "I'm")
    .replace(/\bdont\b/gi, "don't")
    .replace(/\bcant\b/gi, "can't")
    .replace(/\bwont\b/gi, "won't")
    .replace(/\bthier\b/gi, 'their')
    .replace(/\bteh\b/gi, 'the')
    .replace(/\brecieve/gi, 'receive')
    .replace(/\bdefinately\b/gi, 'definitely')
    .replace(/\bbeleive/gi, 'believe')
    .replace(/\bwich\b/gi, 'which')
    .trim()
  if (!t) return ''
  const sentences = t.split(/(?<=[.!?])\s+/).map((s) => s.charAt(0).toUpperCase() + s.slice(1))
  let out = sentences.join(' ')
  if (!/[.!?…]$/.test(out)) out += '.'
  return out
}

const QUOTES: Record<string, string[]> = {
  romantic: [
    'Two hearts, one beautiful journey…',
    'In you, I have found my forever.',
    'Whatever our souls are made of, yours and mine are the same.',
    'You are my today and all of my tomorrows.',
    'Love is composed of a single soul inhabiting two bodies.',
  ],
  traditional: [
    'Marriages are made in heaven and celebrated on earth.',
    'With the blessings of our elders and the grace of God, we begin a sacred journey.',
    'Seven steps, seven vows, one lifetime together.',
    'Two souls, two families, one beautiful bond.',
  ],
  fun: [
    'She said yes to the dress… and to me!',
    'Our greatest adventure begins now.',
    'Plot twist: the best friend became the best husband.',
    'Happily ever after starts here.',
  ],
  minimal: ['Together, always.', 'Just us. Forever.', 'Love, simply.', 'Two names. One story.'],
}

export const localAi: AiProvider = {
  async story({ text, bride, groom }) {
    await wait()
    const body = polish(text)
    const intro = pick([
      `Every love story is beautiful, but ours is the one we are most grateful for.`,
      `Some stories begin with a spark. Ours began with a friendship.`,
    ])
    const outro = pick([
      `And so, with full hearts and the blessings of our families, ${groom || 'he'} and ${bride || 'she'} are beginning the greatest chapter of their lives — together.`,
      `Today, surrounded by the people we love most, we are ready to write the next chapter as one.`,
    ])
    return [intro, body || 'We found each other when we were not even looking.', outro].join('\n\n')
  },

  async wording({ bride, groom, tone }) {
    await wait()
    const g = groom || 'the groom'
    const b = bride || 'the bride'
    const lines: Record<string, string> = {
      formal: `Together with their families,\n${b} & ${g}\nrequest the pleasure of your company\nat the celebration of their marriage.`,
      warm: `We are getting married, and we would be so happy to have you there.\n${b} & ${g} invite you to celebrate the beginning of our forever.`,
      traditional: `With the divine blessings of the Almighty and our beloved elders,\nwe joyfully invite you to the wedding of\n${b} & ${g}.\nYour presence will make our celebration complete.`,
      fun: `They met. They laughed. They fell in love.\nNow ${b} & ${g} are tying the knot — and you are invited to the party!`,
    }
    return lines[tone] ?? lines.warm
  },

  async quotes({ tone }) {
    await wait(400)
    const pool = QUOTES[tone] ?? QUOTES.romantic
    return [...pool].sort(() => Math.random() - 0.5).slice(0, 4)
  },

  async improve(text) {
    await wait(500)
    return polish(text)
  },

  async caption({ alt, album }) {
    await wait(350)
    const subject = alt?.trim() || album?.trim() || 'this moment'
    return pick([
      `${subject.charAt(0).toUpperCase()}${subject.slice(1)} — a memory we will keep forever.`,
      `Little moments, big love: ${subject.toLowerCase()}.`,
      `${subject.charAt(0).toUpperCase()}${subject.slice(1)}. Pure happiness.`,
    ])
  },

  async palettes({ mood }) {
    await wait(500)
    const m = mood.toLowerCase()
    const sets: Record<string, Palette[]> = {
      blush: [
        { name: 'Rose Quartz', primary: '#c2547a', secondary: '#e9b8c8', background: '#fff6f7' },
        { name: 'Peony Garden', primary: '#b84a6b', secondary: '#7a9a7e', background: '#fffafa' },
      ],
      gold: [
        { name: 'Champagne Gold', primary: '#b08d57', secondary: '#e7d9bd', background: '#fffdf8' },
        { name: 'Antique Brass', primary: '#9a7b3a', secondary: '#d8c48a', background: '#fbf6ea' },
      ],
      green: [
        { name: 'Sage & Cream', primary: '#5f8a6a', secondary: '#e8a87c', background: '#f6faf4' },
        { name: 'Eucalyptus', primary: '#3f7d58', secondary: '#c9d8b6', background: '#f8fbf6' },
      ],
      traditional: [
        { name: 'Kasavu', primary: '#a16207', secondary: '#166534', background: '#fdf8ec' },
        { name: 'Vermilion & Marigold', primary: '#c2410c', secondary: '#f59e0b', background: '#fff7e8' },
      ],
      dark: [
        { name: 'Midnight Gold', primary: '#d4af37', secondary: '#f1e2a6', background: '#0b1020' },
        { name: 'Noir Champagne', primary: '#b08d57', secondary: '#e7d9bd', background: '#16151a' },
      ],
      blue: [
        { name: 'Dusty Blue', primary: '#4f6d8f', secondary: '#e6d3c1', background: '#f7fafc' },
        { name: 'Sky & Peach', primary: '#4f86b8', secondary: '#f2a58e', background: '#f6fafe' },
      ],
    }
    const key =
      Object.keys(sets).find((k) => m.includes(k)) ??
      (m.includes('pink') || m.includes('soft') || m.includes('romantic')
        ? 'blush'
        : m.includes('night') || m.includes('luxury')
          ? 'dark'
          : m.includes('kerala') || m.includes('indian')
            ? 'traditional'
            : m.includes('garden') || m.includes('nature')
              ? 'green'
              : 'blush')
    return sets[key]
  },

  async welcome({ bride, groom, guest }) {
    await wait(450)
    const who = guest?.trim() ? `Dear ${guest.trim()}` : 'Dear friends & family'
    return `${who}, ${groom || 'we'} and ${bride || 'we'} are overjoyed to share the beginning of our forever with you. Your love has shaped our story, and we cannot imagine celebrating without you.`
  },

  async themes({ mood }) {
    await wait(400)
    const m = mood.toLowerCase()
    const score = (id: string) => {
      const t = THEMES.find((x) => x.id === id)!
      let s = 0
      for (const w of m.split(/\W+/).filter(Boolean)) {
        if (`${t.name} ${t.tagline}`.toLowerCase().includes(w)) s += 2
      }
      if (/dark|night|luxury|gold/.test(m) && t.dark) s += 2
      if (/kerala|india|tradition/.test(m) && /indian|kerala/.test(id)) s += 3
      if (/simple|minimal|clean/.test(m) && /minimal|white/.test(id)) s += 3
      if (/flower|floral|garden|spring/.test(m) && /floral|garden|pastel/.test(id)) s += 3
      return s + Math.random()
    }
    return THEMES.map((t) => t.id).sort((a, b) => score(b) - score(a)).slice(0, 3)
  },
}

export const ai: AiProvider = localAi
