// The hero's fake market. A seeded random walk, so every visit sees the same
// chart, steered through a fixed story: chop, a big rally, a blow-off top,
// a crash, a bottom, and a recovery that's still running "live".

export type Candle = { o: number; h: number; l: number; c: number }

export const BASE_COUNT = 480
const SEED = 0x5eed2026
const START_PRICE = 48
const STEPS_PER_CANDLE = 6

// Each regime ends at `until` (fraction of the series) and moves price by
// exactly `move` (a multiplier) with `vol` noise per candle (log scale).
const REGIMES = [
  { until: 0.16, move: 1.06, vol: 0.011 }, // chop
  { until: 0.42, move: 2.7, vol: 0.015 }, // the rally
  { until: 0.48, move: 0.96, vol: 0.024 }, // blow-off top
  { until: 0.58, move: 0.42, vol: 0.03 }, // the crash
  { until: 0.7, move: 1.08, vol: 0.02 }, // the bottom
  { until: 1, move: 1.55, vol: 0.013 }, // recovery
]

function mulberry32(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function gaussian(rand: () => number) {
  let u = 0
  while (u === 0) u = rand()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rand())
}

export function generateSeries(): Candle[] {
  const rand = mulberry32(SEED)
  const candles: Candle[] = []
  let logPrice = Math.log(START_PRICE)
  let start = 0

  for (const regime of REGIMES) {
    const end = Math.round(regime.until * BASE_COUNT)
    const steps = (end - start) * STEPS_PER_CANDLE
    const stepVol = regime.vol / Math.sqrt(STEPS_PER_CANDLE)

    // Draw the noise first, then tilt it so the regime lands exactly on its
    // target move. The story holds no matter what the noise does.
    const noise = Array.from({ length: steps }, () => gaussian(rand) * stepVol)
    const drift = (Math.log(regime.move) - noise.reduce((a, b) => a + b, 0)) / steps

    for (let i = 0; i < steps; i += STEPS_PER_CANDLE) {
      const o = Math.exp(logPrice)
      let h = o
      let l = o
      for (let s = 0; s < STEPS_PER_CANDLE; s++) {
        logPrice += noise[i + s] + drift
        const p = Math.exp(logPrice)
        if (p > h) h = p
        if (p < l) l = p
      }
      const c = Math.exp(logPrice)
      // Wicks poke a little past the intra-candle extremes
      h *= 1 + Math.abs(gaussian(rand)) * regime.vol * 0.35
      l *= 1 - Math.abs(gaussian(rand)) * regime.vol * 0.35
      candles.push({ o, h, l, c })
    }
    start = end
  }
  return candles
}

/** Merge every `factor` candles into one, like zooming out a timeframe. */
export function aggregate(candles: Candle[], factor: number): Candle[] {
  if (factor <= 1) return candles
  const out: Candle[] = []
  for (let i = 0; i < candles.length; i += factor) {
    const group = candles.slice(i, i + factor)
    out.push({
      o: group[0].o,
      h: Math.max(...group.map((c) => c.h)),
      l: Math.min(...group.map((c) => c.l)),
      c: group[group.length - 1].c,
    })
  }
  return out
}
