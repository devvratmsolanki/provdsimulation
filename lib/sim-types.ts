export type FundingSource = '' | 'Ads' | 'CRM' | 'Server'

export type RootCause = '' | 'Marketing' | 'Tech' | 'Product'

/**
 * The global tracking object for the operator's micro-decisions across the
 * whole simulation. Feeds the final "Simulated AI" Talent Report.
 */
export interface OperatorStats {
  chartMisclicks: number
  budgetWarnings: number
  fundingSource: FundingSource
  decoyUsed: boolean
  overallScore: number
  rootCauseSelected: RootCause
  correctPlacements: number
}

export function freshStats(): OperatorStats {
  return {
    chartMisclicks: 0,
    budgetWarnings: 0,
    fundingSource: '',
    decoyUsed: false,
    overallScore: 0,
    rootCauseSelected: '',
    correctPlacements: 0,
  }
}

export type Stage = 1 | 2 | 3 | 4 | 5

export type ToastType = 'success' | 'error' | 'info'

export interface ToastItem {
  id: number
  message: string
  type: ToastType
}

/** Talent Report tier derived from the final score. */
export interface ReportResult {
  score: number
  tier: 'Ready to Hire' | 'High Potential' | 'Developing'
  note: string
}
