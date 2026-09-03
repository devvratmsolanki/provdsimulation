export function ContextBar({
  track = "Founder's Office",
  note = 'One task from a 4-week Provd Master Simulation · full cohorts are graded by our team and a company partner',
}: {
  track?: string
  note?: string
} = {}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border-dark bg-carbon px-5 py-2.5">
      <div className="eyebrow">{`Simulation Preview — ${track}`}</div>
      <p className="text-[11px] text-muted-ink">{note}</p>
    </div>
  )
}
