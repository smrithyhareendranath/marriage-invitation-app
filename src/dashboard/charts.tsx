import { useId, useRef, useState } from 'react'

export interface Point {
  label: string
  value: number
}

/** Single-series area/line chart with crosshair + tooltip and a table fallback. */
export function LineChart({ data, title, unit = '', height = 220 }: { data: Point[]; title: string; unit?: string; height?: number }) {
  const [hover, setHover] = useState<number | null>(null)
  const [table, setTable] = useState(false)
  const ref = useRef<SVGSVGElement>(null)
  const gid = useId()
  const W = 640
  const H = height
  const m = { t: 16, r: 16, b: 28, l: 36 }
  const max = Math.max(4, ...data.map((d) => d.value))
  const top = Math.ceil(max / 4) * 4
  const x = (i: number) => m.l + (data.length <= 1 ? 0 : (i / (data.length - 1)) * (W - m.l - m.r))
  const y = (v: number) => m.t + (1 - v / top) * (H - m.t - m.b)
  const line = data.map((d, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(d.value).toFixed(1)}`).join(' ')
  const area = data.length ? `${line} L${x(data.length - 1)},${H - m.b} L${x(0)},${H - m.b} Z` : ''
  const ticks = [0, 1, 2, 3, 4].map((k) => (top / 4) * k)

  const onMove = (e: React.PointerEvent) => {
    const r = ref.current?.getBoundingClientRect()
    if (!r || !data.length) return
    const px = ((e.clientX - r.left) / r.width) * W
    const i = Math.round(((px - m.l) / (W - m.l - m.r)) * (data.length - 1))
    setHover(Math.min(data.length - 1, Math.max(0, i)))
  }

  const labelEvery = Math.ceil(data.length / 7)

  return (
    <figure className="chart">
      <figcaption>
        <strong>{title}</strong>
        <button className="link" onClick={() => setTable((t) => !t)}>{table ? 'View chart' : 'View as table'}</button>
      </figcaption>
      {table ? (
        <div className="table-wrap">
          <table className="table compact">
            <thead><tr><th>Day</th><th>{title}</th></tr></thead>
            <tbody>{data.map((d) => <tr key={d.label}><td>{d.label}</td><td>{d.value}{unit}</td></tr>)}</tbody>
          </table>
        </div>
      ) : (
        <div className="chart-wrap">
          <svg ref={ref} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${title} over the last ${data.length} days`} onPointerMove={onMove} onPointerLeave={() => setHover(null)} style={{ touchAction: 'pan-y' }}>
            <defs>
              <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="var(--chart)" stopOpacity=".22" />
                <stop offset="1" stopColor="var(--chart)" stopOpacity="0" />
              </linearGradient>
            </defs>
            {ticks.map((t) => (
              <g key={t}>
                <line x1={m.l} x2={W - m.r} y1={y(t)} y2={y(t)} className="grid" />
                <text x={m.l - 8} y={y(t) + 4} textAnchor="end" className="axis">{t}</text>
              </g>
            ))}
            {data.map((d, i) => i % labelEvery === 0 && <text key={d.label} x={x(i)} y={H - 8} textAnchor="middle" className="axis">{d.label}</text>)}
            <path d={area} fill={`url(#${gid})`} />
            <path d={line} fill="none" stroke="var(--chart)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
            {hover !== null && (
              <g>
                <line x1={x(hover)} x2={x(hover)} y1={m.t} y2={H - m.b} className="cross" />
                <circle cx={x(hover)} cy={y(data[hover].value)} r="5" fill="var(--chart)" stroke="var(--surface)" strokeWidth="2" />
              </g>
            )}
          </svg>
          {hover !== null && (
            <div className="tooltip" style={{ left: `${(x(hover) / W) * 100}%` }} role="status">
              <span>{data[hover].label}</span>
              <strong>{data[hover].value}{unit}</strong>
            </div>
          )}
        </div>
      )}
    </figure>
  )
}

/** Horizontal bars (single hue, value labelled directly, 2px gaps). */
export function BarList({ data, title }: { data: Point[]; title: string }) {
  const max = Math.max(1, ...data.map((d) => d.value))
  return (
    <figure className="chart">
      <figcaption><strong>{title}</strong></figcaption>
      <ul className="bars">
        {data.map((d) => (
          <li key={d.label} title={`${d.label}: ${d.value}`}>
            <span className="b-label">{d.label}</span>
            <span className="b-track"><i style={{ width: `${(d.value / max) * 100}%` }} /></span>
            <b>{d.value}</b>
          </li>
        ))}
      </ul>
    </figure>
  )
}
