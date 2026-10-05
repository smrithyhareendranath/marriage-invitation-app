import type { Customization } from '../types'
import { getFontPair, getTheme } from '../data/themes'

function parse(hex: string): [number, number, number] {
  let h = hex.replace('#', '')
  if (h.length === 3) h = h.split('').map((c) => c + c).join('')
  const n = parseInt(h.padEnd(6, '0').slice(0, 6), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

const toHex = (r: number, g: number, b: number) =>
  '#' + [r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('')

export function mix(a: string, b: string, t: number): string {
  const [r1, g1, b1] = parse(a)
  const [r2, g2, b2] = parse(b)
  return toHex(r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t)
}

export function luminance(hex: string): number {
  const [r, g, b] = parse(hex).map((v) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function contrast(a: string, b: string): number {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (l1 + 0.05) / (l2 + 0.05)
}

export function rgba(hex: string, alpha: number): string {
  const [r, g, b] = parse(hex)
  return `rgba(${r},${g},${b},${alpha})`
}

export const isValidHex = (v: string) => /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v)

/** Turn a customization into the CSS variables the invitation is styled with. */
export function themeVars(c: Customization): Record<string, string> {
  const preset = getTheme(c.themeId)
  const fonts = getFontPair(c.fontPairId)
  const bg = isValidHex(c.background) ? c.background : preset.bg
  const dark = luminance(bg) < 0.25
  const usePresetText = bg.toLowerCase() === preset.bg.toLowerCase()
  const text = usePresetText ? preset.text : dark ? '#f4efe6' : '#2b2024'
  const surface = usePresetText ? preset.surface : dark ? mix(bg, '#ffffff', 0.07) : mix(bg, '#ffffff', 0.7)
  const muted = usePresetText ? preset.muted : mix(text, bg, 0.42)
  // keep accent text readable against the page background
  let accent = c.primary
  if (contrast(accent, bg) < 3) accent = dark ? mix(accent, '#ffffff', 0.45) : mix(accent, '#000000', 0.35)
  return {
    '--primary': c.primary,
    '--accent': accent,
    '--secondary': c.secondary,
    '--bg': bg,
    '--surface': surface,
    '--surface-alt': dark ? mix(bg, '#ffffff', 0.035) : mix(bg, c.primary, 0.045),
    '--text': text,
    '--muted': muted,
    '--line': rgba(dark ? '#ffffff' : '#000000', dark ? 0.14 : 0.1),
    '--on-primary': luminance(c.primary) > 0.45 ? '#1b1416' : '#ffffff',
    '--glass': dark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.62)',
    '--shadow': dark ? '0 18px 50px rgba(0,0,0,.45)' : `0 18px 50px ${rgba(c.primary, 0.14)}`,
    '--font-h': fonts.heading,
    '--font-b': fonts.body,
    '--font-s': fonts.script,
    colorScheme: dark ? 'dark' : 'light',
  }
}
