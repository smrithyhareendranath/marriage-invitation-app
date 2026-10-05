import { useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { useMediaSrc } from '../lib/media'
import { useInView } from '../hooks'
import { Icon } from './Icon'

export type ImgMotion = 'none' | 'kenburns' | 'float' | 'zoom' | 'parallax'

interface ImgProps {
  src: string
  alt: string
  /** Prefer the small stored thumbnail (grids, cards). */
  thumb?: boolean
  className?: string
  style?: CSSProperties
  motion?: ImgMotion
  eager?: boolean
  onClick?: () => void
  /** Shown when there is no image yet. */
  empty?: ReactNode
}

/**
 * Lazy, progressive image: skeleton shimmer → fade-in once decoded. Works with `media:` refs,
 * data: URIs and remote URLs. Defers resolving blobs until near the viewport.
 */
export function Img({ src, alt, thumb, className = '', style, motion = 'none', eager, onClick, empty }: ImgProps) {
  const [ref, near] = useInView<HTMLDivElement>(true, '300px 0px 300px 0px')
  const url = useMediaSrc(eager || near ? src : '', thumb)
  const [loaded, setLoaded] = useState(false)
  const [failed, setFailed] = useState(false)

  const hasSrc = !!src
  return (
    <div
      ref={ref}
      className={`img ${className} ${loaded ? 'is-loaded' : ''} motion-${motion}`}
      style={style}
      onClick={onClick}
    >
      {!hasSrc || failed ? (
        <div className="img-empty">
          {empty ?? (
            <>
              <Icon name="image" size={28} />
            </>
          )}
        </div>
      ) : (
        <>
          {!loaded && <div className="skeleton" aria-hidden="true" />}
          {url && (
            <img
              src={url}
              alt={alt}
              loading={eager ? 'eager' : 'lazy'}
              decoding="async"
              draggable={false}
              onLoad={() => setLoaded(true)}
              onError={() => setFailed(true)}
            />
          )}
        </>
      )}
    </div>
  )
}
