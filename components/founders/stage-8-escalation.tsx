'use client'

import { useState } from 'react'
import { ClipboardCheck, GripVertical, Timer } from 'lucide-react'
import type { ToastType } from '@/lib/sim-types'

export interface StageEightEscalationProps {
  /** Carry from Stage 6 — 8, or 6 if the operator escalated. */
  founderMinutes: 8 | 6
  /** Carry from Stage 5/6 — interpolated verbatim into I-04's copy. */
  hireAE: number
  /** Carry from Stages 2 and 6 — which conditional rows exist this run. */
  injectedItemIds: string[]
  /** Carry from Stage 7 — one MUST-SAY-equivalent row per question. */
  anselQuestions: string[]
  showToast: (m: string, t?: ToastType) => void
  /** END THE CONVERSATION — GENERATE TALENT REPORT. Fires the report. */
  onCommit: (r: {
    founderMinutesBudget: number // 8 | 6
    founderMinutesUsed: number // 0–8
    escalatedCritical: number // must-says placed in SAY IT NOW
    criticalTotal: number // must-says that existed this run
    escalatedNoise: number // 0–3
    absorbedOverload: boolean // >4 absorbed
    writtenUsed: number // 0–3
  }) => void
}

type Zone = 'bank' | 'say' | 'write' | 'absorb'

interface Item {
  id: string
  text: string
  cost: number
  critical: boolean
  noise: boolean
}

const WRITTEN_CAP = 3

const ZONES: { id: Zone; label: string; short: string; header: string; dot: string }[] = [
  { id: 'say', label: 'Say It Now', short: 'SAY', header: '[ SAY IT NOW ]', dot: 'bg-error' },
  {
    id: 'write',
    label: 'Put In Writing',
    short: 'WRITE',
    header: '[ PUT IN WRITING ]',
    dot: 'bg-gilt-dim',
  },
  { id: 'absorb', label: 'Absorb', short: 'ABSORB', header: '[ ABSORB ]', dot: 'bg-pass' },
]

function mmss(minutes: number) {
  return `${Math.max(0, minutes)}:00`
}

export function StageEightEscalation({
  founderMinutes,
  hireAE,
  injectedItemIds,
  anselQuestions,
  showToast,
  onCommit,
}: StageEightEscalationProps) {
  const [placement, setPlacement] = useState<Record<string, Zone>>({})
  const [dragId, setDragId] = useState<string | null>(null)
  const [overZone, setOverZone] = useState<Zone | null>(null)
  const [flashId, setFlashId] = useState<string | null>(null)
  const [breachZone, setBreachZone] = useState<Zone | null>(null)
  const [committed, setCommitted] = useState(false)

  // Built from props during render — never snapshotted into state.
  const ITEMS: Item[] = [
    {
      id: 'I-01',
      text: "Cordell's non-renewal notice window closed today with nothing filed. We have a runway of exactly one renewal cycle to fix this.",
      cost: 3,
      critical: true,
      noise: false,
    },
    {
      id: 'I-02',
      text: 'Two senior engineers asked to talk privately. If they go, the export fix goes with them.',
      cost: 2,
      critical: true,
      noise: false,
    },
    {
      id: 'I-03',
      text: 'Ansel moved the bar. He wants NDR above 115 and we are at 103 pro-forma with Cordell at risk.',
      cost: 3,
      critical: true,
      noise: false,
    },
    {
      id: 'I-04',
      text: `Marcus and I settled the AE reqs at ${hireAE}. It's in writing.`,
      cost: 2,
      critical: false,
      noise: false,
    },
    {
      id: 'I-05',
      text: 'Office lease notice window closes in 9 days.',
      cost: 1,
      critical: false,
      noise: true,
    },
    {
      id: 'I-06',
      text: 'Design wants the rebrand on the roadmap.',
      cost: 1,
      critical: false,
      noise: true,
    },
    {
      id: 'I-07',
      text: 'The recruiting agency wants a $45k retainer for the VP Eng search.',
      cost: 1,
      critical: false,
      noise: false,
    },
    {
      id: 'I-08',
      text: 'Your read on Cordell was price leverage. The contract file says they have never once asked for a discount.',
      cost: 2,
      critical: false,
      noise: false,
    },
    ...(injectedItemIds.includes('I-R1')
      ? [
          {
            id: 'I-R1',
            text: 'Renata never got back to us on Cordell. We went into this half-blind.',
            cost: 2,
            critical: true,
            noise: false,
          },
        ]
      : []),
    ...(injectedItemIds.includes('I-R2')
      ? [
          {
            id: 'I-R2',
            text: "Renata says she's underwater. Four things landed on her today, all from me.",
            cost: 1,
            critical: false,
            noise: true,
          },
        ]
      : []),
    ...(injectedItemIds.includes('I-M1')
      ? [
          {
            id: 'I-M1',
            text: 'Marcus is expecting a call from you about the third req.',
            cost: 2,
            critical: false,
            noise: false,
          },
        ]
      : []),
    ...anselQuestions.map((q, i) => ({
      id: `I-Q${i + 1}`,
      text: q,
      cost: 2,
      critical: true,
      noise: false,
    })),
  ]

  const zoneOf = (id: string): Zone => placement[id] ?? 'bank'
  const inZone = (z: Zone) => ITEMS.filter((it) => zoneOf(it.id) === z)

  const sayItems = inZone('say')
  const used = sayItems.reduce((n, it) => n + it.cost, 0)
  const remaining = founderMinutes - used
  const writtenCount = inZone('write').length
  const absorbCount = inZone('absorb').length
  const bankItems = inZone('bank')

  function reject(id: string, zone: Zone, message: string) {
    showToast(message, 'error')
    setFlashId(id)
    setBreachZone(zone)
    window.setTimeout(() => {
      setFlashId(null)
      setBreachZone(null)
    }, 550)
  }

  function move(id: string, target: Zone) {
    if (committed) return
    const item = ITEMS.find((it) => it.id === id)
    if (!item) return
    const from = zoneOf(id)
    if (from === target) return

    if (target === 'say' && item.cost > remaining) {
      // Copy ratified in .founders-spec.md §2 — rejection toast.
      reject(
        id,
        'say',
        `That is ${item.cost} minutes and you have ${Math.max(0, remaining)} left. Something has to come out of SAY IT NOW first.`,
      )
      return
    }
    if (target === 'write' && writtenCount >= WRITTEN_CAP) {
      // Copy ratified in .founders-spec.md §2 — rejection toast, from §2's "she reads three things, then she stops".
      reject(id, 'write', 'She reads three things, then she stops. Free one up first.')
      return
    }

    setPlacement((p) => ({ ...p, [id]: target }))
  }

  function handleDrop(e: React.DragEvent, target: Zone) {
    // Without this, dropping a file or link from outside the page falls
    // through to the browser, which navigates away and destroys the run.
    e.preventDefault()
    setOverZone(null)
    if (!dragId) return
    move(dragId, target)
    setDragId(null)
  }

  function handleCommit() {
    setCommitted(true)
    onCommit({
      founderMinutesBudget: founderMinutes,
      founderMinutesUsed: used,
      escalatedCritical: sayItems.filter((it) => it.critical).length,
      criticalTotal: ITEMS.filter((it) => it.critical).length,
      escalatedNoise: sayItems.filter((it) => it.noise).length,
      absorbedOverload: absorbCount > 4,
      writtenUsed: writtenCount,
    })
  }

  const clockTone =
    remaining > 3 ? 'text-text-warm' : remaining >= 1 ? 'text-gilt' : 'text-error'
  const barTone = remaining > 3 ? 'bg-text-warm' : remaining >= 1 ? 'bg-gilt' : 'bg-error'

  // A plain render function, not a nested component: a nested component type is
  // re-created every render, which remounts the card mid-drag.
  function renderItem(item: Item) {
    const here = zoneOf(item.id)
    return (
      <div
        key={item.id}
        draggable={!committed}
        onDragStart={() => setDragId(item.id)}
        onDragEnd={() => setDragId(null)}
        className={`rounded-[var(--radius-sm)] border border-border-dark bg-surface px-3.5 py-3 select-none ${
          committed ? '' : 'cursor-grab active:cursor-grabbing'
        } ${dragId === item.id ? 'opacity-35' : ''} ${
          flashId === item.id ? 'flash-error' : ''
        }`}
      >
        <div className="flex items-start gap-2.5">
          <GripVertical
            className="mt-0.5 hidden size-4 shrink-0 text-muted-ink sm:block"
            aria-hidden="true"
          />
          <p className="text-[13px] font-medium leading-snug text-text-warm">{item.text}</p>
          <span className="ml-auto shrink-0 font-mono text-[11px] tabular-nums text-muted-ink">
            {item.cost} MIN
          </span>
        </div>
        <div
          className={`mt-2.5 flex flex-wrap gap-1.5 sm:pl-6 ${committed ? 'opacity-25' : ''}`}
        >
          {ZONES.map((z) => (
            <button
              key={z.id}
              type="button"
              disabled={committed || here === z.id}
              onClick={() => move(item.id, z.id)}
              aria-label={`Move "${item.text.slice(0, 40)}…" to ${z.label}`}
              className="min-h-11 sm:min-h-9 rounded-[var(--radius-sm)] border border-border-dark bg-transparent px-2 text-[10px] font-bold uppercase tracking-[0.08em] text-muted-ink transition-colors hover:border-gilt hover:text-text-warm disabled:opacity-25"
            >
              {z.short}
            </button>
          ))}
          {here !== 'bank' && (
            <button
              type="button"
              disabled={committed}
              onClick={() => move(item.id, 'bank')}
              aria-label={`Return "${item.text.slice(0, 40)}…" to the bank`}
              className="min-h-11 sm:min-h-9 rounded-[var(--radius-sm)] border border-border-dark bg-transparent px-2 text-[10px] font-bold uppercase tracking-[0.08em] text-muted-ink transition-colors hover:border-gilt hover:text-text-warm disabled:opacity-25"
            >
              RETURN
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <section className="stage-enter">
      <div className="mb-6">
        <div className="flex items-start justify-between gap-4">
          <div className="eyebrow mb-4">
            <Timer className="size-3.5" />
            Stage 8 — Escalation Filter
          </div>
          <span className="hidden shrink-0 font-mono text-[11px] tracking-[0.08em] text-muted-ink sm:block">
            18:47 · STAGE 8 / 8
          </span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-text-warm">
          She Landed. You Have Eight Minutes.
        </h1>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-muted-ink">
          Sort the live items into what you say out loud, what you put in writing, and what
          you absorb.
        </p>
      </div>

      {/* budget header */}
      <div className="sticky top-0 z-20 -mx-5 mb-4 border-b border-border-dark bg-carbon px-5 py-3 sm:-mx-10 sm:px-10">
        <div className="flex flex-wrap items-baseline justify-between gap-x-5 gap-y-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-ink">
            Priya&apos;s Attention
          </p>
          <p className="font-mono text-[11px] tabular-nums text-muted-ink">
            WRITING {writtenCount}/{WRITTEN_CAP} · ABSORBED {absorbCount}
          </p>
        </div>
        <p
          className={`mt-1 text-2xl font-extrabold tabular-nums sm:text-3xl ${clockTone}`}
          aria-live="polite"
        >
          {mmss(remaining)}{' '}
          <span className="text-base font-normal text-muted-ink">remaining</span>
        </p>
        <div className="mt-2 h-[3px] w-full bg-border-dark">
          <div
            className={`h-full transition-[width] duration-300 ease-[var(--ease)] ${barTone}`}
            style={{ width: `${(Math.max(0, remaining) / founderMinutes) * 100}%` }}
          />
        </div>
      </div>

      {/* the bank */}
      <div className="rounded-[var(--radius-md)] border border-border-dark bg-carbon p-5">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-ink">
            Unplaced
          </p>
          <p className="font-mono text-[11px] tabular-nums text-muted-ink">
            {bankItems.length} ITEMS UNPLACED
          </p>
        </div>
        <div
          onDragOver={(e) => {
            e.preventDefault()
            setOverZone('bank')
          }}
          onDragLeave={() => setOverZone((z) => (z === 'bank' ? null : z))}
          onDrop={(e) => handleDrop(e, 'bank')}
          className={`grid min-h-[64px] grid-cols-1 gap-3 rounded-[var(--radius-sm)] p-1 transition-colors sm:grid-cols-2 ${
            overZone === 'bank' ? 'bg-gilt/[0.06]' : ''
          } ${committed ? 'pointer-events-none' : ''}`}
        >
          {bankItems.length === 0 && (
            <p className="px-2 py-4 text-[12px] text-muted-ink">
              Everything is placed. Drag or send any item back to reconsider.
            </p>
          )}
          {bankItems.map((it) => renderItem(it))}
        </div>
      </div>

      {/* three asymmetric lanes */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[1.15fr_0.95fr_0.9fr]">
        {ZONES.map((z) => {
          const constraint =
            z.id === 'say'
              ? `${mmss(founderMinutes)} BUDGET · ${mmss(remaining)} LEFT`
              : z.id === 'write'
                ? `${WRITTEN_CAP} MAX · ${writtenCount} USED`
                : absorbCount > 4
                  ? // Copy ratified in .founders-spec.md §2 — absorb-overload constraint line.
                    'UNCAPPED · YOU ARE NOW THE SINGLE POINT OF FAILURE'
                  : 'UNCAPPED'
          const overloaded = z.id === 'absorb' && absorbCount > 4
          return (
            <div
              key={z.id}
              onDragOver={(e) => {
                e.preventDefault()
                setOverZone(z.id)
              }}
              onDragLeave={() => setOverZone((o) => (o === z.id ? null : o))}
              onDrop={(e) => handleDrop(e, z.id)}
              className={`min-h-[140px] rounded-[var(--radius-md)] border-2 border-dashed p-4 transition-colors lg:min-h-[220px] ${
                overZone === z.id
                  ? 'border-gilt bg-gilt/[0.06]'
                  : breachZone === z.id
                    ? 'border-error bg-carbon'
                    : 'border-border-dark bg-carbon'
              } ${committed ? 'pointer-events-none' : ''}`}
            >
              <div className="mb-1 flex items-center gap-2">
                <span className={`inline-block size-[9px] rounded-full ${z.dot}`} />
                <p className="font-mono text-xs font-bold text-text-warm">{z.header}</p>
              </div>
              <p
                className={`mb-3 font-mono text-[10px] tracking-[0.08em] ${
                  overloaded ? 'text-gilt' : 'text-muted-ink'
                }`}
              >
                {constraint}
              </p>
              <div className="space-y-2">
                {inZone(z.id).map((it) => renderItem(it))}
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-6">
        {bankItems.length > 0 && (
          <p className="mb-2 font-mono text-[11px] text-muted-ink">
            {bankItems.length} item(s) left on the floor.
          </p>
        )}

        {/* Stays enabled after commit: re-firing is idempotent, and it is the
            only way back to the report once the operator closes the modal. */}
        <button
          type="button"
          onClick={handleCommit}
          className="inline-flex w-full items-center justify-center gap-3 rounded-[var(--radius-md)] bg-gilt px-6 py-3.5 text-sm font-bold tracking-[0.02em] text-void transition-colors hover:bg-gilt-dim sm:w-auto"
        >
          <ClipboardCheck className="size-4" />
          END THE CONVERSATION — GENERATE TALENT REPORT
        </button>
      </div>
    </section>
  )
}
