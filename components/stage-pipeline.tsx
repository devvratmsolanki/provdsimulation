'use client'

import { useState } from 'react'
import { GitBranch, GripVertical, ClipboardCheck } from 'lucide-react'
import type { ToastType } from '@/lib/sim-types'

type Zone = 'bank' | 'hour1' | 'day1' | 'week1'

interface Block {
  id: string
  text: string
  correct: Zone | null // null = decoy
}

const BLOCKS: Block[] = [
  { id: 'B1', text: "Pause active 'TikTok_Promo' ad sets immediately.", correct: 'hour1' },
  { id: 'B2', text: 'Deploy Stripe pre-auth $1 verification webhook.', correct: 'hour1' },
  { id: 'B3', text: 'Draft internal incident report & brief SDR team.', correct: 'day1' },
  { id: 'B4', text: 'Launch targeted email reactivation to legitimate leads.', correct: 'day1' },
  { id: 'B5', text: 'Execute cross-functional post-mortem on LTV/CAC models.', correct: 'week1' },
  { id: 'B6', text: 'Deploy 90% apology discount to all failed Day-7 charges.', correct: null },
  { id: 'B7', text: 'Draft public PR statement regarding platform instability.', correct: null },
  { id: 'B8', text: 'Terminate the external performance marketing agency.', correct: null },
]

const TIMELINES: { zone: Zone; header: string; dot: string }[] = [
  { zone: 'hour1', header: '[ HOUR 1 : TRIAGE ]', dot: 'bg-error' },
  { zone: 'day1', header: '[ DAY 1 : RECOVERY ]', dot: 'bg-gilt-dim' },
  { zone: 'week1', header: '[ WEEK 1 : STRUCTURAL ]', dot: 'bg-pass' },
]

const MAX_SLOTS = 5

const ZONE_CHIPS: { zone: Zone; short: string }[] = [
  { zone: 'hour1', short: 'Hour 1' },
  { zone: 'day1', short: 'Day 1' },
  { zone: 'week1', short: 'Week 1' },
  { zone: 'bank', short: 'Bank' },
]

/**
 * Hoisted to module scope deliberately: declared inside StagePipeline it was a
 * new component type on every render, so the drag-start re-render remounted the
 * node mid-drag and the browser cancelled the gesture.
 */
function BlockCard({
  block,
  zone,
  draggable,
  dimmed,
  onDragStart,
  onDragEnd,
  onMove,
}: {
  block: Block
  zone: Zone
  draggable: boolean
  dimmed: boolean
  onDragStart: () => void
  onDragEnd: () => void
  onMove: (target: Zone) => void
}) {
  return (
    <div
      draggable={draggable}
      onDragStart={(e) => {
        // Firefox will not start a drag unless dataTransfer carries something.
        e.dataTransfer.setData('text/plain', block.id)
        e.dataTransfer.effectAllowed = 'move'
        onDragStart()
      }}
      onDragEnd={onDragEnd}
      className={`rounded-[var(--radius-sm)] border border-border-dark bg-surface px-3.5 py-3 text-[13px] font-semibold leading-snug text-text-warm select-none ${
        draggable ? 'cursor-grab active:cursor-grabbing' : 'cursor-not-allowed opacity-40'
      } ${dimmed ? 'opacity-35' : ''}`}
    >
      <div className="flex items-start gap-2.5">
        <GripVertical className="mt-0.5 size-4 shrink-0 text-muted-ink" />
        <span>{block.text}</span>
      </div>
      {/* Touch and keyboard path — HTML5 drag does not fire on touch at all. */}
      <div className="mt-2.5 flex flex-wrap gap-1.5 border-t border-border-dark pt-2.5">
        {ZONE_CHIPS.map(({ zone: z, short }) => (
          <button
            key={z}
            type="button"
            disabled={zone === z}
            onClick={() => onMove(z)}
            aria-label={`Move "${block.text}" to ${short}`}
            className="min-h-9 rounded-[var(--radius-sm)] border border-border-dark bg-transparent px-2 text-[10px] font-bold uppercase tracking-[0.08em] text-muted-ink transition-colors hover:border-gilt hover:text-text-warm disabled:opacity-25 sm:min-h-8"
          >
            {short}
          </button>
        ))}
      </div>
    </div>
  )
}

export function StagePipeline({
  onFinalize,
  showToast,
}: {
  onFinalize: (result: { decoyUsed: boolean; correctPlacements: number }) => void
  showToast: (m: string, t?: ToastType) => void
}) {
  const [placement, setPlacement] = useState<Record<string, Zone>>(
    Object.fromEntries(BLOCKS.map((b) => [b.id, 'bank'])) as Record<string, Zone>,
  )
  const [dragId, setDragId] = useState<string | null>(null)
  const [overZone, setOverZone] = useState<Zone | null>(null)

  const placedCount = Object.values(placement).filter((z) => z !== 'bank').length

  function canDrop(id: string, target: Zone) {
    if (target === 'bank') return true
    const fromBank = placement[id] === 'bank'
    if (fromBank && placedCount >= MAX_SLOTS) return false
    return true
  }

  function move(id: string, target: Zone) {
    if (placement[id] === target) return
    if (!canDrop(id, target)) {
      showToast('Only 5 execution slots available. Free one up first.', 'error')
      return
    }
    setPlacement((p) => ({ ...p, [id]: target }))
  }

  function handleDrop(e: React.DragEvent, target: Zone) {
    e.preventDefault()
    setOverZone(null)
    // Fall back to dataTransfer: dragId is lost if the drag began in another frame.
    const id = dragId ?? e.dataTransfer.getData('text/plain')
    if (id) move(id, target)
    setDragId(null)
  }

  function handleFinalize() {
    let decoyUsed = false
    let correctPlacements = 0
    for (const b of BLOCKS) {
      const z = placement[b.id]
      if (z === 'bank') continue
      if (b.correct === null) decoyUsed = true
      else if (b.correct === z) correctPlacements++
    }
    onFinalize({ decoyUsed, correctPlacements })
  }

  const bankBlocks = BLOCKS.filter((b) => placement[b.id] === 'bank')

  return (
    <section className="stage-enter">
      <div className="mb-6">
        <div className="eyebrow mb-4">
          <GitBranch className="size-3.5" />
          Stage 4 — Execution Pipeline
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-text-warm">
          Sequence the Recovery
        </h1>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-text-warm">
          Funds secured. You have <span className="font-semibold text-gilt">5 execution slots</span>{' '}
          available. Drag them into a timeline, or use the buttons on each card. Leave the noise behind.
        </p>
      </div>

      {/* action bank */}
      <div className="rounded-[var(--radius-md)] border border-border-dark bg-carbon p-5">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-ink">
            Action Bank
          </p>
          <p className="font-mono text-xs text-muted-ink">
            {placedCount}/{MAX_SLOTS} slots used
          </p>
        </div>
        <div
          onDragOver={(e) => {
            e.preventDefault()
            setOverZone('bank')
          }}
          onDragLeave={() => setOverZone((z) => (z === 'bank' ? null : z))}
          onDrop={(e) => handleDrop(e, 'bank')}
          className={`flex min-h-[64px] flex-wrap gap-3 rounded-[var(--radius-sm)] p-1 transition-colors ${
            overZone === 'bank' ? 'bg-gilt/[0.06]' : ''
          }`}
        >
          {bankBlocks.length === 0 && (
            <p className="px-2 py-4 text-xs text-muted-ink">
              All actions deployed. Send any back here to reconsider.
            </p>
          )}
          {bankBlocks.map((b) => (
            <div key={b.id} className="w-full sm:w-[calc(50%-0.375rem)]">
              <BlockCard
                block={b}
                zone="bank"
                draggable={placedCount < MAX_SLOTS}
                dimmed={dragId === b.id}
                onDragStart={() => setDragId(b.id)}
                onDragEnd={() => setDragId(null)}
                onMove={(t) => move(b.id, t)}
              />
            </div>
          ))}
        </div>
      </div>

      {/* timelines */}
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {TIMELINES.map(({ zone, header, dot }) => {
          const items = BLOCKS.filter((b) => placement[b.id] === zone)
          return (
            <div
              key={zone}
              onDragOver={(e) => {
                e.preventDefault()
                setOverZone(zone)
              }}
              onDragLeave={() => setOverZone((z) => (z === zone ? null : z))}
              onDrop={(e) => handleDrop(e, zone)}
              className={`min-h-[210px] rounded-[var(--radius-md)] border-2 border-dashed p-4 transition-colors ${
                overZone === zone ? 'border-gilt bg-gilt/[0.06]' : 'border-border-dark bg-carbon'
              }`}
            >
              <div className="mb-3 flex items-center gap-2">
                <span className={`inline-block size-[9px] rounded-full ${dot}`} />
                <p className="font-mono text-xs font-bold text-text-warm">{header}</p>
              </div>
              <div className="space-y-2">
                {items.map((b) => (
                  <BlockCard
                    key={b.id}
                    block={b}
                    zone={zone}
                    draggable
                    dimmed={dragId === b.id}
                    onDragStart={() => setDragId(b.id)}
                    onDragEnd={() => setDragId(null)}
                    onMove={(t) => move(b.id, t)}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>

      <button
        type="button"
        disabled={placedCount === 0}
        onClick={handleFinalize}
        className="mt-6 inline-flex w-full items-center justify-center gap-3 rounded-[var(--radius-md)] bg-gilt px-6 py-3.5 text-sm font-bold tracking-[0.02em] text-void transition-colors hover:bg-gilt-dim disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
      >
        <ClipboardCheck className="size-4" />
        Finalize Protocol &amp; Generate Report
      </button>
    </section>
  )
}
