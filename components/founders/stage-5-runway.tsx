'use client'

import { useRef, useState } from 'react'
import { ArrowRight, Calculator, Minus, Plus } from 'lucide-react'
import {
  BASE_BURN_K,
  BOARD_FLOOR_MONTHS,
  addedBurn,
  computeRunway,
} from '@/lib/founder-sim-types'
import type { Rec } from '@/lib/founder-sim-types'
import type { ToastType } from '@/lib/sim-types'

export interface StageFiveRunwayProps {
  /** Carry from Stage 4 — the yardstick for planCoherent / planStarved. */
  memoRecommendation: Rec
  showToast: (m: string, t?: ToastType) => void
  onProceed: (r: {
    hireEng: number // 0–3
    hireAE: number // 0–3
    hireCSM: number // 0–2
    hireAudit: number // 0–1
    runwayMonths: number // computeRunway(...), 1dp
    runwayBelowBoardFloor: boolean // runwayMonths < 18
    planCoherent: boolean
    planStarved: number // 0–3
    runwayRecalcs: number // ≥0 stepper interactions
  }) => void
}

type LineKey = 'hireEng' | 'hireAE' | 'hireCSM' | 'hireAudit'

type Plan = Record<LineKey, number>

// Labels are §2 Stage 5 verbatim. The cost sub-labels restate the same table's
// "Monthly cost" / "One-time" columns.
// Copy ratified in .founders-spec.md §2 — the four costLabel strings.
const LINES: { key: LineKey; label: string; costLabel: string; max: number }[] = [
  {
    key: 'hireEng',
    label: 'Engineering backfill (senior)',
    costLabel: '$16k / mo each · 0–3',
    max: 3,
  },
  { key: 'hireAE', label: 'Account Executives', costLabel: '$14k / mo each · 0–3', max: 3 },
  {
    key: 'hireCSM',
    label: 'Customer Success Manager',
    costLabel: '$11k / mo each · 0–2',
    max: 2,
  },
  {
    key: 'hireAudit',
    label: 'External evidence-export remediation',
    costLabel: '$140k one-time · 0–1',
    max: 1,
  },
]

export function StageFiveRunway({ memoRecommendation, onProceed }: StageFiveRunwayProps) {
  const [plan, setPlan] = useState<Plan>({
    hireEng: 0,
    hireAE: 0,
    hireCSM: 0,
    hireAudit: 0,
  })
  const [recalcs, setRecalcs] = useState(0)
  const [committed, setCommitted] = useState(false)
  const [flash, setFlash] = useState(false)

  // Edge detection so .flash-error fires on the transition into breach only —
  // same pattern as `crmBelow` in stage-budget.tsx.
  const wasBelow = useRef(false)

  const added = addedBurn(plan.hireEng, plan.hireAE, plan.hireCSM)
  const burn = BASE_BURN_K + added
  const runway = computeRunway(plan.hireEng, plan.hireAE, plan.hireCSM, plan.hireAudit)
  const below = runway < BOARD_FLOOR_MONTHS

  function step(key: LineKey, delta: number) {
    if (committed) return
    const next: Plan = { ...plan, [key]: plan[key] + delta }
    setPlan(next)
    setRecalcs((n) => n + 1)

    const nowBelow =
      computeRunway(next.hireEng, next.hireAE, next.hireCSM, next.hireAudit) <
      BOARD_FLOOR_MONTHS
    if (nowBelow && !wasBelow.current) {
      setFlash(true)
      window.setTimeout(() => setFlash(false), 550)
    }
    wasBelow.current = nowBelow
  }

  function handleCommit() {
    const coherent =
      memoRecommendation === 'save-cordell'
        ? plan.hireCSM >= 1 && plan.hireAudit === 1 && plan.hireAE <= 1
        : memoRecommendation === 'chase-series-b'
          ? plan.hireAE >= 2 && runway >= 18
          : memoRecommendation === 'cut-burn'
            ? added <= 30 && runway >= 20
            : false

    let starved = 0
    if (memoRecommendation === 'save-cordell' && plan.hireCSM === 0) starved++
    if (memoRecommendation === 'save-cordell' && plan.hireAudit === 0) starved++
    if (memoRecommendation === 'chase-series-b' && plan.hireAE < 2) starved++
    if (memoRecommendation === 'cut-burn' && added > 40) starved++
    if (plan.hireEng === 0) starved++

    setCommitted(true)
    onProceed({
      hireEng: plan.hireEng,
      hireAE: plan.hireAE,
      hireCSM: plan.hireCSM,
      hireAudit: plan.hireAudit,
      runwayMonths: runway,
      runwayBelowBoardFloor: below,
      planCoherent: coherent,
      planStarved: Math.min(starved, 3),
      runwayRecalcs: recalcs,
    })
  }

  // §2 Stage 5 verbatim, one line per unsatisfied condition. Never empty:
  // 3/3/2/1 closes at 17.0 and fires the floor line instead.
  const pressure: { id: string; text: string; severe: boolean }[] = []
  if (plan.hireAE < 3)
    pressure.push({
      id: 'ae',
      text: 'Marcus: pipeline coverage drops to 2.9x. He will not accept this quietly.',
      severe: false,
    })
  if (plan.hireEng < 2)
    pressure.push({
      id: 'eng',
      text: 'The two senior engineers read this as: nobody is coming.',
      severe: false,
    })
  if (plan.hireCSM === 0)
    pressure.push({ id: 'csm', text: 'Nobody owns Cordell on Wednesday.', severe: false })
  if (plan.hireAudit === 0)
    pressure.push({
      id: 'audit',
      text: 'The export bug ships into next quarter.',
      severe: false,
    })
  if (below)
    pressure.push({
      id: 'floor',
      text: "Ansel's floor is 18 months at plan close.",
      severe: true,
    })

  const floorPill = below
    ? 'border-error bg-error/10 text-error'
    : 'border-pass bg-pass/10 text-pass'
  const floorLabel = below ? 'Below 18.0 board floor' : 'Above 18.0 board floor'

  return (
    <section className="stage-enter">
      <div className="mb-6">
        <div className="flex items-start justify-between gap-4">
          <div className="eyebrow mb-4">
            <Calculator className="size-3.5" />
            Stage 5 — Capital Allocation
          </div>
          <span className="hidden shrink-0 font-mono text-[11px] tracking-[0.08em] text-muted-ink sm:block">
            14:05 · STAGE 5 / 8
          </span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-text-warm">
          Fund the Plan You Just Signed
        </h1>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-muted-ink">
          Set headcount and spend, live against a runway model, knowing you cannot fund
          everything.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
        {/* steppers */}
        <div className="rounded-[var(--radius-md)] border border-border-dark bg-carbon">
          <div className="divide-y divide-border-dark">
            {LINES.map((line) => {
              const v = plan[line.key]
              return (
                <div
                  key={line.key}
                  role="group"
                  aria-labelledby={`line-${line.key}`}
                  className="flex items-center gap-3 px-5 py-4"
                >
                  <div className="min-w-0 flex-1">
                    <p
                      id={`line-${line.key}`}
                      className="text-[13px] font-medium text-text-warm"
                    >
                      {line.label}
                    </p>
                    <p className="mt-0.5 font-mono text-[11px] text-muted-ink">
                      {line.costLabel}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center rounded-[var(--radius-sm)] border border-border-dark">
                    <button
                      type="button"
                      aria-label={`Decrease ${line.label}`}
                      disabled={committed || v === 0}
                      onClick={() => step(line.key, -1)}
                      className="grid size-11 place-items-center text-text-warm transition-colors hover:bg-surface disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      <Minus className="size-4" />
                    </button>
                    <output
                      htmlFor={`line-${line.key}`}
                      className="w-12 text-center font-mono text-lg font-bold tabular-nums text-text-warm"
                    >
                      {v}
                    </output>
                    <button
                      type="button"
                      aria-label={`Increase ${line.label}`}
                      disabled={committed || v === line.max}
                      onClick={() => step(line.key, 1)}
                      className="grid size-11 place-items-center text-text-warm transition-colors hover:bg-surface disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      <Plus className="size-4" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-6">
          {/* live readout — full panel from lg up */}
          <div className="hidden rounded-[var(--radius-md)] border border-border-dark bg-carbon p-5 lg:block">
            <div className="flex items-center justify-between border-b border-border-dark pb-3">
              <span className="text-[13px] text-muted-ink">Monthly burn</span>
              <span className="font-mono text-[13px] font-semibold tabular-nums text-text-warm">
                ${burn}k
                {added > 0 && <span className="ml-1.5 text-gilt">+{added}k</span>}
              </span>
            </div>

            <div className="py-5 text-center">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-ink">
                Runway at plan close
              </p>
              <p
                className={`mt-1 text-5xl font-extrabold tabular-nums ${
                  below ? 'text-error' : 'text-text-warm'
                }`}
              >
                {runway.toFixed(1)}
                <span className="ml-1.5 text-lg font-normal text-muted-ink">months</span>
              </p>
            </div>

            <div
              className={`rounded-[var(--radius-sm)] border px-3 py-2.5 text-center text-[11px] font-bold uppercase tracking-[0.1em] ${
                flash ? 'flash-error' : ''
              } ${floorPill}`}
              aria-live="polite"
            >
              {floorLabel}
            </div>
          </div>

          {/* live readout — collapsed, sticky to the bottom below lg */}
          <div
            className={`sticky bottom-0 z-20 -mx-5 flex items-center justify-between gap-3 border-t border-border-dark bg-carbon px-5 py-3 lg:hidden ${
              flash ? 'flash-error' : ''
            }`}
            aria-live="polite"
          >
            <p
              className={`text-2xl font-extrabold tabular-nums ${
                below ? 'text-error' : 'text-text-warm'
              }`}
            >
              {runway.toFixed(1)}
              <span className="ml-1.5 text-sm font-normal text-muted-ink">months</span>
            </p>
            <span
              className={`shrink-0 rounded-[var(--radius-sm)] border px-2.5 py-1.5 text-right text-[10px] font-bold uppercase tracking-[0.1em] ${floorPill}`}
            >
              {floorLabel}
            </span>
          </div>

          {/* who is unhappy */}
          <div className="rounded-[var(--radius-md)] border border-border-dark bg-carbon p-5">
            <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-ink">
              Who is unhappy
            </p>
            <div className="space-y-2" aria-live="polite">
              {pressure.map((l) => (
                <p
                  key={l.id}
                  className={`reveal-down border-l-2 bg-surface px-3 py-2.5 text-[12.5px] leading-snug ${
                    l.severe ? 'border-l-error text-error' : 'border-l-gilt-dim text-text-warm'
                  }`}
                >
                  {l.text}
                </p>
              ))}
            </div>
          </div>
        </aside>
      </div>

      {/* Disabled once committed: Stage 6 may already have caved and bumped
          hireAE, and re-firing would roll Carry back to the pre-cave plan. */}
      <button
        type="button"
        onClick={handleCommit}
        disabled={committed}
        className="mt-6 inline-flex w-full items-center justify-center gap-3 rounded-[var(--radius-md)] bg-gilt px-6 py-3.5 text-sm font-bold tracking-[0.02em] text-void transition-colors hover:bg-gilt-dim disabled:cursor-not-allowed disabled:opacity-30 sm:w-auto"
      >
        COMMIT PLAN
        <ArrowRight className="size-4" />
      </button>
    </section>
  )
}
