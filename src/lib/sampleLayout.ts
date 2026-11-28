import type { Stroke } from './strokeCleanup'
import type { CharacterPlacement, LayoutSet } from './layoutSnap'

function ellipse(cx: number, cy: number, rx: number, ry: number, n = 28): { x: number; y: number }[] {
  const pts: { x: number; y: number }[] = []
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2
    pts.push({ x: cx + Math.cos(a) * rx, y: cy + Math.sin(a) * ry })
  }
  return pts
}

function line(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  n = 12,
): { x: number; y: number }[] {
  const pts: { x: number; y: number }[] = []
  for (let i = 0; i <= n; i++) {
    const t = i / n
    pts.push({ x: x0 + (x1 - x0) * t, y: y0 + (y1 - y0) * t })
  }
  return pts
}

/** Build a simple 1-pt perspective set for the given board size. */
export function buildSampleSet(width: number, height: number): LayoutSet {
  return {
    vp: { x: width * 0.52, y: height * 0.28 },
    horizonY: height * 0.3,
    floorY: height * 0.88,
    floorLeft: width * 0.08,
    floorRight: width * 0.92,
  }
}

/** Floor grid + counter block strokes (layout / blocking). */
export function buildSetStrokes(set: LayoutSet): Stroke[] {
  const strokes: Stroke[] = []
  const { vp, floorY, floorLeft, floorRight, horizonY } = set

  // Floor fan lines
  const cols = 7
  for (let i = 0; i <= cols; i++) {
    const t = i / cols
    const x = floorLeft + (floorRight - floorLeft) * t
    strokes.push({
      id: `floor-ray-${i}`,
      points: line(x, floorY, vp.x, vp.y, 20),
    })
  }

  // Cross contours on floor
  for (let i = 1; i <= 4; i++) {
    const u = i / 5
    const y = floorY + (horizonY + (floorY - horizonY) * 0.25 - floorY) * u
    const leftX = floorLeft + (vp.x - floorLeft) * u * 0.85
    const rightX = floorRight + (vp.x - floorRight) * u * 0.85
    strokes.push({
      id: `floor-band-${i}`,
      points: line(leftX, y, rightX, y, 16),
    })
  }

  // Simple counter / prop block in perspective
  const cNearL = { x: set.vp.x - (floorRight - floorLeft) * 0.18, y: floorY * 0.72 }
  const cNearR = { x: set.vp.x + (floorRight - floorLeft) * 0.12, y: floorY * 0.72 }
  const cFarL = {
    x: cNearL.x + (vp.x - cNearL.x) * 0.35,
    y: cNearL.y + (vp.y - cNearL.y) * 0.35,
  }
  const cFarR = {
    x: cNearR.x + (vp.x - cNearR.x) * 0.35,
    y: cNearR.y + (vp.y - cNearR.y) * 0.35,
  }
  const counterTop = 0.12 * (floorY - horizonY)
  strokes.push({
    id: 'counter-top',
    points: [
      { x: cNearL.x, y: cNearL.y - counterTop },
      { x: cNearR.x, y: cNearR.y - counterTop },
      { x: cFarR.x, y: cFarR.y - counterTop },
      { x: cFarL.x, y: cFarL.y - counterTop },
      { x: cNearL.x, y: cNearL.y - counterTop },
    ],
  })
  strokes.push({
    id: 'counter-front',
    points: [
      { x: cNearL.x, y: cNearL.y - counterTop },
      { x: cNearR.x, y: cNearR.y - counterTop },
      { x: cNearR.x, y: cNearR.y },
      { x: cNearL.x, y: cNearL.y },
      { x: cNearL.x, y: cNearL.y - counterTop },
    ],
  })

  // Horizon guide
  strokes.push({
    id: 'horizon',
    points: line(floorLeft * 0.5, horizonY, floorRight + (widthPad(set)), horizonY, 8),
  })

  return strokes
}

function widthPad(set: LayoutSet) {
  return (set.floorRight - set.floorLeft) * 0.08
}

/**
 * Rough character intentionally floating + slightly oversized —
 * the snap assist plants feet and corrects scale.
 */
export function buildFloatingCharacter(width: number, height: number): CharacterPlacement {
  const foot = { x: width * 0.38, y: height * 0.58 } // floating above floor
  const h = height * 0.55
  const headCy = foot.y - h * 0.78
  const strokes: Stroke[] = [
    { id: 'head', points: ellipse(foot.x, headCy, h * 0.1, h * 0.09) },
    { id: 'torso', points: line(foot.x, headCy + h * 0.1, foot.x, foot.y - h * 0.2) },
    { id: 'arm-l', points: line(foot.x, foot.y - h * 0.55, foot.x - h * 0.18, foot.y - h * 0.35) },
    { id: 'arm-r', points: line(foot.x, foot.y - h * 0.55, foot.x + h * 0.2, foot.y - h * 0.4) },
    { id: 'leg-l', points: line(foot.x, foot.y - h * 0.2, foot.x - h * 0.08, foot.y) },
    { id: 'leg-r', points: line(foot.x, foot.y - h * 0.2, foot.x + h * 0.1, foot.y) },
  ]
  return { strokes, foot, height: h }
}
