import type { Point, Stroke } from './strokeCleanup'

function circle(cx: number, cy: number, rx: number, ry: number, n = 40): Point[] {
  const pts: Point[] = []
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2
    pts.push({ x: cx + Math.cos(a) * rx, y: cy + Math.sin(a) * ry })
  }
  return pts
}

function ovalBlob(cx: number, cy: number, rx: number, ry: number, n = 36): Point[] {
  return circle(cx, cy, rx, ry, n)
}

function closedPoly(points: Point[]): Point[] {
  if (points.length === 0) return points
  const first = points[0]
  const last = points[points.length - 1]
  if (Math.hypot(first.x - last.x, first.y - last.y) > 0.5) {
    return [...points, { ...first }]
  }
  return points
}

/**
 * Unit-space sample cleaned character (0–1 coords).
 * Closed loops so flood-fill flatting finds Skin / Hair / Cloth / Accent regions.
 */
export function buildSampleCleanupUnit(): Stroke[] {
  const hair = ovalBlob(0.5, 0.28, 0.2, 0.18)
  const head = ovalBlob(0.5, 0.34, 0.13, 0.12)
  const torso = closedPoly([
    { x: 0.38, y: 0.46 },
    { x: 0.62, y: 0.46 },
    { x: 0.68, y: 0.78 },
    { x: 0.32, y: 0.78 },
  ])
  const scarf = closedPoly([
    { x: 0.42, y: 0.44 },
    { x: 0.58, y: 0.44 },
    { x: 0.6, y: 0.52 },
    { x: 0.4, y: 0.52 },
  ])

  return [
    { id: 'sample-hair', points: hair },
    { id: 'sample-head', points: head },
    { id: 'sample-torso', points: torso },
    { id: 'sample-scarf', points: scarf },
  ]
}

/** Scale unit strokes into a canvas of size w×h with padding. */
export function scaleSampleToCanvas(width: number, height: number): Stroke[] {
  const padX = width * 0.12
  const padY = height * 0.1
  const innerW = width - padX * 2
  const innerH = height - padY * 2
  return buildSampleCleanupUnit().map((s) => ({
    ...s,
    points: s.points.map((p) => ({
      x: padX + p.x * innerW,
      y: padY + p.y * innerH,
    })),
  }))
}

/** Slightly shifted duplicate for “frame 2” palette-lock preview. */
export function scaleSampleFrame2(width: number, height: number): Stroke[] {
  const base = scaleSampleToCanvas(width, height)
  return base.map((s) => ({
    ...s,
    id: `${s.id}-f2`,
    points: s.points.map((p) => ({
      x: p.x * 0.94 + width * 0.04,
      y: p.y * 0.96 + height * 0.02,
    })),
  }))
}
