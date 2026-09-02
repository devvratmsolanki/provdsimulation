import type { Metadata } from 'next'
import { ExpressSimulation } from '@/components/founders/express-simulation'

export const metadata: Metadata = {
  title: "Provd — Founder's Office (2-Minute Preview)",
  description:
    "Three decisions from a chief-of-staff simulation: read the founder's voice memo, fund the plan, and hold the room against a VP who outranks you.",
}

export default function Page() {
  return <ExpressSimulation />
}
