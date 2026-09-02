'use client'

import { useCallback, useRef, useState } from 'react'
import { ContextBar } from '../context-bar'
import { Sidebar } from '../sidebar'
import { ToastStack } from '../toast-stack'
import { BrandMark } from '../brand'
import { StageOneMemo } from './stage-1-memo'
import { StageFiveRunway } from './stage-5-runway'
import { StageSixNegotiation } from './stage-6-negotiation'
import { ExpressReport } from './express-report'
import { freshFounderStats } from '@/lib/founder-sim-types'
import type { FounderStats } from '@/lib/founder-sim-types'
import type { ToastItem, ToastType } from '@/lib/sim-types'

const STEPS = [
  { step: 1, label: 'The Voice Memo' },
  { step: 2, label: 'Fund the Plan' },
  { step: 3, label: 'Hold the Room' },
  { step: 4, label: 'Talent Report' },
]

/**
 * The 2-minute express run: three of the eight stages, reused verbatim.
 *
 * Stage 5 normally judges the plan against the memo the operator wrote in
 * Stage 4. Express skips that stage, so the recommendation is fixed to
 * save-cordell and stated on screen as a decision Priya already made — which
 * keeps `planCoherent` meaningful instead of permanently false.
 */
const FIXED_REC = 'save-cordell' as const

export function ExpressSimulation() {
  const [operatorName, setOperatorName] = useState('')
  const [stage, setStage] = useState(1)
  const [maxReached, setMaxReached] = useState(1)
  const [reportOpen, setReportOpen] = useState(false)
  const [runKey, setRunKey] = useState(0)
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const [reportStats, setReportStats] = useState<FounderStats>(freshFounderStats())
  const [plan, setPlan] = useState({ hireEng: 0, hireAE: 0, hireCSM: 0, hireAudit: 0 })

  const statsRef = useRef<FounderStats>(freshFounderStats())
  const toastId = useRef(0)

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = ++toastId.current
    setToasts((prev) => [...prev, { id, message, type }])
    window.setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3200)
  }, [])

  const goTo = useCallback((s: number) => {
    setStage(s)
    setMaxReached((m) => (s > m ? s : m))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  const handleIntake = useCallback(
    (
      r: Pick<
        FounderStats,
        'intakeCorrect' | 'intakeAsksMissed' | 'intakeNoiseElevated' | 'intakeRetags'
      >,
    ) => {
      Object.assign(statsRef.current, r)
      goTo(2)
    },
    [goTo],
  )

  const handleRunway = useCallback(
    (r: Parameters<Parameters<typeof StageFiveRunway>[0]['onProceed']>[0]) => {
      Object.assign(statsRef.current, r)
      statsRef.current.memoRecommendation = FIXED_REC
      setPlan({ hireEng: r.hireEng, hireAE: r.hireAE, hireCSM: r.hireCSM, hireAudit: r.hireAudit })
      goTo(3)
    },
    [goTo],
  )

  const handleNegotiation = useCallback(
    (r: Parameters<Parameters<typeof StageSixNegotiation>[0]['onProceed']>[0]) => {
      Object.assign(statsRef.current, r)
      statsRef.current.runwayBelowBoardFloor = r.runwayMonths < 18
      setReportStats({ ...statsRef.current })
      setMaxReached(4)
      setStage(4)
      setReportOpen(true)
    },
    [],
  )

  const handleReplay = useCallback(() => {
    statsRef.current = freshFounderStats()
    setReportStats(freshFounderStats())
    setPlan({ hireEng: 0, hireAE: 0, hireCSM: 0, hireAudit: 0 })
    setReportOpen(false)
    setStage(1)
    setMaxReached(1)
    setOperatorName('')
    setRunKey((k) => k + 1)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  return (
    <div className="min-h-screen">
      <ContextBar
        track="Express Preview — Founder's Office"
        note="Three decisions from an eight-stage simulation · about two minutes"
      />
      <div className="flex min-h-screen">
        <Sidebar
          current={stage}
          maxReached={maxReached}
          onNavigate={goTo}
          steps={STEPS}
          subtitle="Founder's Office"
          duration="About 2 minutes"
        />

        <main className="mx-auto w-full max-w-4xl flex-1 px-5 py-8 sm:px-10">
          <div className="mb-6 flex items-center gap-3 md:hidden">
            <BrandMark className="h-7 w-auto" />
            <p className="text-lg font-extrabold text-text-warm">Provd</p>
          </div>

          <div key={runKey}>
            {maxReached >= 1 && (
              <div className={stage === 1 ? '' : 'hidden'}>
                <StageOneMemo
                  operatorName={operatorName}
                  setOperatorName={setOperatorName}
                  showToast={showToast}
                  onProceed={handleIntake}
                />
              </div>
            )}

            {maxReached >= 2 && (
              <div className={stage === 2 ? '' : 'hidden'}>
                <div className="mb-5 rounded-[var(--radius-md)] border border-border-dark bg-carbon px-5 py-4">
                  <p className="text-[13px] leading-relaxed text-muted-ink">
                    <span className="font-semibold text-gilt">Caught up:</span> Cordell — 20% of
                    revenue — is one unfiled notice from leaving, and their export has been broken
                    six weeks. Priya has already agreed the call is to defend them. What she has not
                    decided is what it costs.
                  </p>
                </div>
                <StageFiveRunway
                  memoRecommendation={FIXED_REC}
                  showToast={showToast}
                  onProceed={handleRunway}
                />
              </div>
            )}

            {maxReached >= 3 && (
              <div className={stage === 3 ? '' : 'hidden'}>
                <StageSixNegotiation
                  memoRecommendation={FIXED_REC}
                  ctaLabel="Finish — Generate Talent Report"
                  hireEng={plan.hireEng}
                  hireAE={plan.hireAE}
                  hireCSM={plan.hireCSM}
                  hireAudit={plan.hireAudit}
                  showToast={showToast}
                  onProceed={handleNegotiation}
                />
              </div>
            )}
          </div>
        </main>
      </div>

      <ExpressReport
        open={reportOpen}
        stats={reportStats}
        operatorName={operatorName}
        onClose={() => setReportOpen(false)}
        onReplay={handleReplay}
      />

      <ToastStack toasts={toasts} />
    </div>
  )
}
