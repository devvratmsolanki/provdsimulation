'use client'

import { useEffect, useRef, useState } from 'react'
import { Pause, Play, RotateCcw, Volume2, VolumeX } from 'lucide-react'

/**
 * The training module that opens the triage sim.
 *
 * Not a video file: an animated, narrated slide sequence built from the design
 * tokens. It ships nothing, loads nothing, and stays legible at 375px — and it
 * teaches the framework the sandbox then tests, which a placeholder box did not.
 * Drop in a real recording later by swapping this component for a <video>.
 */

interface Frame {
  t: number // seconds into the lesson
  kicker: string
  headline: string
  body: string
  say: string
}

const FRAMES: Frame[] = [
  {
    t: 0,
    kicker: 'Module 1 · 01',
    headline: 'Averages hide the leak.',
    body: 'Blended revenue tells you something broke. It never tells you where. Retention is only legible in cohorts — users grouped by when they arrived.',
    say: 'Averages hide the leak. Blended revenue tells you something broke, but never where. Retention is only legible in cohorts.',
  },
  {
    t: 9,
    kicker: 'Module 1 · 02',
    headline: 'Day 7 is where intent shows up.',
    body: 'Signup is free. The trial wall is the first moment a user has to actually want the product. A Day-7 cliff is rarely a Day-7 event — it is the acquisition decision arriving late.',
    say: 'Day seven is where intent shows up. A day seven cliff is rarely a day seven event. It is the acquisition decision arriving late.',
  },
  {
    t: 19,
    kicker: 'Module 1 · 03',
    headline: 'Read the three surfaces in order.',
    body: 'Product telemetry, then acquisition, then payments. Most operators stop at the first surface that looks broken. The first broken-looking surface is usually the symptom.',
    say: 'Read three surfaces in order. Product telemetry, then acquisition, then payments. The first broken looking surface is usually the symptom.',
  },
  {
    t: 29,
    kicker: 'Module 1 · 04',
    headline: 'A metric improving too fast is a warning.',
    body: 'Cost per acquisition falling by half is not a win until you know what it bought. Volume is not demand. Cheap users are not free users.',
    say: 'A metric improving too fast is a warning. Cost per acquisition falling by half is not a win until you know what it bought. Volume is not demand.',
  },
  {
    t: 39,
    kicker: 'Module 1 · 05',
    headline: 'Triage before you fix.',
    body: 'Stop the bleeding, then fund the repair, then sequence the structural work. Doing them in the wrong order costs you the quarter.',
    say: 'Triage before you fix. Stop the bleeding, fund the repair, then sequence the structural work.',
  },
]

const RUNTIME = 48

export function LessonPlayer({ onComplete }: { onComplete: () => void }) {
  const [playing, setPlaying] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [muted, setMuted] = useState(false)
  const [canSpeak, setCanSpeak] = useState(false)
  const spokenFrame = useRef(-1)

  useEffect(() => {
    setCanSpeak(typeof window !== 'undefined' && 'speechSynthesis' in window)
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel()
      }
    }
  }, [])

  useEffect(() => {
    if (!playing) return
    const id = window.setInterval(() => {
      setElapsed((e) => {
        if (e + 0.1 >= RUNTIME) {
          setPlaying(false)
          return RUNTIME
        }
        return e + 0.1
      })
    }, 100)
    return () => window.clearInterval(id)
  }, [playing])

  const index = Math.max(
    0,
    FRAMES.findIndex((f, i) => elapsed >= f.t && (!FRAMES[i + 1] || elapsed < FRAMES[i + 1].t)),
  )
  const frame = FRAMES[index]

  // Narrate each frame once, as it becomes current.
  useEffect(() => {
    if (!playing || muted || !canSpeak) return
    if (spokenFrame.current === index) return
    spokenFrame.current = index
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(FRAMES[index].say)
    u.rate = 1.02
    window.speechSynthesis.speak(u)
  }, [index, playing, muted, canSpeak])

  function toggle() {
    if (playing) {
      window.speechSynthesis?.cancel()
      setPlaying(false)
      return
    }
    if (elapsed >= RUNTIME) {
      setElapsed(0)
      spokenFrame.current = -1
    }
    setPlaying(true)
  }

  function restart() {
    window.speechSynthesis?.cancel()
    spokenFrame.current = -1
    setElapsed(0)
    setPlaying(true)
  }

  const done = elapsed >= RUNTIME
  const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

  return (
    <div className="overflow-hidden rounded-[var(--radius-md)] border border-border-dark bg-carbon">
      {/* stage */}
      <div className="relative flex aspect-video w-full flex-col justify-center px-6 py-6 sm:px-10">
        {!playing && elapsed === 0 ? (
          <div className="flex flex-col items-center text-center">
            <button
              type="button"
              onClick={toggle}
              aria-label="Play the training module"
              className="flex size-16 items-center justify-center rounded-[var(--radius-sm)] border border-border-dark bg-surface text-text-warm transition-colors hover:border-gilt hover:text-gilt"
            >
              <Play className="ml-0.5 size-6" />
            </button>
            <p className="mt-4 text-sm font-medium text-text-warm">Core Retention Mechanics</p>
            <p className="mt-1 text-xs text-muted-ink">
              Runtime {mmss(RUNTIME)} · Founder&apos;s Office Masterclass
            </p>
          </div>
        ) : (
          <div key={index} className="stage-enter">
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-gilt">
              {frame.kicker}
            </p>
            <p className="mt-3 text-xl font-extrabold leading-tight tracking-tight text-text-warm sm:text-2xl">
              {frame.headline}
            </p>
            <p className="mt-3 max-w-xl text-[13px] leading-relaxed text-muted-ink sm:text-sm">
              {frame.body}
            </p>
          </div>
        )}

        {done && (
          <p className="reveal-down absolute inset-x-0 bottom-4 text-center text-[11px] text-muted-ink">
            Module complete.
          </p>
        )}
      </div>

      {/* transport */}
      <div className="flex items-center gap-3 border-t border-border-dark px-4 py-3">
        <button
          type="button"
          onClick={toggle}
          aria-label={playing ? 'Pause the module' : 'Play the module'}
          className="flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)] border border-border-dark bg-surface text-gilt transition-colors hover:border-gilt"
        >
          {playing ? <Pause className="size-4" /> : <Play className="ml-0.5 size-4" />}
        </button>
        <button
          type="button"
          onClick={restart}
          aria-label="Restart the module"
          className="flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)] border border-border-dark bg-surface text-muted-ink transition-colors hover:border-gilt hover:text-text-warm"
        >
          <RotateCcw className="size-4" />
        </button>

        <div className="relative h-[2px] w-full bg-border-dark" aria-hidden="true">
          <span
            className="absolute left-0 top-0 h-full bg-gilt"
            style={{ width: `${(elapsed / RUNTIME) * 100}%` }}
          />
          {FRAMES.map((f) => (
            <span
              key={f.t}
              className="absolute top-1/2 size-1 -translate-y-1/2 rounded-full bg-muted-ink"
              style={{ left: `${(f.t / RUNTIME) * 100}%` }}
            />
          ))}
        </div>

        <p className="shrink-0 font-mono text-[11px] tabular-nums text-muted-ink">
          {mmss(elapsed)} / {mmss(RUNTIME)}
        </p>

        {canSpeak && (
          <button
            type="button"
            onClick={() => {
              if (!muted) window.speechSynthesis.cancel()
              setMuted((m) => !m)
            }}
            aria-label={muted ? 'Unmute narration' : 'Mute narration'}
            className="flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)] border border-border-dark bg-surface text-muted-ink transition-colors hover:border-gilt hover:text-text-warm"
          >
            {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
          </button>
        )}
      </div>

      <button
        type="button"
        onClick={onComplete}
        className="w-full border-t border-border-dark px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-ink transition-colors hover:bg-surface hover:text-text-warm"
      >
        {done ? 'Continue' : 'Skip the module'}
      </button>
    </div>
  )
}
