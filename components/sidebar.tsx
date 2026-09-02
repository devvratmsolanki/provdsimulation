'use client'

import { Check } from 'lucide-react'
import { BrandLockup } from './brand'

const DEFAULT_STEPS: { step: number; label: string }[] = [
  { step: 1, label: 'Mission Brief' },
  { step: 2, label: 'Synthesis' },
  { step: 3, label: 'Budget Triage' },
  { step: 4, label: 'Execution Pipeline' },
  { step: 5, label: 'Talent Report' },
]

/**
 * `onNavigate` is declared with method syntax deliberately: bivariant parameter
 * checking lets the AI-Ops sim keep passing its narrower `(s: Stage) => void`.
 */
export interface SidebarProps {
  current: number
  maxReached: number
  onNavigate(s: number): void
  steps?: { step: number; label: string }[]
  subtitle?: string
  duration?: string
}

export function Sidebar({
  current,
  maxReached,
  onNavigate,
  steps = DEFAULT_STEPS,
  subtitle = 'Operational Triage',
  duration = '3–5 minutes',
}: SidebarProps) {
  return (
    <aside className="sticky top-0 hidden h-screen w-72 flex-col border-r border-border-dark bg-carbon px-6 py-8 md:flex">
      <div className="mb-10">
        <BrandLockup sub={subtitle} />
      </div>

      <nav className="flex-1 space-y-1">
        {steps.map(({ step, label }) => {
          const isActive = step === current
          const isDone = step < current
          const isLocked = step > maxReached
          return (
            <button
              key={step}
              type="button"
              disabled={isLocked}
              onClick={() => !isLocked && onNavigate(step)}
              className={`flex w-full items-center gap-3 rounded-[var(--radius-sm)] px-3 py-[11px] text-left transition-colors ${
                isActive
                  ? 'bg-gilt/[0.08] text-text-warm'
                  : isLocked
                    ? 'cursor-not-allowed text-muted-ink/50'
                    : 'text-muted-ink hover:bg-surface'
              }`}
            >
              <span
                className={`flex size-[26px] shrink-0 items-center justify-center rounded-[var(--radius-sm)] border text-[11px] font-bold ${
                  isActive
                    ? 'border-gilt bg-gilt text-void'
                    : isDone
                      ? 'border-pass bg-pass text-parchment'
                      : 'border-border-dark text-muted-ink'
                }`}
              >
                {isDone ? <Check className="size-3" /> : step}
              </span>
              <span className="text-[13px] font-medium">{label}</span>
            </button>
          )
        })}
      </nav>

      <div className="mt-6 border-t border-border-dark pt-6">
        <div className="flex items-center gap-2 text-[11px] text-muted-ink">
          <span className="pulse inline-block size-[9px] rounded-full bg-pass" />
          Live Sandbox Session
        </div>
        <p className="mt-2 text-[11px] text-muted-ink">{`Est. duration: ${duration}`}</p>
      </div>
    </aside>
  )
}
