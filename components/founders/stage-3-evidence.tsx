'use client'

import { useState } from 'react'
import {
  Activity,
  ArrowRight,
  Check,
  FileText,
  Lock,
  Mail,
  MessageSquare,
  ListChecks,
  Search,
} from 'lucide-react'
import { CordellChart, CORDELL_BREAK_INDEX, CORDELL_TOLERANCE } from './cordell-chart'
import type { ToastType } from '@/lib/sim-types'

export interface StageThreeEvidenceProps {
  /** Carry from Stage 2: Q-03 deferred/declined → Renata's DM tab renders locked. */
  evidenceLocked: boolean
  showToast: (m: string, t?: ToastType) => void
  onProceed: (r: {
    chartMisreads: number // ≥0  clicks outside index 19 ±1
    sourcesOpened: number // 0–5
    factsLoadBearing: number // 0–3  committed in {F1,F2,F3}
    factsContradicted: number // 0–1  committed in {F6}
    caseStrength: number // max(0, loadBearing - contradicted)
    /** The three committed fact ids, e.g. ['F1','F2','F3'] — Stage 4 needs them. */
    committedFacts: string[]
  }) => void
}

type TabId = 'thread' | 'tickets' | 'usage' | 'renata' | 'contract'

const TABS: { id: TabId; label: string; icon: typeof Mail }[] = [
  { id: 'thread', label: 'Cordell thread', icon: Mail },
  { id: 'tickets', label: 'Support tickets', icon: ListChecks },
  { id: 'usage', label: 'Usage', icon: Activity },
  { id: 'renata', label: "Renata's DMs", icon: MessageSquare },
  { id: 'contract', label: 'Contract & terms', icon: FileText },
]

// Copy ratified in .founders-spec.md §2 — §2 gives the three emails' arc and the "never mentions
// price" constraint, not their bodies. Drafted to those constraints.
const THREAD: { date: string; subject: string; body: string }[] = [
  {
    date: 'Jul 22',
    subject: 'quick question on the evidence export',
    body: 'Hi — quick question. Our SOC 2 evidence export has failed on the last few scheduled runs and my team has gone back to pulling it by hand. Is this a known issue? No rush, just want to tell them something.',
  },
  {
    date: 'Aug 08',
    subject: 'following up — evidence export',
    body: "Following up on the below. We're now three weeks of manual pulls in and my auditors are asking why the exports have gaps. Can someone give me an escalation path? I don't think I have one.",
  },
  {
    date: 'Aug 29',
    subject: 'where we are',
    body: "I'll be direct. Six weeks, no fix, no owner, and I've stopped hearing from anyone. I have to take a recommendation to my board, and right now we're evaluating options.",
  },
]

// Copy ratified in .founders-spec.md §2 — §2 fixes 11 tickets / 8 EVIDENCE_EXPORT_TIMEOUT / median 9
// days. Ticket ids, dates and the three non-export types are drafted.
const TICKETS: { id: string; opened: string; type: string; days: number }[] = [
  { id: 'CDL-4471', opened: 'Jul 21', type: 'EVIDENCE_EXPORT_TIMEOUT', days: 4 },
  { id: 'CDL-4480', opened: 'Jul 24', type: 'EVIDENCE_EXPORT_TIMEOUT', days: 9 },
  { id: 'CDL-4495', opened: 'Jul 29', type: 'LOGIN_SSO_REDIRECT', days: 2 },
  { id: 'CDL-4502', opened: 'Aug 01', type: 'EVIDENCE_EXPORT_TIMEOUT', days: 12 },
  { id: 'CDL-4517', opened: 'Aug 05', type: 'EVIDENCE_EXPORT_TIMEOUT', days: 6 },
  { id: 'CDL-4524', opened: 'Aug 08', type: 'REPORT_PDF_MARGIN', days: 1 },
  { id: 'CDL-4536', opened: 'Aug 12', type: 'EVIDENCE_EXPORT_TIMEOUT', days: 14 },
  { id: 'CDL-4541', opened: 'Aug 15', type: 'EVIDENCE_EXPORT_TIMEOUT', days: 9 },
  { id: 'CDL-4550', opened: 'Aug 19', type: 'API_RATE_LIMIT', days: 3 },
  { id: 'CDL-4563', opened: 'Aug 22', type: 'EVIDENCE_EXPORT_TIMEOUT', days: 11 },
  { id: 'CDL-4578', opened: 'Aug 27', type: 'EVIDENCE_EXPORT_TIMEOUT', days: 8 },
]

// Copy ratified in .founders-spec.md §2 — §2 gives the contract facts, not the row labels.
const CONTRACT: { label: string; value: string; tone?: 'error' | 'gilt' }[] = [
  { label: 'Annual contract value', value: '$840k ARR' },
  { label: 'Renewal', value: 'Auto-renew · Nov 30' },
  { label: 'Non-renewal notice', value: '90 days' },
  { label: 'Notice window', value: 'NOTICE WINDOW CLOSES TODAY', tone: 'error' },
  { label: 'Notice filed', value: 'None on file' },
  { label: 'Discount history', value: 'None on file, full term to date' },
]

const FACTS: { id: string; text: string }[] = [
  {
    id: 'F1',
    text: "Cordell's weekly active seats fell 38% starting week 19 — the week the export regression shipped.",
  },
  {
    id: 'F2',
    text: '8 of 11 Cordell tickets in six weeks are the same evidence-export failure. Median resolve: 9 days.',
  },
  {
    id: 'F3',
    text: 'Their 90-day non-renewal notice window closes today. No notice has been filed yet.',
  },
  {
    id: 'F4',
    text: "Their champion Dana Whitlock was promoted and hasn't attended a QBR in two quarters.",
  },
  { id: 'F5', text: 'Verity ran a webinar that four Cordell employees attended.' },
  { id: 'F6', text: "Priya's read: they're using the competitor as leverage on price." },
  { id: 'F7', text: "Renata hasn't had a scheduled Cordell call in 47 days." },
]

export function StageThreeEvidence({
  evidenceLocked,
  showToast,
  onProceed,
}: StageThreeEvidenceProps) {
  // The seven facts are authored F1..F7, so clicking the first three cards gave
  // the perfect case. Shuffled once per run: this dimension has to measure
  // judgment, not reading order. Mounts only after Stage 2, so never on the server.
  const [shownFacts] = useState(() => {
    const a = [...FACTS]
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[a[i], a[j]] = [a[j], a[i]]
    }
    return a
  })
  const [solved, setSolved] = useState(false)
  const [misreads, setMisreads] = useState(0)
  const [tab, setTab] = useState<TabId>('thread')
  const [touched, setTouched] = useState(false)
  const [opened, setOpened] = useState<string[]>([])
  const [picked, setPicked] = useState<string[]>([])
  const [committed, setCommitted] = useState(false)

  const phase = committed ? 3 : touched ? 2 : solved ? 1 : 0

  function open(id: string) {
    setOpened((prev) => (prev.includes(id) ? prev : [...prev, id]))
  }

  function handlePointClick(index: number) {
    if (solved) return
    if (Math.abs(index - CORDELL_BREAK_INDEX) <= CORDELL_TOLERANCE) {
      setSolved(true)
      open('usage')
      // Copy ratified in .founders-spec.md §2 — chart feedback toasts (§9.4 of the visual spec).
      showToast('Break located. Evidence room unlocked.', 'success')
    } else {
      setMisreads((n) => n + 1)
      showToast('Seats held that week. Keep reading the line.', 'info')
    }
  }

  function selectTab(id: TabId) {
    setTouched(true)
    setTab(id)
    // The locked source is reachable and announces itself, but it is not a
    // source you opened — it never counts.
    if (!(id === 'renata' && evidenceLocked)) open(id)
  }

  function toggleFact(id: string) {
    if (committed) return
    if (picked.includes(id)) {
      setPicked((prev) => prev.filter((f) => f !== id))
      return
    }
    if (picked.length === 3) {
      // Copy ratified in .founders-spec.md §2 — the three-fact cap toast.
      showToast('Three facts is the whole case. Drop one to add another.', 'error')
      return
    }
    setPicked((prev) => [...prev, id])
  }

  function handleCommit() {
    setCommitted(true)
  }

  function handleProceed() {
    const factsLoadBearing = picked.filter((f) => f === 'F1' || f === 'F2' || f === 'F3').length
    const factsContradicted = picked.includes('F6') ? 1 : 0
    onProceed({
      chartMisreads: misreads,
      sourcesOpened: opened.length,
      factsLoadBearing,
      factsContradicted,
      caseStrength: Math.max(0, factsLoadBearing - factsContradicted),
      committedFacts: picked,
    })
  }

  return (
    <section className="stage-enter">
      <div className="mb-6">
        <div className="flex items-start justify-between gap-4">
          <div className="eyebrow mb-4">
            <Search className="size-3.5" />
            Stage 3 — Signal Synthesis
          </div>
          <span className="hidden shrink-0 font-mono text-[11px] tracking-[0.08em] text-muted-ink sm:block">
            10:40 · STAGE 3 / 8
          </span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-text-warm">
          What Actually Happened to Cordell
        </h1>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-muted-ink">
          Interrogate five sources, then commit exactly three facts as the case you will put in
          front of Priya.
        </p>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {[
          ['01', 'Locate the break'],
          ['02', 'Read the sources'],
          ['03', 'Commit three facts'],
        ].map(([n, label], i) => (
          <div
            key={n}
            className={`flex items-center gap-2 rounded-[var(--radius-sm)] border px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.1em] ${
              phase > i
                ? 'border-pass/50 bg-pass/10 text-pass'
                : phase === i
                  ? 'border-gilt bg-gilt/[0.12] text-gilt'
                  : 'border-border-dark bg-transparent text-muted-ink/60'
            }`}
          >
            {phase > i ? <Check className="size-3" /> : <span className="font-mono">{n}</span>}
            {label}
          </div>
        ))}
      </div>

      {/* 3A */}
      <div className="rounded-[var(--radius-md)] border border-border-dark bg-carbon p-5 sm:p-6">
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div className="rounded-[var(--radius-sm)] border border-border-dark bg-surface p-3.5">
            <p className="text-xs text-muted-ink">Cordell ARR</p>
            <p className="mt-1 text-xl font-bold tabular-nums text-text-warm">$840k</p>
          </div>
          <div className="rounded-[var(--radius-sm)] border border-border-dark bg-surface p-3.5">
            <p className="text-xs text-muted-ink">Share of revenue</p>
            <p className="mt-1 text-xl font-bold tabular-nums text-text-warm">20%</p>
          </div>
          <div className="col-span-2 rounded-[var(--radius-sm)] border border-border-dark bg-surface p-3.5 sm:col-span-1">
            <p className="text-xs text-muted-ink">Renewal</p>
            <p className="mt-1 text-xl font-bold text-text-warm">Nov 30</p>
          </div>
        </div>

        <CordellChart solved={solved} onPointClick={handlePointClick} />
      </div>

      {/* 3B */}
      {solved && (
        <div className="reveal-down mt-6 overflow-hidden rounded-[var(--radius-md)] border border-border-dark bg-surface">
          <div className="flex overflow-x-auto border-b border-border-dark">
            {TABS.map(({ id, label, icon: Icon }) => {
              const active = tab === id
              const locked = id === 'renata' && evidenceLocked
              return (
                <button
                  key={id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => selectTab(id)}
                  className={`flex shrink-0 items-center justify-center gap-2 px-3.5 py-3 text-xs font-semibold transition-colors ${
                    active
                      ? 'bg-carbon text-gilt shadow-[inset_0_-2px_0_var(--gilt)]'
                      : locked
                        ? 'text-muted-ink/60 hover:text-muted-ink'
                        : 'text-muted-ink hover:text-text-warm'
                  }`}
                >
                  {locked ? <Lock className="size-4" /> : <Icon className="size-4" />}
                  <span className="hidden sm:inline">{label}</span>
                  {locked && <span className="sr-only">— unavailable</span>}
                </button>
              )
            })}
          </div>

          <div className="p-5">
            {tab === 'thread' && (
              <div className="space-y-3">
                {THREAD.map((m, i) => (
                  <div
                    key={m.date}
                    className={`rounded-[var(--radius-sm)] border border-border-dark bg-surface p-3.5 ${
                      i === 2 ? 'border-l-2 border-l-error' : ''
                    }`}
                  >
                    <p className="text-[11px] text-muted-ink">
                      Dana Whitlock · {m.date} · {m.subject}
                    </p>
                    <p className="mt-1.5 text-[13px] leading-relaxed text-text-warm">{m.body}</p>
                  </div>
                ))}
              </div>
            )}

            {tab === 'tickets' && (
              <div>
                <div className="grid grid-cols-[1fr_auto] gap-3 border-b border-border-dark pb-2 text-[10px] uppercase tracking-[0.12em] text-muted-ink sm:grid-cols-[90px_70px_1fr_70px]">
                  <span>Ticket</span>
                  <span className="hidden sm:block">Opened</span>
                  <span className="hidden sm:block">Type</span>
                  <span className="text-right">Resolve</span>
                </div>
                <div className="divide-y divide-border-dark">
                  {TICKETS.map((t) => (
                    <div
                      key={t.id}
                      className="grid grid-cols-[1fr_auto] gap-3 py-2.5 font-mono text-[12px] sm:grid-cols-[90px_70px_1fr_70px]"
                    >
                      <span className="text-text-warm">{t.id}</span>
                      <span className="hidden text-muted-ink sm:block">{t.opened}</span>
                      <span
                        className={`truncate ${
                          t.type === 'EVIDENCE_EXPORT_TIMEOUT' ? 'text-error' : 'text-muted-ink'
                        }`}
                      >
                        {t.type}
                      </span>
                      <span className="text-right tabular-nums text-muted-ink">{t.days}d</span>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-[11px] text-muted-ink">
                  11 tickets in 6 weeks. 8 are EVIDENCE_EXPORT_TIMEOUT — median time-to-resolve on
                  those: 9 days.
                </p>
              </div>
            )}

            {tab === 'usage' && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-[var(--radius-sm)] border border-border-dark bg-surface p-3.5">
                  <p className="text-xs text-muted-ink">Break week</p>
                  <p className="mt-1 text-xl font-bold tabular-nums text-text-warm">W19</p>
                  <p className="mt-1 text-[11px] text-muted-ink">
                    Weekly active seats fall 38% and do not recover.
                  </p>
                </div>
                <div className="rounded-[var(--radius-sm)] border border-border-dark bg-surface p-3.5">
                  <p className="text-xs text-muted-ink">Release that week</p>
                  <p className="mt-1 font-mono text-xl font-bold text-text-warm">2.14.0</p>
                  <p className="mt-1 text-[11px] text-muted-ink">
                    Shipped the evidence-export regression.
                  </p>
                </div>
              </div>
            )}

            {tab === 'renata' &&
              (evidenceLocked ? (
                <div className="rounded-[var(--radius-sm)] border border-dashed border-border-dark bg-void p-8 text-center font-mono text-[13px] leading-relaxed text-muted-ink">
                  Renata never got back to you. This source is unavailable.
                </div>
              ) : (
                // Copy ratified in .founders-spec.md §2 — §2 gives the admission's content, not the DM wording.
                <div className="space-y-3">
                  <div className="rounded-[var(--radius-sm)] border border-border-dark bg-surface p-3.5">
                    <p className="text-[11px] text-muted-ink">Renata Sol · 09:41</p>
                    <p className="mt-1.5 text-[13px] leading-relaxed text-text-warm">
                      Okay. Honestly? I haven&apos;t had a scheduled call with Cordell in 47 days.
                      It kept sliding and then I was embarrassed to put it back on the calendar.
                    </p>
                  </div>
                  <div className="rounded-[var(--radius-sm)] border border-border-dark bg-surface p-3.5">
                    <p className="text-[11px] text-muted-ink">Renata Sol · 09:43</p>
                    <p className="mt-1.5 text-[13px] leading-relaxed text-text-warm">
                      Dana asked me twice for an escalation path for the export failures. I never
                      gave her one because I didn&apos;t have one to give.
                    </p>
                  </div>
                </div>
              ))}

            {tab === 'contract' && (
              <div>
                {CONTRACT.map((r) => (
                  <div
                    key={r.label}
                    className={`flex justify-between gap-4 border-b border-border-dark py-3 last:border-b-0 ${
                      r.tone === 'gilt' ? 'border-l-2 border-l-gilt pl-3' : ''
                    }`}
                  >
                    <span className="text-[13px] text-muted-ink">{r.label}</span>
                    <span
                      className={`text-right text-[13px] ${
                        r.tone === 'error' ? 'font-bold text-error' : 'font-semibold text-text-warm'
                      }`}
                    >
                      {r.value}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3C — gated on `solved`, not on `touched`: an operator who locates the
          break and reads the tab that is already open would otherwise have no
          fact cards and no CTA. `touched` still drives the phase stepper. */}
      {solved && (
        <div className="reveal-down mt-6">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-ink">
              The case you will put in front of Priya
            </p>
            <p className="font-mono text-[11px] tabular-nums text-gilt">
              SELECTED {picked.length} / 3
            </p>
          </div>

          <div className={`grid grid-cols-1 gap-2.5 ${committed ? 'pointer-events-none' : ''}`}>
            {shownFacts.map((f) => {
              const selected = picked.includes(f.id)
              const dimmed = committed ? !selected : !selected && picked.length === 3
              return (
                <button
                  key={f.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => toggleFact(f.id)}
                  className={`flex w-full items-start gap-3 rounded-[var(--radius-md)] border p-4 text-left text-[13px] leading-snug transition-colors ${
                    selected
                      ? 'border-gilt bg-gilt/[0.08] text-text-warm'
                      : 'border-border-dark bg-surface text-text-warm hover:border-gilt'
                  } ${dimmed ? (committed ? 'opacity-25' : 'opacity-45') : ''}`}
                >
                  {selected && <Check className="mt-0.5 size-4 shrink-0 text-gilt" />}
                  <span>{f.text}</span>
                  {committed && selected && (
                    <span className="ml-auto shrink-0 font-mono text-[10px] tracking-[0.12em] text-gilt">
                      COMMITTED
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {picked.length === 3 && !committed && (
            <button
              type="button"
              onClick={handleCommit}
              className="reveal-down mt-6 inline-flex w-full items-center justify-center gap-3 rounded-[var(--radius-md)] bg-gilt px-6 py-3.5 text-sm font-bold tracking-[0.02em] text-void transition-colors hover:bg-gilt-dim sm:w-auto"
            >
              Commit Case
              <ArrowRight className="size-4" />
            </button>
          )}
        </div>
      )}

      {committed && (
        <button
          type="button"
          onClick={handleProceed}
          className="reveal-down mt-6 inline-flex w-full items-center justify-center gap-3 rounded-[var(--radius-md)] bg-gilt px-6 py-3.5 text-sm font-bold tracking-[0.02em] text-void transition-colors hover:bg-gilt-dim sm:w-auto"
        >
          Proceed to Stage 4 — Decision Memo
          <ArrowRight className="size-4" />
        </button>
      )}
    </section>
  )
}
