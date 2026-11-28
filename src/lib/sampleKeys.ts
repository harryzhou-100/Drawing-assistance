import type { Point, Stroke } from './strokeCleanup'

function ellipse(cx: number, cy: number, rx: number, ry: number, n = 36): Point[] {
  const pts: Point[] = []
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2
    pts.push({ x: cx + Math.cos(a) * rx, y: cy + Math.sin(a) * ry })
  }
  return pts
}

function line(x0: number, y0: number, x1: number, y1: number, n = 16): Point[] {
  const pts: Point[] = []
  for (let i = 0; i <= n; i++) {
    const t = i / n
    pts.push({ x: x0 + (x1 - x0) * t, y: y0 + (y1 - y0) * t })
  }
  return pts
}

/**
 * Unit-space sample keys: same stroke topology (head, torso, arm).
 * Key A — arm down/rest. Key B — arm raised (wave).
 */
export function buildSampleKeyAUnit(): Stroke[] {
  return [
    { id: 'head', points: ellipse(0.5, 0.28, 0.11, 0.1) },
    { id: 'torso', points: line(0.5, 0.38, 0.5, 0.68) },
    { id: 'arm', points: line(0.5, 0.48, 0.68, 0.66) },
    { id: 'leg-l', points: line(0.5, 0.68, 0.4, 0.88) },
    { id: 'leg-r', points: line(0.5, 0.68, 0.6, 0.88) },
  ]
}

export function buildSampleKeyBUnit(): Stroke[] {
  return [
    { id: 'head', points: ellipse(0.5, 0.26, 0.11, 0.1) },
    { id: 'torso', points: line(0.5, 0.36, 0.5, 0.68) },
    { id: 'arm', points: line(0.5, 0.46, 0.72, 0.3) },
    { id: 'leg-l', points: line(0.5, 0.68, 0.38, 0.88) },
    { id: 'leg-r', points: line(0.5, 0.68, 0.62, 0.88) },
  ]
}

function scaleUnit(strokes: Stroke[], width: number, height: number, tag: string): Stroke[] {
  const padX = width * 0.18
  const padY = height * 0.1
  const innerW = width - padX * 2
  const innerH = height - padY * 2
  return strokes.map((s) => ({
    ...s,
    id: `${tag}-${s.id}`,
    points: s.points.map((p) => ({
      x: padX + p.x * innerW,
      y: padY + p.y * innerH,
    })),
  }))
}

export function scaleSampleKeys(width: number, height: number): { keyA: Stroke[]; keyB: Stroke[] } {
  return {
    keyA: scaleUnit(buildSampleKeyAUnit(), width, height, 'A'),
    keyB: scaleUnit(buildSampleKeyBUnit(), width, height, 'B'),
  }
}
