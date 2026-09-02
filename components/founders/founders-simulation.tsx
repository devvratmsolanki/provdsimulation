'use client'

import { useCallback, useRef, useState } from 'react'
import { ContextBar } from '../context-bar'
import { Sidebar } from '../sidebar'
import { ToastStack } from '../toast-stack'
import { StageOneMemo } from './stage-1-memo'
import { StageTwoQueue } from './stage-2-queue'
import { StageThreeEvidence } from './stage-3-evidence'
import { StageFourMemoComposer } from './stage-4-memo-composer'
import { StageFiveRunway } from './stage-5-runway'
import { StageSixNegotiation } from './stage-6-negotiation'
import { StageSevenPreread } from './stage-7-preread'
import { StageEightEscalation } from './stage-8-escalation'
import { FounderReport } from './founder-report'
import {
  freshCarry,
  freshFounderStats,
  type Carry,
  type FounderStage,
  type FounderStats,
} from '@/lib/founder-sim-types'
import type { ToastItem, ToastType } from '@/lib/sim-types'

const STEPS: { step: number; label: string }[] = [
  { step: 1, label: 'Intake' },
  { step: 2, label: 'Attention Triage' },
  { step: 3, label: 'Signal Synthesis' },
  { step: 4, label: 'Decision Memo' },
  { step: 5, label: 'Capital Allocation' },
  { step: 6, label: 'Stakeholder Craft' },
  { step: 7, label: 'Narrative Under Scrutiny' },
  { step: 8, label: 'Escalation Filter' },
  { step: 9, label: 'Talent Report' },
]

export function FoundersSimulation() {
  const [operatorName, setOperatorName] = useState('')
  const [stage, setStage] = useState<FounderStage>(1)
  const [maxReached, setMaxReached] = useState<FounderStage>(1)
  const [reportOpen, setReportOpen] = useState(false)
  const [runKey, setRunKey] = useState(0)
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const [reportStats, setReportStats] = useState<FounderStats>(freshFounderStats())

  // Mutable run state. Neither ref is read during render — stages receive the
  // Carry values they need as props, keyed off `carryVersion`.
  const statsRef = useRef<FounderStats>(freshFounderStats())
  const carryRef = useRef<Carry>(freshCarry())
  const startedAt = useRef(0)
  const toastId = useRef(0)

  // Bumped whenever carryRef mutates, so downstream stages re-render with it.
  const [carryVersion, setCarryVersion] = useState(0)
  const carry = carryRef.current
  void carryVersion

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = ++toastId.current
    setToasts((prev) => [...prev, { id, message, type }])
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 3200)
  }, [])

  const goTo = useCallback((s: FounderStage) => {
    setStage((prev) => {
      if (s < prev) statsRef.current.stagesRevisited++
      return s
    })
    setMaxReached((m) => (s > m ? s : m))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  // ---- Stage 1 ----
  const handleIntake = useCallback(
    (
      r: Pick<
        FounderStats,
        'intakeCorrect' | 'intakeAsksMissed' | 'intakeNoiseElevated' | 'intakeRetags'
      >,
    ) => {
      Object.assign(statsRef.current, r)
      if (startedAt.current === 0) startedAt.current = Date.now()
      goTo(2)
    },
    [goTo],
  )

  // ---- Stage 2 ---- (carry-forwards 1, 2, 3)
  const handleQueue = useCallback(
    (
      r: Pick<
        FounderStats,
        | 'queueMinutesSpent'
        | 'queueHighValueHandled'
        | 'queueTrapsDoneNow'
        | 'queueDelegated'
        | 'queueDeclined'
        | 'queueDelegationOverload'
        | 'queueCordellDeferred'
      >,
    ) => {
      Object.assign(statsRef.current, r)
      statsRef.current.evidenceLocked = r.queueCordellDeferred
      carryRef.current.evidenceLocked = r.queueCordellDeferred
      // Rebuilt idempotently: this handler re-fires whenever the operator
      // back-navigates to Stage 2 and re-clicks its CTA, and a plain reassign
      // would drop a Stage-6 escalation that has already been recorded.
      carryRef.current.injectedItemIds = [
        ...(r.queueCordellDeferred ? ['I-R1'] : []),
        ...(r.queueDelegationOverload ? ['I-R2'] : []),
        ...carryRef.current.injectedItemIds.filter((id) => id === 'I-M1'),
      ]
      setCarryVersion((v) => v + 1)
      goTo(3)
    },
    [goTo],
  )

  // ---- Stage 3 ---- (carry-forward 4)
  const handleEvidence = useCallback(
    (
      r: Pick<
        FounderStats,
        | 'chartMisreads'
        | 'sourcesOpened'
        | 'factsLoadBearing'
        | 'factsContradicted'
        | 'caseStrength'
      > & { committedFacts: string[] },
    ) => {
      const { committedFacts, ...stats } = r
      Object.assign(statsRef.current, stats)
      carryRef.current.committedFacts = committedFacts
      setCarryVersion((v) => v + 1)
      goTo(4)
    },
    [goTo],
  )

  // ---- Stage 4 ---- (carry-forwards 5, 6)
  const handleMemo = useCallback(
    (
      r: Pick<
        FounderStats,
        | 'memoRecommendation'
        | 'memoDecisive'
        | 'memoHedges'
        | 'memoTradeoffOwned'
        | 'memoAskSpecific'
        | 'memoEvidenceCoherent'
      >,
    ) => {
      Object.assign(statsRef.current, r)
      carryRef.current.memoRecommendation = r.memoRecommendation
      setCarryVersion((v) => v + 1)
      goTo(5)
    },
    [goTo],
  )

  // ---- Stage 5 ---- (carry-forwards 7, 8, 12)
  const handleRunway = useCallback(
    (
      r: Pick<
        FounderStats,
        | 'hireEng'
        | 'hireAE'
        | 'hireCSM'
        | 'hireAudit'
        | 'runwayMonths'
        | 'runwayBelowBoardFloor'
        | 'planCoherent'
        | 'planStarved'
        | 'runwayRecalcs'
      >,
    ) => {
      Object.assign(statsRef.current, r)
      Object.assign(carryRef.current, {
        hireEng: r.hireEng,
        hireAE: r.hireAE,
        hireCSM: r.hireCSM,
        hireAudit: r.hireAudit,
        runwayMonths: r.runwayMonths,
      })
      setCarryVersion((v) => v + 1)
      goTo(6)
    },
    [goTo],
  )

  // ---- Stage 6 ---- (carry-forwards 9, 10)
  const handleNegotiation = useCallback(
    (
      r: Pick<
        FounderStats,
        | 'marcusTrust'
        | 'negotiationPath'
        | 'negotiationEscalated'
        | 'negotiationCaved'
        | 'negotiationUsedNumbers'
        | 'hireAE'
        | 'runwayMonths'
      >,
    ) => {
      Object.assign(statsRef.current, r)
      // planCoherent is deliberately NOT recomputed: D6 scores a cave against
      // the plan the operator had already committed to.
      statsRef.current.runwayBelowBoardFloor = r.runwayMonths < 18
      carryRef.current.hireAE = r.hireAE
      carryRef.current.runwayMonths = r.runwayMonths
      carryRef.current.founderMinutes = r.negotiationEscalated ? 6 : 8
      // Same reason: appending would inject a duplicate I-M1 (and duplicate
      // React keys) if the operator returns to Stage 6 and re-clicks its CTA.
      carryRef.current.injectedItemIds = [
        ...carryRef.current.injectedItemIds.filter((id) => id !== 'I-M1'),
        ...(r.negotiationEscalated ? ['I-M1'] : []),
      ]
      setCarryVersion((v) => v + 1)
      goTo(7)
    },
    [goTo],
  )

  // ---- Stage 7 ---- (carry-forward 11)
  const handlePreread = useCallback(
    (
      r: Pick<
        FounderStats,
        | 'claimsCut'
        | 'unsupportableLeft'
        | 'overSanitized'
        | 'evidenceAttached'
        | 'anselQuestionsInvited'
        | 'anselTrust'
      > & { anselQuestions: string[] },
    ) => {
      const { anselQuestions, ...stats } = r
      Object.assign(statsRef.current, stats)
      carryRef.current.anselQuestions = anselQuestions
      setCarryVersion((v) => v + 1)
      goTo(8)
    },
    [goTo],
  )

  // ---- Stage 8 · commit → report ----
  const handleCommit = useCallback(
    (
      r: Pick<
        FounderStats,
        | 'founderMinutesBudget'
        | 'founderMinutesUsed'
        | 'escalatedCritical'
        | 'criticalTotal'
        | 'escalatedNoise'
        | 'absorbedOverload'
        | 'writtenUsed'
      >,
    ) => {
      Object.assign(statsRef.current, r)
      statsRef.current.elapsedSeconds =
        startedAt.current === 0 ? 0 : Math.round((Date.now() - startedAt.current) / 1000)
      setReportStats({ ...statsRef.current })
      setMaxReached(9)
      setStage(9)
      setReportOpen(true)
    },
    [],
  )

  const handleReplay = useCallback(() => {
    statsRef.current = freshFounderStats()
    carryRef.current = freshCarry()
    startedAt.current = 0
    setCarryVersion((v) => v + 1)
    setReportStats(freshFounderStats())
    setReportOpen(false)
    setStage(1)
    setMaxReached(1)
    setOperatorName('')
    setRunKey((k) => k + 1)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  return (
    <div className="min-h-screen">
      <ContextBar track="Founder's Office Track" />
      <div className="flex min-h-screen">
        <Sidebar
          current={stage}
          maxReached={maxReached}
          onNavigate={(s) => goTo(s as FounderStage)}
          steps={STEPS}
          subtitle="Founder's Office"
          duration="13–16 minutes"
        />

        <main className="mx-auto w-full max-w-4xl flex-1 px-5 py-8 sm:px-10">
          {/* mobile brand */}
          <div className="mb-6 flex items-center gap-3 md:hidden">
            <div className="flex size-8 items-center justify-center rounded-[var(--radius-sm)] bg-gilt">
              <span className="text-sm font-extrabold text-void">P</span>
            </div>
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
                <StageTwoQueue showToast={showToast} onProceed={handleQueue} />
              </div>
            )}

            {maxReached >= 3 && (
              <div className={stage === 3 ? '' : 'hidden'}>
                <StageThreeEvidence
                  evidenceLocked={carry.evidenceLocked}
                  showToast={showToast}
                  onProceed={handleEvidence}
                />
              </div>
            )}

            {maxReached >= 4 && (
              <div className={stage === 4 ? '' : 'hidden'}>
                <StageFourMemoComposer
                  committedFacts={carry.committedFacts}
                  factsLoadBearing={statsRef.current.factsLoadBearing}
                  factsContradicted={statsRef.current.factsContradicted}
                  showToast={showToast}
                  onProceed={handleMemo}
                />
              </div>
            )}

            {maxReached >= 5 && (
              <div className={stage === 5 ? '' : 'hidden'}>
                <StageFiveRunway
                  memoRecommendation={carry.memoRecommendation}
                  showToast={showToast}
                  onProceed={handleRunway}
                />
              </div>
            )}

            {maxReached >= 6 && (
              <div className={stage === 6 ? '' : 'hidden'}>
                <StageSixNegotiation
                  memoRecommendation={carry.memoRecommendation}
                  hireEng={carry.hireEng}
                  hireAE={carry.hireAE}
                  hireCSM={carry.hireCSM}
                  hireAudit={carry.hireAudit}
                  showToast={showToast}
                  onProceed={handleNegotiation}
                />
              </div>
            )}

            {maxReached >= 7 && (
              <div className={stage === 7 ? '' : 'hidden'}>
                <StageSevenPreread
                  runwayMonths={carry.runwayMonths}
                  showToast={showToast}
                  onProceed={handlePreread}
                />
              </div>
            )}

            {maxReached >= 8 && (
              <div className={stage === 8 || (stage === 9 && !reportOpen) ? '' : 'hidden'}>
                <StageEightEscalation
                  founderMinutes={carry.founderMinutes}
                  hireAE={carry.hireAE}
                  injectedItemIds={carry.injectedItemIds}
                  anselQuestions={carry.anselQuestions}
                  showToast={showToast}
                  onCommit={handleCommit}
                />
              </div>
            )}
          </div>
        </main>
      </div>

      <FounderReport
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
