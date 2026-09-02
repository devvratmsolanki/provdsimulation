/**
 * Founder's Office simulation — telemetry contract.
 * Track 02, route /founders-office. See .founders-spec.md §3 and §4.
 *
 * Flat, serializable, no nesting, no Date, no Map. Every field is written by
 * exactly one stage. Toast types are reused from the AI-Ops sim unchanged.
 */

export type Rec = 'save-cordell' | 'chase-series-b' | 'cut-burn' | ''

export type FounderStage = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9

export interface FounderStats {
  // ── Stage 1 · Intake ─────────────────────────────────────────
  intakeCorrect: number // 0–9   lines tagged with the truth value
  intakeAsksMissed: number // 0–3   real ASKs tagged CONTEXT or NOISE
  intakeNoiseElevated: number // 0–2   NOISE lines tagged ASK
  intakeRetags: number // ≥0    total tag changes; indecision proxy

  // ── Stage 2 · Queue ──────────────────────────────────────────
  queueMinutesSpent: number // 0–240
  queueHighValueHandled: number // 0–4   of {Q-01,Q-03,Q-05,Q-12} set to DO NOW
  queueTrapsDoneNow: number // 0–3   of {Q-06,Q-07,Q-11} set to DO NOW
  queueDelegated: number // 0–12
  queueDeclined: number // 0–12
  queueDelegationOverload: boolean // >3 items to a single named person
  queueCordellDeferred: boolean // Q-03 disposition is DEFER or DECLINE

  // ── Stage 3 · Evidence ───────────────────────────────────────
  chartMisreads: number // ≥0    chart clicks outside index 19 ±1
  sourcesOpened: number // 0–5   distinct evidence tabs viewed
  factsLoadBearing: number // 0–3   committed facts in {F1,F2,F3}
  factsContradicted: number // 0–1   committed facts in {F6}
  evidenceLocked: boolean // Renata's DMs were unavailable
  caseStrength: number // 0–3   = factsLoadBearing - factsContradicted, floored at 0

  // ── Stage 4 · Memo ───────────────────────────────────────────
  memoRecommendation: Rec
  memoDecisive: boolean // headline H2
  memoHedges: number // 0–3   hedged blocks across S/T/A (RECOMMENDATION offers no hedge)
  memoTradeoffOwned: boolean // T3
  memoAskSpecific: boolean // A2
  memoEvidenceCoherent: boolean

  // ── Stage 5 · Runway ─────────────────────────────────────────
  hireEng: number // 0–3
  hireAE: number // 0–4  (3 max in-stage; can reach 4 via a Stage-6 cave)
  hireCSM: number // 0–2
  hireAudit: number // 0–1
  runwayMonths: number // 1 decimal place
  runwayBelowBoardFloor: boolean // runwayMonths < 18
  planCoherent: boolean
  planStarved: number // 0–3
  runwayRecalcs: number // ≥0   stepper interactions; churn proxy

  // ── Stage 6 · Negotiation ────────────────────────────────────
  marcusTrust: number // starts 50; reachable range 22–84
  negotiationPath: string // e.g. "defend>data>commit"
  negotiationEscalated: boolean
  negotiationCaved: boolean
  negotiationUsedNumbers: boolean

  // ── Stage 7 · Board pre-read ─────────────────────────────────
  claimsCut: number // 0–6
  unsupportableLeft: number // 0–3
  overSanitized: number // 0–3
  evidenceAttached: number // 0–2
  anselQuestionsInvited: number // 0–4
  anselTrust: number // starts 50; formula maximum is 82

  // ── Stage 8 · Escalation filter ──────────────────────────────
  founderMinutesBudget: number // 8 | 6
  founderMinutesUsed: number // 0–8
  escalatedCritical: number // must-say items placed in SAY IT NOW
  criticalTotal: number // 3–7   3 fixed + I-R1 (Cordell deferred) + one per unsupportable claim left
  escalatedNoise: number // 0–3   low-value items placed in SAY IT NOW
  absorbedOverload: boolean // >4 items absorbed
  writtenUsed: number // 0–3

  // ── Meta ─────────────────────────────────────────────────────
  elapsedSeconds: number // wall-clock from Stage 1 accept to Stage 8 commit
  stagesRevisited: number // sidebar back-navigations
}

export function freshFounderStats(): FounderStats {
  return {
    intakeCorrect: 0,
    intakeAsksMissed: 0,
    intakeNoiseElevated: 0,
    intakeRetags: 0,

    queueMinutesSpent: 0,
    queueHighValueHandled: 0,
    queueTrapsDoneNow: 0,
    queueDelegated: 0,
    queueDeclined: 0,
    queueDelegationOverload: false,
    queueCordellDeferred: false,

    chartMisreads: 0,
    sourcesOpened: 0,
    factsLoadBearing: 0,
    factsContradicted: 0,
    evidenceLocked: false,
    caseStrength: 0,

    memoRecommendation: '',
    memoDecisive: false,
    memoHedges: 0,
    memoTradeoffOwned: false,
    memoAskSpecific: false,
    memoEvidenceCoherent: false,

    hireEng: 0,
    hireAE: 0,
    hireCSM: 0,
    hireAudit: 0,
    runwayMonths: BASE_RUNWAY_MONTHS,
    runwayBelowBoardFloor: false,
    planCoherent: false,
    planStarved: 0,
    runwayRecalcs: 0,

    marcusTrust: 50,
    negotiationPath: '',
    negotiationEscalated: false,
    negotiationCaved: false,
    negotiationUsedNumbers: false,

    claimsCut: 0,
    unsupportableLeft: 0,
    overSanitized: 0,
    evidenceAttached: 0,
    anselQuestionsInvited: 0,
    anselTrust: 50,

    founderMinutesBudget: 8,
    founderMinutesUsed: 0,
    escalatedCritical: 0,
    criticalTotal: 3,
    escalatedNoise: 0,
    absorbedOverload: false,
    writtenUsed: 0,

    elapsedSeconds: 0,
    stagesRevisited: 0,
  }
}

/**
 * Cross-stage consequence state (§3). A plain object of plain values —
 * deliberately not a reducer, a context provider, or an event bus.
 */
export interface Carry {
  evidenceLocked: boolean // S2 → S3
  committedFacts: string[] // S3 → S4  (fact ids, e.g. ['F1','F2','F3'])
  memoRecommendation: Rec // S4 → S5, S6, S7
  runwayMonths: number // S5 → S6, S7, S8
  hireEng: number // S5 → S6 (runway recompute on cave)
  hireAE: number // S5 → S6, S8
  hireCSM: number // S5 → S6 (runway recompute on cave)
  hireAudit: number // S5 → S6 (runway recompute on cave)
  founderMinutes: 8 | 6 // S6 → S8
  injectedItemIds: string[] // S2, S6 → S8
  anselQuestions: string[] // S7 → S8
}

export function freshCarry(): Carry {
  return {
    evidenceLocked: false,
    committedFacts: [],
    memoRecommendation: '',
    runwayMonths: BASE_RUNWAY_MONTHS,
    hireEng: 0,
    hireAE: 0,
    hireCSM: 0,
    hireAudit: 0,
    founderMinutes: 8,
    injectedItemIds: [],
    anselQuestions: [],
  }
}

/* ── The runway model (§2 Stage 5, exact, in $k) ─────────────────────
 * Shared by Stage 5 (live readout) and Stage 6 (recompute after a cave).
 * Fixtures: (0,0,0,0)→20.3 (2,1,1,1)→18.4 (1,2,1,1)→18.4
 *           (2,3,1,1)→17.6 (3,3,2,1)→17.0
 */
export const BASE_CASH_K = 12400
export const BASE_BURN_K = 610
export const AUDIT_ONE_TIME_K = 140
export const BOARD_FLOOR_MONTHS = 18

export function addedBurn(hireEng: number, hireAE: number, hireCSM: number): number {
  return 16 * hireEng + 14 * hireAE + 11 * hireCSM
}

export function computeRunway(
  hireEng: number,
  hireAE: number,
  hireCSM: number,
  hireAudit: number,
): number {
  const cash = BASE_CASH_K - AUDIT_ONE_TIME_K * hireAudit
  return Math.round((cash / (BASE_BURN_K + addedBurn(hireEng, hireAE, hireCSM))) * 10) / 10
}

/** The zero-plan runway, quoted on screen before anything is funded. */
export const BASE_RUNWAY_MONTHS = 20.3
