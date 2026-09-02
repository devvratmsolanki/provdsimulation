import type { Metadata } from 'next'
import { FoundersSimulation } from '@/components/founders/founders-simulation'

export const metadata: Metadata = {
  title: "Provd — Founder's Office Simulation",
  description:
    "A chief-of-staff simulation: triage a founder's voice memo, dismantle a wrong theory with evidence, write the memo, fund the plan, and survive the board pre-read. One task from a 4-week Provd Master Simulation.",
}

export default function Page() {
  return <FoundersSimulation />
}
