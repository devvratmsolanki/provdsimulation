'use client'

import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { BrandMark } from '../brand'
import { expressTierColor, generateExpressReport } from '@/lib/express-report'
import type { FounderStats } from '@/lib/founder-sim-types'

export function ExpressReport({
  open,
  stats,
  operatorName,
  onClose,
  onReplay,
}: {
  open: boolean
  stats: FounderStats
  operatorName: string
  onClose: () => void
  onReplay: () => void
}) {
  const [phase, setPhase] = useState<'loading' | 'result'>('loading')
  const [openedFor, setOpenedFor] = useState<FounderStats | null>(null)
  const closeRef = useRef<HTMLButtonElement>(null)

  // Derived during render, never in an effect: the effect that opens the modal
  // would otherwise also be the thing that creates it, so the focus call lands
  // before the node exists.
  const report = open ? generateExpressReport(stats) : null
  if (open && openedFor !== stats) {
    setOpenedFor(stats)
    setPhase('loading')
  }

  useEffect(() => {
    if (!open) return
    closeRef.current?.focus()
    const t = window.setTimeout(() => setPhase('result'), 1400)
    return () => window.clearTimeout(t)
  }, [open, stats])

  if (!open || !report) return null
  const displayName = (operatorName || '').trim() || 'Guest Operator'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.85)' }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose()
      }}
    >
      <div className="stage-enter hard-shadow max-h-full w-full max-w-lg overflow-y-auto rounded-[var(--radius-md)] border border-border-dark bg-carbon">
        <div className="flex items-center gap-2 border-b border-border-dark bg-surface px-5 py-3">
          <span className="inline-block size-[9px] rounded-full bg-error" />
          <span className="inline-block size-[9px] rounded-full bg-gilt-dim" />
          <span className="inline-block size-[9px] rounded-full bg-pass" />
          <p className="ml-2 font-mono text-xs text-muted-ink">provd://grading-engine</p>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close report"
            className="ml-auto px-1 text-sm text-muted-ink hover:text-text-warm"
          >
            <X className="size-4" />
          </button>
        </div>

        {phase === 'loading' && (
          <div className="space-y-3 p-8 font-mono text-sm">
            <p>
              <span className="text-pass">➜</span> Scoring three decisions...
            </p>
            <p className="text-muted-ink">
              Plan closes at {stats.runwayMonths.toFixed(1)} months · Marcus at {stats.marcusTrust}
              <span className="blink">_</span>
            </p>
          </div>
        )}

        {phase === 'result' && (
          <div className="p-8">
            <div className="mb-6 text-center">
              <div className="mb-4 flex justify-center">
                <BrandMark className="h-12 w-auto" />
              </div>
              <div className="mb-3 inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-border-dark bg-carbon px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.06em] text-gilt">
                Provd — Talent Report (Express)
              </div>
              <h2 className="break-words text-2xl font-extrabold text-text-warm">{displayName}</h2>
              <p className="mt-1 text-sm text-muted-ink">
                Founder&apos;s Office · 3-decision preview
              </p>
            </div>

            <div className="flex items-center justify-between border-b border-border-dark py-3">
              <span className="text-[13px] text-muted-ink">Overall</span>
              <span>
                <span className="text-3xl font-extrabold text-text-warm">{report.overall}</span>
                <span className="text-sm text-muted-ink"> / 100</span>
              </span>
            </div>

            {report.dimensions.map((d) => (
              <div
                key={d.label}
                className="flex items-center justify-between border-b border-border-dark py-3"
              >
                <span className="text-[13px] text-muted-ink">{d.label}</span>
                <span className="flex items-center gap-3">
                  <span className="font-mono text-[13px] font-bold text-text-warm">{d.score}</span>
                  <span className="w-[92px] text-right text-[12px] font-semibold text-text-warm">
                    {d.band}
                  </span>
                </span>
              </div>
            ))}

            <div className="flex items-center justify-between border-b border-border-dark py-3">
              <span className="text-[13px] text-muted-ink">Provd Tier</span>
              <span className={`text-[13px] font-bold ${expressTierColor(report.tier)}`}>
                {report.tier}
              </span>
            </div>

            <div className="mt-5 border-t border-border-dark pt-4">
              <p className="mb-1.5 text-[10px] uppercase tracking-wide text-muted-ink">
                Simulated partner note
              </p>
              <p className="text-xs italic leading-relaxed text-muted-ink">
                &ldquo;{report.note}&rdquo;
              </p>
            </div>

            <div className="mt-7 text-center">
              <p className="mb-3 text-sm text-muted-ink">
                This is 3 of 8 decisions. The full simulation runs the whole Monday.
              </p>
              <a
                href="../founders-office/"
                className="block w-full rounded-[var(--radius-md)] bg-gilt px-6 py-4 text-base font-bold text-void transition-colors hover:bg-gilt-dim"
              >
                Run the full simulation
                <span className="mt-1 block text-xs font-semibold opacity-85">
                  8 stages · 13–16 minutes
                </span>
              </a>
              <button
                type="button"
                onClick={onReplay}
                className="mt-3 w-full rounded-[var(--radius-md)] border border-border-dark bg-transparent px-6 py-3 text-sm font-medium text-text-warm transition-colors hover:border-gilt hover:bg-carbon"
              >
                Replay
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
