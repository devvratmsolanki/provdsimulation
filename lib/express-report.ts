import type { FounderStats } from './founder-sim-types'

/**
 * Scoring for the 2-minute express run (Stages 1, 5 and 6 only).
 *
 * Deliberately NOT `generateFounderReport`: that rubric reads telemetry from
 * all eight stages, so on a three-stage run the unwritten fields sit at their
 * zero state and read as failures rather than as absences. This scores only
 * what the express run actually measured.
 */
export interface ExpressDimension {
  label: string
  score: number
  band: 'Exceptional' | 'Strong' | 'Developing' | 'Needs Work'
}

export interface ExpressReportResult {
  dimensions: ExpressDimension[]
  overall: number
  tier: 'Ready to Hire' | 'High Potential' | 'Developing' | 'Not Yet'
  note: string
}

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)))

function band(n: number): ExpressDimension['band'] {
  if (n >= 85) return 'Exceptional'
  if (n >= 70) return 'Strong'
  if (n >= 55) return 'Developing'
  return 'Needs Work'
}

export function generateExpressReport(s: FounderStats): ExpressReportResult {
  // Reading the founder — S1 only.
  // intakeCorrect is included so blanket-tagging every line the same way
  // cannot score well by dodging the two specific penalties.
  const intake = clamp(
    100 - 16 * s.intakeAsksMissed - 10 * s.intakeNoiseElevated - 5 * (9 - s.intakeCorrect),
  )

  // Capital judgment — S5 only. Same shape as the full rubric's D4, minus the
  // terms that need stages the express run does not include.
  const capital = clamp(
    50 +
      (s.runwayMonths >= 18 ? 25 : 0) +
      (s.runwayMonths >= 21 ? 5 : 0) -
      (s.runwayMonths < 15 ? 20 : 0) +
      (s.planCoherent ? 20 : 0) -
      10 * s.planStarved +
      (s.hireCSM >= 1 && s.hireAudit === 1 ? 10 : 0),
  )

  // Stakeholder craft — S6 only.
  const stakeholder = clamp(
    0.75 * s.marcusTrust +
      22 +
      (s.negotiationUsedNumbers ? 12 : 0) -
      (s.negotiationEscalated ? 12 : 0) -
      (s.negotiationCaved ? 14 : 0),
  )

  const dimensions: ExpressDimension[] = [
    { label: 'Reading the Founder', score: intake, band: band(intake) },
    { label: 'Capital & Runway Judgment', score: capital, band: band(capital) },
    { label: 'Stakeholder Craft', score: stakeholder, band: band(stakeholder) },
  ]

  const overall = Math.round(0.3 * intake + 0.37 * capital + 0.33 * stakeholder)

  let tier: ExpressReportResult['tier']
  if (overall >= 86) tier = 'Ready to Hire'
  else if (overall >= 74) tier = 'High Potential'
  else if (overall >= 60) tier = 'Developing'
  else tier = 'Not Yet'

  // Two sentences: what they did with the money, then how they held the room.
  const runway = s.runwayMonths.toFixed(1)
  const s1 =
    s.planStarved > 0
      ? `They closed the plan at ${runway} months, but left ${s.planStarved} commitment(s) in it unfunded.`
      : s.runwayMonths >= 18
        ? `They funded a plan that holds ${runway} months — above the board floor, with every line paid for.`
        : `They funded a plan that closes at ${runway} months, below the 18-month floor the board is holding them to.`

  const s2 = s.negotiationEscalated
    ? 'Then they escalated a peer disagreement to a founder with eight minutes, which is the expensive way to win it.'
    : s.negotiationCaved
      ? 'Then they folded on the number they had just committed to, which is the one thing a founder cannot delegate again.'
      : s.negotiationUsedNumbers
        ? `Then they held the room with their own model rather than their title, and left Marcus at ${s.marcusTrust}.`
        : `Then they held the line without reaching for the numbers that would have won it outright. Marcus closed at ${s.marcusTrust}.`

  return { dimensions, overall, tier, note: `${s1} ${s2}` }
}

export function expressTierColor(tier: ExpressReportResult['tier']): string {
  if (tier === 'Ready to Hire') return 'text-pass'
  if (tier === 'High Potential') return 'text-gilt'
  if (tier === 'Developing') return 'text-text-warm'
  return 'text-muted-ink'
}
