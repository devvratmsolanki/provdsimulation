'use client'

import { useState } from 'react'
import { ArrowRight, Check, PenLine } from 'lucide-react'
import type { Rec } from '@/lib/founder-sim-types'
import type { ToastType } from '@/lib/sim-types'

export interface StageFourMemoComposerProps {
  /** Carry from Stage 3 — the yardstick for memoEvidenceCoherent. */
  committedFacts: string[]
  factsLoadBearing: number
  factsContradicted: number
  showToast: (m: string, t?: ToastType) => void
  onProceed: (r: {
    memoRecommendation: Rec
    memoDecisive: boolean // headline H2
    memoHedges: number // 0–4 across S/R/T/A
    memoTradeoffOwned: boolean // T3
    memoAskSpecific: boolean // A2
    memoEvidenceCoherent: boolean // §4 formula, computed here
  }) => void
}

type SlotKey = 'headline' | 'situation' | 'recommendation' | 'tradeoff' | 'ask'

interface Option {
  id: string
  text: string
  hedged?: boolean
  rec?: Rec
}

const SLOTS: { key: SlotKey; label: string; options: Option[] }[] = [
  {
    key: 'headline',
    label: 'Headline',
    options: [
      { id: 'H1', text: 'Cordell: Status and Considerations' },
      {
        id: 'H2',
        text: 'Cordell is 1 unfiled notice from churning. Recommend we spend $140k to keep them.',
      },
      { id: 'H3', text: 'Update on Several Open Items' },
    ],
  },
  {
    key: 'situation',
    label: 'Situation',
    options: [
      {
        id: 'S1',
        text: 'There are some concerns from Cordell that may warrant attention.',
        hedged: true,
      },
      {
        id: 'S2',
        text: "Cordell's usage fell 38% the week our export regression shipped. 8 of their last 11 tickets are that same bug, sitting a median of 9 days. Their non-renewal notice window closes today and nothing has been filed.",
      },
      {
        id: 'S3',
        text: 'Cordell is unhappy and is talking to Verity. We are at risk of losing 20% of ARR.',
      },
    ],
  },
  {
    key: 'recommendation',
    label: 'Recommendation',
    options: [
      {
        id: 'R1',
        rec: 'save-cordell',
        text: 'Spend $140k on an external evidence-export remediation and put a dedicated CSM on Cordell this week. It buys us the renewal, and it is the cheapest NDR we will ever buy.',
      },
      {
        id: 'R2',
        rec: 'chase-series-b',
        text: 'Hold the line on Cordell with existing staff and put the money into 3 AE hires. The Series B story is growth, not retention.',
      },
      {
        id: 'R3',
        rec: 'cut-burn',
        text: 'Freeze all hiring, fix the bug with the team we have, and extend runway past 24 months so we are never negotiating from weakness.',
      },
    ],
  },
  {
    key: 'tradeoff',
    label: 'Tradeoff',
    options: [
      { id: 'T1', text: 'There are risks either way.', hedged: true },
      { id: 'T2', text: "This is the right call and I don't see a real downside." },
      {
        id: 'T3',
        text: "What this costs us: it pushes runway to 18.4 months, one AE req below what Marcus is asking for, and it means the Q4 roadmap slips two weeks. I think that's the correct trade and I'll own it.",
      },
    ],
  },
  {
    key: 'ask',
    label: 'Ask',
    options: [
      { id: 'A1', text: 'Let me know your thoughts when you get a chance.', hedged: true },
      {
        id: 'A2',
        text: 'One decision from you: approve $140k remediation spend, by Wednesday 5pm, or I hold the Cordell call at status-quo. Reply Y or N.',
      },
      { id: 'A3', text: "I'll keep you posted as things develop.", hedged: true },
    ],
  },
]

/** The four sections that render under a label on the sheet; HEADLINE is set. */
const SHEET_SECTIONS = SLOTS.filter((s) => s.key !== 'headline')

function BlankLines({ n, wide }: { n: number; wide?: boolean }) {
  return (
    <div className="space-y-2" aria-hidden="true">
      {Array.from({ length: n }).map((_, i) => (
        <div
          key={i}
          className={`h-2.5 rounded-[1px] bg-void/[0.08] ${
            i === n - 1 ? 'w-1/2' : wide ? 'w-full' : 'w-11/12'
          }`}
        />
      ))}
    </div>
  )
}

export function StageFourMemoComposer({
  committedFacts,
  factsLoadBearing,
  factsContradicted,
  onProceed,
}: StageFourMemoComposerProps) {
  const [chosen, setChosen] = useState<Record<string, string>>({})
  const [sent, setSent] = useState(false)

  function optionFor(key: SlotKey) {
    const slot = SLOTS.find((s) => s.key === key)
    return slot?.options.find((o) => o.id === chosen[key])
  }

  const filled = SLOTS.filter((s) => chosen[s.key]).length
  const ready = filled === SLOTS.length

  function handleSend() {
    setSent(true)
  }

  function handleProceed() {
    const rec = optionFor('recommendation')?.rec ?? ''
    // §4 formula, computed from the facts committed in Stage 3.
    const has = (id: string) => committedFacts.includes(id)
    const coherent =
      rec === 'save-cordell'
        ? (has('F1') || has('F2')) && has('F3')
        : rec === 'chase-series-b'
          ? factsLoadBearing >= 2 && factsContradicted === 0
          : rec === 'cut-burn'
            ? factsLoadBearing >= 1 && factsContradicted === 0
            : false

    onProceed({
      memoRecommendation: rec,
      memoDecisive: chosen.headline === 'H2',
      memoHedges: SHEET_SECTIONS.filter((s) => optionFor(s.key)?.hedged).length,
      memoTradeoffOwned: chosen.tradeoff === 'T3',
      memoAskSpecific: chosen.ask === 'A2',
      memoEvidenceCoherent: coherent,
    })
  }

  const headline = optionFor('headline')

  return (
    <section className="stage-enter">
      <div className="mb-6">
        <div className="flex items-start justify-between gap-4">
          <div className="eyebrow mb-4">
            <PenLine className="size-3.5" />
            Stage 4 — Decision Memo
          </div>
          <span className="hidden shrink-0 font-mono text-[11px] tracking-[0.08em] text-muted-ink sm:block">
            13:15 · STAGE 4 / 8
          </span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-text-warm">
          One Page. A Position, Not a Status Update.
        </h1>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-muted-ink">
          Assemble a five-block decision memo from prewritten claim blocks.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-start">
        {!sent && (
          <div className="space-y-6">
            {SLOTS.map((slot, i) => {
              const picked = chosen[slot.key]
              return (
                <div key={slot.key}>
                  <div className="mb-2.5 flex items-center gap-2.5">
                    <span className="font-mono text-[11px] tabular-nums text-muted-ink">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-ink">
                      {slot.label}
                    </p>
                    <span
                      className={`ml-auto rounded-[var(--radius-sm)] border px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] ${
                        picked
                          ? 'border-gilt/50 bg-gilt/[0.12] text-gilt'
                          : 'border-border-dark bg-transparent text-muted-ink'
                      }`}
                    >
                      {picked ? 'Set' : 'Empty'}
                    </span>
                  </div>
                  <div className="space-y-2.5">
                    {slot.options.map((o) => {
                      const selected = picked === o.id
                      return (
                        <button
                          key={o.id}
                          type="button"
                          aria-pressed={selected}
                          onClick={() => setChosen((prev) => ({ ...prev, [slot.key]: o.id }))}
                          className={`flex w-full items-start gap-3 rounded-[var(--radius-md)] border p-4 text-left text-[13px] leading-snug transition-colors ${
                            selected
                              ? 'border-gilt bg-gilt/[0.08] text-text-warm'
                              : 'border-border-dark bg-surface text-text-warm hover:border-gilt'
                          } ${picked && !selected ? 'opacity-45' : ''}`}
                        >
                          {selected && <Check className="mt-0.5 size-4 shrink-0 text-gilt" />}
                          <span>{o.text}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}

            <p aria-live="polite" className="text-[11px] text-muted-ink">
              Memo: {filled} of 5 blocks set.
            </p>

            {ready && (
              <button
                type="button"
                onClick={handleSend}
                className="reveal-down inline-flex w-full items-center justify-center gap-3 rounded-[var(--radius-md)] bg-gilt px-6 py-3.5 text-sm font-bold tracking-[0.02em] text-void transition-colors hover:bg-gilt-dim sm:w-auto"
              >
                Send to Priya
                <ArrowRight className="size-4" />
              </button>
            )}
          </div>
        )}

        {/* the sheet — the one palette inversion in the product */}
        <aside
          aria-label="Live memo preview"
          className={`hard-shadow rounded-[var(--radius-sm)] bg-warmpaper p-7 text-void sm:p-9 ${
            sent ? 'lg:col-span-full lg:mx-auto lg:w-full lg:max-w-2xl' : 'lg:sticky lg:top-6'
          }`}
        >
          <div className="flex items-baseline justify-between gap-3">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-void/60">
              Ridgeline — Internal
            </p>
            <p className="font-mono text-[10px] tracking-[0.1em] text-void/60">Monday</p>
          </div>
          <div className="mt-3 h-px w-full bg-void/15" />

          <div className="mt-6">
            {headline ? (
              <h2 className="reveal-down text-[17px] font-extrabold leading-snug text-void">
                {headline.text}
              </h2>
            ) : (
              <BlankLines n={2} wide />
            )}
          </div>

          {SHEET_SECTIONS.map((s) => {
            const o = optionFor(s.key)
            return (
              <div key={s.key} className="mt-6">
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-void/60">
                  {s.label}
                </p>
                {o ? (
                  <p className="reveal-down mt-1.5 text-[13px] leading-[1.7] text-void sm:text-[13.5px]">
                    {o.text}
                  </p>
                ) : (
                  <div className="mt-2.5">
                    <BlankLines n={3} />
                  </div>
                )}
              </div>
            )
          })}

          <div className="mt-8 h-px w-full bg-void/15" />
          <p className="mt-3 font-mono text-[10px] tracking-[0.1em] text-void/60">
            — Chief of Staff
          </p>
        </aside>
      </div>

      {sent && (
        <button
          type="button"
          onClick={handleProceed}
          className="reveal-down mt-6 inline-flex w-full items-center justify-center gap-3 rounded-[var(--radius-md)] bg-gilt px-6 py-3.5 text-sm font-bold tracking-[0.02em] text-void transition-colors hover:bg-gilt-dim sm:w-auto"
        >
          Proceed to Stage 5 — Capital Allocation
          <ArrowRight className="size-4" />
        </button>
      )}
    </section>
  )
}
