'use client'

import { useMemo } from 'react'

const ANOMALY_INDEX = 16
const N = 24

const W = 720
const H = 260
const PAD_L = 40
const PAD_R = 20
const PAD_T = 20
const PAD_B = 30
const PLOT_W = W - PAD_L - PAD_R
const PLOT_H = H - PAD_T - PAD_B

function xAt(i: number) {
  return PAD_L + (i / (N - 1)) * PLOT_W
}
function yAt(v: number) {
  return PAD_T + (1 - v / 100) * PLOT_H
}

export function AnomalyChart({
  solved,
  onPointClick,
}: {
  solved: boolean
  onPointClick: (index: number) => void
}) {
  const { revenue, load } = useMemo(() => {
    const revenue: number[] = []
    const load: number[] = []
    for (let h = 0; h < N; h++) {
      revenue.push(
        h < ANOMALY_INDEX
          ? 80 + Math.round(Math.sin(h / 2) * 6)
          : 30 + Math.round(Math.sin(h / 2) * 4),
      )
      load.push(
        h < ANOMALY_INDEX
          ? 40 + Math.round(Math.cos(h / 2) * 6)
          : 92 + Math.round(Math.cos(h / 2) * 3),
      )
    }
    return { revenue, load }
  }, [])

  const revLine = revenue.map((v, i) => `${xAt(i)},${yAt(v)}`).join(' ')
  const loadLine = load.map((v, i) => `${xAt(i)},${yAt(v)}`).join(' ')
  const revArea = `${PAD_L},${yAt(0)} ${revLine} ${xAt(N - 1)},${yAt(0)}`

  return (
    <div className="w-full">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        role="img"
        aria-label="24-hour telemetry: revenue and server load. Click the moment revenue collapsed."
      >
        {/* grid */}
        {[0, 25, 50, 75, 100].map((g) => (
          <g key={g}>
            <line
              x1={PAD_L}
              x2={W - PAD_R}
              y1={yAt(g)}
              y2={yAt(g)}
              stroke="rgba(255,255,255,0.05)"
              strokeWidth={1}
            />
            <text
              x={PAD_L - 8}
              y={yAt(g) + 3}
              textAnchor="end"
              className="fill-[var(--muted)] font-mono"
              fontSize={9}
            >
              {g}
            </text>
          </g>
        ))}

        {/* x ticks */}
        {revenue.map((_, i) =>
          i % 4 === 0 ? (
            <text
              key={i}
              x={xAt(i)}
              y={H - 8}
              textAnchor="middle"
              className="fill-[var(--muted)] font-mono"
              fontSize={9}
            >
              {String(i).padStart(2, '0')}:00
            </text>
          ) : null,
        )}

        {/* revenue area + line */}
        <polygon points={revArea} fill="rgba(62,122,95,0.10)" />
        <polyline
          points={revLine}
          fill="none"
          stroke="var(--pass)"
          strokeWidth={2}
        />
        {/* server load line */}
        <polyline
          points={loadLine}
          fill="none"
          stroke="var(--error)"
          strokeWidth={2}
        />

        {/* anomaly marker once solved */}
        {solved && (
          <>
            <line
              x1={xAt(ANOMALY_INDEX)}
              x2={xAt(ANOMALY_INDEX)}
              y1={PAD_T}
              y2={H - PAD_B}
              stroke="var(--gilt)"
              strokeWidth={1}
              strokeDasharray="4 4"
            />
            <circle
              cx={xAt(ANOMALY_INDEX)}
              cy={yAt(revenue[ANOMALY_INDEX])}
              r={7}
              fill="var(--gilt)"
              stroke="var(--void)"
              strokeWidth={2}
            />
          </>
        )}

        {/* clickable hit points on revenue line */}
        {revenue.map((v, i) => {
          const nearAnomaly = Math.abs(i - ANOMALY_INDEX) <= 1
          return (
            <circle
              key={i}
              cx={xAt(i)}
              cy={yAt(v)}
              r={12}
              fill="transparent"
              className={solved ? '' : 'cursor-pointer'}
              onClick={() => !solved && onPointClick(i)}
            >
              <title>
                {nearAnomaly ? 'Suspicious dip' : `${String(i).padStart(2, '0')}:00`}
              </title>
            </circle>
          )
        })}
      </svg>

      <div className="mt-3 flex items-center justify-center gap-5 text-[11px] text-muted-ink">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-[2px] w-4 bg-pass" /> Revenue
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-[2px] w-4 bg-error" /> Server Load
        </span>
      </div>
    </div>
  )
}

export { ANOMALY_INDEX }
