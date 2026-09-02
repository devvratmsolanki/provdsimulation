import type { OperatorStats, ReportResult } from './sim-types'

/**
 * The "Simulated AI" review matrix. Builds a personalized partner note and a
 * final hiring tier purely from the operator's tracked micro-decisions.
 */
export function generateAIReport(stats: OperatorStats): ReportResult {
  // ---- Scoring algorithm ----
  let score = 100
  score -= 10 * stats.chartMisclicks
  score -= 15 * stats.budgetWarnings
  if (stats.decoyUsed) score -= 25
  if (stats.fundingSource === 'Ads') score += 10
  score = Math.min(100, score)
  score = Math.max(0, score)

  // ---- Logic matrix ----
  const part1 =
    stats.chartMisclicks === 0
      ? 'The operator demonstrated elite signal-to-noise filtering, instantly diagnosing the true root cause without chasing false metrics.'
      : 'The operator required multiple passes to filter out the noise, eventually diagnosing the root cause but showing a dangerous tendency to jump to conclusions.'

  let part2: string
  if (stats.budgetWarnings === 0 && stats.fundingSource === 'Ads') {
    part2 =
      ' Resource reallocation was highly disciplined, perfectly defunding the toxic acquisition channel to protect the core business.'
  } else if (stats.budgetWarnings === 0 && stats.fundingSource !== 'Ads') {
    part2 =
      ' They successfully funded the crisis without breaking constraints, but pulled capital from the wrong source, missing a critical operational synergy.'
  } else {
    part2 =
      ' Budgeting exposed a critical flaw under pressure: they temporarily broke active operational constraints to fund the crisis, choking the sales pipeline.'
  }

  let part3: string
  if (!stats.decoyUsed && stats.correctPlacements >= 4) {
    part3 =
      ' Execution sequencing was flawless, perfectly isolating immediate triage from long-term structural fixes.'
  } else if (!stats.decoyUsed && stats.correctPlacements < 4) {
    part3 =
      ' Execution mapping was functional but messy, slightly confusing immediate bleeding with long-term fixes.'
  } else {
    part3 =
      ' However, prioritization under fire needs serious work—they deployed a catastrophic decoy action, demonstrating a tendency to overreact rather than stick to the playbook.'
  }

  const note = part1 + part2 + part3

  let tier: ReportResult['tier']
  if (score >= 90) tier = 'Ready to Hire'
  else if (score >= 75) tier = 'High Potential'
  else tier = 'Developing'

  return { score, tier, note }
}

export function tierColor(tier: ReportResult['tier']): string {
  if (tier === 'Ready to Hire') return 'text-pass'
  if (tier === 'High Potential') return 'text-gilt'
  return 'text-muted-ink'
}
