'use client'

import { useEffect, useState } from 'react'
import { Award, X } from 'lucide-react'
import type { OperatorStats, ReportResult, ToastType } from '@/lib/sim-types'
import { generateAIReport, tierColor } from '@/lib/report'

function metricLabel(good: boolean, mid?: boolean) {
  if (good) return 'Exceptional'
  if (mid) return 'Developing'
  return 'Needs Work'
}

export function TalentReport({
  open,
  stats,
  operatorName,
  onClose,
  onReplay,
  showToast,
}: {
  open: boolean
  stats: OperatorStats
  operatorName: string
  onClose: () => void
  onReplay: () => void
  showToast: (m: string, t?: ToastType) => void
}) {
  const [phase, setPhase] = useState<'loading' | 'result'>('loading')
  const [visibleLines, setVisibleLines] = useState(0)
  const [report, setReport] = useState<ReportResult | null>(null)

  useEffect(() => {
    if (!open) return
    setPhase('loading')
    setVisibleLines(0)
    setReport(generateAIReport(stats))

    const timers = [
      setTimeout(() => setVisibleLines(1), 400),
      setTimeout(() => setVisibleLines(2), 1000),
      setTimeout(() => setVisibleLines(3), 1600),
      setTimeout(() => setVisibleLines(4), 2200),
      setTimeout(() => setPhase('result'), 3000),
    ]
    return () => timers.forEach(clearTimeout)
  }, [open, stats])

  if (!open || !report) return null

  const displayName = (operatorName || '').trim() || 'Guest Operator'

  const loadLines = [
    `Cross-referencing diagnosis — ${stats.chartMisclicks} misdiagnosis${stats.chartMisclicks === 1 ? '' : 'es'} before lock.`,
    `Auditing budget allocation — ${stats.budgetWarnings} constraint break${stats.budgetWarnings === 1 ? '' : 's'} logged.`,
    `Scoring sequencing logic — ${stats.correctPlacements}/5 actions correctly placed${stats.decoyUsed ? ', decoy deployed' : ''}.`,
    'Drafting partner note...',
  ]

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.85)' }}
    >
      <div className="stage-enter hard-shadow w-full max-w-lg overflow-hidden rounded-[var(--radius-md)] border border-border-dark bg-carbon">
        {/* terminal header */}
        <div className="flex items-center gap-2 border-b border-border-dark bg-surface px-5 py-3">
          <span className="inline-block size-[9px] rounded-full bg-error" />
          <span className="inline-block size-[9px] rounded-full bg-gilt-dim" />
          <span className="inline-block size-[9px] rounded-full bg-pass" />
          <p className="ml-2 font-mono text-xs text-muted-ink">
            provd://grading-engine
          </p>
          <button
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
          <div className="p-8">
            <div className="mb-6 text-center">
              <div
                className="mb-4 inline-flex size-16 items-center justify-center rounded-full border border-gilt"
                style={{ background: 'rgba(200,169,110,0.15)' }}
              >
                <Award className="size-7 text-gilt" />
              </div>
              <div className="mb-3 inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-border-dark bg-carbon px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.06em] text-gilt">
                Provd — Talent Report (Preview)
              </div>
              <h2 className="text-2xl font-extrabold text-text-warm">
                {displayName}
              </h2>
              <p className="mt-1 text-sm text-muted-ink">
                AI-Ops Track · Simulation Preview
              </p>
            </div>

            {/* score */}
            <div className="flex items-center justify-between border-b border-border-dark py-3">
              <span className="text-[13px] text-muted-ink">
                Overall simulation score
              </span>
              <span>
                <span className="text-3xl font-extrabold text-text-warm">
                  {report.score}
                </span>
                <span className="text-sm text-muted-ink"> / 100</span>
              </span>
            </div>

            <Row
              label="Signal Detection"
              value={metricLabel(stats.chartMisclicks === 0, stats.chartMisclicks <= 1)}
            />
            <Row
              label="Resource Discipline"
              value={metricLabel(
                stats.budgetWarnings === 0 && stats.fundingSource === 'Ads',
                stats.budgetWarnings <= 1,
              )}
            />
            <Row
              label="Execution Sequencing"
              value={metricLabel(
                !stats.decoyUsed && stats.correctPlacements >= 4,
                !stats.decoyUsed,
              )}
            />
            <div className="flex items-center justify-between border-b border-border-dark py-3">
              <span className="text-[13px] text-muted-ink">Provd Tier</span>
              <span className={`text-[13px] font-bold ${tierColor(report.tier)}`}>
                {report.tier}
              </span>
            </div>

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
                This was one task. The Master Simulation runs four weeks — graded by
                our team and a company partner.
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

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border-dark py-3">
      <span className="text-[13px] text-muted-ink">{label}</span>
      <span className="text-[13px] font-semibold text-text-warm">{value}</span>
    </div>
  )
}
