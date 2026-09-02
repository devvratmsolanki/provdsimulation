'use client'

import { useEffect, useState } from 'react'
import { ArrowRight, MessageSquare } from 'lucide-react'
import { computeRunway } from '@/lib/founder-sim-types'
import type { Rec } from '@/lib/founder-sim-types'
import type { ToastType } from '@/lib/sim-types'

export interface StageSixNegotiationProps {
  /** Carry from Stage 4/5 — sets the opening temperature (hot/cool/warm). */
  memoRecommendation: Rec
  hireEng: number
  hireAE: number
  hireCSM: number
  hireAudit: number
  showToast: (m: string, t?: ToastType) => void
  onProceed: (r: {
    marcusTrust: number // 0–100, starts 50
    negotiationPath: string // "defend>data>commit"
    negotiationEscalated: boolean // → founderMinutes 8 → 6
    negotiationCaved: boolean // → hireAE += 1, runway recomputes
    negotiationUsedNumbers: boolean
    /** Post-cave values. Unchanged from the props when no cave occurred. */
    hireAE: number // 0–4
    runwayMonths: number // computeRunway(hireEng, hireAE, hireCSM, hireAudit)
  }) => void
}

interface Option {
  key: string
  text: string
  trust: number
  usedNumbers?: boolean
  escalated?: boolean
  caved?: boolean
}

// Three opening temperatures, selected by hireAE (§2 Stage 6 + its addendum).
// Warm is usually the *worse* run: three AEs cost $42k of the $71k of added
// burn the 18-month floor allows, so the operator who made Marcus happy has
// typically spent the board floor to do it.
const MARCUS_T3 = 'And if the fix slips?'

const MARCUS_HOT = [
  "So I hear from Wen that my three reqs became one. Six weeks in and you're setting sales capacity now? Walk me through that.",
  "Fine. Then tell me what I'm supposed to do with a 2.9x coverage number in a board quarter.",
  MARCUS_T3,
]
const MARCUS_COOL = [
  "So I hear from Wen my three reqs became two. Which is worse than three and worse than one, because now I get to decide which territory doesn't get covered this year. Six weeks in and you're making that call. Walk me through it.",
  'Fine. Then tell me what I do with 3.2x coverage on a territory map built for four heads.',
  MARCUS_T3,
]
const MARCUS_WARM = [
  'Wen sent me the model. All three reqs held — and they cost forty-two of the seventy-one you had to spend. That\u2019s the whole quarter\u2019s slack sitting in my org. I\u2019ve been somewhere the board took reqs back in February, after the offers went out. Tell me Friday doesn\u2019t end with Ansel unwinding this.',
  "So what's the number you put in front of him? Because if the answer is 'we hired ahead of the fix', I'm the line item he cuts.",
  MARCUS_T3,
]

// Shared replies — referenced by more than one branch rather than retyped.
const TRADE_HOT: Option = {
  key: 'trade',
  text: 'Give me until the pre-read. If Ansel signs off on burn above the floor, the third req is yours Monday.',
  trust: 10,
}
const ESCALATE: Option = {
  key: 'escalate',
  text: 'Take it up with Priya, she has ten minutes when she lands.',
  trust: -10,
  escalated: true,
}
const COMMIT_HOT: Option = {
  key: 'commit',
  text: "Then I'm wrong in writing and you get the req. I'll put that in the pre-read so it's not a hallway promise.",
  trust: 12,
}
const HEDGE: Option = { key: 'hedge', text: "Let's see where we are.", trust: -6 }
const CAVE_HOT: Option = {
  key: 'cave',
  text: "You know what, take the third req. I'll find the runway.",
  trust: 6,
  caved: true,
}

const OPTIONS_HOT: Option[][] = [
  [
    {
      key: 'defend',
      text: 'I set the model, not your capacity. The reqs came out because the plan has to hold 18 months at close and yours was $42k of the $71k available.',
      trust: 8,
      usedNumbers: true,
    },
    {
      key: 'concede',
      text: "You're right, that wasn't mine to decide. Let me take it back to Priya.",
      trust: 4,
    },
    { key: 'deflect', text: "It's not final, nothing's decided yet.", trust: -12 },
  ],
  [
    {
      key: 'data',
      text: "Coverage is 2.9x on the current close rate. If we ship the export fix, the two deals stuck in security review unstick, and coverage is 3.4x without a single new hire. That's the trade.",
      trust: 14,
      usedNumbers: true,
    },
    TRADE_HOT,
    ESCALATE,
  ],
  [COMMIT_HOT, HEDGE, CAVE_HOT],
]

const OPTIONS_COOL: Option[][] = [
  [
    {
      key: 'defend',
      text: "I set the model, not your capacity. Two reqs is $28k of the $71k the plan had, and the third is the one that puts us under Ansel's floor. Tell me which territory and I'll help you make the case to sequence it \u2014 not to add it back.",
      trust: 8,
      usedNumbers: true,
    },
    {
      key: 'concede',
      text: 'Fair. Picking the territory was never my call and I made it look like it was. Let me take the third back to Priya.',
      trust: 4,
    },
    { key: 'deflect', text: "Two is basically three. It'll be fine.", trust: -12 },
  ],
  [
    {
      key: 'data',
      text: "Coverage is 3.2x on the current close rate \u2014 and two of your stuck deals aren't stuck on capacity, they're stuck in security review on the export bug. Ship the fix and you clear 3.6x without the third head. That's the trade.",
      trust: 14,
      usedNumbers: true,
    },
    TRADE_HOT,
    ESCALATE,
  ],
  [COMMIT_HOT, HEDGE, CAVE_HOT],
]

/** Warm's `defend` quotes the operator's own committed runway, so it is built per run. */
function optionsWarm(runwayMonths: number): Option[][] {
  return [
    [
      {
        key: 'defend',
        text: `The plan closes at ${runwayMonths.toFixed(1)} months and I built it with all three of your reqs already in it. If Ansel unwinds something Friday it won't be because the model was sloppy \u2014 it'll be because he doesn't believe the coverage. That's the thing to defend. Not the headcount.`,
        trust: 8,
        usedNumbers: true,
      },
      {
        key: 'concede',
        text: "You might be right. I'd rather hand one back now, on our terms, than have it taken in February after the offers go out. Say the word and I'll re-cut it.",
        trust: 4,
      },
      { key: 'deflect', text: "Nothing's getting unwound. Ansel's fine.", trust: -12 },
    ],
    [
      {
        key: 'data',
        text: 'The number is the fix, not the headcount. Two deals are sitting in security review on the export bug. Ship it and coverage clears 3.4x with the team you already have \u2014 which makes your three reqs the reason the plan works, not the reason it doesn\u2019t.',
        trust: 14,
        usedNumbers: true,
      },
      {
        key: 'trade',
        text: "I'll carry the burn line myself at the pre-read and put my name on it as the recommendation. In exchange, if Ansel pushes back, you don't go around me to Priya. We take it together.",
        trust: 10,
      },
      ESCALATE,
    ],
    [
      {
        key: 'commit',
        text: "Then I'm wrong in writing and the third req is the first thing I give back. I'll put that in the pre-read so it isn't a hallway promise.",
        trust: 12,
      },
      HEDGE,
      {
        key: 'cave',
        text: 'You know what \u2014 take a fourth. If we\u2019re already over the line, one more head isn\u2019t what kills us.',
        trust: 6,
        caved: true,
      },
    ],
  ]
}

export function StageSixNegotiation({
  hireEng,
  hireAE,
  hireCSM,
  hireAudit,
  onProceed,
}: StageSixNegotiationProps) {
  // One selector, three arrays (§2 Stage 6 addendum note 3 — no config table,
  // no per-branch component). Read during render so back-navigation is safe.
  const runwayNow = computeRunway(hireEng, hireAE, hireCSM, hireAudit)
  const marcusLines = hireAE >= 3 ? MARCUS_WARM : hireAE === 2 ? MARCUS_COOL : MARCUS_HOT
  const options = hireAE >= 3 ? optionsWarm(runwayNow) : hireAE === 2 ? OPTIONS_COOL : OPTIONS_HOT

  // defend/data/commit — the optimal path — was the first card in all three
  // turns. Shuffled per turn, once per run, for the same reason as Stage 3.
  const [order] = useState(() =>
    [0, 1, 2].map(() => {
      const a = [0, 1, 2]
      for (let i = 2; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[a[i], a[j]] = [a[j], a[i]]
      }
      return a
    }),
  )

  const [step, setStep] = useState(0)
  const [thread, setThread] = useState<{ id: string; who: 'marcus' | 'you'; text: string }[]>([])
  const [typing, setTyping] = useState(true)
  const [showReplies, setShowReplies] = useState(false)
  const [trust, setTrust] = useState(50)
  const [delta, setDelta] = useState<number | null>(null)
  const [path, setPath] = useState<string[]>([])
  const [usedNumbers, setUsedNumbers] = useState(false)
  const [escalated, setEscalated] = useState(false)
  const [caved, setCaved] = useState(false)

  useEffect(() => {
    if (step > 2) return
    setTyping(true)
    setShowReplies(false)
    const t1 = window.setTimeout(() => {
      setTyping(false)
      setThread((prev) => [...prev, { id: `m${step}`, who: 'marcus', text: marcusLines[step] }])
    }, 900)
    const t2 = window.setTimeout(() => setShowReplies(true), 1150)
    return () => {
      window.clearTimeout(t1)
      window.clearTimeout(t2)
    }
  }, [step, marcusLines])

  function choose(o: Option) {
    setThread((prev) => [...prev, { id: `y${step}`, who: 'you', text: o.text }])
    setShowReplies(false)
    setTrust((t) => Math.max(0, Math.min(100, t + o.trust)))
    setDelta(o.trust)
    window.setTimeout(() => setDelta(null), 1400)
    setPath((p) => [...p, o.key])
    if (o.usedNumbers) setUsedNumbers(true)
    if (o.escalated) setEscalated(true)
    if (o.caved) setCaved(true)
    setStep((s) => s + 1)
  }

  function handleProceed() {
    const finalAE = caved ? hireAE + 1 : hireAE
    onProceed({
      marcusTrust: trust,
      negotiationPath: path.join('>'),
      negotiationEscalated: escalated,
      negotiationCaved: caved,
      negotiationUsedNumbers: usedNumbers,
      hireAE: finalAE,
      runwayMonths: computeRunway(hireEng, finalAE, hireCSM, hireAudit),
    })
  }

  const done = step > 2
  const barTone = trust >= 60 ? 'bg-pass' : trust >= 35 ? 'bg-gilt' : 'bg-error'

  return (
    <section className="stage-enter">
      <div className="mb-6">
        <div className="flex items-start justify-between gap-4">
          <div className="eyebrow mb-4">
            <MessageSquare className="size-3.5" />
            Stage 6 — Stakeholder Craft
          </div>
          <span className="hidden shrink-0 font-mono text-[11px] tracking-[0.08em] text-muted-ink sm:block">
            15:20 · STAGE 6 / 8
          </span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-text-warm">
          He Has Already Drafted the Slack to Priya
        </h1>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-muted-ink">
          Three exchanges with a VP who outranks you and has just seen your headcount plan.
        </p>
      </div>

      {/* trust header */}
      <div className="sticky top-0 z-20 -mx-5 mb-5 border-b border-border-dark bg-carbon px-5 py-3 sm:-mx-10 sm:px-10">
        <div className="flex items-center gap-3">
          <div className="grid size-9 shrink-0 place-items-center rounded-[var(--radius-sm)] border border-border-dark bg-surface text-[13px] font-extrabold text-gilt">
            M
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-text-warm">Marcus Ellery</p>
            <p className="text-[11px] text-muted-ink">VP Sales</p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-ink">
              Marcus — Working Trust
            </p>
            <p
              className="font-mono text-lg font-bold tabular-nums text-text-warm"
              aria-live="polite"
            >
              {trust}
              {delta !== null && (
                <span
                  className={`reveal-down ml-2 text-[11px] font-bold ${
                    delta > 0 ? 'text-pass' : 'text-error'
                  }`}
                >
                  {delta > 0 ? `+${delta}` : delta}
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="mt-2 h-[3px] w-full bg-border-dark">
          <div
            className={`h-full transition-[width] duration-500 ease-[var(--ease)] ${barTone}`}
            style={{ width: `${trust}%` }}
          />
        </div>
      </div>

      <div className="max-w-2xl">
        <div className="space-y-4">
          {thread.map((m) =>
            m.who === 'marcus' ? (
              <div key={m.id} className="border-l-2 border-l-border-dark pl-3.5">
                <p className="mb-1 text-[11px] uppercase tracking-[0.1em] text-muted-ink">
                  Marcus Ellery
                </p>
                <p className="text-[14px] leading-relaxed text-text-warm">{m.text}</p>
              </div>
            ) : (
              <div
                key={m.id}
                className="ml-auto max-w-[85%] rounded-[var(--radius-sm)] border border-gilt/40 bg-gilt/[0.06] px-3.5 py-2.5 text-[14px] leading-relaxed text-text-warm"
              >
                {m.text}
              </div>
            ),
          )}

          {typing && (
            <div className="border-l-2 border-l-border-dark pl-3.5" aria-hidden="true">
              <p className="pulse font-mono text-[12px] text-muted-ink">
                Marcus is typing
                <span className="blink">_</span>
              </p>
            </div>
          )}
        </div>

        {showReplies && !done && (
          <div className="mt-5 space-y-2.5">
            {order[step]
              .map((oi) => options[step][oi])
              .map((o) => (
                <button
                  key={o.key}
                  type="button"
                  onClick={() => choose(o)}
                  className="reveal-down flex w-full items-start gap-3 rounded-[var(--radius-md)] border border-border-dark bg-surface p-4 text-left text-[13.5px] leading-snug text-text-warm transition-colors hover:border-gilt"
                >
                  <span>{o.text}</span>
                </button>
              ))}
          </div>
        )}
      </div>

      {done && (
        <button
          type="button"
          onClick={handleProceed}
          className="reveal-down mt-6 inline-flex w-full items-center justify-center gap-3 rounded-[var(--radius-md)] bg-gilt px-6 py-3.5 text-sm font-bold tracking-[0.02em] text-void transition-colors hover:bg-gilt-dim sm:w-auto"
        >
          Proceed to Stage 7 — Narrative Under Scrutiny
          <ArrowRight className="size-4" />
        </button>
      )}
    </section>
  )
}
