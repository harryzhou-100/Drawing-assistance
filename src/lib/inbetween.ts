import type { Point, Stroke } from './strokeCleanup'

function dist(a: Point, b: Point) {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

/** Arc-length resample so two strokes can be lerped pointwise. */
export function resampleToCount(points: Point[], count: number): Point[] {
  if (points.length === 0) return []
  if (points.length === 1 || count <= 1) {
    return Array.from({ length: Math.max(1, count) }, () => ({ ...points[0] }))
  }

  const lengths: number[] = [0]
  let total = 0
  for (let i = 1; i < points.length; i++) {
    total += dist(points[i - 1], points[i])
    lengths.push(total)
  }
  if (total < 1e-6) {
    return Array.from({ length: count }, () => ({ ...points[0] }))
  }

  const out: Point[] = []
  for (let i = 0; i < count; i++) {
    const target = (i / (count - 1)) * total
    let j = 1
    while (j < lengths.length && lengths[j] < target) j++
    const a = points[j - 1]
    const b = points[Math.min(j, points.length - 1)]
    const segStart = lengths[j - 1]
    const segLen = lengths[Math.min(j, lengths.length - 1)] - segStart || 1
    const t = (target - segStart) / segLen
    out.push({
      x: a.x + (b.x - a.x) * t,
      y: a.y + (b.y - a.y) * t,
    })
  }
  return out
}

export function lerpPoint(a: Point, b: Point, t: number): Point {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
  }
}

/** Ease for slightly more natural spacing (slow in / slow out). */
export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

export function lerpStroke(a: Point[], b: Point[], t: number, samples = 48): Point[] {
  const ra = resampleToCount(a, samples)
  const rb = resampleToCount(b, samples)
  return ra.map((p, i) => lerpPoint(p, rb[i] ?? rb[rb.length - 1], t))
}

/**
 * Match strokes by index (keys must share topology).
 * Extra strokes on either side fade via hold-last / hold-first.
 */
export function lerpStrokes(keyA: Stroke[], keyB: Stroke[], t: number): Stroke[] {
  const n = Math.max(keyA.length, keyB.length)
  const out: Stroke[] = []
  for (let i = 0; i < n; i++) {
    const a = keyA[i] ?? keyA[keyA.length - 1]
    const b = keyB[i] ?? keyB[keyB.length - 1]
    if (!a || !b) continue
    out.push({
      id: `ib-${i}`,
      points: lerpStroke(a.points, b.points, t),
    })
  }
  return out
}

/**
 * Client-side stand-in for key-to-key inbetween drafts.
 * Returns frames at open interval (0,1) — keys themselves stay human-owned.
 */
export function proposeInbetweens(
  keyA: Stroke[],
  keyB: Stroke[],
  count = 5,
  eased = true,
): Stroke[][] {
  if (count < 1) return []
  const frames: Stroke[][] = []
  for (let i = 1; i <= count; i++) {
    const raw = i / (count + 1)
    const t = eased ? easeInOutCubic(raw) : raw
    frames.push(lerpStrokes(keyA, keyB, t))
  }
  return frames
}

/** Continuous draft at timing chart position t ∈ [0,1]. */
export function draftAtTiming(keyA: Stroke[], keyB: Stroke[], t: number, eased = true): Stroke[] {
  const u = Math.max(0, Math.min(1, t))
  const easedT = eased ? easeInOutCubic(u) : u
  return lerpStrokes(keyA, keyB, easedT)
}
