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
  <div class="eyebrow">Provd — Talent Report</div>
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
