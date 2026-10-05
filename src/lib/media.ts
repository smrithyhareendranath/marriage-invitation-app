import { useEffect, useState } from 'react'
import { uid } from './util'

/**
 * Media architecture
 * ------------------
 * Every uploaded file is stored behind a `media:<id>` reference. Invitation data only ever holds
 * that reference (or a plain https:// / data: URL for demo content).
 *
 * The blob storage below is IndexedDB so it works offline with no backend. To move to the cloud,
 * implement `MediaStore` against S3 / Cloudinary / Firebase Storage (signed upload URL, return a
 * CDN URL) and swap `mediaStore` – nothing else in the app needs to change.
 */

export interface MediaStore {
  put(id: string, blob: Blob): Promise<void>
  get(id: string): Promise<Blob | undefined>
  remove(id: string): Promise<void>
  usage(): Promise<number>
}

const DB_NAME = 'mia-media'
const STORE = 'blobs'

let dbPromise: Promise<IDBDatabase> | null = null
function openDb(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1)
      req.onupgradeneeded = () => req.result.createObjectStore(STORE)
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
  }
  return dbPromise
}

function tx<T>(mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const req = run(db.transaction(STORE, mode).objectStore(STORE))
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => reject(req.error)
      }),
  )
}

export const mediaStore: MediaStore = {
  put: (id, blob) => tx('readwrite', (s) => s.put(blob, id)).then(() => undefined),
  get: (id) => tx<Blob | undefined>('readonly', (s) => s.get(id)),
  remove: (id) => tx('readwrite', (s) => s.delete(id)).then(() => undefined),
  usage: async () => {
    const all = await tx<Blob[]>('readonly', (s) => s.getAll())
    return all.reduce((n, b) => n + (b?.size ?? 0), 0)
  },
}

export const isMedia = (src: string) => src.startsWith('media:')
export const mediaId = (src: string) => src.slice('media:'.length)

const urlCache = new Map<string, string>()

export async function resolveMedia(src: string, thumb = false): Promise<string> {
  if (!src || !isMedia(src)) return src
  const key = thumb ? `${mediaId(src)}.t` : mediaId(src)
  const cached = urlCache.get(key)
  if (cached) return cached
  let blob = await mediaStore.get(key)
  if (!blob && thumb) blob = await mediaStore.get(mediaId(src))
  if (!blob) return ''
  const url = URL.createObjectURL(blob)
  urlCache.set(key, url)
  return url
}

/** Resolve a stored reference to something usable in <img src>. */
export function useMediaSrc(src: string, thumb = false): string {
  const [url, setUrl] = useState<string>(() => (isMedia(src) ? '' : src))
  useEffect(() => {
    let alive = true
    if (!isMedia(src)) {
      setUrl(src)
      return
    }
    resolveMedia(src, thumb).then((u) => alive && setUrl(u))
    return () => {
      alive = false
    }
  }, [src, thumb])
  return url
}

export async function removeMedia(src: string) {
  if (!isMedia(src)) return
  const id = mediaId(src)
  for (const key of [id, `${id}.t`]) {
    const u = urlCache.get(key)
    if (u) URL.revokeObjectURL(u)
    urlCache.delete(key)
    await mediaStore.remove(key).catch(() => undefined)
  }
}

/* ------------------------------ image processing ------------------------------ */

export interface CropRect {
  x: number
  y: number
  w: number
  h: number
} // fractions (0-1) of the rotated image

export interface ProcessOptions {
  maxSize?: number
  quality?: number
  rotate?: 0 | 90 | 180 | 270
  crop?: CropRect
}

async function toBitmap(blob: Blob): Promise<ImageBitmap> {
  return createImageBitmap(blob, { imageOrientation: 'from-image' })
}

function canvasBlob(c: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) =>
    c.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not encode image'))), 'image/jpeg', quality),
  )
}

export function rotateCanvas(bmp: ImageBitmap, rotate: number): HTMLCanvasElement {
  const swap = rotate === 90 || rotate === 270
  const c = document.createElement('canvas')
  c.width = swap ? bmp.height : bmp.width
  c.height = swap ? bmp.width : bmp.height
  const ctx = c.getContext('2d')!
  ctx.translate(c.width / 2, c.height / 2)
  ctx.rotate((rotate * Math.PI) / 180)
  ctx.drawImage(bmp, -bmp.width / 2, -bmp.height / 2)
  return c
}

export async function processImage(source: Blob, opts: ProcessOptions = {}): Promise<Blob> {
  const { maxSize = 1600, quality = 0.82, rotate = 0, crop } = opts
  const bmp = await toBitmap(source)
  const rotated = rotate ? rotateCanvas(bmp, rotate) : null
  const w = rotated ? rotated.width : bmp.width
  const h = rotated ? rotated.height : bmp.height
  const sx = crop ? Math.round(crop.x * w) : 0
  const sy = crop ? Math.round(crop.y * h) : 0
  const sw = crop ? Math.max(1, Math.round(crop.w * w)) : w
  const sh = crop ? Math.max(1, Math.round(crop.h * h)) : h
  const scale = Math.min(1, maxSize / Math.max(sw, sh))
  const out = document.createElement('canvas')
  out.width = Math.max(1, Math.round(sw * scale))
  out.height = Math.max(1, Math.round(sh * scale))
  const ctx = out.getContext('2d')!
  ctx.imageSmoothingQuality = 'high'
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, out.width, out.height)
  ctx.drawImage(rotated ?? bmp, sx, sy, sw, sh, 0, 0, out.width, out.height)
  bmp.close?.()
  return canvasBlob(out, quality)
}

export const MAX_IMAGE_BYTES = 25 * 1024 * 1024
export const MAX_AUDIO_BYTES = 15 * 1024 * 1024
export const MAX_VIDEO_BYTES = 60 * 1024 * 1024

export function validateImage(file: File): string | null {
  if (!file.type.startsWith('image/')) return `“${file.name}” is not an image.`
  if (file.size > MAX_IMAGE_BYTES) return `“${file.name}” is larger than 25 MB.`
  return null
}

/** Compress + store an image (and a small thumbnail). Returns the `media:` reference. */
export async function saveImage(
  file: Blob,
  opts: ProcessOptions = {},
  onProgress?: (pct: number) => void,
): Promise<string> {
  const id = uid('img')
  onProgress?.(8)
  const full = await processImage(file, opts)
  onProgress?.(55)
  await mediaStore.put(id, full)
  onProgress?.(75)
  const thumb = await processImage(full, { maxSize: 480, quality: 0.7 })
  await mediaStore.put(`${id}.t`, thumb)
  onProgress?.(100)
  return `media:${id}`
}

/** Store audio/video as-is. */
export async function saveFile(file: File, kind: 'audio' | 'video'): Promise<string> {
  const limit = kind === 'audio' ? MAX_AUDIO_BYTES : MAX_VIDEO_BYTES
  if (!file.type.startsWith(`${kind}/`)) throw new Error(`Please choose an ${kind} file.`)
  if (file.size > limit) throw new Error(`File is larger than ${Math.round(limit / 1048576)} MB.`)
  const id = uid(kind)
  await mediaStore.put(id, file)
  return `media:${id}`
}

export async function loadBlob(src: string): Promise<Blob | undefined> {
  if (isMedia(src)) return mediaStore.get(mediaId(src))
  if (!src) return undefined
  try {
    return await (await fetch(src)).blob()
  } catch {
    return undefined
  }
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1048576) return `${(n / 1024).toFixed(0)} KB`
  return `${(n / 1048576).toFixed(1)} MB`
}
