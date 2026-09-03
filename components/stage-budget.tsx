'use client'

import { useRef, useState } from 'react'
import { SlidersHorizontal, TriangleAlert, ArrowRight, Megaphone, Users, Server } from 'lucide-react'
import type { FundingSource, ToastType } from '@/lib/sim-types'

const TOTAL = 20000
const TARGET = 8000
const STEP = 500

const START = { ads: 10000, crm: 6000, server: 4000 }

type OpKey = 'ads' | 'crm' | 'server'

const OP_META: { key: OpKey; label: string; icon: typeof Megaphone }[] = [
  { key: 'ads', label: 'Top-of-Funnel Ads', icon: Megaphone },
  { key: 'crm', label: 'CRM & Sales Pipeline', icon: Users },
  { key: 'server', label: 'Server Hosting', icon: Server },
]

function fmt(n: number) {
  return '$' + n.toLocaleString()
}

export function StageBudget({
  onBudgetWarning,
  onSolved,
  onProceed,
  showToast,
}: {
  onBudgetWarning: () => void
  onSolved: (source: FundingSource) => void
  onProceed: () => void
  showToast: (m: string, t?: ToastType) => void
}) {
  const [ops, setOps] = useState<Record<OpKey, number>>({ ...START })
  const [solved, setSolved] = useState(false)

  const crmBelow = useRef(false)
  const serverBelow = useRef(false)

  const crisis = TOTAL - ops.ads - ops.crm - ops.server

  const alerts: string[] = []
  if (ops.crm < 4000)
    alerts.push('CRITICAL: SDR tools underfunded. Active sales pipeline is choking.')
  if (ops.server < 2000)
    alerts.push('WARNING: Server capacity critical. Site latency increasing.')

  function handleChange(key: OpKey, raw: number) {
    if (solved) return
    let newVal = Math.max(0, Math.min(TOTAL, Math.round(raw / STEP) * STEP))
    const next: Record<OpKey, number> = { ...ops, [key]: newVal }

    // Crisis is the receiver. If operational sum exceeds the war chest,
    // pull the overflow proportionally from the other two operational lines.
    let opSum = next.ads + next.crm + next.server
    if (opSum > TOTAL) {
      let overflow = opSum - TOTAL
      const others = (['ads', 'crm', 'server'] as OpKey[]).filter((k) => k !== key)
      const othersSum = others.reduce((a, k) => a + next[k], 0)
      if (othersSum <= 0) {
        next[key] = newVal - overflow
      } else {
        others.forEach((k) => {
          const share = Math.round((next[k] / othersSum) * overflow)
          next[k] = Math.max(0, Math.round((next[k] - share) / STEP) * STEP)
        })
        // fix any residual drift so crisis stays >= 0
        let drift = next.ads + next.crm + next.server - TOTAL
        if (drift > 0) {
          const biggest = others.reduce((a, b) => (next[a] >= next[b] ? a : b))
          next[biggest] = Math.max(0, next[biggest] - drift)
        }
      }
    }

    setOps(next)

    // Track constraint crossings (increment once per entry into violation).
    const crmNowBelow = next.crm < 4000
    if (crmNowBelow && !crmBelow.current) {
      onBudgetWarning()
      showToast('CRITICAL: SDR tools underfunded.', 'error')
    }
    crmBelow.current = crmNowBelow

    const serverNowBelow = next.server < 2000
    if (serverNowBelow && !serverBelow.current) {
      onBudgetWarning()
      showToast('WARNING: Server capacity critical.', 'error')
    }
    serverBelow.current = serverNowBelow

    // Completion check.
    const newCrisis = TOTAL - next.ads - next.crm - next.server
    if (newCrisis === TARGET && !solved) {
      const losses: Record<OpKey, number> = {
        ads: START.ads - next.ads,
        crm: START.crm - next.crm,
        server: START.server - next.server,
      }
      const winner = (Object.keys(losses) as OpKey[]).reduce((a, b) =>
        losses[a] >= losses[b] ? a : b,
      )
      const source: FundingSource =
        winner === 'ads' ? 'Ads' : winner === 'crm' ? 'CRM' : 'Server'
      setSolved(true)
      onSolved(source)
      showToast('Remediation fully funded — capital re-routed.', 'success')
    }
  }

  const values: Record<OpKey, number> = ops

  return (
    <section className="stage-enter">
      <div className="mb-6">
        <div className="eyebrow mb-4">
          <SlidersHorizontal className="size-3.5" />
          Stage 3 — Budget Triage
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-text-warm">
          Re-Route the Capital
        </h1>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-text-warm">
          Diagnosis Confirmed. The acquisition campaign is flooding the funnel with
          low-intent users. We require{' '}
          <span className="font-semibold text-gilt">$8,000</span> immediately to
          deploy a Stripe verification webhook and launch a targeted reactivation
          campaign. Re-route the capital without breaking core operations.
        </p>
      </div>

      <div className="rounded-[var(--radius-md)] border border-border-dark bg-carbon p-6">
        {/* counter */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-border-dark pb-6">
          <div>
            <p className="text-xs text-muted-ink">Remediation Funded</p>
            <p
              key={crisis}
              className={`tick text-3xl font-extrabold ${solved ? 'text-pass' : 'text-text-warm'}`}
            >
              {fmt(crisis)}{' '}
              <span className="text-lg font-normal text-muted-ink">/ {fmt(TARGET)}</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-ink">War Chest</p>
            <p className="text-3xl font-extrabold text-gilt">{fmt(TOTAL)}</p>
          </div>
        </div>

        {/* live operational alerts */}
        {alerts.length > 0 && (
          <div className="reveal-down mb-6 space-y-2 rounded-[var(--radius-md)] border border-error bg-error/10 px-4 py-3">
            {alerts.map((a) => (
              <p
                key={a}
                className="flex items-center gap-2 text-sm font-semibold text-error"
              >
                <TriangleAlert className="size-4 shrink-0" />
                {a}
              </p>
            ))}
          </div>
        )}

        {/* operational sliders */}
        <div className="space-y-6">
          {OP_META.map(({ key, label, icon: Icon }) => (
            <div key={key}>
              <div className="mb-2 flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm font-medium text-text-warm">
                  <Icon className="size-4 text-muted-ink" />
                  {label}
                </label>
                <span className="text-sm font-bold text-text-warm">
                  {fmt(values[key])}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={TOTAL}
                step={STEP}
                value={values[key]}
                disabled={solved}
                onChange={(e) => handleChange(key, Number(e.target.value))}
              />
            </div>
          ))}

          {/* crisis receiver (read-only) */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm font-medium text-gilt">
                <TriangleAlert className="size-4" />
                Crisis Remediation
                <span className="text-[10px] font-normal uppercase tracking-wide text-muted-ink">
                  receiver
                </span>
              </label>
              <span className="text-sm font-bold text-gilt">{fmt(crisis)}</span>
            </div>
            <input
              type="range"
              min={0}
              max={TOTAL}
              step={STEP}
              value={crisis}
              readOnly
              disabled
              aria-label="Crisis Remediation (auto-filled)"
            />
          </div>
        </div>
      </div>

      {solved && (
        <button
          type="button"
          onClick={onProceed}
          className="sheen reveal-down mt-6 inline-flex w-full items-center justify-center gap-3 rounded-[var(--radius-md)] bg-gilt px-6 py-3.5 text-sm font-bold tracking-[0.02em] text-void transition-colors hover:bg-gilt-dim sm:w-auto"
        >
          Proceed to Stage 4: Execution Pipeline
          <ArrowRight className="size-4" />
        </button>
      )}
    </section>
  )
}
