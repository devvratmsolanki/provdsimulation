'use client'

import { useState } from 'react'
import { Film, Radio, ArrowRight, Play } from 'lucide-react'

export function StageBrief({
  operatorName,
  setOperatorName,
  onAccept,
}: {
  operatorName: string
  setOperatorName: (v: string) => void
  onAccept: () => void
}) {
  // Phase 1A = The Classroom, Phase 1B = The Interruption
  const [phase, setPhase] = useState<'1A' | '1B'>('1A')

  const displayName = (operatorName || '').trim() || 'Guest Operator'

  return (
    <section className="stage-enter">
      <div className="mb-6">
        <div className="eyebrow mb-4">
          <Film className="size-3.5" />
          Stage 1 — Mission Brief
        </div>
        <h1 className="text-3xl font-extrabold leading-tight tracking-tight text-text-warm sm:text-4xl">
          {phase === '1A' ? 'Module 1: Core Retention Mechanics' : 'The Operational Triage'}
        </h1>
        <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-muted-ink">
          {phase === '1A'
            ? 'Complete the training module, then step into the live sandbox where the theory meets a company in freefall.'
            : 'Theoreticals are over. Read the incoming transmission and accept the mission.'}
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <label htmlFor="operatorName" className="text-xs text-muted-ink">
            Running this as
          </label>
          <input
            id="operatorName"
            type="text"
            maxLength={40}
            value={operatorName}
            onChange={(e) => setOperatorName(e.target.value)}
            placeholder="Guest Operator"
            className="w-48 rounded-[var(--radius-sm)] border border-border-dark bg-surface px-3 py-2 text-sm text-text-warm outline-none"
          />
        </div>
      </div>

      {/* ---------- PHASE 1A: THE CLASSROOM ---------- */}
      {phase === '1A' && (
        <div className="stage-enter">
          <div className="flex aspect-video w-full items-center justify-center rounded-[var(--radius-md)] border border-border-dark bg-carbon">
            <div className="flex flex-col items-center text-center">
              <div className="flex size-16 items-center justify-center rounded-[var(--radius-sm)] border border-border-dark bg-surface">
                <Play className="ml-0.5 size-6 text-text-warm" />
              </div>
              <p className="mt-4 text-sm font-medium text-text-warm">
                Video Placeholder: Core Retention Mechanics
              </p>
              <p className="mt-1 text-xs text-muted-ink">Runtime 12:04 · Founder&apos;s Office Masterclass</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setPhase('1B')}
            className="mt-8 inline-flex w-full items-center justify-center gap-3 rounded-[var(--radius-md)] bg-gilt px-6 py-3.5 text-sm font-bold tracking-[0.02em] text-void transition-colors hover:bg-gilt-dim sm:w-auto"
          >
            Complete Module &amp; Enter Sandbox
            <ArrowRight className="size-4" />
          </button>
        </div>
      )}

      {/* ---------- PHASE 1B: THE INTERRUPTION ---------- */}
      {phase === '1B' && (
        <div className="reveal-down flex flex-col items-center py-4">
          <div className="w-full max-w-xl overflow-hidden rounded-[var(--radius-md)] border-2 border-error bg-carbon hard-shadow">
            <div className="flex items-center gap-2 border-b border-error/40 bg-error/10 px-4 py-2.5">
              <Radio className="size-4 text-error" />
              <span className="text-xs font-bold uppercase tracking-[0.14em] text-error">
                Incoming Transmission
              </span>
              <span className="pulse ml-auto inline-block size-2 rounded-full bg-error" />
            </div>
            <div className="p-6">
              <p className="text-lg leading-relaxed text-text-warm">
                <span className="font-bold text-gilt">@{displayName}</span>, theoreticals
                are over. Revenue just dropped{' '}
                <span className="font-bold text-error">40%</span> on the Day-7 cohort.
                Find the leak and balance the budget.
                <span className="mt-3 block font-mono text-sm text-muted-ink">
                  &gt; You have 3 minutes.
                </span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onAccept}
            className="mt-8 inline-flex w-full max-w-xl items-center justify-center gap-3 rounded-[var(--radius-md)] bg-gilt px-6 py-3.5 text-sm font-bold tracking-[0.02em] text-void transition-colors hover:bg-gilt-dim"
          >
            Accept Mission &amp; Start Timer
            <ArrowRight className="size-4" />
          </button>
        </div>
      )}
    </section>
  )
}
