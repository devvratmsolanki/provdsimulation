'use client'

import { useState } from 'react'
import { Activity, Megaphone, Terminal, ArrowUp, ArrowDown } from 'lucide-react'

type Tab = 'telemetry' | 'marketing' | 'payments'

const TABS: { id: Tab; label: string; icon: typeof Activity }[] = [
  { id: 'telemetry', label: 'Product Telemetry', icon: Activity },
  { id: 'marketing', label: 'Marketing Dashboard', icon: Megaphone },
  { id: 'payments', label: 'Payment Logs', icon: Terminal },
]

function Row({
  label,
  value,
  tone,
  trend,
}: {
  label: string
  value: string
  tone?: 'up' | 'down' | 'neutral'
  trend?: 'up' | 'down'
}) {
  const color =
    tone === 'up'
      ? 'text-pass'
      : tone === 'down'
        ? 'text-error'
        : 'text-text-warm'
  return (
    <div className="flex items-center justify-between border-b border-border-dark py-3 last:border-b-0">
      <span className="text-[13px] text-muted-ink">{label}</span>
      <span className={`flex items-center gap-1.5 text-[13px] font-semibold ${color}`}>
        {trend === 'up' && <ArrowUp className="size-3.5" />}
        {trend === 'down' && <ArrowDown className="size-3.5" />}
        {value}
      </span>
    </div>
  )
}

export function DiagnosticTerminal() {
  const [tab, setTab] = useState<Tab>('telemetry')

  return (
    <div className="reveal-down mt-6 overflow-hidden rounded-[var(--radius-md)] border border-border-dark bg-surface">
      {/* tab nav */}
      <div className="flex border-b border-border-dark">
        {TABS.map(({ id, label, icon: Icon }) => {
          const active = tab === id
          return (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`flex flex-1 items-center justify-center gap-2 px-3 py-3 text-xs font-semibold transition-colors ${
                active
                  ? 'bg-carbon text-gilt shadow-[inset_0_-2px_0_var(--gilt)]'
                  : 'text-muted-ink hover:text-text-warm'
              }`}
            >
              <Icon className="size-4" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          )
        })}
      </div>

      <div className="p-5">
        {tab === 'telemetry' && (
          <div>
            <p className="mb-3 text-[11px] uppercase tracking-wider text-muted-ink">
              Day-7 Cohort · Engagement
            </p>
            <Row label="Daily Active Users (DAU)" value="+8%" tone="up" trend="up" />
            <Row
              label="Session Length"
              value="+12% · 40 min/session"
              tone="up"
              trend="up"
            />
            <Row label="Crash Reports" value="0" tone="neutral" />
          </div>
        )}

        {tab === 'marketing' && (
          <div>
            <p className="mb-3 text-[11px] uppercase tracking-wider text-muted-ink">
              Ad Spend · Active Campaign
            </p>
            <Row label="Campaign" value="TikTok_Promo_Uncapped" tone="neutral" />
            <Row label="Acquisition Volume" value="+300%" tone="up" trend="up" />
            <Row
              label="CAC (7 days ago → now)"
              value="$15.00 → $0.80"
              tone="down"
              trend="down"
            />
          </div>
        )}

        {tab === 'payments' && (
          <div className="rounded-[var(--radius-sm)] border border-border-dark bg-void p-4 font-mono text-[13px] leading-relaxed">
            <p className="text-muted-ink">provd://payments/day-7 --tail</p>
            <p className="mt-2 text-pass">
              [200 OK] 140 recurring charges successful.
            </p>
            <p className="text-error">
              [402 DECLINED] 860 charges failed: ERROR_INSUFFICIENT_FUNDS
            </p>
            <p className="mt-2 text-muted-ink">
              <span className="blink">_</span>
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
