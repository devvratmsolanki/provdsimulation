'use client'

import { useState } from 'react'

/** Cordell weekly active seats, 26 points. Seats fall 38% at the break. */
export const CORDELL_BREAK_INDEX = 19
export const CORDELL_TOLERANCE = 1

export interface CordellChartProps {
  /** Locks the chart and reveals the annotated break once 3A is satisfied. */
  solved: boolean
  onPointClick: (index: number) => void
}

const N = 26

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

// 86 seats → 53 seats is a 38% fall, and the 0–100 domain keeps the grid labels
// identical to the revenue chart at `/`.
const SEATS: number[] = Array.from({ length: N }, (_, w) =>
  w < CORDELL_BREAK_INDEX
    ? 86 + Math.round(Math.sin(w / 2) * 4)
    : 53 + Math.round(Math.sin(w / 2) * 3),
)

const LINE = SEATS.map((v, i) => `${xAt(i)},${yAt(v)}`).join(' ')
const AREA = `${PAD_L},${yAt(0)} ${LINE} ${xAt(N - 1)},${yAt(0)}`

// Week numbers are the series index, so the chart, the select and §2's fact
// copy ("starting week 19") all name the break the same way.
function weekLabel(i: number) {
  return `W${String(i).padStart(2, '0')}`
}

export function CordellChart({ solved, onPointClick }: CordellChartProps) {
  const [pick, setPick] = useState('')

  return (
    <div className="w-full">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        role="img"
        aria-label="Cordell weekly active seats, 26 weeks. Select the week the seat count broke."
      >
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

        {SEATS.map((_, i) =>
          i % 4 === 0 ? (
            <text
              key={i}
              x={xAt(i)}
              y={H - 8}
              textAnchor="middle"
              className="fill-[var(--muted)] font-mono"
              fontSize={9}
            >
              {weekLabel(i)}
            </text>
          ) : null,
        )}

        <polygon points={AREA} fill="rgba(62,122,95,0.10)" />
        <polyline points={LINE} fill="none" stroke="var(--pass)" strokeWidth={2} />

        {solved && (
          <>
            <line
              x1={xAt(CORDELL_BREAK_INDEX)}
              x2={xAt(CORDELL_BREAK_INDEX)}
              y1={PAD_T}
              y2={H - PAD_B}
              stroke="var(--gilt)"
              strokeWidth={1}
              strokeDasharray="4 4"
            />
            <circle
              cx={xAt(CORDELL_BREAK_INDEX)}
              cy={yAt(SEATS[CORDELL_BREAK_INDEX])}
              r={7}
              fill="var(--gilt)"
              stroke="var(--void)"
              strokeWidth={2}
            />
          </>
        )}

        {SEATS.map((v, i) => (
          <circle
            key={i}
            cx={xAt(i)}
            cy={yAt(v)}
            r={14}
            fill="transparent"
            role="button"
            tabIndex={solved ? -1 : 0}
            aria-label={`Week ${i}, ${v} active seats`}
            className={solved ? '' : 'cursor-pointer'}
            onClick={() => !solved && onPointClick(i)}
            onKeyDown={(e) => {
              if (solved) return
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onPointClick(i)
              }
            }}
          >
            <title>{`Week ${i} · ${v} seats`}</title>
          </circle>
        ))}
      </svg>

      <div className="mt-3 flex items-center justify-center gap-5 text-[11px] text-muted-ink">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-[2px] w-4 bg-pass" /> Weekly active seats
        </span>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border-dark pt-4">
        <label htmlFor="weekPick" className="text-[11px] text-muted-ink">
          Or select the week the break occurred
        </label>
        <select
          id="weekPick"
          value={pick}
          disabled={solved}
          onChange={(e) => {
            setPick(e.target.value)
            if (e.target.value !== '') onPointClick(Number(e.target.value))
          }}
          className="min-h-11 rounded-[var(--radius-sm)] border border-border-dark bg-surface px-2 py-2 text-[12px] text-text-warm disabled:opacity-30 sm:min-h-0"
        >
          <option value="">Select a week…</option>
          {SEATS.map((_, i) => (
            <option key={i} value={i}>
              {`Week ${i} (${weekLabel(i)})`}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
