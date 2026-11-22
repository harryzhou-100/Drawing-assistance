export type Point = { x: number; y: number }

export type Stroke = {
  id: string
  points: Point[]
}

/** Moving-average smoothing that preserves endpoints. */
export function smoothStroke(points: Point[], windowSize = 5): Point[] {
  if (points.length < 3) return points.map((p) => ({ ...p }))
  const half = Math.floor(windowSize / 2)
  const out: Point[] = []
  for (let i = 0; i < points.length; i++) {
    if (i === 0 || i === points.length - 1) {
      out.push({ ...points[i] })
      continue
    }
    let sx = 0
    let sy = 0
    let n = 0
    for (let j = Math.max(0, i - half); j <= Math.min(points.length - 1, i + half); j++) {
      sx += points[j].x
      sy += points[j].y
      n++
    }
    out.push({ x: sx / n, y: sy / n })
  }
  return out
}

function perpendicularDistance(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x
  const dy = b.y - a.y
  if (dx === 0 && dy === 0) {
    return Math.hypot(p.x - a.x, p.y - a.y)
  }
  const t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy)
  const projX = a.x + t * dx
  const projY = a.y + t * dy
  return Math.hypot(p.x - projX, p.y - projY)
}

/** Ramer–Douglas–Peucker simplification for cleaner, vector-ready paths. */
export function simplifyStroke(points: Point[], epsilon = 1.6): Point[] {
  if (points.length < 3) return points.map((p) => ({ ...p }))

  let maxDist = 0
  let index = 0
  const end = points.length - 1
  for (let i = 1; i < end; i++) {
    const dist = perpendicularDistance(points[i], points[0], points[end])
    if (dist > maxDist) {
      maxDist = dist
      index = i
    }
  }

  if (maxDist > epsilon) {
    const left = simplifyStroke(points.slice(0, index + 1), epsilon)
    const right = simplifyStroke(points.slice(index), epsilon)
    return left.slice(0, -1).concat(right)
  }
  return [points[0], points[end]]
}

/** Resample a polyline to roughly equal spacing for even stroke weight. */
export function resampleStroke(points: Point[], spacing = 2.2): Point[] {
  if (points.length < 2) return points.map((p) => ({ ...p }))

  const out: Point[] = [{ ...points[0] }]
  let prev = points[0]
  let budget = spacing

  for (let i = 1; i < points.length; i++) {
    let curr = points[i]
    let dx = curr.x - prev.x
    let dy = curr.y - prev.y
    let dist = Math.hypot(dx, dy)
    if (dist === 0) continue

    while (dist >= budget) {
      const t = budget / dist
      const nx = prev.x + dx * t
      const ny = prev.y + dy * t
      out.push({ x: nx, y: ny })
      prev = { x: nx, y: ny }
      dx = curr.x - prev.x
      dy = curr.y - prev.y
      dist = Math.hypot(dx, dy)
      budget = spacing
    }

    budget -= dist
    prev = curr
  }

  const last = points[points.length - 1]
  const tip = out[out.length - 1]
  if (Math.hypot(last.x - tip.x, last.y - tip.y) > 0.4) {
    out.push({ ...last })
  }
  return out
}

/**
 * Client-side stand-in for structure-preserving line cleanup.
 * Real product would use ControlNet / custom diffusion adapters;
 * this demo shows the interaction loop: rough → cleaned → artist retains control.
 */
export function cleanupStroke(points: Point[]): Point[] {
  if (points.length < 2) return points.map((p) => ({ ...p }))
  // Two-pass smooth + stronger simplification so the rough→clean change is obvious in the demo.
  const smoothed = smoothStroke(smoothStroke(points, 9), 7)
  const simplified = simplifyStroke(smoothed, 2.8)
  return resampleStroke(simplified, 2)
}

export function cleanupStrokes(strokes: Stroke[]): Stroke[] {
  return strokes.map((s) => ({
    ...s,
    points: cleanupStroke(s.points),
  }))
}
