'use client'

import { useState } from 'react'
import { Search, MousePointerClick, Check, ArrowRight } from 'lucide-react'
import { AnomalyChart, ANOMALY_INDEX } from './anomaly-chart'
import { DiagnosticTerminal } from './diagnostic-terminal'
import type { ToastType } from '@/lib/sim-types'

const OPTIONS = [
  {
    id: 'tech',
    label: 'The Stripe API Gateway crashed, preventing trial conversions.',
    correct: false,
  },
  {
    id: 'product',
    label:
      'The product team shipped a bug that is stopping users from logging in on Day 7.',
    correct: false,
  },
  {
    id: 'marketing',
    label:
      'Marketing acquired a massive cohort of low-intent users who have no capital to clear the trial.',
    correct: true,
  },
]

export function StageDataHunt({
  onMisclick,
  onCorrectDiagnosis,
  onProceed,
  showToast,
}: {
  onMisclick: () => void
  onCorrectDiagnosis: () => void
  onProceed: () => void
  showToast: (m: string, t?: ToastType) => void
}) {
  const [terminalOpen, setTerminalOpen] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [wrongId, setWrongId] = useState<string | null>(null)

  function handlePointClick(index: number) {
    if (Math.abs(index - ANOMALY_INDEX) <= 1) {
      if (!terminalOpen) {
        setTerminalOpen(true)
        showToast('Break located. Diagnostic Terminal unlocked.', 'success')
      }
    } else {
      showToast('That reading is just noise. Keep hunting.', 'info')
    }
  }

  function handleAnswer(opt: (typeof OPTIONS)[number]) {
    if (confirmed) return
    if (opt.correct) {
      setConfirmed(true)
      setWrongId(null)
      onCorrectDiagnosis()
      showToast('Diagnosis confirmed — root cause isolated.', 'success')
    } else {
      onMisclick()
      setWrongId(opt.id)
      showToast('Incorrect diagnosis. Re-read the telemetry.', 'error')
      window.setTimeout(() => setWrongId((c) => (c === opt.id ? null : c)), 550)
    }
  }

  return (
    <section className="stage-enter">
      <div className="mb-6">
        <div className="eyebrow mb-4">
          <Search className="size-3.5" />
          Stage 2 — Synthesis
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-text-warm">
          Find the Anomaly
        </h1>
        <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-muted-ink">
          Revenue collapsed today. Study the 24-hour telemetry and{' '}
          <span className="font-semibold text-text-warm">
            click the exact moment
          </span>{' '}
          it broke to unlock the diagnostic terminal.
        </p>
      </div>

      <div className="rounded-[var(--radius-md)] border border-border-dark bg-carbon p-6">
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div className="lift rounded-[var(--radius-sm)] border border-border-dark bg-surface p-4">
            <p className="text-xs text-muted-ink">Revenue (24h)</p>
            <p className="mt-1 text-xl font-bold text-error">-40%</p>
          </div>
          <div className="lift rounded-[var(--radius-sm)] border border-border-dark bg-surface p-4">
            <p className="text-xs text-muted-ink">Peak Server Load</p>
            <p className="mt-1 text-xl font-bold text-error">98%</p>
          </div>
          <div className="lift col-span-2 rounded-[var(--radius-sm)] border border-border-dark bg-surface p-4 sm:col-span-1">
            <p className="text-xs text-muted-ink">Status</p>
            <p className="mt-1 text-xl font-bold text-text-warm">Investigating</p>
          </div>
        </div>

        <AnomalyChart solved={terminalOpen} onPointClick={handlePointClick} />

        {!terminalOpen && (
          <p className="mt-3 flex items-center justify-center gap-2 text-center text-xs text-muted-ink">
            <MousePointerClick className="size-3.5" />
            Click directly on the chart where you spot the break
          </p>
        )}
      </div>

      {/* Phase 2B — Diagnostic Terminal */}
      {terminalOpen && <DiagnosticTerminal />}

      {/* Phase 2C — Diagnosis */}
      {terminalOpen && (
        <div className="reveal-down mt-6">
          <p className="mb-3 text-sm font-semibold text-text-warm">
            Based on the telemetry, why did revenue drop 40% today?
          </p>
          <div className="space-y-3">
            {OPTIONS.map((opt) => {
              const isCorrectConfirmed = confirmed && opt.correct
              const isWrong = wrongId === opt.id
              return (
                <button
                  key={opt.id}
                  type="button"
                  disabled={confirmed}
                  onClick={() => handleAnswer(opt)}
                  className={`flex w-full items-start gap-3 rounded-[var(--radius-md)] border p-4 text-left text-[13px] leading-snug transition-colors ${
                    isCorrectConfirmed
                      ? 'border-pass bg-pass/10 text-pass'
                      : isWrong
                        ? 'flash-error border-error bg-error/10 text-error'
                        : 'lift border-border-dark bg-surface text-text-warm hover:border-gilt'
                  } ${confirmed && !opt.correct ? 'opacity-40' : ''}`}
                >
                  {isCorrectConfirmed && <Check className="mt-0.5 size-4 shrink-0" />}
                  <span>{opt.label}</span>
                </button>
              )
            })}
          </div>

          {confirmed && (
            <button
              type="button"
              onClick={onProceed}
              className="sheen reveal-down mt-6 inline-flex w-full items-center justify-center gap-3 rounded-[var(--radius-md)] bg-gilt px-6 py-3.5 text-sm font-bold tracking-[0.02em] text-void transition-colors hover:bg-gilt-dim sm:w-auto"
            >
              Proceed to Stage 3: Budget Triage
              <ArrowRight className="size-4" />
            </button>
          )}
        </div>
      )}
    </section>
  )
}
