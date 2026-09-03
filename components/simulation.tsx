'use client'

import { useCallback, useRef, useState } from 'react'
import { ContextBar } from './context-bar'
import { Sidebar } from './sidebar'
import { StageBrief } from './stage-brief'
import { StageDataHunt } from './stage-data-hunt'
import { StageBudget } from './stage-budget'
import { StagePipeline } from './stage-pipeline'
import { TalentReport } from './talent-report'
import { ToastStack } from './toast-stack'
import { BrandMark } from './brand'
import {
  freshStats,
  type FundingSource,
  type OperatorStats,
  type Stage,
  type ToastItem,
  type ToastType,
} from '@/lib/sim-types'
import { generateAIReport } from '@/lib/report'

export function Simulation() {
  const [operatorName, setOperatorName] = useState('')
  const [stage, setStage] = useState<Stage>(1)
  const [maxReached, setMaxReached] = useState<Stage>(1)
  const [reportOpen, setReportOpen] = useState(false)
  const [runKey, setRunKey] = useState(0)
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const [reportStats, setReportStats] = useState<OperatorStats>(freshStats())

  // Mutable tracking of the operator's micro-decisions.
  const statsRef = useRef<OperatorStats>(freshStats())
  const toastId = useRef(0)

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = ++toastId.current
    setToasts((prev) => [...prev, { id, message, type }])
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 3200)
  }, [])

  const goTo = useCallback((s: Stage) => {
    setStage(s)
    setMaxReached((m) => (s > m ? s : m))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  // ---- Stage 2 tracking ----
  const handleMisclick = useCallback(() => {
    statsRef.current.chartMisclicks++
  }, [])
  const handleCorrectDiagnosis = useCallback(() => {
    statsRef.current.rootCauseSelected = 'Marketing'
  }, [])

  // ---- Stage 3 tracking ----
  const handleBudgetWarning = useCallback(() => {
    statsRef.current.budgetWarnings++
  }, [])
  const handleBudgetSolved = useCallback((source: FundingSource) => {
    statsRef.current.fundingSource = source
  }, [])

  // ---- Stage 4 finalize ----
  const handleFinalize = useCallback(
    (result: { decoyUsed: boolean; correctPlacements: number }) => {
      statsRef.current.decoyUsed = result.decoyUsed
      statsRef.current.correctPlacements = result.correctPlacements
      statsRef.current.overallScore = generateAIReport(statsRef.current).score
      setReportStats({ ...statsRef.current })
      setMaxReached(5)
      setStage(5)
      setReportOpen(true)
    },
    [],
  )

  const handleReplay = useCallback(() => {
    statsRef.current = freshStats()
    setReportStats(freshStats())
    setReportOpen(false)
    setStage(1)
    setMaxReached(1)
    setRunKey((k) => k + 1)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  return (
    <div className="triage min-h-screen">
      <ContextBar />
      <div className="flex min-h-screen">
        <Sidebar current={stage} maxReached={maxReached} onNavigate={goTo} />

        <main className="mx-auto w-full max-w-4xl flex-1 px-5 py-8 sm:px-10">
          {/* mobile brand */}
          <div className="mb-6 flex items-center gap-3 md:hidden">
            <BrandMark className="h-7 w-auto" />
            <p className="text-lg font-extrabold text-text-warm">Provd</p>
          </div>

          <div key={runKey}>
            <div className={stage === 1 ? '' : 'hidden'}>
              <StageBrief
                operatorName={operatorName}
                setOperatorName={setOperatorName}
                onAccept={() => goTo(2)}
              />
            </div>

            <div className={stage === 2 ? '' : 'hidden'}>
              <StageDataHunt
                onMisclick={handleMisclick}
                onCorrectDiagnosis={handleCorrectDiagnosis}
                onProceed={() => goTo(3)}
                showToast={showToast}
              />
            </div>

            <div className={stage === 3 ? '' : 'hidden'}>
              <StageBudget
                onBudgetWarning={handleBudgetWarning}
                onSolved={handleBudgetSolved}
                onProceed={() => goTo(4)}
                showToast={showToast}
              />
            </div>

            <div className={stage === 4 || (stage === 5 && !reportOpen) ? '' : 'hidden'}>
              <StagePipeline onFinalize={handleFinalize} showToast={showToast} />
            </div>
          </div>
        </main>
      </div>

      <TalentReport
        open={reportOpen}
        stats={reportStats}
        operatorName={operatorName}
        onClose={() => setReportOpen(false)}
        onReplay={handleReplay}
        showToast={showToast}
      />

      <ToastStack toasts={toasts} />
    </div>
  )
}
