import type { FounderStats } from './founder-sim-types'

/**
 * Founder's Office grading engine (.founders-spec.md §5).
 * Pure, synchronous, deterministic. Zero network, zero randomness, zero LLM.
 * Same input → same output, always.
 */

export interface FounderDimension {
  key: 'prioritization' | 'synthesis' | 'clarity' | 'capital' | 'stakeholder' | 'coherence'
  label: string
  score: number // 0–100
  band: 'Exceptional' | 'Strong' | 'Developing' | 'Needs Work'
}

export interface FounderReportResult {
  dimensions: FounderDimension[] // always 6, fixed order
  overall: number // 0–100
  tier: 'Ready to Hire' | 'High Potential' | 'Developing' | 'Not Yet'
  note: string // 4 sentences
}

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)))

function band(score: number): FounderDimension['band'] {
  if (score >= 85) return 'Exceptional'
  if (score >= 70) return 'Strong'
  if (score >= 55) return 'Developing'
  return 'Needs Work'
}

const LABELS: Record<FounderDimension['key'], string> = {
  prioritization: 'Prioritization Under Ambiguity',
  synthesis: 'Signal Synthesis',
  clarity: 'Written Clarity & Decisiveness',
  capital: 'Capital & Runway Judgment',
  stakeholder: 'Stakeholder Craft',
  coherence: 'Execution Coherence',
}

const WEIGHTS: Record<FounderDimension['key'], number> = {
  prioritization: 0.2,
  synthesis: 0.15,
  clarity: 0.15,
  capital: 0.2,
  stakeholder: 0.15,
  coherence: 0.15,
}

export function generateFounderReport(s: FounderStats): FounderReportResult {
  // ── D1 · Prioritization Under Ambiguity (20) · S1, S2, S8 ──
  const d1 = clamp(
    100 -
      12 * s.intakeAsksMissed -
      8 * s.intakeNoiseElevated -
      10 * s.queueTrapsDoneNow -
      10 * (4 - s.queueHighValueHandled) -
      8 * s.escalatedNoise -
      9 * Math.min(3, Math.max(0, s.criticalTotal - s.escalatedCritical)) -
      (s.queueDelegationOverload ? 10 : 0) -
      (s.absorbedOverload ? 8 : 0) -
      (s.queueMinutesSpent < 140 ? 5 : 0) -
      (s.intakeRetags > 14 ? 4 : 0),
  )

  // ── D2 · Signal Synthesis (15) · S3 ──
  const d2 = clamp(
    40 +
      15 * s.factsLoadBearing -
      12 * s.factsContradicted -
      8 * s.chartMisreads +
      3 * Math.min(s.sourcesOpened, 5) -
      (s.sourcesOpened <= 2 ? 8 : 0) +
      (s.evidenceLocked ? 3 : 0),
  )

  // ── D3 · Written Clarity & Decisiveness (15) · S4, S7 ──
  const d3 = clamp(
    46 +
      (s.memoDecisive ? 18 : 0) +
      (s.memoTradeoffOwned ? 12 : 0) +
      (s.memoAskSpecific ? 12 : 0) -
      7 * s.memoHedges +
      6 * Math.min(s.evidenceAttached, 2) -
      9 * s.unsupportableLeft -
      9 * s.overSanitized,
  )

  // ── D4 · Capital & Runway Judgment (20) · S5 ──
  const d4 = clamp(
    45 +
      (s.runwayMonths >= 18 ? 25 : 0) +
      (s.runwayMonths >= 21 ? 5 : 0) -
      (s.runwayMonths < 15 ? 20 : 0) +
      (s.planCoherent ? 20 : 0) -
      10 * s.planStarved +
      ((s.hireCSM >= 1 && s.hireAudit === 1) ||
      (s.memoRecommendation === 'cut-burn' && s.planCoherent)
        ? 10
        : 0) -
      (s.negotiationCaved ? 8 : 0) -
      (s.runwayRecalcs > 25 ? 5 : 0),
  )

  // ── D5 · Stakeholder Craft (15) · S6, S7, S2 ──
  const d5 = clamp(
    0.55 * s.marcusTrust +
      0.35 * s.anselTrust +
      16 +
      (s.negotiationUsedNumbers ? 10 : 0) -
      (s.negotiationEscalated ? 8 : 0) -
      (s.negotiationCaved ? 10 : 0) -
      (s.queueDelegationOverload ? 8 : 0) -
      4 * Math.max(0, s.queueDeclined - 3),
  )

  // ── D6 · Execution Coherence (15) · cross-stage ──
  const d6 = clamp(
    100 -
      (s.memoEvidenceCoherent ? 0 : 20) -
      (s.planCoherent ? 0 : 20) -
      12 * s.unsupportableLeft -
      (s.negotiationCaved && s.planCoherent ? 15 : 0) -
      (s.queueCordellDeferred && s.memoRecommendation === 'save-cordell' ? 12 : 0) -
      (s.escalatedCritical < s.criticalTotal ? 10 : 0) -
      (s.runwayBelowBoardFloor && s.memoRecommendation === 'chase-series-b' ? 15 : 0),
  )

  const scores: Record<FounderDimension['key'], number> = {
    prioritization: d1,
    synthesis: d2,
    clarity: d3,
    capital: d4,
    stakeholder: d5,
    coherence: d6,
  }

  const keys = Object.keys(LABELS) as FounderDimension['key'][]
  const dimensions: FounderDimension[] = keys.map((key) => ({
    key,
    label: LABELS[key],
    score: scores[key],
    band: band(scores[key]),
  }))

  const overall = Math.round(keys.reduce((sum, key) => sum + WEIGHTS[key] * scores[key], 0))

  // Ladder shifted down 2 from §5's 88/76/62: the recalibrated dimensions
  // score ~4 points lower at the median, and leaving the old boundaries in
  // place would have relabelled the same performance a tier worse.
  let tier: FounderReportResult['tier']
  if (overall >= 86) tier = 'Ready to Hire'
  else if (overall >= 74) tier = 'High Potential'
  else if (overall >= 60) tier = 'Developing'
  else tier = 'Not Yet'
  if (tier === 'Ready to Hire' && dimensions.some((d) => d.score < 70)) {
    tier = 'High Potential'
  }

  // Ties broken by the fixed dimension order. `low` is searched over the five
  // dimensions that are not `top`: §5 assumes top !== low, and letting them
  // collide makes sentence 3 contradict sentence 1 (a flat run would read
  // "Prioritization is the gap: 0 low-value item(s)... while 0 critical...").
  let top = keys[0]
  for (const key of keys) if (scores[key] > scores[top]) top = key
  const rest = keys.filter((k) => k !== top)
  let low = rest[0]
  for (const key of rest) if (scores[key] < scores[low]) low = key

  const runway = s.runwayMonths.toFixed(1)

  // Sentence 1 may only claim excellence when the telemetry backs the claim.
  const S1_EARNED: Record<FounderDimension['key'], boolean> = {
    prioritization: s.escalatedCritical >= s.criticalTotal,
    synthesis: s.factsContradicted === 0 && s.sourcesOpened >= 3,
    clarity: s.memoDecisive && s.memoTradeoffOwned && s.memoAskSpecific,
    capital: s.planCoherent && s.planStarved === 0,
    stakeholder: !s.negotiationEscalated,
    coherence: s.memoEvidenceCoherent && s.planCoherent,
  }

  // Used when the top dimension is weak in absolute terms, or when its claim
  // is not earned. Every number in these is true on any run.
  const S1_NEUTRAL: Record<FounderDimension['key'], string> = {
    prioritization: `Prioritization scored highest of the six — ${s.queueMinutesSpent} of 240 minutes spent, and ${s.escalatedCritical} of ${s.criticalTotal} critical items reached the founder.`,
    synthesis: `Synthesis scored highest of the six — ${s.factsLoadBearing} of 3 load-bearing facts committed, across ${s.sourcesOpened} source(s) opened.`,
    clarity: `Written clarity scored highest of the six — ${s.memoHedges} hedged block(s) in the memo, ${s.unsupportableLeft} unsupportable claim(s) left in the board narrative.`,
    capital: `Capital judgment scored highest of the six — the plan closed at ${runway} months.`,
    stakeholder: `Stakeholder craft scored highest of the six — Marcus at ${s.marcusTrust}, Ansel at ${s.anselTrust}.`,
    coherence:
      'Coherence scored highest of the six, which on this run means the contradictions are fewer rather than absent.',
  }

  const S1: Record<FounderDimension['key'], string> = {
    prioritization: `They ran a 240-minute attention budget down to ${s.queueMinutesSpent} without losing a single one of the ${s.criticalTotal} things that actually mattered.`,
    synthesis: `They took apart the founder's stated theory with evidence rather than argument — ${s.factsLoadBearing} of 3 load-bearing facts committed, ${s.chartMisreads} misreads.`,
    clarity:
      'The memo was the strongest artifact in the run: a position, a named tradeoff, and a decision request with a date on it.',
    capital: `The capital plan was the strongest artifact in the run — it closed at ${runway} months and every commitment in it was actually funded.`,
    stakeholder: `They held a room they had no authority in, and left Marcus at ${s.marcusTrust} and Ansel at ${s.anselTrust} without spending the founder's attention to do it.`,
    coherence:
      'Across eight decisions they never once contradicted themselves — the memo, the model, and the board narrative all told the same story.',
  }

  const sentence1 = scores[top] < 70 || !S1_EARNED[top] ? S1_NEUTRAL[top] : S1[top]

  let sentence2: string
  if (s.memoRecommendation === 'save-cordell') {
    sentence2 = s.planCoherent
      ? `They chose to defend 20% of revenue and then actually paid for it: CSM staffed, remediation funded, runway held at ${runway} months.`
      : 'They recommended defending Cordell and then declined to fund the defence — the memo and the model are two different companies.'
  } else if (s.memoRecommendation === 'chase-series-b') {
    sentence2 = s.planCoherent
      ? `They made the aggressive call — growth over retention — and had the discipline to keep it above the board floor at ${runway} months.`
      : `They sold the board a growth story on ${runway} months of runway, which is the version of this job that ends in a down round.`
  } else if (s.memoRecommendation === 'cut-burn') {
    sentence2 = s.planCoherent
      ? `They took the unglamorous call, extended to ${runway} months, and were honest about what it costs.`
      : 'They recommended cutting burn and then approved the hires anyway.'
  } else {
    // Spec gap: §5 sentence 2 has no template for an empty recommendation.
    // Only reachable on an abandoned run; a sentence is still required.
    sentence2 = `They never committed to a recommendation, so the plan closed at ${runway} months with nothing behind it.`
  }

  let sentence3: string
  switch (low) {
    case 'prioritization': {
      const dropped = Math.max(0, s.criticalTotal - s.escalatedCritical)
      sentence3 =
        s.queueTrapsDoneNow > 0
          ? `Prioritization is the gap: ${s.queueTrapsDoneNow} low-value item(s) got full attention while ${4 - s.queueHighValueHandled} critical thread(s) got triaged away.`
          : dropped > 0
            ? `Prioritization is the gap: ${dropped} of the ${s.criticalTotal} things that mattered never reached the founder at all.`
            : s.queueHighValueHandled < 4
              ? `Prioritization is the gap: ${4 - s.queueHighValueHandled} of the four critical threads got triaged away.`
              : `Prioritization is the gap — the queue got worked, but ${s.intakeAsksMissed} of the founder's three actual asks never got read as asks.`
      break
    }
    case 'synthesis':
      sentence3 =
        s.factsContradicted > 0
          ? "The gap is synthesis under social pressure — they put the founder's own unsupported theory into the case file, which is the most expensive kind of agreement."
          : s.factsLoadBearing < 3
            ? `The gap is synthesis — they committed a case built on ${s.factsLoadBearing} of 3 load-bearing facts.`
            : `The gap is synthesis — the right facts, but ${s.chartMisreads} misread(s) and only ${s.sourcesOpened} source(s) opened to find them.`
      break
    case 'clarity':
      sentence3 =
        s.memoHedges > 0
          ? `The writing is the gap — ${s.memoHedges} hedged block(s) in a memo whose entire job was to state a position.`
          : s.unsupportableLeft > 0
            ? `The writing is the gap — ${s.unsupportableLeft} claim(s) went to the board that this run cannot defend.`
            : s.overSanitized > 0
              ? 'The writing is the gap — they cut the claims they should have defended, and the deck now says nothing a board can act on.'
              : 'The writing is the gap — the memo reaches a position without making the reader believe it.'
      break
    case 'capital':
      sentence3 = s.runwayBelowBoardFloor
        ? `Capital judgment is the gap: the plan closed at ${runway} months against a hard 18-month floor.`
        : `Capital judgment is the gap: the plan closed at ${runway} months, but it does not fund the recommendation they just made.`
      break
    case 'stakeholder':
      sentence3 = s.negotiationEscalated
        ? 'Stakeholder craft is the gap — they escalated a peer disagreement to a founder with eight minutes, and paid for it twice.'
        : s.negotiationCaved
          ? 'Stakeholder craft is the gap — they folded on a plan they had already put in writing.'
          : s.anselQuestionsInvited > 0
            ? `Stakeholder craft is the gap — they left ${s.anselQuestionsInvited} avoidable question(s) in the board narrative.`
            : s.queueDelegationOverload
              ? 'Stakeholder craft is the gap — they cleared their own queue by burying one teammate under it.'
              : `Stakeholder craft is the gap — they closed at Marcus ${s.marcusTrust} and Ansel ${s.anselTrust}, and neither of them is an ally yet.`
      break
    default:
      sentence3 =
        "Coherence is the gap — each individual decision was defensible, but they don't add up to one plan."
  }

  const S4: Record<FounderReportResult['tier'], string> = {
    'Ready to Hire':
      "This is a founder's-office hire. Put them next to a CEO and get out of the way.",
    'High Potential':
      "This is a hire with one sharp edge to file down. Six months next to a strong operator and they're running the office.",
    Developing:
      "The instincts are there and the sequencing isn't yet. Give them a narrower surface and a manager who writes well.",
    'Not Yet':
      "Not this seat yet. The judgment is real but it isn't load-bearing under this much simultaneous pressure.",
  }

  if (scores[low] >= 85) {
    sentence3 = `There is no material gap in this run — the weakest of the six dimensions still closed at ${scores[low]}.`
  }

  const note = [sentence1, sentence2, sentence3, S4[tier]].join(' ')

  return { dimensions, overall, tier, note }
}

/** Same convention as `tierColor` in lib/report.ts. */
export function founderTierColor(tier: FounderReportResult['tier']): string {
  if (tier === 'Ready to Hire') return 'text-pass'
  if (tier === 'High Potential') return 'text-gilt'
  if (tier === 'Developing') return 'text-text-warm'
  return 'text-muted-ink'
}

/**
 * The downloadable Talent Report: one self-contained HTML file, no assets, no
 * network. Opens in any browser and prints straight to PDF, which is the whole
 * reason it is HTML and not text — it saves pulling in a PDF dependency.
 */
export function founderReportHTML(
  s: FounderStats,
  r: FounderReportResult,
  operatorName: string,
): string {
  const name = (operatorName || '').trim() || 'Guest Operator'
  const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const issued = new Date().toISOString().slice(0, 10)

  const rows = r.dimensions
    .map(
      (d) => `<tr><td>${esc(d.label)}</td><td class="n">${d.score}</td>
      <td class="b ${d.band.toLowerCase().replace(/ /g, '-')}">${esc(d.band)}</td></tr>`,
    )
    .join('\n      ')

  const telemetry: [string, string][] = [
    ['Attention spent', `${s.queueMinutesSpent} of 240 minutes`],
    ['Critical items reaching the founder', `${s.escalatedCritical} of ${s.criticalTotal}`],
    ['Load-bearing facts committed', `${s.factsLoadBearing} of 3`],
    ['Recommendation', s.memoRecommendation || 'none committed'],
    ['Plan closed at', `${s.runwayMonths.toFixed(1)} months runway`],
    ['Marcus / Ansel working trust', `${s.marcusTrust} / ${s.anselTrust}`],
    ['Unsupportable claims left in the board deck', String(s.unsupportableLeft)],
    ['Elapsed', `${Math.floor(s.elapsedSeconds / 60)}m ${s.elapsedSeconds % 60}s`],
  ]

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<title>Provd Talent Report — ${esc(name)}</title>
<style>
  :root{--void:#0a0a0a;--carbon:#1c1c1c;--gilt:#c8a96e;--warm:#f0e6c8;--muted:#888880;
        --pass:#3e7a5f;--error:#d44c4c;--line:#2a2a2a}
  *{box-sizing:border-box}
  body{margin:0;padding:48px 24px;background:var(--void);color:var(--warm);
       font:14px/1.6 ui-sans-serif,system-ui,sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .sheet{max-width:640px;margin:0 auto}
  .eyebrow{font:700 11px/1 ui-monospace,monospace;letter-spacing:.14em;text-transform:uppercase;color:var(--gilt)}
  .brand{display:flex;align-items:center;gap:10px;margin-bottom:14px}
  h1{font-size:28px;margin:14px 0 4px;letter-spacing:-.01em}
  .sub{color:var(--muted);font-size:13px;margin:0 0 28px}
  .score{display:flex;align-items:baseline;justify-content:space-between;
         border-top:1px solid var(--line);border-bottom:1px solid var(--line);padding:18px 0;margin-bottom:8px}
  .score b{font-size:40px;letter-spacing:-.02em}
  .tier{font-weight:700}
  .ready-to-hire{color:var(--pass)}.high-potential{color:var(--gilt)}
  .developing{color:var(--warm)}.not-yet{color:var(--muted)}
  table{width:100%;border-collapse:collapse;margin:8px 0 28px}
  td{padding:11px 0;border-bottom:1px solid var(--line);font-size:13px}
  td.n{text-align:right;width:56px;font-weight:700;font-family:ui-monospace,monospace}
  td.b{text-align:right;width:110px;font-size:12px;font-weight:600}
  .exceptional{color:var(--pass)}.strong{color:var(--warm)}
  .needs-work{color:var(--error)}
  .note{border-left:2px solid var(--gilt);padding:2px 0 2px 16px;color:var(--muted);
        font-style:italic;font-size:13px;margin-bottom:28px}
  h2{font:700 11px/1 ui-monospace,monospace;letter-spacing:.14em;text-transform:uppercase;
     color:var(--muted);margin:0 0 10px}
  footer{margin-top:32px;padding-top:16px;border-top:1px solid var(--line);
         color:var(--muted);font-size:11px}
  @media print{body{background:#fff;color:#111;padding:0}
    .note,h2,td.n,footer{color:#444}td{border-color:#ddd}}
</style></head>
<body><div class="sheet">
  <div class="brand">
    <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGAAAAA4CAYAAAACRf2iAAAAAXNSR0IArs4c6QAAAERlWElmTU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAA6ABAAMAAAABAAEAAKACAAQAAAABAAAAYKADAAQAAAABAAAAOAAAAAChUNtEAAAeB0lEQVR4Ae2cC9DlZV3Hz/U973lvu7C4EiEjaI06moI0XihNyNyUcSSGHTNxxMzKGhKF0szJmbyMptiE2qiZtyFRJxCjMSElrwgFjaJjKJRUymVdLvtezv2cPp/vc85uOgT7wrJbM/53zzn/8/8/z+/5/b6/6/P8n/NWKj8+DikCVUe/+ZtfeOFhRxz+2OFwXBmP+5XKcJDPRqNRGVcalRptao06b/OcjSvDYT/XxuMJ7ca5NuG9aXu+jvobfKMlF2vVWqXK9VFvtVKr1yv1hjSGoVWr1SrDfteWlcmIjtVGpcq1yXhYGY96Xi7jwgOcMe6AcWuVRqPKOJNKrdakT422fej0qpXaHPfq3IDn2fVhJ2M05ubpOcetaugow6DXo3szbdOHsceMXVOOfr8ymgwrzbrXRlNZ6nyOkSOIwB9cjUaVEZ918Jnwz2vVWsuznJcP+oOrvSqNVqXdXql0BpMbHvXEZ36g4bWVlcXnL2+df06lA3ATgLb3WMAVkHMGrVQ9ATgHtZfAemsCYJMJt6tcklnYmG8XZhwy/aqVSWsRwFBAXSXJrCTo24JZaToEVxV2MpEygNEeypXRkHErnM9xnbFU5EQg4MGxUX1l3KpXqvUmtEawPYdCh5yrzPnKuN2COH2kDcDtNjxMMIr2AmPANzRGAFmV7gix5XEO+VG6ckUmvjlWnTYDlFPG9j5j0q4G/cFgIHuVelM+wEHc0k8+lKnKvVZloU3bPf3PcaEooN5odCvreyrdjXVAaWSgCFaFGzgqABcwpTmO0IwkCIAExwEmAkJ1hKUKSx1AtA65qlUFzk8sZiSjQMtYepDMKrRjDQc9zgu9meDVGdCAUeM10UMBWLoT+mjFKrpaHTN2j7HXIIUiGigG2jSgbemDOkN/xHV6BGB5GQJeFBADsAs4QAPusO65GIGA1pFVZXluP6OE/I7Hg7RR3gbeLD2VhWRpJyZ6fLXPOFxt1OoJE/EA3U9jrWlBACew0Z7mkObci3VrE5DUMmmjflVGdcpMFSsYAaCHgIZW2hft22cQawZILE9hBB9UEUCLFRxCgmPBcIAXKIREk4CiMHKAL/K9ATCyqNfYlkbwI896w1xArNcEl7BKr8gksIQ6SDHegHCEIuHbl+PCAED2w0sMTYWraPlTUXoWDDTmWgk/xWORazCEB0VBFhWUEY0IegdfOBIlYijIXWUgjihgLGhzJdZ50U4Sg5y9ogKJakkJE1iwYMT6VcC0D5rAWlQiw/NfARq4nH20jFg0gjYTIrBIueQwBHlaTQ7ARgUU+rZPPFYx+S7QxWr1rvBTb2FNttWrvF/ySGEBOehryB4RKhstLBmgxioTOiNCndbtWIa5yI1ZYR6Ibq4phjYaFtk1GttV+Ywn0kY+Bv0en+Kh2MXiq4wX5TD+GKyJMsFEz9Lgu51esM/bJAnPU6AUZD5iLZyMGdDOuRaY9IBiiTPLU4ACjN0VhlCApcxCiQqZubvMa926ZLWGD0HYmDlGSNvZT061MsdxXCILb9CQL+47luElIAD6hATnuDWSXw1lmthtU0cZoo8ZaA0Q8eATOjGUITTp54XQps14SlugazAhH/bRwyKP3sL3hFaujVBmaKWtjaEBjzEeQpBG6kvP3IsRSm7WqwpaPCBARPNaYnE5CdSpGAwlWoAa1lJldiZKOZsyqQQOrsZhxn5FUXzHY/QmQ5RubLu4vYL7TQ8QSO75Xe9MqCHcFMUhcCyP0KIC4W0CTbkZJbwM8bR5QAn3EZQ3wgtjQ9uwpvDDQTc8WW0V60RZeLYG5thaOCRy1FGMYYeGyM59PseEJi24Ov1uyHQcX1GYytSAadPgVD4FfjIqtL1nFTXAQAbdruwXBdCbjsRTLmhhHlUsThDM9gliDFKSofBpEVqonqGr0cfOsUItZOqy3AveEkQAO82SsgnKstJrJuiADwCpgKBlvyIASoDuNGQCFqUk5Pq9TsA3BFQpj70/JsFJNwkd/oZWK4IicxBMuAkrWqM0sWpU7NgCrHL3HuIay7U7snMupYRH2gtk3fZ8ynMDL04lxVDShnvh4HbpGwWblJPANeiKiWmqgLlletGTI4mHz7g5g4ZRAfemAImj6HgFizYpVeNejqagtoxYWAwVjTFWIQFaRXmulalE30NLt1ajEbHkAxVWR8Ej++g5ehb1/shmjJH8YxiCx4RLxjZEKKi0NJwSGjJK5FImR/WY8ZK28iRHhaWEyCHjx/imbRMB0oZx4EHji5dqfPAnbU4kDW0B5po+iregvXhrWqAV7zFvSGMDP/OXFVRI5p90IMx1GZFZOLIi8FCpYVBw/cJ947jErMMDQloKKgPT2P7GezJ+6ew1/smr1Udcm7YqPRZCMwjzD4YxCENXLF969KtR2ZhAS24w5uuBEyZUXfLIfAA3/qdGT9GgeMpTQpESC7yKklZCiNBjESrLwzYDeDaEOGag4MwixFAW7/aqfKOkVGKcF8ue8SY2eJ/jYCB6jR6G3/EPmkSb1uJKRshbt9cbVpYWqU6KBSUxAQqjAgzhJAM6ZgEi/hBQZR7hAFM3BKIohY5TQE0+DEg/78Uz6FeslvacJ7xwb1a+0SiVTxxJI4C+qCRcYE3W6iV+w5t8cbPZIgTRpiT+Jl5pkpyGP/tyUwsuxiT3XBQ0zwBI+QRXQEtyVUHTKksekCGYhN+iVL3Rw3zAzRJOxcKI4PWMAYcaT3CTD0IO+WZpcZFLgMYRD7jx29987aCz/baVxfaLl1a2LvfW7rZBETqBzKa63UwotI8lOnDinkBQdmn5DiIsvnLZwfkio6WKwDFNfNCSScML5UbOXR7IkkQIAAoWHj4YJ0kangRDl5eo4SsWpo1QKsWSicUykUkUHqSHFku35DRsFN6mQ3BPnpUDTwXAJFn6F8ORvv2KckqZiyEZmuEtIY4+gpzwN1MAsqV8Nt4np2oAjcri0lKlh3vdtusHH71zdeMtQqSy9h5Xff6iRx/3E0e+YmG+eubSynK7s846ClUG4gRAwdJKIoVA7wVKgAqpUkbKoxZvT9rh4lq497S4gOhdGFUZpafWYmtvlBifewAIGoxbKqmMLw2E5Y2mWmjpI5Cl4tJ5p57LfWfKtklhoUHSr3iW4bTwJt14uMqGnIZlaazHtfAweTepq4Rmqx0elc7KyJym50ROZOImrxLKmihvcWm5ssEqQ68//FRvUnvT45/yvKvTgLfScvZt+vmFz37khGMf9rBzD1taPH2x3ZzrbmxEAIaDkWLlIJJaHPbj2hKy+iiesQ+AJFDuFWy1KJVlfNfaBBLGAYQWESqJT9D4ZxlYJYkLTpYoojyZVFnSLMqzWmo6M6Wd4Ule9CYrJH1LvjQQlThbwkjZCDhZcARcAS+Uoauh6BX0CcjQTL5KA9VjrCeRMqFUKXQo/HBHzyiGVK20FxYIh/BUqf/97l27zj/+F3ZeIYn/edyjAmYNvnHNp3/2qCMPO2d+rraz3Z6vb6yuRtNas4xpfUaiWGU6Ka7XC8hoqNwr5sc9QSsubwmqUAHEvvZRUN0dMFI+ci1WjYCCbKGWujraFFDAhgfvuRrJ0Hx3jJIP+BY6tgt9wsxsnKIAIrDeIF2U56w9sjCeAA/wgMiKUdvGMtbQnVKUgbhkR944m8osv3MaAx36k9oX797TeeMTnnrqZ2x6T8e9KmDW4evXXPz0o4865rxWffjshflWdYPQJHCZqCDkWEuBYRmRoC7u94Qs28FMamyAinUImh4gWumvRalU3bckLimlHwIZX21fLAthoSdQSYzTdvbzWtN6XKMIfbwSjzO+O479nZxFudKAN0NlaAkgbfSELBzGU6eKIXeEL+5bAiufPBT+uKYyGLu9sMhprbLR6V+z2hm89bFPfs6ldCwTK07u6RCB/T5u/NqnTj5s5fA/mG/Wfmlhfo6BNn6I+YQTQYQJ3VKhw7jWG7CnylFYrs0qJONwvAnkCjhYJT0TOuwbBZj4WVHk3HFm1h/mpwo1/E59MwoIXjHOUg5a+k7IY1p1ZtLhMSwCvEsuJlsVyfk0VEpfUPfJkyvxAkfTaxoo0RDYG06+tusHd7zjLz925UUXXHBBWZW0+b0cm1LAjM53rv3ks7Ystf9wean9tDkedHS6jKVh2gBmEy4KhFzQRUuYMPxodakeYkHcSggoHsO3KIb15uSXhANRhGaWIgDO0CBAM+8wXjuuVZZVmBatFY9my8uMI4DmKhVnOeq6vQdc5bpKdUEtpWf4kaIe4gKfXmThAG1Y8bue52eDfu2lFYCvfHMwGr7tq9fv+tjOnTs7Ib6fb/dLAVPatX/72mWnHnHE9lfNt1pPoxJmha8L28UdA6xiIHTAMhFqzbSIeAIjmOSChI45Jkbe4BBAQ5b9LCcFYAgYJlXIQcelalnHMgVqmjsc01DmmlBI8TYDy5BUFKpCChfFkywM9iJbPMHcBA1Dlx6VoWQM+vJsVTTHQ6e1jc6Nq6udd/3DNd/9q7PPPnuPTTZ7PBAFlLHOOKN+0x//1s5tKwvnLq8sn2CS2lhfM3gaLjkAZJZwAapM4aOCJGHBTrzGMgtqfBgatFoUIMSel6rGByMozFkmcTkrkYDVp1SeoyLRok2QRTGln+hJx8MP85azV48BdBKyorjiuRpJlk3wrFnYVAG2qzM9bhFq+uPqTf1R44LrbrjxQ6eddtZdIXY/3x64AqYDv/71r59/ya/teMHKfPX3luabP9OnPOv5zHWqhICQLwKtV4xwYSwNVJAZCWmIMpAT3Zm3qICwNhp7KaFLRWiZVkuGCz9TVRn8oSOJPC4UYOkKMGHCQyU3sNyiZFdGrd9LWeyg+ozKLVBbus6Ss5Ooaqy+0x9/f3Vt/T133tF951N37LwjhB/gm7Id0OPDf3ru4inPfe5ZC63aKxZa9UcMWRJwyddQs9eqQSo1fGKzgBdQAyKg71MWeOFJDZLjkAf9qap0q/QvVZD3RVXLbpIQnRBZBXlEAXym3FVB09gdz+J8tkaTUKjnpI3hp8zUzRdLy1sqq+ud21l9fdfN319/39N2nH5LiB+gtwOugBlfF3/oTdtOOOHE3zxi+5EvX5ir/GS3y84F1+dNmghoYszjQ4T2EJTymiY9TVVAALskQxOs5aAJFWfxOYAVjfE7h9bswpeWXMJHJnK01sNyD0MI2MZ2FJAXfHhkycBzXlKcb7ctLu7o9scfvHX36p+fdMrpN6fhAX6bcX+Aye4j96XLLz3q2GOPOHt5afmlC83Rto31dSJNAR0bxdqKuZZKxSjkMrRAFPCNvb3OOuGjHWAME1EeQ1jp5FEf52W2C73pRMkEFDJIqAJUpPlGfVvqOrO2b7a2oCQf1vhQp81OifWNztp6d/Th1bu75594ymk37ZPmwJ896AqYsfz5z3z82OOOOfxVy0tbXtxqVBd7LCEn4cWei0JIDXwrFp8lAjxlr+UCYHICjaznvW5rQ47nCVugq0M4y85yN6EryjK8ZJzCjUpIJeSAeJRe1GJ7TH9U73Z7/Yu+f8v33n7Ss170jdL6wX0/aAqYifFPX77ssQ9/6JZ3L7WbP98bGHZKIk34MRf4zxDlP8MEIcFEm5JR5Di8b6goaz1eKwm0TNxM8OSH9Hevjo8RTdKGPjyEVds8w1Ch9GsTaniQNlzrDi7Ztbv7lieffOq1GeQgvR10BSjXzd/6ypuPfuiWV6+trRGvXVcX9BKKYtHG/RI3puFIr2ANZhp+nLVapWQNn5BlrE/VQohBM9OXiinVjQorky0KAdan1MfiwlKlz+YBws1lq73hWx//pFO/SIeDfuR5wMEetekarVZtQhYnLT4JsMCnJbvJykOP8L4eMgs17slRYXtnuyRjNw4Y47XuslzhxItylu6hYVmLYtvzLBlg8lj85XdtDN/+uBN3XJ6BDtHbIVGAcy6wyEtFJJ5zYQayWjFsWM1YAXlusnbeYEhxyTrJm08VlwiDEkripZ9hB/rG9tmDI1coXbfZs7Zx1Z133f2mJz7j+ZcdIsx/aNhDogA5SBzn04pEJ9BOs4qasMG3KCaRPFVMcgSo2t6XCpCG1m2/Opte5+Z0LKyepJzFOsJYkyUO1366g8lVq53e+Y/6jT+6tHLttWUxKOMe2rdDogDXWMZjwDI88ObL0D2biQpJ6vuYMe2I8wKaNXzAny0vz8I9aoGQD1X0JryCV4vkqoL27Fm9/tZdd/zphy5+50Xvfe//HeBnaofzQ3CwozgTIvMAwxuz9QDj92wRjhOulGRcnr+WNibn8ip5w9lxZr8k6CRjrH+Z2etgOLlx990bL//y5779lJN2nPWR+wL/jDPOKAtEBxmOQ+IBrss4EfJToDFxXiXpGnRUhPfcNVG2mPjYj/t6CnHdsKO158BLMltmQ67r8ly+5e6N8du+8sXrPrjzpa+8z/WaKy/5wNbjHvHQczrD6uATn/jEGw4y/tONWQd51GH3rkltyzbitrvJDB3TamhvTLH2VyllT9EsTJXqJj6TeJ9nvK6MTp/9Lq1sqdxy++73/NTxJ59/XyJdeeUH5o9sr7xoaaF93rZtWx95++4999nnvmjen/uHxAMm/oIC6zbEZ2u7JSJxOzkBKVLhGMvBuoCvo/j82JDlnnzzB+e8nD5YALlN0K3xLn7fGxAve9nLmr9z5jN/dcvy/Ctazcbx5pa11fXKnjvvWry3fg/WvYOqgMsvff9Rj3v0cWfPN+ov6rDTwmcDI7TgkoQhRiWArykVVF278boAe2Xf2pCTNxWTJ1jMF1LxRCFsiq03Ues9HtV/+cJFz92+bdu5zUbt59xB1+2yi45wNxisVVDImTdde9notl13vuOpO8688R4pPAgXD4oCLrzw3Yed9ISffslSu/XKlYXWUWvrG0z/3dFcdhpMKBOzSqpFA2yKT2N7Zq0qqIAcoEmyJuo6Zo9uABDPUCGec88HNT96XP3ZD5985Pbtvz8/13oWaq10Ojw1VPGMJe1sUxyNFrYut19emwye//V/vPBduzcm733Gs1/4Xz9K60B//9+s5YCMc/7557R/ZcfpL1icr716qT33yD4PaPo8e3VQAcOGp0sNTnbZ+IQiBFcgrXSy+EYrJ1aGHpPtvnuEKJ83R2kqi7X7hfnKnevd1x3zmGe+QQGuv/rvTlyeb76mWRufNscK4DqKpyHKs8ISfGfKriOVdSJXR6U5316sdIeTW3kO8L4bbvqPvzj9zHMO6DMAeZsdD5YC6v963WdOW2rVX3PY1q0nGKt7uHss2JEBMudWOYQA63WfUIFFqYD4XsIL7GmlguzEi08VYLuEqwBYHsDoCcvLK5Vdd+55zZ49d16y9fDtr11oNXc2q8NWt8cPQlDwwF8CcRj60Dh0JMQpJayHP6DTCJxLNJqEM1x0bb3zn7fedtv5V33rO+8777y3rafhAXw74Aq44brLT1mcr75uZWn56Vqns9AsoiHUrOpx0Fi4JwLsvwCtlZucS2lZFt18cD99kGK4IB3Y19BhOw9LVvOE9Dvdwb/PNSqHL7bntzD7jXX7wz1Bdb5gv+QPvpfZeClpy843AlQUYx4qPPlUTM9g//L1a2vrf/b+S66+cH+3nIS5+3g7YAq4+ksfPfGowx/CVpXl5zXBsONPXjkKWK7rc5HwosmV+r+EDX7fSxv2W7K9Ze/6Tnpinex+8PcFAxbP+EZ/tgNCZ9DvcF42++aZQpSHEmjl78/M6XqcR9aDAN25hQpy+4meJPgq27GzqqpCp6CXwRheB6ENVlKZMzzB/+rq6jV3rfbe+uQdL/4kN1x+fUDHA1bAdV/95GMecti2Vy+2ajup6nF3Jk0mwynjCphEB3AqA4liiQrmQ5eyHC24pQwtngFbgOoOtcwRzBWAp4K0esGTlIeKdc7gkzAvuWO64Z5NGgh+FuYMWyqB7YtDkr+HE0GBlQ9pu4nAhzIeTvL0XMOQRKMslzp4yuZ6k4aw3ulf2VnbePPxv3jmFel0P9/utwK+dMXHjzlq+/KrFtuts5aWl5c7G8T4rNcXZApQs8TJLgRnroYMBZJZgCoRpCwt6OaCJOCz0DKL99kKSBeZVUFl7d+yVWUUuvkpKjTzmBHCjqdyHM0EP1uyyAw7itROaMczAX9elHxAf7ekhDf6JSyGJ70Dr+E9TowBNFUWvzVji8qnd99++5886Zd//SoG2/SxaQVc+bd/fcSxjzjyt9ut1u8C/vYO265jxTCqJWnJSZgwKZAR3CTHeeIw8VpgtU7burs4IYhnvvl1o4IjqPfsb3iwSvGHbSZFLVoLl162tEBvpNVPlZF1Jaw6eQEP2hdqsGpzCfe8Ji/xKMfhZezP75axDpfAZ49E85wB+nq0IcplkxgIZbAyzKG8bq874AH+39zdmbxxs48yN6WAf/7KFY877ujDPzVf7z+82x8hkCEBpVONzITSPUtCFaMSApL0iMFao5MrLc5zj2KdAj5d/zE+zwS2QuKctzznpRWnRdFeF0yf/zq2lu9MOetIfE+0gy+a8HLLOHuGUF4pY639TbN6kJZeQrmVlA3labbs4UMer6USk0jCIfkH5YZ3S2EGYfd4pdpcXvvebT84/cSnn7HfD3n00f0+2s3x0WzKBfwSCtzgOmESZGIsywOSKsAKSqlOyj56hVAhxmEtLt+FQA0iwCwxl60mAME9n3glttO3hBN+jUayjlJiOq6gEsNTyhqSoEM/gQ04AEqLhC0GKcrhCoNCF2Dx2qJIVcuIfA8fU8XoeVq9yxwzhWv1eoH0lVT66oUd0eSfwVJ/ff1ILu/3sSkFICtP8/zhA9YMs/LiocgyE6spXOW6ggpoSb4wivV4BBxvAbxgCU5A5UxrTBiZ0nQfllboniLbgZId94KlAku4MrRwz/E5iqXzhTEMUf6aUw9xfclxZ55qB9vaLr/iAfSsOdFntgnY8pUGCXnxdMd0oCkvs5DqHIKlkOJO4eK+3zalADbK8hdcqB6cAEXSIrwW4CsxGcsXxACjAmAyD1A8tVEE1lKthrByQogxV/cXQMEpG3YLUXOIYEUpcOsmXUGQlORjifRzbJAMI44ioHTKdeGSH8OIwJWQVR4IZau649I/ZTCf0i0GZn859oIq4FO6XoG2Lxs7dIzMk/yVlTTfrzd9fb8PflFfk3mZiNU5oNxOPyRUmCmJFrYAyD2gJiwZl1Hdnm6cjwDExF0st4Do9QhGI0nv7UfuiMfsHc+kjlXKDygZiqRtCIoSuR7AoKPiE6b4ay0xAuim2kpoKSKoGhnLMwgVp5JlOO/cY9w6L+W2r2FJPulCC72o3NvszKCgkoH24y0LNTyBMjHFGgQAK0Zwa2fBlnGZLMwLEkx6TcuO5yinQODWWp50OCz/tMbZIfBFQCClv/E4oUtFBivGNAEbi6GlEgO0/UKw9Ms4cGOVU8KVxcB0HLwrB7xlPQi+ZKFPKJF/vTK7ue3B9SjbO5znvhenfTizFfOJzT1u3pQH9Pt6QLEiBUPmMKX1OTjpEFcu8TKWxuXEVS6lVIVhQUj5Z3tKzNnTsAkVlWL5Oyx6BcySEAWliFdQYHyVjkL8a1ZarMrTEmWI1unLt6CGYXrCNfmlke1MBCSXhDw6qpwonHaOlQqJ9v5yh0a8oKpiGU/jkx3lK6HS9StowXPCoMNt4ticB1Dq1ViwcjAFFngfAyZQMqhgiGMqg2mbgI0XODHif+SX+fxciFzR6/Izp4CiEHoL5LDq/GYYYOwvgP4iUS/yPEmPamoAGFEA/VWW5/m9Gp8JV1P8qtCoOgcIqPAQb7Vkxf6myi3jcI82Gk123ckXh+NJ32WMyOMf+0CBypMQyXhi4jzCmfJmjk15AMm10ea3YQ3/khZC+SdjPLJ7mU8TZoWfZgqof/NN6/MPJ/ENazFxqzi1INjs03FiBcOzvwmkYhRE7Y5HrpT6YgwEzj5/1oYSKhigWsUQaBdrjOUb1/WgsqRsuMskjqrN0WiKFWvhWLFK1uqT+AvKvpsn3KRL8/z6vtflx4iEOSd+MZrp8kX+/kXCVwl9DICs/AJ+ZaXS2tOZxjUI7sexKQWsra/funutd3FN7bMgNh6z4Obf6HFSMnS5WcAtNzmshDjP6iJ/OE+pGuzdEcCEBSZH/tyfpbUAZR/nFf6JAX+50sx8weoH2vlbdSgd5SVc0FbFan2jAGZYUG4tkZk1HkQLvpaKSeBdA8qvaLR6jvwivw5NLNuk6lGUbIVF4eDvGgZaPW06a/CMYWDhETJ/7K/kwlnF54+3x+u9ylqn990Q+/Hb/w8E/huC5Y3rlwgfvgAAAABJRU5ErkJggg==" alt="Provd" width="52">
    <span class="eyebrow">Talent Report</span>
  </div>
  <h1>${esc(name)}</h1>
  <p class="sub">Founder's Office Track · Simulation Preview · Issued ${issued}</p>

  <div class="score">
    <span>Overall simulation score</span>
    <span><b>${r.overall}</b> <span style="color:var(--muted)">/ 100</span></span>
  </div>
  <div class="score" style="border-top:none">
    <span>Provd Tier</span>
    <span class="tier ${r.tier.toLowerCase().replace(/ /g, '-')}">${esc(r.tier)}</span>
  </div>

  <h2>Competency dimensions</h2>
  <table>
      ${rows}
  </table>

  <h2>Simulated partner note</h2>
  <p class="note">&ldquo;${esc(r.note)}&rdquo;</p>

  <h2>Run telemetry</h2>
  <table>
      ${telemetry.map(([k, v]) => `<tr><td>${esc(k)}</td><td class="b">${esc(v)}</td></tr>`).join('\n      ')}
  </table>

  <footer>
    Generated by the Provd Founder's Office simulation. Scoring is deterministic:
    the same run always produces this report. One task from a four-week Master
    Simulation graded by our team and a company partner.
  </footer>
</div></body></html>`
}
