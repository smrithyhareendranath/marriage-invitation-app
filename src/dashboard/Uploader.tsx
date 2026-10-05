import { useCallback, useEffect, useRef, useState } from 'react'
import type { DragEvent } from 'react'
import { Icon } from '../components/Icon'
import { Img } from '../components/Img'
import { Modal } from '../components/Modal'
import { useToast } from '../context'
import {
  formatBytes,
  loadBlob,
  removeMedia,
  rotateCanvas,
  saveImage,
  validateImage,
} from '../lib/media'
import type { CropRect } from '../lib/media'
import { clamp } from '../lib/util'

/* ----------------------------- crop / rotate editor ----------------------------- */

const ASPECTS: { id: string; label: string; ratio: number | null }[] = [
  { id: 'orig', label: 'Original', ratio: null },
  { id: '1', label: 'Square', ratio: 1 },
  { id: '4:5', label: 'Portrait 4:5', ratio: 4 / 5 },
  { id: '3:2', label: 'Landscape 3:2', ratio: 3 / 2 },
  { id: '16:9', label: 'Wide 16:9', ratio: 16 / 9 },
]

interface EditorProps {
  source: Blob
  /** Preferred ratio (w/h); null keeps the original proportions. */
  aspect?: number | null
  allowAspect?: boolean
  title?: string
  onCancel(): void
  onDone(result: { rotate: 0 | 90 | 180 | 270; crop: CropRect }): void
}

export function ImageEditor({ source, aspect = null, allowAspect = true, title = 'Adjust photo', onCancel, onDone }: EditorProps) {
  const [rotate, setRotate] = useState<0 | 90 | 180 | 270>(0)
  const [zoom, setZoom] = useState(1)
  const [off, setOff] = useState({ x: 0, y: 0 })
  const [ratioId, setRatioId] = useState(() => ASPECTS.find((a) => a.ratio === aspect)?.id ?? (aspect ? '4:5' : 'orig'))
  const [view, setView] = useState<{ url: string; w: number; h: number } | null>(null)
  const box = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: 320, h: 400 })
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null)

  // rotated preview (max 1200px) so what you see is what gets saved
  useEffect(() => {
    let revoked = ''
    let alive = true
    ;(async () => {
      const bmp = await createImageBitmap(source, { imageOrientation: 'from-image' })
      const scale = Math.min(1, 1200 / Math.max(bmp.width, bmp.height))
      const small = document.createElement('canvas')
      small.width = Math.round(bmp.width * scale)
      small.height = Math.round(bmp.height * scale)
      small.getContext('2d')!.drawImage(bmp, 0, 0, small.width, small.height)
      const small2 = await createImageBitmap(small)
      const c = rotate ? rotateCanvas(small2, rotate) : small
      const blob: Blob = await new Promise((r) => c.toBlob((b) => r(b!), 'image/jpeg', 0.85))
      if (!alive) return
      revoked = URL.createObjectURL(blob)
      setView({ url: revoked, w: c.width, h: c.height })
    })().catch(() => undefined)
    return () => {
      alive = false
      if (revoked) URL.revokeObjectURL(revoked)
    }
  }, [source, rotate])

  const ratio = ASPECTS.find((a) => a.id === ratioId)?.ratio ?? (view ? view.w / view.h : 1)

  useEffect(() => {
    const el = box.current
    if (!el) return
    const measure = () => {
      const maxW = Math.min(el.parentElement?.clientWidth ?? 420, 460)
      const maxH = Math.min(window.innerHeight * 0.5, 460)
      let w = maxW
      let h = w / ratio
      if (h > maxH) {
        h = maxH
        w = h * ratio
      }
      setSize({ w: Math.round(w), h: Math.round(h) })
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [ratio])

  const geom = (() => {
    if (!view) return null
    const s0 = Math.max(size.w / view.w, size.h / view.h)
    const s = s0 * zoom
    const maxX = Math.max(0, (view.w * s - size.w) / 2)
    const maxY = Math.max(0, (view.h * s - size.h) / 2)
    return { s, maxX, maxY }
  })()

  const ox = geom ? clamp(off.x, -geom.maxX, geom.maxX) : 0
  const oy = geom ? clamp(off.y, -geom.maxY, geom.maxY) : 0

  const confirm = () => {
    if (!view || !geom) return
    const { s } = geom
    const left = (view.w * s / 2 - size.w / 2 - ox) / s
    const top = (view.h * s / 2 - size.h / 2 - oy) / s
    onDone({
      rotate,
      crop: {
        x: clamp(left / view.w, 0, 1),
        y: clamp(top / view.h, 0, 1),
        w: clamp(size.w / s / view.w, 0.01, 1),
        h: clamp(size.h / s / view.h, 0.01, 1),
      },
    })
  }

  return (
    <Modal
      title={title}
      onClose={onCancel}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onCancel}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={confirm} disabled={!view}>
            <Icon name="check" size={16} /> Use this photo
          </button>
        </>
      }
    >
      <div className="cropper">
        <div
          ref={box}
          className="crop-box"
          style={{ width: size.w, height: size.h, touchAction: 'none' }}
          onPointerDown={(e) => {
            ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
            drag.current = { x: e.clientX, y: e.clientY, ox, oy }
          }}
          onPointerMove={(e) => {
            if (!drag.current) return
            setOff({ x: drag.current.ox + e.clientX - drag.current.x, y: drag.current.oy + e.clientY - drag.current.y })
          }}
          onPointerUp={() => (drag.current = null)}
          onPointerCancel={() => (drag.current = null)}
        >
          {view && geom ? (
            <img
              src={view.url}
              alt="Photo being edited"
              draggable={false}
              style={{
                width: view.w * geom.s,
                height: view.h * geom.s,
                transform: `translate(calc(-50% + ${ox}px), calc(-50% + ${oy}px))`,
              }}
            />
          ) : (
            <div className="skeleton" />
          )}
          <span className="crop-grid" aria-hidden="true" />
        </div>
        <p className="hint center">Drag to reposition · use the slider to zoom</p>

        <div className="crop-controls">
          <label className="zoom">
            <Icon name="zoomin" size={16} />
            <input type="range" min={1} max={3} step={0.01} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} aria-label="Zoom" />
          </label>
          <div className="crop-btns">
            <button className="btn btn-ghost sm" onClick={() => { setRotate(((rotate + 270) % 360) as 0 | 90 | 180 | 270); setOff({ x: 0, y: 0 }) }}>
              <Icon name="rotate" size={15} style={{ transform: 'scaleX(-1)' }} /> Left
            </button>
            <button className="btn btn-ghost sm" onClick={() => { setRotate(((rotate + 90) % 360) as 0 | 90 | 180 | 270); setOff({ x: 0, y: 0 }) }}>
              <Icon name="rotate" size={15} /> Right
            </button>
          </div>
        </div>

        {allowAspect && (
          <div className="chips-row" role="radiogroup" aria-label="Crop shape">
            {ASPECTS.map((a) => (
              <button key={a.id} role="radio" aria-checked={ratioId === a.id} className={`chip ${ratioId === a.id ? 'on' : ''}`} onClick={() => { setRatioId(a.id); setOff({ x: 0, y: 0 }) }}>
                {a.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </Modal>
  )
}

/* ------------------------------- single photo slot ------------------------------- */

const coarse = () => typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches

interface PickerProps {
  value: string
  onChange(v: string): void
  label: string
  alt: string
  aspect?: number | null
  shape?: 'portrait' | 'square' | 'wide' | 'round'
  allowAspect?: boolean
  placeholder?: string
}

export function PhotoPicker({ value, onChange, label, alt, aspect = 4 / 5, shape = 'portrait', allowAspect = true, placeholder }: PickerProps) {
  const toast = useToast()
  const input = useRef<HTMLInputElement>(null)
  const camera = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState<Blob | null>(null)
  const [progress, setProgress] = useState<number | null>(null)
  const [hover, setHover] = useState(false)
  const [editing, setEditing] = useState(false)

  const choose = (f: File | undefined) => {
    if (!f) return
    const err = validateImage(f)
    if (err) return toast(err, 'error')
    setEditing(false)
    setPending(f)
  }

  const finish = async (r: { rotate: 0 | 90 | 180 | 270; crop: CropRect }) => {
    if (!pending) return
    const src = pending
    setPending(null)
    setProgress(0)
    try {
      const ref = await saveImage(src, { rotate: r.rotate, crop: r.crop }, setProgress)
      if (value) void removeMedia(value)
      onChange(ref)
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not process that image.', 'error')
    } finally {
      setProgress(null)
    }
  }

  const edit = async () => {
    const b = await loadBlob(value)
    if (!b) return toast('Could not open that photo for editing.', 'error')
    setEditing(true)
    setPending(b)
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setHover(false)
    choose(e.dataTransfer.files?.[0])
  }

  return (
    <div className={`photo-picker shape-${shape}`}>
      <div
        className={`pp-frame ${hover ? 'hover' : ''} ${value ? 'has' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setHover(true) }}
        onDragLeave={() => setHover(false)}
        onDrop={onDrop}
      >
        {value ? (
          <Img src={value} alt={alt} thumb={false} />
        ) : (
          <button type="button" className="pp-empty" onClick={() => input.current?.click()}>
            <Icon name="plus" size={26} />
            <strong>Add {label}</strong>
            <span>{placeholder ?? 'Drag a photo here or choose from your device'}</span>
          </button>
        )}
        {progress !== null && (
          <div className="pp-progress" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
            <span style={{ width: `${progress}%` }} />
            <em>Optimising… {progress}%</em>
          </div>
        )}
      </div>
      <div className="pp-actions">
        <button type="button" className="btn btn-ghost sm" onClick={() => input.current?.click()}>
          <Icon name="image" size={15} /> {value ? 'Replace' : 'Choose'}
        </button>
        {coarse() && (
          <button type="button" className="btn btn-ghost sm" onClick={() => camera.current?.click()}>
            <Icon name="camera" size={15} /> Camera
          </button>
        )}
        {value && (
          <>
            <button type="button" className="btn btn-ghost sm" onClick={edit}>
              <Icon name="crop" size={15} /> Crop / rotate
            </button>
            <button type="button" className="btn btn-ghost sm" onClick={() => { void removeMedia(value); onChange('') }}>
              <Icon name="trash" size={15} /> Remove
            </button>
          </>
        )}
      </div>
      <input ref={input} type="file" accept="image/*" hidden onChange={(e) => { choose(e.target.files?.[0]); e.target.value = '' }} />
      <input ref={camera} type="file" accept="image/*" capture="environment" hidden onChange={(e) => { choose(e.target.files?.[0]); e.target.value = '' }} />
      {pending && (
        <ImageEditor
          source={pending}
          aspect={aspect}
          allowAspect={allowAspect}
          title={editing ? 'Edit photo' : 'Adjust your photo'}
          onCancel={() => setPending(null)}
          onDone={finish}
        />
      )}
    </div>
  )
}

/* ------------------------------ multi-photo uploader ------------------------------ */

interface Job {
  id: number
  name: string
  size: number
  pct: number
  state: 'working' | 'done' | 'error'
  error?: string
}

interface MultiProps {
  onUploaded(refs: { src: string; name: string }[]): void
  /** How many more photos the plan still allows. */
  remaining: number
  compact?: boolean
}

export function MultiUploader({ onUploaded, remaining, compact }: MultiProps) {
  const toast = useToast()
  const input = useRef<HTMLInputElement>(null)
  const camera = useRef<HTMLInputElement>(null)
  const [hover, setHover] = useState(false)
  const [jobs, setJobs] = useState<Job[]>([])
  const counter = useRef(0)

  const run = useCallback(
    async (files: File[]) => {
      let list = files
      if (list.length > remaining) {
        toast(`Your plan allows ${remaining} more photo${remaining === 1 ? '' : 's'}. Upgrade for unlimited photos.`, 'info')
        list = list.slice(0, Math.max(0, remaining))
      }
      if (!list.length) return
      const mk = list.map((f) => ({ f, job: { id: ++counter.current, name: f.name, size: f.size, pct: 0, state: 'working' as const } }))
      setJobs((j) => [...mk.map((m) => m.job), ...j].slice(0, 12))
      const done: { src: string; name: string }[] = []
      // modest parallelism keeps low-end phones responsive
      let cursor = 0
      const worker = async () => {
        while (cursor < mk.length) {
          const { f, job } = mk[cursor++]
          const err = validateImage(f)
          if (err) {
            setJobs((j) => j.map((x) => (x.id === job.id ? { ...x, state: 'error', error: err } : x)))
            continue
          }
          try {
            const ref = await saveImage(f, {}, (pct) => setJobs((j) => j.map((x) => (x.id === job.id ? { ...x, pct } : x))))
            done.push({ src: ref, name: f.name.replace(/\.[^.]+$/, '') })
            setJobs((j) => j.map((x) => (x.id === job.id ? { ...x, pct: 100, state: 'done' } : x)))
          } catch (e) {
            setJobs((j) => j.map((x) => (x.id === job.id ? { ...x, state: 'error', error: e instanceof Error ? e.message : 'Failed' } : x)))
          }
        }
      }
      await Promise.all([worker(), worker()])
      if (done.length) onUploaded(done)
      setTimeout(() => setJobs((j) => j.filter((x) => x.state === 'working')), 4000)
    },
    [onUploaded, remaining, toast],
  )

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setHover(false)
    void run(Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith('image/')))
  }

  return (
    <div className="multi-up">
      <div
        className={`dropzone ${hover ? 'hover' : ''} ${compact ? 'compact' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setHover(true) }}
        onDragLeave={() => setHover(false)}
        onDrop={onDrop}
      >
        <span className="dz-ico">
          <Icon name="plus" size={24} />
        </span>
        <strong>+ Add Photos</strong>
        <span>Drag photos here or choose from your device</span>
        <div className="dz-actions">
          <button type="button" className="btn btn-primary sm" onClick={() => input.current?.click()}>
            <Icon name="image" size={15} /> Choose photos
          </button>
          {coarse() && (
            <button type="button" className="btn btn-ghost sm" onClick={() => camera.current?.click()}>
              <Icon name="camera" size={15} /> Take photo
            </button>
          )}
        </div>
        <small className="hint">Photos are resized and compressed automatically.</small>
      </div>
      <input ref={input} type="file" accept="image/*" multiple hidden onChange={(e) => { void run(Array.from(e.target.files ?? [])); e.target.value = '' }} />
      <input ref={camera} type="file" accept="image/*" capture="environment" hidden onChange={(e) => { void run(Array.from(e.target.files ?? [])); e.target.value = '' }} />
      {jobs.length > 0 && (
        <ul className="upload-list" aria-live="polite">
          {jobs.map((j) => (
            <li key={j.id} className={j.state}>
              <span className="u-name">{j.name}</span>
              <span className="u-size">{formatBytes(j.size)}</span>
              <span className="u-bar">
                <i style={{ width: `${j.pct}%` }} />
              </span>
              <span className="u-state">
                {j.state === 'working' ? `${j.pct}%` : j.state === 'done' ? <Icon name="check" size={16} /> : j.error}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
