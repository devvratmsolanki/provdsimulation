'use client'

import { useState } from 'react'
import { ArrowRight, Inbox } from 'lucide-react'
import type { ToastType } from '@/lib/sim-types'

export interface StageTwoQueueProps {
  showToast: (m: string, t?: ToastType) => void
  onProceed: (r: {
    queueMinutesSpent: number // 0–240
    queueHighValueHandled: number // 0–4  of {Q-01,Q-03,Q-05,Q-12} at DO NOW
    queueTrapsDoneNow: number // 0–3  of {Q-06,Q-07,Q-11} at DO NOW
    queueDelegated: number // 0–12
    queueDeclined: number // 0–12
    queueDelegationOverload: boolean // >3 items to one named person
    queueCordellDeferred: boolean // Q-03 is DEFER or DECLINE
  }) => void
}

type Disposition = 'DO NOW' | 'DELEGATE' | 'DEFER' | 'DECLINE'

const DISPOSITIONS: Disposition[] = ['DO NOW', 'DELEGATE', 'DEFER', 'DECLINE']

const BUDGET = 240

// §2 Stage 2 — the tier column is authoring metadata and is deliberately not rendered.
const ITEMS: { id: string; from: string; subject: string; cost: number }[] = [
  {
    id: 'Q-01',
    from: 'Ansel Kwan',
    subject: "Board pre-read Friday. PS — what's NDR trending?",
    cost: 45,
  },
  { id: 'Q-02', from: 'Priya', subject: 'did you handle the thing', cost: 10 },
  {
    id: 'Q-03',
    from: 'Renata Sol',
    subject: "Cordell wants a call. I don't know what to tell them.",
    cost: 30,
  },
  {
    id: 'Q-04',
    from: 'Marcus Ellery',
    subject: 'Need 3 AE reqs approved today. Pipeline is exploding.',
    cost: 25,
  },
  {
    id: 'Q-05',
    from: 'Dmitri Volkov',
    subject: 'Exit chat? There are things you should know.',
    cost: 40,
  },
  {
    id: 'Q-06',
    from: 'Thorne Talent Partners',
    subject: '12 VP Eng profiles. Retainer $45k.',
    cost: 20,
  },
  {
    id: 'Q-07',
    from: 'Head of Design',
    subject: 'Can we get the rebrand on the roadmap?',
    cost: 20,
  },
  {
    id: 'Q-08',
    from: 'Wen Ito',
    subject: 'Runway model updated — needs your assumptions by EOD.',
    cost: 20,
  },
  {
    id: 'Q-09',
    from: 'Ops',
    subject: 'Office lease renewal — 30-day notice window closes in 9 days.',
    cost: 15,
  },
  {
    id: 'Q-10',
    from: 'Tobias Kerr',
    subject: 'SOC 2 evidence export bug — third customer hit.',
    cost: 25,
  },
  {
    id: 'Q-11',
    from: 'Priya',
    subject: 'Quick competitive teardown of Verity? Just a quick one.',
    cost: 35,
  },
  {
    id: 'Q-12',
    from: 'Two senior engineers',
    subject: 'can we talk. privately.',
    cost: 20,
  },
]

const TARGETS = ['Renata Sol (CS)', 'Marcus Ellery (Sales)', 'Wen Ito (Finance)', 'Tobias Kerr (Support Lead)']

const HIGH_VALUE = ['Q-01', 'Q-03', 'Q-05', 'Q-12']
const TRAPS = ['Q-06', 'Q-07', 'Q-11']

function costOf(disposition: Disposition | undefined, cost: number) {
  if (disposition === 'DO NOW') return cost
  if (disposition === 'DELEGATE') return Math.ceil(cost * 0.4)
  if (disposition === 'DEFER') return 5
  return 0
}

function dispClass(k: Disposition, selected: boolean) {
  if (!selected)
    return 'border-border-dark bg-surface text-muted-ink hover:border-gilt hover:text-text-warm'
  if (k === 'DO NOW') return 'border-gilt bg-gilt text-void'
  if (k === 'DELEGATE') return 'border-gilt/50 bg-gilt/[0.12] text-gilt'
  if (k === 'DEFER') return 'border-border-dark bg-surface text-text-warm'
  return 'border-border-dark bg-transparent text-muted-ink'
}

export function StageTwoQueue({ showToast, onProceed }: StageTwoQueueProps) {
  const [d, setD] = useState<Record<string, Disposition>>({})
  const [assignee, setAssignee] = useState<Record<string, string>>({})
  const [flashId, setFlashId] = useState<string | null>(null)

  const spent = ITEMS.reduce((sum, q) => sum + costOf(d[q.id], q.cost), 0)
  const remaining = BUDGET - spent
  const disposed = ITEMS.filter((q) => d[q.id]).length
  const ready = disposed === ITEMS.length

  // >3 items on one named person. Only live delegations count.
  const load: Record<string, number> = {}
  for (const q of ITEMS) {
    const who = d[q.id] === 'DELEGATE' ? assignee[q.id] : undefined
    if (who) load[who] = (load[who] ?? 0) + 1
  }
  const overloaded = Object.values(load).some((n) => n > 3)

  const meterTone =
    remaining > 120 ? 'text-text-warm' : remaining >= 40 ? 'text-gilt' : 'text-error'
  const barTone = remaining > 120 ? 'bg-gilt-dim' : remaining >= 40 ? 'bg-gilt' : 'bg-error'

  function dispose(q: (typeof ITEMS)[number], k: Disposition) {
    if (d[q.id] === k) return
    const next = spent - costOf(d[q.id], q.cost) + costOf(k, q.cost)
    if (next > BUDGET) {
      // §0.6 judgment cap — reject, never disable. The refusal is the lesson.
      showToast("You don't have the attention. Something has to give.", 'error')
      setFlashId(q.id)
      window.setTimeout(() => setFlashId((c) => (c === q.id ? null : c)), 550)
      return
    }
    setD((prev) => ({ ...prev, [q.id]: k }))
  }

  function handleProceed() {
    onProceed({
      queueMinutesSpent: spent,
      queueHighValueHandled: HIGH_VALUE.filter((id) => d[id] === 'DO NOW').length,
      queueTrapsDoneNow: TRAPS.filter((id) => d[id] === 'DO NOW').length,
      queueDelegated: ITEMS.filter((q) => d[q.id] === 'DELEGATE').length,
      queueDeclined: ITEMS.filter((q) => d[q.id] === 'DECLINE').length,
      queueDelegationOverload: overloaded,
      queueCordellDeferred: d['Q-03'] === 'DEFER' || d['Q-03'] === 'DECLINE',
    })
  }

  return (
    <section className="stage-enter">
      <div className="mb-6">
        <div className="flex items-start justify-between gap-4">
          <div className="eyebrow mb-4">
            <Inbox className="size-3.5" />
            Stage 2 — Attention Triage
          </div>
          <span className="hidden shrink-0 font-mono text-[11px] tracking-[0.08em] text-muted-ink sm:block">
            09:05 · STAGE 2 / 8
          </span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-text-warm">
          Two Hundred and Forty Minutes
        </h1>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-muted-ink">
          Dispose of twelve inbound items against a hard attention budget of 240 minutes.
        </p>
      </div>

      <div className="sticky top-0 z-20 -mx-5 mb-4 border-b border-border-dark bg-carbon px-5 py-3 sm:-mx-10 sm:px-10">
        <div className="flex items-baseline justify-between gap-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-ink">
            Minutes Remaining
          </p>
          <p className="font-mono text-[11px] tabular-nums text-muted-ink">
            {disposed} / 12 DISPOSED
          </p>
        </div>
        <p className={`mt-1 text-3xl font-extrabold tabular-nums ${meterTone}`} aria-live="polite">
          {remaining}
          <span className="ml-1 text-base font-normal text-muted-ink">/ 240</span>
        </p>
        <div className="mt-2 h-[3px] w-full bg-border-dark">
          <div
            className={`h-full transition-[width] duration-300 ease-[var(--ease)] ${barTone}`}
            style={{ width: `${(remaining / BUDGET) * 100}%` }}
          />
        </div>
      </div>

      <div className="rounded-[var(--radius-md)] border border-border-dark bg-carbon">
        <div className="divide-y divide-border-dark">
          {ITEMS.map((q) => {
            const chosen = d[q.id]
            const who = assignee[q.id] ?? ''
            return (
              <div
                key={q.id}
                className={`px-5 py-3.5 transition-opacity ${flashId === q.id ? 'flash-error' : ''} ${
                  chosen === 'DECLINE' ? 'opacity-50' : ''
                }`}
              >
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
                  <div className="min-w-0">
                    <p className="text-[11px] uppercase tracking-[0.1em] text-muted-ink">
                      {q.from}
                      <span className="ml-2 font-mono normal-case tracking-normal">
                        {q.cost} min
                      </span>
                    </p>
                    <p
                      className={`mt-0.5 text-[13px] font-semibold leading-snug text-text-warm ${
                        chosen === 'DECLINE' ? 'line-through decoration-muted-ink' : ''
                      }`}
                    >
                      {q.subject}
                    </p>
                  </div>
                  <div
                    role="group"
                    aria-label={`Disposition for ${q.subject}`}
                    className="grid grid-cols-2 gap-1.5 sm:flex sm:gap-1.5"
                  >
                    {DISPOSITIONS.map((k) => (
                      <button
                        key={k}
                        type="button"
                        aria-pressed={chosen === k}
                        onClick={() => dispose(q, k)}
                        className={`min-h-11 rounded-[var(--radius-sm)] border px-2.5 text-[10px] font-bold uppercase tracking-[0.08em] transition-colors sm:min-h-0 sm:py-2 ${dispClass(
                          k,
                          chosen === k,
                        )}`}
                      >
                        {k}
                      </button>
                    ))}
                  </div>
                </div>

                {chosen === 'DELEGATE' && (
                  <div className="reveal-down mt-2.5 flex items-center gap-2">
                    <label
                      htmlFor={`del-${q.id}`}
                      className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-ink"
                    >
                      To
                    </label>
                    <select
                      id={`del-${q.id}`}
                      value={who}
                      onChange={(e) =>
                        setAssignee((prev) => ({ ...prev, [q.id]: e.target.value }))
                      }
                      className={`min-h-11 w-full rounded-[var(--radius-sm)] border border-border-dark bg-surface px-2 py-2 text-[12px] sm:min-h-0 sm:w-auto ${
                        who && (load[who] ?? 0) > 3 ? 'text-gilt' : 'text-text-warm'
                      }`}
                    >
                      <option value="">Select…</option>
                      {TARGETS.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
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
          Proceed to Stage 3 — Signal Synthesis
          <ArrowRight className="size-4" />
        </button>
      )}
    </section>
  )
}
