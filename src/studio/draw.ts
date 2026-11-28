import type { Stroke } from '../lib/strokeCleanup'

export function drawStrokes(
  ctx: CanvasRenderingContext2D,
  strokes: Stroke[],
  style: { color: string; width: number; alpha: number },
) {
  ctx.save()
  ctx.strokeStyle = style.color
  ctx.lineWidth = style.width
  ctx.globalAlpha = style.alpha
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  for (const stroke of strokes) {
    if (stroke.points.length < 2) continue
    ctx.beginPath()
    ctx.moveTo(stroke.points[0].x, stroke.points[0].y)
    for (let i = 1; i < stroke.points.length; i++) {
      ctx.lineTo(stroke.points[i].x, stroke.points[i].y)
    }
    ctx.stroke()
  }
  ctx.restore()
}

export function paintStudioBoard(
  canvas: HTMLCanvasElement,
  opts: {
    strokes: Stroke[]
    cleaned: Stroke[] | null
    onionPrev: Stroke[] | null
    onionNext: Stroke[] | null
    proposedCleanup: Stroke[] | null
    ghostRough: boolean
    showCleaned: boolean
  },
) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const dpr = window.devicePixelRatio || 1
  const w = canvas.clientWidth
  const h = canvas.clientHeight
  if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
    canvas.width = Math.floor(w * dpr)
    canvas.height = Math.floor(h * dpr)
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, w, h)

  ctx.fillStyle = '#F2F4F6'
  ctx.fillRect(0, 0, w, h)

  // Paper grain wash
  const wash = ctx.createLinearGradient(0, 0, w, h)
  wash.addColorStop(0, 'rgba(255,255,255,0.5)')
  wash.addColorStop(1, 'rgba(42,107,95,0.05)')
  ctx.fillStyle = wash
  ctx.fillRect(0, 0, w, h)

  if (opts.onionPrev) {
    drawStrokes(ctx, opts.onionPrev, { color: '#C45C3A', width: 1.6, alpha: 0.22 })
  }
  if (opts.onionNext) {
    drawStrokes(ctx, opts.onionNext, { color: '#2A6B5F', width: 1.6, alpha: 0.22 })
  }

  if (opts.ghostRough || !opts.proposedCleanup) {
    drawStrokes(ctx, opts.strokes, {
      color: '#5A5348',
      width: 2.6,
      alpha: opts.proposedCleanup ? 0.3 : 0.95,
    })
  }

  if (opts.proposedCleanup) {
    drawStrokes(ctx, opts.proposedCleanup, { color: '#1A3D38', width: 2.3, alpha: 1 })
  } else if (opts.showCleaned && opts.cleaned) {
    drawStrokes(ctx, opts.cleaned, { color: '#0E1012', width: 2.35, alpha: 1 })
  }
}

export function frameDisplayStrokes(strokes: Stroke[], cleaned: Stroke[] | null): Stroke[] {
  return cleaned && cleaned.length > 0 ? cleaned : strokes
}

/** Render a frame to a PNG blob at fixed resolution. */
export async function frameToPngBlob(
  strokes: Stroke[],
  cleaned: Stroke[] | null,
  width = 960,
  height = 540,
): Promise<Blob | null> {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  ctx.fillStyle = '#F2F4F6'
  ctx.fillRect(0, 0, width, height)
  const draw = cleaned && cleaned.length > 0 ? cleaned : strokes
  drawStrokes(ctx, draw, { color: '#0E1012', width: 2.4, alpha: 1 })
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/png'))
}
