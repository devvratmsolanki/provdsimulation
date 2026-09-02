'use client'

import { useEffect, useRef, useState } from 'react'
import { Download, X } from 'lucide-react'
import { BrandMark } from '../brand'
import { founderReportHTML, founderTierColor, generateFounderReport } from '@/lib/founder-report'
import type { FounderDimension } from '@/lib/founder-report'
import type { FounderStats } from '@/lib/founder-sim-types'
import type { ToastType } from '@/lib/sim-types'

export interface FounderReportProps {
  open: boolean
  stats: FounderStats
  operatorName: string
  onClose: () => void
  onReplay: () => void
  showToast: (m: string, t?: ToastType) => void
}

function bandText(band: FounderDimension['band']) {
  if (band === 'Exceptional') return 'text-pass'
  if (band === 'Strong') return 'text-gilt'
  if (band === 'Developing') return 'text-text-warm'
  return 'text-muted-ink'
}

function bandBar(band: FounderDimension['band']) {
  if (band === 'Exceptional') return 'bg-pass'
  if (band === 'Strong') return 'bg-gilt'
  if (band === 'Developing') return 'bg-gilt-dim'
  return 'bg-muted-ink'
}

const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'

export function FounderReport({
  open,
  stats,
  operatorName,
  onClose,
  onReplay,
  showToast,
}: FounderReportProps) {
  const [phase, setPhase] = useState<'loading' | 'result'>('loading')
  const [visibleLines, setVisibleLines] = useState(0)
  const [openedFor, setOpenedFor] = useState<FounderStats | null>(null)

  const dialogRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)

  // Derived during render, not parked in state: an effect that sets `report`
  // renders nothing on the pass that opens the modal, so `closeRef` is still
  // null when the focus call below runs and Esc / the Tab trap never engage.
  // Resetting the loading phase here (rather than in the effect, which runs
  // after paint) also stops the previous run's scores flashing on a replay.
  const report = open ? generateFounderReport(stats) : null
  if (open && openedFor !== stats) {
    setOpenedFor(stats)
    setPhase('loading')
    setVisibleLines(0)
  }

  useEffect(() => {
    if (!open) return
    closeRef.current?.focus()

    const timers = [
      setTimeout(() => setVisibleLines(1), 400),
      setTimeout(() => setVisibleLines(2), 1000),
      setTimeout(() => setVisibleLines(3), 1600),
      setTimeout(() => setVisibleLines(4), 2200),
      setTimeout(() => setVisibleLines(5), 2800),
      setTimeout(() => setPhase('result'), 3200),
    ]
    return () => timers.forEach(clearTimeout)
  }, [open, stats])

  if (!open || !report) return null

  const displayName = (operatorName || '').trim() || 'Guest Operator'

  // Copy ratified in .founders-spec.md §2 — five loading lines, drafted from §2 Stage 9's example.
  const loadLines = [
    `Replaying attention budget — 240 minutes down to ${stats.queueMinutesSpent}.`,
    `Reconstructing the Cordell case — ${stats.factsLoadBearing} of 3 load-bearing facts committed.`,
    `Auditing capital allocation — plan closes at ${stats.runwayMonths.toFixed(1)} months runway.`,
    `Reading the room — Marcus at ${stats.marcusTrust}, Ansel at ${stats.anselTrust}.`,
    'Drafting partner note...',
  ]

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'Escape') {
      onClose()
      return
    }
    if (e.key !== 'Tab') return
    const nodes = dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE)
    if (!nodes || nodes.length === 0) return
    const first = nodes[0]
    const last = nodes[nodes.length - 1]
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault()
      first.focus()
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.85)' }}
      onKeyDown={handleKeyDown}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="fr-title"
        aria-label="Talent report"
        className="stage-enter hard-shadow max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-[var(--radius-md)] border border-border-dark bg-carbon"
      >
        {/* terminal header */}
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
              <span className="text-pass">➜</span> Initializing grading engine...
            </p>
            {loadLines.map((line, i) => (
              <p
                key={i}
                className="text-muted-ink transition-opacity duration-200"
                style={{ opacity: visibleLines > i ? 1 : 0 }}
              >
                {line}
                <span className="blink">_</span>
              </p>
            ))}
          </div>
        )}

        {phase === 'result' && (
          <div className="p-6 sm:p-8">
            <div className="mb-6 text-center">
              <div className="mb-4 flex justify-center">
                <BrandMark className="h-12 w-auto" />
              </div>
              <div className="mb-3 inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-border-dark bg-carbon px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.06em] text-gilt">
                Provd — Talent Report (Preview)
              </div>
              <h2 id="fr-title" className="break-words text-2xl font-extrabold text-text-warm">
                {displayName}
              </h2>
              <p className="mt-1 text-sm text-muted-ink">
                Founder&apos;s Office Track · Simulation Preview
              </p>
            </div>

            {/* overall */}
            <div className="flex items-center justify-between border-b border-border-dark py-3">
              <span className="text-[13px] text-muted-ink">Overall simulation score</span>
              <span>
                <span className="text-3xl font-extrabold text-text-warm">{report.overall}</span>
                <span className="text-sm text-muted-ink"> / 100</span>
              </span>
            </div>

            {/* tier */}
            <div className="flex items-center justify-between border-b border-border-dark py-3">
              <span className="text-[13px] text-muted-ink">Provd Tier</span>
              <span className={`text-[13px] font-bold ${founderTierColor(report.tier)}`}>
                {report.tier}
              </span>
            </div>

            {/* six dimensions */}
            {report.dimensions.map((d) => (
              <div
                key={d.key}
                className="flex items-center justify-between gap-4 border-b border-border-dark py-3"
              >
                <span className="text-[13px] text-muted-ink">{d.label}</span>
                <div className="flex shrink-0 items-center gap-3">
                  <div className="h-[3px] w-20 bg-border-dark sm:w-24">
                    <div className={`h-full ${bandBar(d.band)}`} style={{ width: `${d.score}%` }} />
                  </div>
                  <span className="hidden w-10 text-right font-mono text-[12px] tabular-nums text-muted-ink sm:inline">
                    {d.score}
                  </span>
                  <span className={`w-[86px] text-right text-[13px] font-bold ${bandText(d.band)}`}>
                    {d.band}
                  </span>
                </div>
              </div>
            ))}

            {/* partner note */}
            <div className="mt-5 border-t border-border-dark pt-4">
              <p className="mb-1.5 text-[10px] uppercase tracking-wide text-muted-ink">
                Simulated partner note
              </p>
              <p className="text-xs italic leading-relaxed text-muted-ink">
                &ldquo;{report.note}&rdquo;
              </p>
            </div>

            {/* CTA */}
            <div className="mt-7 text-center">
              <p className="mb-3 text-sm text-muted-ink">
                This was one task. The Master Simulation runs four weeks — graded by our team and a
                company partner.
              </p>
              <button
                type="button"
                onClick={() =>
                  showToast(
                    'This connects to the real cohort application flow in production.',
                    'info',
                  )
                }
                className="w-full rounded-[var(--radius-md)] bg-gilt px-6 py-4 text-base font-bold text-void transition-colors hover:bg-gilt-dim"
              >
                See Cohort 01 — Growth Marketing
                <span className="mt-1 block text-xs font-semibold opacity-85">
                  Starts Sept 8, 2026 · ₹4,999
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!report) return
                  const safe = (displayName || 'operator')
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, '-')
                    .replace(/^-|-$/g, '')
                  const url = URL.createObjectURL(
                    new Blob([founderReportHTML(stats, report, displayName)], {
                      type: 'text/html',
                    }),
                  )
                  const a = document.createElement('a')
                  a.href = url
                  a.download = `provd-talent-report-${safe}.html`
                  a.click()
                  URL.revokeObjectURL(url)
                  showToast(
                    'Talent Report downloaded. Open it and print to PDF to share.',
                    'success',
                  )
                }}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-[var(--radius-md)] border border-border-dark bg-transparent px-6 py-3 text-sm font-medium text-text-warm transition-colors hover:border-gilt hover:bg-carbon"
              >
                <Download className="size-4" />
                Download full report
              </button>
              <button
                type="button"
                onClick={onReplay}
                className="mt-3 w-full rounded-[var(--radius-md)] border border-border-dark bg-transparent px-6 py-3 text-sm font-medium text-text-warm transition-colors hover:border-gilt hover:bg-carbon"
              >
                Replay this demo
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
