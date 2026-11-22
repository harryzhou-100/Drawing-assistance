import { useEffect, useId, useRef, useState } from 'react'
import { cleanupStrokes, type Point, type Stroke } from '../lib/strokeCleanup'

type Mode = 'rough' | 'clean'

function drawStrokes(
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

function paintBoard(
  canvas: HTMLCanvasElement,
  rough: Stroke[],
  clean: Stroke[] | null,
  mode: Mode,
  ghostRough: boolean,
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

  ctx.fillStyle = '#EEF1F4'
  ctx.fillRect(0, 0, w, h)
  const wash = ctx.createLinearGradient(0, 0, w, h)
  wash.addColorStop(0, 'rgba(255,255,255,0.35)')
  wash.addColorStop(1, 'rgba(42,107,95,0.06)')
  ctx.fillStyle = wash
  ctx.fillRect(0, 0, w, h)

  if (mode === 'rough' || (mode === 'clean' && ghostRough)) {
    drawStrokes(ctx, rough, {
      color: '#6B6358',
      width: mode === 'rough' ? 2.8 : 1.5,
      alpha: mode === 'rough' ? 0.9 : 0.28,
    })
  }
  if (mode === 'clean' && clean) {
    drawStrokes(ctx, clean, { color: '#0E1012', width: 2.35, alpha: 1 })
  }
}

export function LineCleanupDemo() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawingRef = useRef(false)
  const currentIdRef = useRef<string | null>(null)
  const labelId = useId()

  const [rough, setRough] = useState<Stroke[]>([])
  const [clean, setClean] = useState<Stroke[] | null>(null)
  const [mode, setMode] = useState<Mode>('rough')
  const [ghostRough, setGhostRough] = useState(true)
  const [status, setStatus] = useState('Draw a rough sketch, then run cleanup.')

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    paintBoard(canvas, rough, clean, mode, ghostRough)
  }, [rough, clean, mode, ghostRough])

  useEffect(() => {
    const onResize = () => {
      const canvas = canvasRef.current
      if (!canvas) return
      paintBoard(canvas, rough, clean, mode, ghostRough)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [rough, clean, mode, ghostRough])

  function pointerPos(e: React.PointerEvent<HTMLCanvasElement>): Point {
    const rect = e.currentTarget.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  function onPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    if (mode !== 'rough') {
      setMode('rough')
      setClean(null)
      setStatus('Back to rough — keep drawing, then clean up again.')
    }
    e.currentTarget.setPointerCapture(e.pointerId)
    drawingRef.current = true
    const id = crypto.randomUUID()
    currentIdRef.current = id
    const p = pointerPos(e)
    setRough((prev) => [...prev, { id, points: [p] }])
  }

  function onPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current || !currentIdRef.current) return
    const p = pointerPos(e)
    const id = currentIdRef.current
    setRough((prev) =>
      prev.map((s) => (s.id === id ? { ...s, points: [...s.points, p] } : s)),
    )
  }

  function onPointerUp() {
    drawingRef.current = false
    currentIdRef.current = null
  }

  function runCleanup() {
    if (rough.length === 0) {
      setStatus('Sketch a few strokes first.')
      return
    }
    const next = cleanupStrokes(rough)
    setClean(next)
    setMode('clean')
    setStatus(
      'Cleanup applied (local smoothing + path simplification). You still own every pixel — undo, redraw, or tweak.',
    )
  }

  function undoStroke() {
    setRough((prev) => prev.slice(0, -1))
    setClean(null)
    setMode('rough')
    setStatus('Last stroke removed.')
  }

  function clearAll() {
    setRough([])
    setClean(null)
    setMode('rough')
    setStatus('Board cleared. Draw something new.')
  }

  return (
    <div className="demo">
      <div className="demo__toolbar" role="toolbar" aria-label="Line cleanup controls">
        <button type="button" className="btn btn--primary" onClick={runCleanup}>
          Clean up lines
        </button>
        <button
          type="button"
          className={`btn ${mode === 'rough' ? 'btn--active' : ''}`}
          onClick={() => setMode('rough')}
          disabled={rough.length === 0}
        >
          Rough
        </button>
        <button
          type="button"
          className={`btn ${mode === 'clean' ? 'btn--active' : ''}`}
          onClick={() => clean && setMode('clean')}
          disabled={!clean}
        >
          Clean
        </button>
        <label className="demo__ghost" htmlFor={labelId}>
          <input
            id={labelId}
            type="checkbox"
            checked={ghostRough}
            onChange={(e) => setGhostRough(e.target.checked)}
          />
          Ghost rough under clean
        </label>
        <div className="demo__spacer" />
        <button type="button" className="btn" onClick={undoStroke} disabled={rough.length === 0}>
          Undo
        </button>
        <button type="button" className="btn" onClick={clearAll} disabled={rough.length === 0}>
          Clear
        </button>
      </div>

      <canvas
        ref={canvasRef}
        className="demo__canvas"
        aria-label="Drawing board for rough sketch cleanup"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      />

      <p className="demo__status" role="status">
        {status}
      </p>
      <p className="demo__note">
        Demo only — no cloud model yet. This stands in for structure-preserving cleanup
        (ControlNet / adapters) so you can feel the human-in-the-loop step.
      </p>
    </div>
  )
}
