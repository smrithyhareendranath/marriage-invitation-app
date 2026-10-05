import { useCallback, useEffect, useRef, useState } from 'react'
import type { Photo } from '../types'
import { useMediaSrc } from '../lib/media'
import { Icon } from './Icon'

interface Props {
  photos: Photo[]
  index: number
  onIndex(i: number): void
  onClose(): void
  startSlideshow?: boolean
}

export function Lightbox({ photos, index, onIndex, onClose, startSlideshow }: Props) {
  const photo = photos[index]
  const src = useMediaSrc(photo?.src ?? '')
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [playing, setPlaying] = useState(!!startSlideshow)
  const [dir, setDir] = useState<1 | -1>(1)
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const gesture = useRef({ startX: 0, startY: 0, panX: 0, panY: 0, dist: 0, zoom: 1, moved: false })

  const go = useCallback(
    (d: 1 | -1) => {
      setDir(d)
      setZoom(1)
      setPan({ x: 0, y: 0 })
      onIndex((index + d + photos.length) % photos.length)
    },
    [index, onIndex, photos.length],
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowRight') go(1)
      else if (e.key === 'ArrowLeft') go(-1)
      else if (e.key === '+' || e.key === '=') setZoom((z) => Math.min(4, z + 0.5))
      else if (e.key === '-') setZoom((z) => Math.max(1, z - 0.5))
    }
    document.addEventListener('keydown', onKey)
    const o = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = o
    }
  }, [go, onClose])

  useEffect(() => {
    if (!playing) return
    const t = setInterval(() => go(1), 3800)
    return () => clearInterval(t)
  }, [playing, go])

  // preload neighbours for instant swipes
  useEffect(() => {
    ;[1, -1].forEach((d) => {
      const p = photos[(index + d + photos.length) % photos.length]
      if (p && !p.src.startsWith('media:')) {
        const i = new Image()
        i.src = p.src
      }
    })
  }, [index, photos])

  const onDown = (e: React.PointerEvent) => {
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    const g = gesture.current
    g.startX = e.clientX
    g.startY = e.clientY
    g.panX = pan.x
    g.panY = pan.y
    g.zoom = zoom
    g.moved = false
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()]
      g.dist = Math.hypot(a.x - b.x, a.y - b.y)
    }
  }
  const onMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    const g = gesture.current
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()]
      const d = Math.hypot(a.x - b.x, a.y - b.y)
      setZoom(Math.min(4, Math.max(1, (g.zoom * d) / (g.dist || d))))
      g.moved = true
    } else if (zoom > 1) {
      setPan({ x: g.panX + e.clientX - g.startX, y: g.panY + e.clientY - g.startY })
      g.moved = true
    }
  }
  const onUp = (e: React.PointerEvent) => {
    const g = gesture.current
    pointers.current.delete(e.pointerId)
    if (pointers.current.size === 0 && zoom === 1 && g.zoom === 1) {
      const dx = e.clientX - g.startX
      const dy = e.clientY - g.startY
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) go(dx < 0 ? 1 : -1)
      else if (dy > 110) onClose()
    }
  }

  const toggleZoom = () => {
    setPan({ x: 0, y: 0 })
    setZoom((z) => (z > 1 ? 1 : 2.4))
  }

  if (!photo) return null
  return (
    <div className="lightbox" role="dialog" aria-modal="true" aria-label="Photo viewer">
      <div className="lb-top">
        <span className="lb-count">
          {index + 1} / {photos.length}
        </span>
        <div className="lb-actions">
          <button className="lb-btn" onClick={() => setPlaying((p) => !p)} aria-label={playing ? 'Pause slideshow' : 'Start slideshow'}>
            <Icon name={playing ? 'pause' : 'play'} size={18} />
          </button>
          <button className="lb-btn" onClick={toggleZoom} aria-label="Toggle zoom">
            <Icon name="zoomin" size={18} />
          </button>
          <button className="lb-btn" onClick={onClose} aria-label="Close viewer">
            <Icon name="x" size={20} />
          </button>
        </div>
      </div>

      <div
        className="lb-stage"
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onDoubleClick={toggleZoom}
        onWheel={(e) => setZoom((z) => Math.min(4, Math.max(1, z - e.deltaY / 400)))}
      >
        {src && (
          <img
            key={photo.id}
            src={src}
            alt={photo.alt}
            className={`lb-img ${dir > 0 ? 'from-right' : 'from-left'}`}
            style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, cursor: zoom > 1 ? 'grab' : 'zoom-in' }}
            draggable={false}
          />
        )}
      </div>

      {photos.length > 1 && (
        <>
          <button className="lb-nav lb-prev" onClick={() => go(-1)} aria-label="Previous photo">
            <Icon name="left" size={24} />
          </button>
          <button className="lb-nav lb-next" onClick={() => go(1)} aria-label="Next photo">
            <Icon name="right" size={24} />
          </button>
        </>
      )}
      {(photo.caption || photo.alt) && <p className="lb-caption">{photo.caption || photo.alt}</p>}
    </div>
  )
}
