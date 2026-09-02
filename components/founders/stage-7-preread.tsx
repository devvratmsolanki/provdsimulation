'use client'

import { useState } from 'react'
import { ArrowRight, FileText, ScanLine } from 'lucide-react'
import type { ToastType } from '@/lib/sim-types'

export interface StageSevenPrereadProps {
  /** Carry from Stage 5/6 — C5 is unsupportable iff runwayMonths < 18. */
  runwayMonths: number
  showToast: (m: string, t?: ToastType) => void
  onProceed: (r: {
    claimsCut: number // 0–6
    unsupportableLeft: number // 0–3
    overSanitized: number // 0–3
    evidenceAttached: number // 0–2, among {C4, C6}
    anselQuestionsInvited: number // 0–4
    anselTrust: number // 0–100, §2 clamp formula
    /** The invited questions, verbatim — Stage 8 injects one row per question. */
    anselQuestions: string[]
  }) => void
}

type Action = 'KEEP' | 'SOFTEN' | 'CUT'

interface ClaimState {
  action: Action | null
  evidence: boolean
}

interface Claim {
  id: string
  text: string
  /** ADD EVIDENCE is offered on C4 and C6 only — that is what caps
   *  `evidenceAttached` at 0–2. */
  evidenceNote?: string
}

const CLAIMS: Claim[] = [
  { id: 'C1', text: 'ARR $4.2M, up 96% year over year.' },
  { id: 'C2', text: 'Net dollar retention: 118%.' },
  { id: 'C3', text: 'Cordell expanding to three new regions in Q3.' },
  {
    id: 'C4',
    text: 'Engineering velocity steady quarter over quarter.',
    // Copy ratified in .founders-spec.md §2 — evidence footnote.
    evidenceNote:
      'Attached: sprint throughput, last six sprints — flat, and the VP Eng seat is open as of Friday.',
  },
  { id: 'C5', text: '18+ months of runway at current plan.' },
  {
    id: 'C6',
    text: 'CAC payback: 21 months.',
    // Copy ratified in .founders-spec.md §2 — evidence footnote.
    evidenceNote:
      'Attached: CAC payback by cohort — 21 months blended, 16 months on the last two cohorts.',
  },
]

// Ansel's questions, §2 Stage 7 verbatim. The spec renders C5's "which" in
// markdown emphasis; it ships here as plain text because Stage 8 injects the
// same string as a row label.
const QUESTIONS: Record<string, string> = {
  C2: 'Walk me through the 118%. Does it include Cordell at full weight?',
  C3: 'Who at Cordell confirmed the Q3 expansion, and when?',
  C5: 'Eighteen months at which plan? Send me the model.',
  C4: "Steady velocity — is that before or after Dmitri's last day?",
}

// Copy ratified in .founders-spec.md §2 — the three "what you just deleted" notes (designer-supplied
// register, per the UI spec's suggestion).
const DELETED_NOTES: Record<string, string> = {
  C1: 'ARR up 96% was your strongest number. You took it off the slide.',
  C4: 'Cutting the velocity line does not make the VP Eng seat less empty. It makes it unmentioned.',
  C6: 'CAC payback was the one number that clears Ansel’s moved bar. It is no longer in the deck.',
}

function claimClass(state: ClaimState) {
  if (state.action === 'CUT')
    return 'line-through decoration-error decoration-2 opacity-40 text-text-warm'
  if (state.action === 'SOFTEN') return 'italic text-muted-ink'
  return 'text-text-warm'
}

function actionClass(a: Action, selected: boolean) {
  if (!selected) return 'border-border-dark bg-surface text-muted-ink hover:border-gilt'
  if (a === 'SOFTEN') return 'border-gilt/50 bg-gilt/[0.12] text-gilt'
  if (a === 'CUT') return 'border-error/60 bg-error/10 text-error'
  return 'border-border-dark bg-surface text-text-warm'
}

export function StageSevenPreread({ runwayMonths, onProceed }: StageSevenPrereadProps) {
  const [states, setStates] = useState<Record<string, ClaimState>>(
    Object.fromEntries(
      CLAIMS.map((c) => [c.id, { action: null, evidence: false }]),
    ) as Record<string, ClaimState>,
  )
  const [committed, setCommitted] = useState(false)

  const unsupportable = ['C2', 'C3', ...(runwayMonths < 18 ? ['C5'] : [])]
  const keptUnsupportable = unsupportable.filter((id) => states[id].action === 'KEEP')
  const unsupportableLeft = keptUnsupportable.length
  const c4Invites = states.C4.action === 'KEEP' && !states.C4.evidence

  const overSanitizedIds = [
    ...(states.C1.action === 'CUT' || states.C1.action === 'SOFTEN' ? ['C1'] : []),
    ...(states.C4.action === 'CUT' ? ['C4'] : []),
    ...(states.C6.action === 'CUT' ? ['C6'] : []),
  ]
  const evidenceAttached = ['C4', 'C6'].filter((id) => states[id].evidence).length
  const invited = unsupportableLeft + (c4Invites ? 1 : 0)
  const ready = CLAIMS.every((c) => states[c.id].action !== null)

  // Panel order follows the slide, so the questions read as the deck reads.
  const panelQuestions = [
    ...CLAIMS.filter((c) => keptUnsupportable.includes(c.id)).map((c) => ({
      id: c.id,
      text: QUESTIONS[c.id],
    })),
    ...(c4Invites ? [{ id: 'C4', text: QUESTIONS.C4 }] : []),
  ]

  function setAction(id: string, action: Action) {
    if (committed) return
    setStates((s) => ({ ...s, [id]: { ...s[id], action } }))
  }

  function toggleEvidence(id: string) {
    if (committed) return
    setStates((s) => ({ ...s, [id]: { ...s[id], evidence: !s[id].evidence } }))
  }

  function handleCommit() {
    const overSanitized = overSanitizedIds.length
    setCommitted(true)
    onProceed({
      claimsCut: CLAIMS.filter((c) => states[c.id].action === 'CUT').length,
      unsupportableLeft,
      overSanitized,
      evidenceAttached,
      anselQuestionsInvited: invited,
      anselTrust: Math.max(
        0,
        Math.min(
          100,
          Math.round(
            50 +
              12 * evidenceAttached -
              14 * unsupportableLeft -
              6 * overSanitized +
              (states.C3.action === 'CUT' ? 8 : 0),
          ),
        ),
      ),
      // Only the unsupportable claims left at KEEP inject a Stage 8 row.
      // C4's question is invited on screen but is not a must-say.
      anselQuestions: keptUnsupportable.map((id) => QUESTIONS[id]),
    })
  }

  return (
    <section className="stage-enter">
      <div className="mb-6">
        <div className="flex items-start justify-between gap-4">
          <div className="eyebrow mb-4">
            <ScanLine className="size-3.5" />
            Stage 7 — Narrative Under Scrutiny
          </div>
          <span className="hidden shrink-0 font-mono text-[11px] tracking-[0.08em] text-muted-ink sm:block">
            16:50 · STAGE 7 / 8
          </span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-text-warm">
          Redline the Slide Priya Would Have Sent
        </h1>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-muted-ink">
          Mark up six claims on the board narrative slide before Ansel sees it.
        </p>
      </div>

      {invited > 0 && (
        <p className="mb-3 font-mono text-[11px] text-error lg:hidden">
          {invited} QUESTION(S) INVITED
        </p>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        <article
          className={`rounded-[var(--radius-md)] border border-border-dark bg-carbon p-6 sm:p-8 ${
            committed ? 'pointer-events-none' : ''
          }`}
        >
          <div className="flex items-baseline justify-between border-b border-gilt/30 pb-3">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-gilt">
              Ridgeline — Board Pre-Read
            </p>
            <p className="font-mono text-[10px] tracking-[0.1em] text-muted-ink">Draft</p>
          </div>

          <div className="divide-y divide-border-dark">
            {CLAIMS.map((claim) => {
              const state = states[claim.id]
              return (
                <div key={claim.id} className="py-5">
                  <p
                    className={`text-[14px] leading-relaxed transition-all sm:text-[15px] ${claimClass(
                      state,
                    )}`}
                  >
                    {claim.text}
                  </p>

                  {state.evidence && claim.evidenceNote && (
                    <p className="reveal-down mt-2.5 flex gap-2 border-l-2 border-l-gilt pl-3 font-mono text-[11.5px] leading-snug text-gilt">
                      <FileText className="mt-0.5 size-3.5 shrink-0" />
                      {claim.evidenceNote}
                    </p>
                  )}

                  <div
                    className={`mt-3 flex flex-wrap gap-1.5 ${committed ? 'opacity-25' : ''}`}
                  >
                    {(['KEEP', 'SOFTEN', 'CUT'] as const).map((a) => (
                      <button
                        key={a}
                        type="button"
                        aria-pressed={state.action === a}
                        aria-label={`${a} — ${claim.text}`}
                        onClick={() => setAction(claim.id, a)}
                        className={`min-h-11 rounded-[var(--radius-sm)] border px-2.5 text-[10px] font-bold uppercase tracking-[0.08em] transition-colors sm:min-h-0 sm:py-1.5 ${actionClass(
                          a,
                          state.action === a,
                        )}`}
                      >
                        {a}
                      </button>
                    ))}
                    {claim.evidenceNote && (
                      <button
                        type="button"
                        aria-pressed={state.evidence}
                        aria-label={`Add evidence — ${claim.text}`}
                        onClick={() => toggleEvidence(claim.id)}
                        className={`min-h-11 rounded-[var(--radius-sm)] border px-2.5 text-[10px] font-bold uppercase tracking-[0.08em] transition-colors sm:min-h-0 sm:py-1.5 ${
                          state.evidence
                            ? 'border-gilt bg-gilt text-void'
                            : 'border-border-dark bg-surface text-muted-ink hover:border-gilt'
                        }`}
                      >
                        Add Evidence
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </article>

        <aside className="lg:sticky lg:top-6">
          <div className="rounded-[var(--radius-md)] border border-border-dark bg-carbon p-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-ink">
              Questions you just invited
            </p>
            <div className="mt-3 space-y-2" aria-live="polite">
              {panelQuestions.length === 0 ? (
                <p className="rounded-[var(--radius-sm)] border border-dashed border-border-dark px-3 py-5 text-center text-[12px] text-muted-ink">
                  Nothing here yet.
                </p>
              ) : (
                panelQuestions.map((q) => (
                  <div
                    key={q.id}
                    className="reveal-down border-l-2 border-l-error bg-error/[0.06] px-3 py-2.5"
                  >
                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-error">
                      Ansel
                    </p>
                    <p className="mt-1 text-[12.5px] leading-snug text-text-warm">
                      {q.text}
                    </p>
                  </div>
                ))
              )}
            </div>

            {overSanitizedIds.length > 0 && (
              <>
                <div className="my-4 h-px bg-border-dark" />
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-ink">
                  What you just deleted
                </p>
                <div className="mt-3 space-y-2">
                  {overSanitizedIds.map((id) => (
                    <p
                      key={id}
                      className="reveal-down border-l-2 border-l-gilt-dim bg-surface px-3 py-2.5 text-[12.5px] leading-snug text-text-warm"
                    >
                      {DELETED_NOTES[id]}
                    </p>
                  ))}
                </div>
              </>
            )}
          </div>
        </aside>
      </div>

      {ready && (
        <button
          type="button"
          onClick={handleCommit}
          className="reveal-down mt-6 inline-flex w-full items-center justify-center gap-3 rounded-[var(--radius-md)] bg-gilt px-6 py-3.5 text-sm font-bold tracking-[0.02em] text-void transition-colors hover:bg-gilt-dim sm:w-auto"
        >
          Proceed to Stage 8 — Escalation Filter
          <ArrowRight className="size-4" />
        </button>
      )}
    </section>
  )
}
