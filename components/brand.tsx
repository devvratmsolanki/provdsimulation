/**
 * The Provd brand mark — the real artwork from provd.co.in.
 *
 * A plain <img>: the image is already sized for its slot and `unoptimized` is
 * set globally, so next/image would add nothing — and it does not prefix
 * basePath when unoptimized, which is exactly what the Pages build needs.
 */
const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? ''

/** The anvil mark. Landscape, so height is the dimension worth setting. */
export function BrandMark({ className = 'h-7 w-auto' }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`${BASE}/brand/provd-mark.png`}
      alt="Provd"
      width={256}
      height={149}
      className={className}
    />
  )
}

/** Mark plus wordmark. `sub` is the track name that sits under it. */
export function BrandLockup({ sub }: { sub?: string }) {
  return (
    <div className="flex items-center gap-3">
      <BrandMark className="h-8 w-auto" />
      <div>
        <p className="text-lg font-extrabold leading-none tracking-tight text-text-warm">Provd</p>
        {sub && <p className="mt-0.5 text-[11px] uppercase tracking-wide text-muted-ink">{sub}</p>}
      </div>
    </div>
  )
}
