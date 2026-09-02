'use client'

import { CheckCircle2, XCircle, Info } from 'lucide-react'
import type { ToastItem } from '@/lib/sim-types'

const ICONS = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
}

const STYLES: Record<ToastItem['type'], string> = {
  success: 'border-pass bg-pass/10 text-pass',
  error: 'border-error bg-error/10 text-error',
  info: 'border-border-dark bg-carbon text-text-warm',
}

export function ToastStack({ toasts }: { toasts: ToastItem[] }) {
  return (
    <div
      aria-live="polite"
      className="fixed top-5 right-5 z-[60] w-[92%] max-w-sm space-y-3"
    >
      {toasts.map((t) => {
        const Icon = ICONS[t.type]
        return (
          <div
            key={t.id}
            className={`toast-in flex items-start gap-3 rounded-[var(--radius-md)] border px-4 py-3 ${STYLES[t.type]}`}
          >
            <Icon className="mt-0.5 size-4 shrink-0" />
            <p className="text-sm font-semibold leading-snug">{t.message}</p>
          </div>
        )
      })}
    </div>
  )
}
