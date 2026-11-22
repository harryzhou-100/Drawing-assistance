import { useEffect, useRef } from 'react'
import { cleanupStroke, type Point } from '../lib/strokeCleanup'

/** Decorative full-bleed hero: a rough gesture stroke that settles into clean line art. */
export function HeroSketch() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const surface = canvas
    const g = ctx
    let raf = 0
    let start = 0

    const roughPath = buildGesturePath()
    const cleanPath = cleanupStroke(roughPath)

    function resize() {
      const dpr = window.devicePixelRatio || 1
      const w = surface.clientWidth
      const h = surface.clientHeight
      surface.width = Math.floor(w * dpr)
      surface.height = Math.floor(h * dpr)
      g.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    function draw(now: number) {
      if (!start) start = now
      const t = ((now - start) % 7200) / 7200
      const w = surface.clientWidth
      const h = surface.clientHeight
      g.clearRect(0, 0, w, h)

      const wash = g.createLinearGradient(0, 0, w, h)
      wash.addColorStop(0, 'rgba(232, 236, 240, 0.35)')
      wash.addColorStop(0.55, 'rgba(214, 222, 228, 0.2)')
      wash.addColorStop(1, 'rgba(42, 107, 95, 0.12)')
      g.fillStyle = wash
      g.fillRect(0, 0, w, h)

      const reveal = easeInOut(Math.min(1, t < 0.45 ? t / 0.45 : 1))
      const settle = easeInOut(Math.min(1, t < 0.35 ? 0 : (t - 0.35) / 0.35))
      const holdFade = t > 0.85 ? (t - 0.85) / 0.15 : 0

      const scaledRough = scalePath(roughPath, w, h)
      const scaledClean = scalePath(cleanPath, w, h)

      g.save()
      g.globalAlpha = (1 - settle * 0.85) * (1 - holdFade)
      strokePartial(g, scaledRough, reveal, {
        color: '#5A5348',
        width: 2.6,
      })
      g.restore()

      g.save()
      g.globalAlpha = settle * (1 - holdFade * 0.4)
      strokePartial(g, scaledClean, Math.max(reveal, settle), {
        color: '#141618',
        width: 2.15,
      })
      g.restore()

      raf = requestAnimationFrame(draw)
    }

    resize()
    raf = requestAnimationFrame(draw)
    window.addEventListener('resize', resize)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return <canvas ref={canvasRef} className="hero__canvas" aria-hidden="true" />
}

function easeInOut(t: number) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
}

function buildGesturePath(): Point[] {
  const pts: Point[] = []
  const push = (x: number, y: number) => pts.push({ x, y })

  for (let a = -0.2; a < Math.PI * 1.6; a += 0.08) {
    push(0.62 + Math.cos(a) * 0.07, 0.28 + Math.sin(a) * 0.09)
  }
  for (let i = 0; i <= 18; i++) {
    const u = i / 18
    push(0.55 - u * 0.18 + Math.sin(u * 4) * 0.01, 0.36 + u * 0.12 + Math.cos(u * 3) * 0.008)
  }
  for (let i = 0; i <= 22; i++) {
    const u = i / 22
    push(0.38 + Math.sin(u * 2.2) * 0.02, 0.48 + u * 0.28)
  }
  for (let i = 0; i <= 16; i++) {
    const u = i / 16
    push(0.4 + u * 0.12, 0.76 + u * 0.1 + Math.sin(u * 5) * 0.006)
  }
  for (let i = 0; i <= 24; i++) {
    const u = i / 24
    push(0.52 + u * 0.18 + Math.sin(u * 3) * 0.015, 0.72 - u * 0.34)
  }

  return pts.map((p, i) => ({
    x: p.x + Math.sin(i * 1.7) * 0.004,
    y: p.y + Math.cos(i * 1.3) * 0.005,
  }))
}

function scalePath(points: Point[], w: number, h: number): Point[] {
  const padX = w * 0.08
  const padY = h * 0.1
  return points.map((p) => ({
    x: padX + p.x * (w - padX * 2),
    y: padY + p.y * (h - padY * 2),
  }))
}

function strokePartial(
  ctx: CanvasRenderingContext2D,
  points: Point[],
  amount: number,
  style: { color: string; width: number },
) {
  if (points.length < 2 || amount <= 0) return
  const count = Math.max(2, Math.floor(points.length * amount))
  ctx.beginPath()
  ctx.strokeStyle = style.color
  ctx.lineWidth = style.width
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.moveTo(points[0].x, points[0].y)
  for (let i = 1; i < count; i++) {
    ctx.lineTo(points[i].x, points[i].y)
  }
  ctx.stroke()
}
