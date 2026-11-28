import type { Point, Stroke } from './strokeCleanup'

function ellipse(cx: number, cy: number, rx: number, ry: number, n = 48): Point[] {
  const pts: Point[] = []
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2
    pts.push({ x: cx + Math.cos(a) * rx, y: cy + Math.sin(a) * ry })
  }
  return pts
}

function closed(points: Point[]): Point[] {
  if (points.length === 0) return points
  const first = points[0]
  const last = points[points.length - 1]
  if (Math.hypot(first.x - last.x, first.y - last.y) > 0.01) {
    return [...points, { ...first }]
  }
  return points
}

/**
 * Unit-space sample cleaned character (0–1).
 * Four clearly separated closed loops for Skin / Hair / Cloth / Accent flats.
 */
export function buildSampleCleanupUnit(): Stroke[] {
  // Hair bun — fully above the head so the interior is its own pocket
  const hair = ellipse(0.5, 0.18, 0.14, 0.1)
  // Head / skin
  const head = ellipse(0.5, 0.36, 0.15, 0.14)
  // Torso / cloth — gap below the head so flood-fill does not leak through shared edges
  const torso = closed([
    { x: 0.34, y: 0.56 },
    { x: 0.66, y: 0.56 },
    { x: 0.72, y: 0.88 },
    { x: 0.28, y: 0.88 },
  ])
  // Accent pocket inside the torso
  const accent = closed([
    { x: 0.44, y: 0.64 },
    { x: 0.56, y: 0.64 },
    { x: 0.58, y: 0.76 },
    { x: 0.42, y: 0.76 },
  ])

  return [
    { id: 'sample-hair', points: hair },
    { id: 'sample-head', points: head },
    { id: 'sample-torso', points: torso },
    { id: 'sample-accent', points: accent },
  ]
}

/** Scale unit strokes into a canvas of size w×h with padding. */
export function scaleSampleToCanvas(width: number, height: number): Stroke[] {
  const padX = width * 0.14
  const padY = height * 0.08
  const innerW = width - padX * 2
  const innerH = height - padY * 2
  return buildSampleCleanupUnit().map((s) => ({
    ...s,
    id: `${s.id}-${width}x${height}`,
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
      x: p.x * 0.95 + width * 0.035,
      y: p.y * 0.97 + height * 0.015,
    })),
  }))
}
