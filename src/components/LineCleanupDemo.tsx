import { useEffect, useId, useRef, useState } from 'react'
import {
  DEFAULT_PALETTE,
  lockPaletteOntoRegions,
  proposeFlats,
  reassignRegion,
  regionAtPoint,
  swatchColor,
  type FlatRegion,
  type PaletteSwatch,
} from '../lib/flatting'
import { scaleSampleFrame2, scaleSampleToCanvas } from '../lib/sampleCleanup'
import { cleanupStrokes, type Point, type Stroke } from '../lib/strokeCleanup'

type Phase = 'draw' | 'review' | 'accepted' | 'flat_review' | 'flat_accepted'

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

function drawFlats(
  ctx: CanvasRenderingContext2D,
  regions: FlatRegion[],
  palette: PaletteSwatch[],
  width: number,
  height: number,
  selectedId: string | null,
) {
  const img = ctx.createImageData(width, height)
  const { data } = img
  for (const region of regions) {
    const hex = swatchColor(palette, region.swatchId)
    const r = Number.parseInt(hex.slice(1, 3), 16)
    const g = Number.parseInt(hex.slice(3, 5), 16)
    const b = Number.parseInt(hex.slice(5, 7), 16)
    const emphasize = selectedId === region.id
    const alpha = emphasize ? 220 : 180
    for (let i = 0; i < region.mask.length; i++) {
      if (region.mask[i] !== 1) continue
      const o = i * 4
      data[o] = r
      data[o + 1] = g
      data[o + 2] = b
      data[o + 3] = alpha
    }
  }
  ctx.putImageData(img, 0, 0)

  if (selectedId) {
    const selected = regions.find((r) => r.id === selectedId)
    if (selected) {
      ctx.save()
      ctx.strokeStyle = '#0E1012'
      ctx.lineWidth = 2
      ctx.setLineDash([4, 3])
      ctx.beginPath()
      ctx.arc(selected.cx, selected.cy, 10, 0, Math.PI * 2)
      ctx.stroke()
      ctx.restore()
    }
  }
}

function paintBoard(
  canvas: HTMLCanvasElement,
  rough: Stroke[],
  lineArt: Stroke[] | null,
  flats: FlatRegion[] | null,
  palette: PaletteSwatch[],
  phase: Phase,
  ghostRough: boolean,
  selectedFlatId: string | null,
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

  const inFlat = phase === 'flat_review' || phase === 'flat_accepted'
  const showRough =
    phase === 'draw' ||
    ((phase === 'review' || phase === 'accepted') && ghostRough)

  if (inFlat && flats && flats.length > 0) {
    // Flats are in CSS pixel space matching clientWidth/Height.
    const flatCanvas = document.createElement('canvas')
    flatCanvas.width = w
    flatCanvas.height = h
    const fctx = flatCanvas.getContext('2d')
    if (fctx) {
      drawFlats(fctx, flats, palette, w, h, phase === 'flat_review' ? selectedFlatId : null)
      ctx.drawImage(flatCanvas, 0, 0)
    }
  }

  if (showRough) {
    drawStrokes(ctx, rough, {
      color: '#6B6358',
      width: phase === 'draw' ? 2.8 : 1.5,
      alpha: phase === 'draw' ? 0.9 : 0.28,
    })
  }

  if (lineArt && phase !== 'draw') {
    drawStrokes(ctx, lineArt, {
      color: phase === 'review' ? '#1A3D38' : '#0E1012',
      width: inFlat ? 2.1 : phase === 'accepted' ? 2.35 : 2.2,
      alpha: 1,
    })
  }
}

function paintLockPreview(
  canvas: HTMLCanvasElement,
  strokes: Stroke[],
  flats: FlatRegion[],
  palette: PaletteSwatch[],
) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const dpr = window.devicePixelRatio || 1
  const w = canvas.clientWidth
  const h = canvas.clientHeight
  canvas.width = Math.floor(w * dpr)
  canvas.height = Math.floor(h * dpr)
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, w, h)
  ctx.fillStyle = '#E8ECF0'
  ctx.fillRect(0, 0, w, h)

  if (flats.length > 0) {
    const flatCanvas = document.createElement('canvas')
    flatCanvas.width = w
    flatCanvas.height = h
    const fctx = flatCanvas.getContext('2d')
    if (fctx) {
      drawFlats(fctx, flats, palette, w, h, null)
      ctx.drawImage(flatCanvas, 0, 0)
    }
  }
  drawStrokes(ctx, strokes, { color: '#0E1012', width: 1.8, alpha: 1 })
}

const LOOP_STEPS: { id: string; label: string }[] = [
  { id: 'draw', label: '1. Rough' },
  { id: 'cleanup', label: '2. Cleanup' },
  { id: 'flats', label: '3. Flats' },
  { id: 'lock', label: '4. Palette lock' },
]

export function LineCleanupDemo() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const lockCanvasRef = useRef<HTMLCanvasElement>(null)
  const drawingRef = useRef(false)
  const currentIdRef = useRef<string | null>(null)
  const boardSizeRef = useRef({ w: 640, h: 400 })
  const ghostId = useId()

  const [rough, setRough] = useState<Stroke[]>([])
  const [lineArt, setLineArt] = useState<Stroke[] | null>(null)
  const [phase, setPhase] = useState<Phase>('draw')
  const [ghostRough, setGhostRough] = useState(true)
  const [palette] = useState<PaletteSwatch[]>(DEFAULT_PALETTE)
  const [flats, setFlats] = useState<FlatRegion[] | null>(null)
  const [selectedFlatId, setSelectedFlatId] = useState<string | null>(null)
  const [frame2, setFrame2] = useState<{ strokes: Stroke[]; flats: FlatRegion[] } | null>(
    null,
  )
  const [status, setStatus] = useState(
    'Draw a rough, or load a sample cleaned frame to jump into flatting.',
  )

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    boardSizeRef.current = { w: canvas.clientWidth, h: canvas.clientHeight }
    paintBoard(
      canvas,
      rough,
      lineArt,
      flats,
      palette,
      phase,
      ghostRough,
      selectedFlatId,
    )
  }, [rough, lineArt, flats, palette, phase, ghostRough, selectedFlatId])

  useEffect(() => {
    const canvas = lockCanvasRef.current
    if (!canvas || !frame2) return
    paintLockPreview(canvas, frame2.strokes, frame2.flats, palette)
  }, [frame2, palette])

  useEffect(() => {
    const onResize = () => {
      const canvas = canvasRef.current
      if (!canvas) return
      boardSizeRef.current = { w: canvas.clientWidth, h: canvas.clientHeight }
      paintBoard(
        canvas,
        rough,
        lineArt,
        flats,
        palette,
        phase,
        ghostRough,
        selectedFlatId,
      )
      if (lockCanvasRef.current && frame2) {
        paintLockPreview(lockCanvasRef.current, frame2.strokes, frame2.flats, palette)
      }
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [rough, lineArt, flats, palette, phase, ghostRough, selectedFlatId, frame2])

  function pointerPos(e: React.PointerEvent<HTMLCanvasElement>): Point {
    const rect = e.currentTarget.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  function onPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    if (phase === 'flat_review') {
      const p = pointerPos(e)
      const { w } = boardSizeRef.current
      if (!flats) return
      const hit = regionAtPoint(flats, p.x, p.y, w)
      setSelectedFlatId(hit?.id ?? null)
      setStatus(
        hit
          ? `Selected ${palette.find((s) => s.id === hit.swatchId)?.name ?? 'region'}. Click a locked swatch to reassign.`
          : 'Click a flat region, then a palette swatch to reassign within the lock.',
      )
      return
    }

    if (phase !== 'draw') return
    e.currentTarget.setPointerCapture(e.pointerId)
    drawingRef.current = true
    const id = crypto.randomUUID()
    currentIdRef.current = id
    const p = pointerPos(e)
    setRough((prev) => [...prev, { id, points: [p] }])
  }

  function onPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (phase !== 'draw' || !drawingRef.current || !currentIdRef.current) return
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

  function proposeCleanup() {
    if (rough.length === 0) {
      setStatus('Sketch a few strokes first — the assist needs your rough.')
      return
    }
    const next = cleanupStrokes(rough)
    setLineArt(next)
    setFlats(null)
    setFrame2(null)
    setPhase('review')
    setStatus('Cleanup proposed as a separate layer. Ghost your rough, then Accept or Reject.')
  }

  function acceptCleanup() {
    if (!lineArt) return
    setPhase('accepted')
    setStatus(
      'Cleanup accepted. Next: Propose flats on this line art, or load a sample with closed regions.',
    )
  }

  function rejectCleanup() {
    setLineArt(null)
    setPhase('draw')
    setStatus('Cleanup rejected. Your rough is unchanged — redraw or propose again.')
  }

  function loadSampleCleanup() {
    const canvas = canvasRef.current
    const w = canvas?.clientWidth || 640
    const h = canvas?.clientHeight || 400
    boardSizeRef.current = { w, h }
    const sample = scaleSampleToCanvas(w, h)
    setRough([])
    setLineArt(sample)
    setFlats(null)
    setFrame2(null)
    setSelectedFlatId(null)
    setPhase('accepted')
    setStatus(
      'Sample cleaned frame loaded (closed hair / skin / cloth / accent). Propose flats next.',
    )
  }

  function runProposeFlats(strokes: Stroke[]) {
    const canvas = canvasRef.current
    const w = canvas?.clientWidth || boardSizeRef.current.w
    const h = canvas?.clientHeight || boardSizeRef.current.h
    boardSizeRef.current = { w, h }
    const regions = proposeFlats(strokes, w, h, palette)
    if (regions.length === 0) {
      setStatus(
        'No enclosed regions found. Draw closed shapes, or load the sample cleaned frame.',
      )
      return false
    }
    setFlats(regions)
    setSelectedFlatId(regions[0]?.id ?? null)
    setFrame2(null)
    setPhase('flat_review')
    setStatus(
      `Proposed ${regions.length} flat region${regions.length === 1 ? '' : 's'} from the locked palette. Reassign with swatches, then Accept or Reject.`,
    )
    return true
  }

  function proposeFlatLayer() {
    if (!lineArt) {
      setStatus('Accept a cleanup layer or load a sample first.')
      return
    }
    runProposeFlats(lineArt)
  }

  function acceptFlats() {
    if (!flats || !lineArt) return
    const canvas = canvasRef.current
    const w = canvas?.clientWidth || boardSizeRef.current.w
    const h = canvas?.clientHeight || boardSizeRef.current.h
    const strokes2 = scaleSampleFrame2(w, h)
    const regions2 = proposeFlats(strokes2, w, h, palette)
    const locked = lockPaletteOntoRegions(flats, regions2)
    setFrame2({ strokes: strokes2, flats: locked })
    setPhase('flat_accepted')
    setSelectedFlatId(null)
    setStatus(
      'Flats accepted. Frame 2 preview inherits the same palette lock by region rank — continuity without re-picking colors.',
    )
  }

  function rejectFlats() {
    setFlats(null)
    setSelectedFlatId(null)
    setFrame2(null)
    setPhase('accepted')
    setStatus('Flat proposal rejected. Cleanup layer unchanged — propose flats again anytime.')
  }

  function applySwatch(swatchId: string) {
    if (phase !== 'flat_review' || !flats || !selectedFlatId) {
      setStatus('Select a flat region on the canvas first, then pick a locked swatch.')
      return
    }
    setFlats(reassignRegion(flats, selectedFlatId, swatchId, palette))
    const name = palette.find((s) => s.id === swatchId)?.name ?? swatchId
    setStatus(`Reassigned region to ${name} (still inside the locked palette).`)
  }

  function backToDraw() {
    setLineArt(null)
    setFlats(null)
    setFrame2(null)
    setSelectedFlatId(null)
    setPhase('draw')
    setStatus('Back to rough. Draw more, then propose cleanup again.')
  }

  function undoStroke() {
    if (phase !== 'draw') return
    setRough((prev) => prev.slice(0, -1))
    setStatus('Last stroke removed.')
  }

  function clearAll() {
    setRough([])
    setLineArt(null)
    setFlats(null)
    setFrame2(null)
    setSelectedFlatId(null)
    setPhase('draw')
    setStatus('Board cleared. Draw a new rough or load a sample.')
  }

  function loopStepState(stepId: string): 'active' | 'done' | 'idle' {
    if (stepId === 'draw') {
      if (phase === 'draw') return 'active'
      return rough.length > 0 || lineArt ? 'done' : 'idle'
    }
    if (stepId === 'cleanup') {
      if (phase === 'review' || phase === 'accepted') return 'active'
      if (phase === 'flat_review' || phase === 'flat_accepted') return 'done'
      return 'idle'
    }
    if (stepId === 'flats') {
      if (phase === 'flat_review') return 'active'
      if (phase === 'flat_accepted') return 'done'
      return 'idle'
    }
    return phase === 'flat_accepted' ? 'active' : 'idle'
  }

  return (
    <div className="demo">
      <ol className="demo__loop" aria-label="Pipeline assist steps">
        {LOOP_STEPS.map((step) => {
          const state = loopStepState(step.id)
          return (
            <li
              key={step.id}
              className={
                state === 'active'
                  ? 'demo__loop-step demo__loop-step--active'
                  : state === 'done'
                    ? 'demo__loop-step demo__loop-step--done'
                    : 'demo__loop-step'
              }
            >
              {step.label}
            </li>
          )
        })}
      </ol>

      <div className="demo__toolbar" role="toolbar" aria-label="Pipeline assist controls">
        {phase === 'draw' && (
          <>
            <button
              type="button"
              className="btn btn--primary"
              onClick={proposeCleanup}
              disabled={rough.length === 0}
            >
              Propose cleanup
            </button>
            <button type="button" className="btn" onClick={loadSampleCleanup}>
              Load sample cleanup
            </button>
            <button type="button" className="btn" onClick={undoStroke} disabled={rough.length === 0}>
              Undo stroke
            </button>
          </>
        )}

        {phase === 'review' && (
          <>
            <button type="button" className="btn btn--primary" onClick={acceptCleanup}>
              Accept cleanup
            </button>
            <button type="button" className="btn" onClick={rejectCleanup}>
              Reject
            </button>
            <label className="demo__ghost" htmlFor={ghostId}>
              <input
                id={ghostId}
                type="checkbox"
                checked={ghostRough}
                onChange={(e) => setGhostRough(e.target.checked)}
              />
              Ghost rough
            </label>
          </>
        )}

        {phase === 'accepted' && (
          <>
            <button type="button" className="btn btn--primary" onClick={proposeFlatLayer}>
              Propose flats
            </button>
            <button type="button" className="btn" onClick={loadSampleCleanup}>
              Load sample cleanup
            </button>
            <button type="button" className="btn" onClick={backToDraw}>
              Edit rough again
            </button>
          </>
        )}

        {phase === 'flat_review' && (
          <>
            <button type="button" className="btn btn--primary" onClick={acceptFlats}>
              Accept flats
            </button>
            <button type="button" className="btn" onClick={rejectFlats}>
              Reject
            </button>
          </>
        )}

        {phase === 'flat_accepted' && (
          <>
            <button type="button" className="btn btn--primary" onClick={proposeFlatLayer}>
              Re-propose flats
            </button>
            <button type="button" className="btn" onClick={backToDraw}>
              Start over
            </button>
          </>
        )}

        <div className="demo__spacer" />
        <button
          type="button"
          className="btn"
          onClick={clearAll}
          disabled={rough.length === 0 && !lineArt}
        >
          Clear
        </button>
      </div>

      {(phase === 'flat_review' || phase === 'flat_accepted') && (
        <div className="demo__palette" role="group" aria-label="Locked character palette">
          <span className="demo__palette-label">Locked palette</span>
          {palette.map((swatch) => (
            <button
              key={swatch.id}
              type="button"
              className="demo__swatch"
              style={{ ['--swatch' as string]: swatch.color }}
              onClick={() => applySwatch(swatch.id)}
              disabled={phase !== 'flat_review' || !selectedFlatId}
              title={
                phase === 'flat_review'
                  ? `Assign ${swatch.name}`
                  : `${swatch.name} (locked after accept)`
              }
            >
              <span className="demo__swatch-chip" aria-hidden="true" />
              {swatch.name}
            </button>
          ))}
        </div>
      )}

      <div className={`demo__stage${frame2 ? ' demo__stage--split' : ''}`}>
        <canvas
          ref={canvasRef}
          className={`demo__canvas${phase === 'draw' || phase === 'flat_review' ? '' : ' demo__canvas--locked'}`}
          aria-label={
            phase === 'draw'
              ? 'Drawing board — draw your rough sketch'
              : phase === 'flat_review'
                ? 'Flat review — click a region, then a palette swatch'
                : 'Pipeline assist board'
          }
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        />
        {frame2 && (
          <div className="demo__lock-pane">
            <p className="demo__lock-label">Frame 2 · palette lock</p>
            <canvas
              ref={lockCanvasRef}
              className="demo__canvas demo__canvas--lock"
              aria-label="Second frame with locked palette applied"
            />
          </div>
        )}
      </div>

      <p className="demo__status" role="status">
        {status}
      </p>
      <p className="demo__note">
        Local stand-ins for cleanup + flood-fill flatting. Same assist loop: propose a layer,
        compare, accept or reject — palette stays locked across frames once you accept.
      </p>
    </div>
  )
}
