import type { Point, Stroke } from './strokeCleanup'

export type PaletteSwatch = {
  id: string
  name: string
  color: string
}

/** Locked character palette — flats may only use these swatches. */
export const DEFAULT_PALETTE: PaletteSwatch[] = [
  { id: 'skin', name: 'Skin', color: '#E2B896' },
  { id: 'hair', name: 'Hair', color: '#2F5D52' },
  { id: 'cloth', name: 'Cloth', color: '#3E5160' },
  { id: 'accent', name: 'Accent', color: '#C45C3A' },
]

export type FlatRegion = {
  id: string
  /** Index into the locked palette (by swatch id). */
  swatchId: string
  pixelCount: number
  /** Compact mask: 1 = inside region, length = width * height. */
  mask: Uint8Array
  /** Mask buffer dimensions — must match the board used when proposing. */
  width: number
  height: number
  cx: number
  cy: number
}

export type FlatProposal = {
  width: number
  height: number
  regions: FlatRegion[]
}

const LINE = 0
const EMPTY = 255
const VISITED = 128

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

/** Rasterize line art onto a grayscale buffer (255 empty, 0 line). */
export function rasterizeLineArt(
  strokes: Stroke[],
  width: number,
  height: number,
  lineWidth = 3,
): Uint8ClampedArray {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return new Uint8ClampedArray(width * height).fill(EMPTY)

  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, width, height)
  ctx.strokeStyle = '#000000'
  ctx.lineWidth = lineWidth
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  for (const stroke of strokes) {
    if (stroke.points.length < 2) continue
    // Close near-closed loops so flood-fill can find flats.
    const pts = maybeCloseStroke(stroke.points, 18)
    ctx.beginPath()
    ctx.moveTo(pts[0].x, pts[0].y)
    for (let i = 1; i < pts.length; i++) {
      ctx.lineTo(pts[i].x, pts[i].y)
    }
    ctx.stroke()
  }

  const { data } = ctx.getImageData(0, 0, width, height)
  const gray = new Uint8ClampedArray(width * height)
  for (let i = 0; i < gray.length; i++) {
    gray[i] = data[i * 4] < 200 ? LINE : EMPTY
  }
  return gray
}

function maybeCloseStroke(points: Point[], threshold: number): Point[] {
  if (points.length < 3) return points
  const a = points[0]
  const b = points[points.length - 1]
  if (Math.hypot(a.x - b.x, a.y - b.y) <= threshold && Math.hypot(a.x - b.x, a.y - b.y) > 0.5) {
    return [...points, { ...a }]
  }
  return points
}

function floodCollect(
  gray: Uint8ClampedArray,
  width: number,
  height: number,
  sx: number,
  sy: number,
  paint: number,
): { count: number; sumX: number; sumY: number; cells: number[] } {
  const cells: number[] = []
  const stack: number[] = [sy * width + sx]
  let count = 0
  let sumX = 0
  let sumY = 0

  while (stack.length) {
    const idx = stack.pop()!
    if (idx < 0 || idx >= gray.length) continue
    if (gray[idx] !== EMPTY) continue
    gray[idx] = paint
    const x = idx % width
    const y = (idx / width) | 0
    cells.push(idx)
    count++
    sumX += x
    sumY += y
    if (x + 1 < width) stack.push(idx + 1)
    if (x > 0) stack.push(idx - 1)
    if (y + 1 < height) stack.push(idx + width)
    if (y > 0) stack.push(idx - width)
  }

  return { count, sumX, sumY, cells }
}

/**
 * Client-side stand-in for auto-flatting:
 * find enclosed white regions in cleaned line art and assign locked palette swatches.
 */
export function proposeFlats(
  strokes: Stroke[],
  width: number,
  height: number,
  palette: PaletteSwatch[] = DEFAULT_PALETTE,
  options?: { minPixels?: number; maxRegions?: number; lineWidth?: number },
): FlatRegion[] {
  const minPixels = options?.minPixels ?? Math.max(60, Math.floor((width * height) / 500))
  const maxRegions = options?.maxRegions ?? palette.length
  const gray = rasterizeLineArt(strokes, width, height, options?.lineWidth ?? 4)

  // Mark background (anything reachable from the border).
  for (let x = 0; x < width; x++) {
    if (gray[x] === EMPTY) floodCollect(gray, width, height, x, 0, VISITED)
    if (gray[(height - 1) * width + x] === EMPTY) {
      floodCollect(gray, width, height, x, height - 1, VISITED)
    }
  }
  for (let y = 0; y < height; y++) {
    if (gray[y * width] === EMPTY) floodCollect(gray, width, height, 0, y, VISITED)
    if (gray[y * width + width - 1] === EMPTY) {
      floodCollect(gray, width, height, width - 1, y, VISITED)
    }
  }

  const candidates: { count: number; sumX: number; sumY: number; cells: number[] }[] = []
  for (let i = 0; i < gray.length; i++) {
    if (gray[i] !== EMPTY) continue
    const x = i % width
    const y = (i / width) | 0
    const region = floodCollect(gray, width, height, x, y, VISITED)
    if (region.count >= minPixels) candidates.push(region)
  }

  candidates.sort((a, b) => b.count - a.count)
  const picked = candidates.slice(0, maxRegions)

  // Prefer top→Hair/Skin… and reserve Accent for the smallest pocket.
  const withMeta = picked.map((region) => ({
    ...region,
    cx: region.sumX / region.count,
    cy: region.sumY / region.count,
  }))
  const smallest = [...withMeta].sort((a, b) => a.count - b.count)[0]
  const upper = withMeta
    .filter((r) => r !== smallest)
    .sort((a, b) => a.cy - b.cy || b.count - a.count)
  const ordered = smallest ? [...upper, smallest] : upper
  // Map onto Hair, Skin, Cloth, Accent when using the default palette order.
  const swatchOrder =
    palette.length >= 4
      ? [palette[1], palette[0], palette[2], palette[3], ...palette.slice(4)]
      : palette

  return ordered.map((region, i) => {
    const mask = new Uint8Array(width * height)
    for (const idx of region.cells) mask[idx] = 1
    const swatch = swatchOrder[i % swatchOrder.length]
    return {
      id: `flat-${i}-${swatch.id}`,
      swatchId: swatch.id,
      pixelCount: region.count,
      mask,
      width,
      height,
      cx: region.cx,
      cy: region.cy,
    }
  })
}

export function regionAtPoint(
  regions: FlatRegion[],
  x: number,
  y: number,
  width: number,
): FlatRegion | null {
  const ix = clamp(Math.floor(x), 0, width - 1)
  const iy = clamp(Math.floor(y), 0, Number.MAX_SAFE_INTEGER)
  const idx = iy * width + ix
  for (const region of regions) {
    if (idx < region.mask.length && region.mask[idx] === 1) return region
  }
  return null
}

export function reassignRegion(
  regions: FlatRegion[],
  regionId: string,
  swatchId: string,
  palette: PaletteSwatch[],
): FlatRegion[] {
  if (!palette.some((s) => s.id === swatchId)) return regions
  return regions.map((r) => (r.id === regionId ? { ...r, swatchId } : r))
}

/** Apply the same size-ranked swatch mapping onto another frame's regions (palette lock). */
export function lockPaletteOntoRegions(
  source: FlatRegion[],
  target: FlatRegion[],
): FlatRegion[] {
  const rankedSource = [...source].sort((a, b) => b.pixelCount - a.pixelCount)
  const rankedTarget = [...target].sort((a, b) => b.pixelCount - a.pixelCount)
  return rankedTarget.map((region, i) => ({
    ...region,
    swatchId: rankedSource[i]?.swatchId ?? region.swatchId,
  }))
}

export function swatchColor(palette: PaletteSwatch[], swatchId: string): string {
  return palette.find((s) => s.id === swatchId)?.color ?? '#888888'
}
