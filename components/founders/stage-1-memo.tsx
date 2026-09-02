'use client'

import { useState } from 'react'
import { ArrowRight, Mic } from 'lucide-react'
import type { ToastType } from '@/lib/sim-types'

export interface StageOneMemoProps {
  operatorName: string
  setOperatorName: (v: string) => void
  showToast: (m: string, t?: ToastType) => void
  /** Fires once, on the gilt CTA. Payload is the complete §2 Stage-1 signal set. */
  onProceed: (r: {
    intakeCorrect: number // 0–9
    intakeAsksMissed: number // 0–3
    intakeNoiseElevated: number // 0–2
    intakeRetags: number // ≥0
  }) => void
}

type Tag = 'ASK' | 'CONTEXT' | 'NOISE'

const TAGS: Tag[] = ['ASK', 'CONTEXT', 'NOISE']

// §2 Stage 1 — transcript is verbatim, truth column is the scoring key and is
// never rendered.
const LINES: { id: string; text: string; truth: Tag }[] = [
  {
    id: 'L1',
    text: "ok so I'm boarding, this is going to be messy, bear with me",
    truth: 'NOISE',
  },
  {
    id: 'L2',
    text: "Cordell emailed, Dana sounds off, I think they're just leveraging us on price honestly",
    truth: 'CONTEXT',
  },
  {
    id: 'L3',
    text: "someone needs to actually figure out what's going on there before Friday",
    truth: 'ASK',
  },
  {
    id: 'L4',
    text: 'Dmitri quitting is fine, honestly, I saw it coming, but the team is going to spiral',
    truth: 'CONTEXT',
  },
  {
    id: 'L5',
    text: 'Ansel wants a pre-read and I have not looked at the numbers in three weeks',
    truth: 'CONTEXT',
  },
  {
    id: 'L6',
    text: 'can you get me something I can actually defend on Friday, not a status update, a position',
    truth: 'ASK',
  },
  {
    id: 'L7',
    text: "Marcus wants three AEs, I don't know, tell him yes? tell him something",
    truth: 'ASK',
  },
  {
    id: 'L8',
    text: 'also our Notion is a disaster, at some point',
    truth: 'NOISE',
  },
  {
    id: 'L9',
    text: "I'll have like ten minutes when I land, don't waste them",
    truth: 'CONTEXT',
  },
]

function chipClass(tag: Tag, selected: boolean) {
  if (!selected)
    return 'border-border-dark bg-surface text-muted-ink hover:border-gilt hover:text-text-warm'
  if (tag === 'ASK') return 'border-gilt bg-gilt text-void'
  if (tag === 'CONTEXT') return 'border-gilt/50 bg-gilt/[0.12] text-gilt'
  return 'border-border-dark bg-transparent text-muted-ink'
}

export function StageOneMemo({ operatorName, setOperatorName, onProceed }: StageOneMemoProps) {
  const [tags, setTags] = useState<Record<string, Tag>>({})
  const [retags, setRetags] = useState(0)

  const tagged = LINES.filter((l) => tags[l.id]).length
  const ready = tagged === LINES.length

  function setTag(id: string, next: Tag) {
    const current = tags[id]
    if (current === next) return // re-clicking the same chip is a no-op — no deselect
    if (current) setRetags((n) => n + 1)
    setTags((prev) => ({ ...prev, [id]: next }))
  }

  function handleProceed() {
    let intakeCorrect = 0
    let intakeAsksMissed = 0
    let intakeNoiseElevated = 0
    for (const l of LINES) {
      const tag = tags[l.id]
      if (tag === l.truth) intakeCorrect++
      if (l.truth === 'ASK' && tag !== 'ASK') intakeAsksMissed++
      if (l.truth === 'NOISE' && tag === 'ASK') intakeNoiseElevated++
    }
    onProceed({ intakeCorrect, intakeAsksMissed, intakeNoiseElevated, intakeRetags: retags })
  }

  return (
    <section className="stage-enter">
      <div className="mb-6">
        <div className="flex items-start justify-between gap-4">
          <div className="eyebrow mb-4">
            <Mic className="size-3.5" />
            Stage 1 — Intake
          </div>
          <span className="hidden shrink-0 font-mono text-[11px] tracking-[0.08em] text-muted-ink sm:block">
            08:12 · STAGE 1 / 8
          </span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-text-warm">
          Nine Sentences, Three Actual Asks
        </h1>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-muted-ink">
          Classify every line of Priya&apos;s 07:58 voice memo as an ASK, CONTEXT, or NOISE.
        </p>
      </div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <label
          htmlFor="operatorName"
          className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-ink"
        >
          Operator name
        </label>
        <input
          id="operatorName"
          type="text"
          value={operatorName}
          onChange={(e) => setOperatorName(e.target.value)}
          placeholder="Guest Operator"
          className="min-h-11 w-full rounded-[var(--radius-sm)] border border-border-dark bg-surface px-3 py-2 text-[13px] text-text-warm placeholder:text-muted-ink sm:min-h-0 sm:w-64"
        />
      </div>

      {/* player card */}
      <div className="rounded-[var(--radius-md)] border border-border-dark bg-carbon">
        <div className="flex flex-wrap items-center gap-3 border-b border-border-dark px-5 py-3">
          <Mic className="size-4 shrink-0 text-gilt" />
          <div>
            <p className="text-[13px] font-semibold text-text-warm">Priya Raghavan</p>
            <p className="text-[11px] text-muted-ink">Voice memo · 07:58</p>
          </div>
          <p className="ml-auto font-mono text-[11px] tabular-nums text-muted-ink">0:00 / 1:34</p>
        </div>
        {/* decorative scrubber — not an input, not focusable */}
        <div aria-hidden="true" className="cursor-default px-5 py-4">
          <div className="relative h-[2px] w-full bg-border-dark">
            <span className="absolute left-0 top-1/2 size-4 -translate-y-1/2 rounded-[var(--radius-sm)] border-2 border-void bg-gilt" />
          </div>
        </div>
      </div>

      {/* transcript */}
      <div className="mt-4 rounded-[var(--radius-md)] border border-border-dark bg-carbon">
        <div className="flex items-center justify-between gap-3 border-b border-border-dark px-5 py-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-ink">
            Transcript — auto-generated
          </p>
          <p className="font-mono text-[11px] tabular-nums text-muted-ink">{tagged} / 9 TAGGED</p>
        </div>

        <div className="divide-y divide-border-dark">
          {LINES.map((l, i) => {
            const tag = tags[l.id]
            return (
              <div
                key={l.id}
                className={`grid grid-cols-1 gap-2.5 px-5 py-4 sm:grid-cols-[28px_1fr_auto] sm:items-start sm:gap-4 ${
                  tag === 'NOISE' ? 'opacity-50' : ''
                }`}
              >
                <span className="font-mono text-[11px] leading-6 text-muted-ink">{`L${i + 1}`}</span>
                <p
                  className={`font-mono text-[13px] leading-relaxed transition-colors ${
                    tag ? 'text-text-warm' : 'text-muted-ink'
                  }`}
                >
                  {l.text}
                </p>
                <div
                  role="group"
                  aria-label={`Classify line ${i + 1}`}
                  className="flex gap-1.5 sm:justify-end"
                >
                  {TAGS.map((t) => (
                    <button
                      key={t}
                      type="button"
                      aria-pressed={tag === t}
                      onClick={() => setTag(l.id, t)}
                      className={`min-h-11 rounded-[var(--radius-sm)] border px-2.5 text-[10px] font-bold uppercase tracking-[0.1em] transition-colors sm:min-h-0 sm:py-1.5 ${chipClass(
                        t,
                        tag === t,
                      )}`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {ready && (
        <button
          type="button"
          onClick={handleProceed}
          className="reveal-down mt-6 inline-flex w-full items-center justify-center gap-3 rounded-[var(--radius-md)] bg-gilt px-6 py-3.5 text-sm font-bold tracking-[0.02em] text-void transition-colors hover:bg-gilt-dim sm:w-auto"
        >
          Proceed to Stage 2 — Attention Triage
          <ArrowRight className="size-4" />
        </button>
      )}
    </section>
  )
}
