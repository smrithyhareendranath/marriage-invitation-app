import { useEffect, useRef, useState } from 'react'
import type { DragEvent, ReactNode } from 'react'
import { Icon } from '../components/Icon'
import type { IconName } from '../components/Icon'
import { reorder } from '../lib/util'
import { isValidHex } from '../lib/color'

export function PageHead({ title, desc, actions }: { title: string; desc?: string; actions?: ReactNode }) {
  return (
    <header className="page-head">
      <div>
        <h1>{title}</h1>
        {desc && <p>{desc}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </header>
  )
}

export function Card({ title, hint, children, actions, className = '' }: { title?: string; hint?: string; children: ReactNode; actions?: ReactNode; className?: string }) {
  return (
    <section className={`card ${className}`}>
      {(title || actions) && (
        <header className="card-head">
          <div>
            {title && <h2>{title}</h2>}
            {hint && <p>{hint}</p>}
          </div>
          {actions}
        </header>
      )}
      {children}
    </section>
  )
}

export function Field({
  label,
  hint,
  tip,
  error,
  children,
  htmlFor,
}: {
  label: string
  hint?: string
  tip?: string
  error?: string
  children: ReactNode
  htmlFor?: string
}) {
  return (
    <div className="field">
      <label htmlFor={htmlFor}>
        {label}
        {tip && <Tip text={tip} />}
      </label>
      {children}
      {hint && !error && <small className="hint">{hint}</small>}
      {error && <small className="err">{error}</small>}
    </div>
  )
}

export function Tip({ text }: { text: string }) {
  return (
    <span className="tip" tabIndex={0} role="note" aria-label={text}>
      <Icon name="info" size={14} />
      <span className="tip-pop">{text}</span>
    </span>
  )
}

export function Toggle({ checked, onChange, label, desc }: { checked: boolean; onChange(v: boolean): void; label: string; desc?: string }) {
  return (
    <label className="toggle">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="toggle-track" aria-hidden="true" />
      <span className="toggle-text">
        <strong>{label}</strong>
        {desc && <small>{desc}</small>}
      </span>
    </label>
  )
}

export function Segmented<T extends string>({ value, onChange, options, label }: { value: T; onChange(v: T): void; options: { value: T; label: string; icon?: IconName }[]; label: string }) {
  return (
    <div className="seg" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <label key={o.value} className={value === o.value ? 'on' : ''}>
          <input type="radio" checked={value === o.value} onChange={() => onChange(o.value)} />
          {o.icon && <Icon name={o.icon} size={15} />}
          {o.label}
        </label>
      ))}
    </div>
  )
}

export function ColorInput({ value, onChange, label }: { value: string; onChange(v: string): void; label: string }) {
  const [text, setText] = useState(value)
  useEffect(() => setText(value), [value])
  return (
    <div className="color-input">
      <input type="color" value={isValidHex(value) && value.length === 7 ? value : '#000000'} onChange={(e) => onChange(e.target.value)} aria-label={`${label} colour picker`} />
      <input
        value={text}
        onChange={(e) => {
          setText(e.target.value)
          if (isValidHex(e.target.value)) onChange(e.target.value)
        }}
        aria-label={`${label} hex value`}
        maxLength={7}
        spellCheck={false}
      />
    </div>
  )
}

/** Delete button that asks for a second click. */
export function ConfirmButton({ onConfirm, label = 'Delete', confirmLabel = 'Click again to confirm', icon = 'trash', className = '' }: { onConfirm(): void; label?: string; confirmLabel?: string; icon?: IconName; className?: string }) {
  const [armed, setArmed] = useState(false)
  useEffect(() => {
    if (!armed) return
    const t = setTimeout(() => setArmed(false), 3500)
    return () => clearTimeout(t)
  }, [armed])
  return (
    <button
      type="button"
      className={`btn ${armed ? 'btn-danger' : 'btn-ghost'} sm ${className}`}
      onClick={() => (armed ? (setArmed(false), onConfirm()) : setArmed(true))}
    >
      <Icon name={icon} size={15} /> {armed ? confirmLabel : label}
    </button>
  )
}

export function EmptyState({ icon, title, children, action }: { icon: IconName; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="empty">
      <span className="empty-ico">
        <Icon name={icon} size={26} />
      </span>
      <h3>{title}</h3>
      {children && <p>{children}</p>}
      {action}
    </div>
  )
}

export function UpgradeNote({ children }: { children: ReactNode }) {
  return (
    <div className="upgrade-note">
      <Icon name="star" size={16} />
      <span>{children}</span>
    </div>
  )
}

/**
 * Drag-to-reorder for lists (mouse). Touch devices use the up/down buttons each editor renders.
 */
export function useSortable<T>(items: T[], onChange: (next: T[]) => void) {
  const from = useRef<number | null>(null)
  const [over, setOver] = useState<number | null>(null)
  return {
    over,
    props: (i: number) => ({
      draggable: true,
      onDragStart: (e: DragEvent) => {
        from.current = i
        e.dataTransfer.effectAllowed = 'move'
        try {
          e.dataTransfer.setData('text/plain', String(i))
        } catch {
          /* ignore */
        }
      },
      onDragOver: (e: DragEvent) => {
        if (from.current === null) return
        e.preventDefault()
        setOver(i)
      },
      onDragLeave: () => setOver((o) => (o === i ? null : o)),
      onDrop: (e: DragEvent) => {
        e.preventDefault()
        if (from.current !== null) onChange(reorder(items, from.current, i))
        from.current = null
        setOver(null)
      },
      onDragEnd: () => {
        from.current = null
        setOver(null)
      },
    }),
    move: (i: number, d: -1 | 1) => onChange(reorder(items, i, i + d)),
  }
}

export function MoveButtons({ index, length, onMove, label }: { index: number; length: number; onMove(d: -1 | 1): void; label: string }) {
  return (
    <span className="move-btns">
      <button type="button" className="icon-btn sm" disabled={index === 0} onClick={() => onMove(-1)} aria-label={`Move ${label} up`}>
        <Icon name="up" size={16} />
      </button>
      <button type="button" className="icon-btn sm" disabled={index === length - 1} onClick={() => onMove(1)} aria-label={`Move ${label} down`}>
        <Icon name="down" size={16} />
      </button>
    </span>
  )
}
