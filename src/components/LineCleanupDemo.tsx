import { useEffect, useId, useRef, useState } from 'react'
import { cleanupStrokes, type Point, type Stroke } from '../lib/strokeCleanup'

type Phase = 'draw' | 'review' | 'accepted'

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
  proposed: Stroke[] | null,
  phase: Phase,
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

  const showRough =
    phase === 'draw' || ((phase === 'review' || phase === 'accepted') && ghostRough)
  const showProposed = (phase === 'review' || phase === 'accepted') && proposed

  if (showRough) {
    drawStrokes(ctx, rough, {
      color: '#6B6358',
      width: phase === 'draw' ? 2.8 : 1.5,
      alpha: phase === 'draw' ? 0.9 : 0.28,
    })
  }
  if (showProposed) {
    drawStrokes(ctx, proposed, {
      color: phase === 'accepted' ? '#0E1012' : '#1A3D38',
      width: phase === 'accepted' ? 2.35 : 2.2,
      alpha: 1,
    })
  }
}

const LOOP_STEPS: { id: Phase | 'propose'; label: string }[] = [
  { id: 'draw', label: '1. Draw rough' },
  { id: 'propose', label: '2. Propose layer' },
  { id: 'review', label: '3. Compare' },
  { id: 'accepted', label: '4. Accept / reject' },
]

export function LineCleanupDemo() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawingRef = useRef(false)
  const currentIdRef = useRef<string | null>(null)
  const ghostId = useId()

  const [rough, setRough] = useState<Stroke[]>([])
  const [proposed, setProposed] = useState<Stroke[] | null>(null)
  const [phase, setPhase] = useState<Phase>('draw')
  const [ghostRough, setGhostRough] = useState(true)
  const [status, setStatus] = useState(
    'Draw your rough first. AI will only propose a cleanup layer — you decide.',
  )

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    paintBoard(canvas, rough, proposed, phase, ghostRough)
  }, [rough, proposed, phase, ghostRough])

  useEffect(() => {
    const onResize = () => {
      const canvas = canvasRef.current
      if (!canvas) return
      paintBoard(canvas, rough, proposed, phase, ghostRough)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [rough, proposed, phase, ghostRough])

  function pointerPos(e: React.PointerEvent<HTMLCanvasElement>): Point {
    const rect = e.currentTarget.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  function onPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
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
    setProposed(next)
    setPhase('review')
    setStatus(
      'Cleanup proposed as a separate layer. Ghost your rough, then Accept or Reject.',
    )
  }

  function acceptProposal() {
    if (!proposed) return
    setPhase('accepted')
    setStatus(
      'Layer accepted. This is stage output — not a finished film. Keep editing or clear for another pass.',
    )
  }

  function rejectProposal() {
    setProposed(null)
    setPhase('draw')
    setStatus('Proposal rejected. Your rough is unchanged — redraw or propose again.')
  }

  function backToDraw() {
    setProposed(null)
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
    setProposed(null)
    setPhase('draw')
    setStatus('Board cleared. Draw a new rough.')
  }

  function loopStepActive(stepId: (typeof LOOP_STEPS)[number]['id']): boolean {
    if (stepId === 'draw') return phase === 'draw' && rough.length === 0
    if (stepId === 'propose') return phase === 'draw' && rough.length > 0
    if (stepId === 'review') return phase === 'review'
    return phase === 'accepted'
  }

  function loopStepDone(stepId: (typeof LOOP_STEPS)[number]['id']): boolean {
    if (stepId === 'draw') return rough.length > 0
    if (stepId === 'propose') return phase === 'review' || phase === 'accepted'
    if (stepId === 'review') return phase === 'accepted'
    return phase === 'accepted'
  }

  return (
    <div className="demo">
      <ol className="demo__loop" aria-label="Assist loop steps">
        {LOOP_STEPS.map((step) => {
          const active = loopStepActive(step.id)
          const done = loopStepDone(step.id)
          return (
            <li
              key={step.id}
              className={
                active
                  ? 'demo__loop-step demo__loop-step--active'
                  : done
                    ? 'demo__loop-step demo__loop-step--done'
                    : 'demo__loop-step'
              }
            >
              {step.label}
            </li>
          )
        })}
      </ol>

      <div className="demo__toolbar" role="toolbar" aria-label="Line cleanup assist controls">
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
            <button type="button" className="btn" onClick={undoStroke} disabled={rough.length === 0}>
              Undo stroke
            </button>
          </>
        )}

        {phase === 'review' && (
          <>
            <button type="button" className="btn btn--primary" onClick={acceptProposal}>
              Accept layer
            </button>
            <button type="button" className="btn" onClick={rejectProposal}>
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
            <button type="button" className="btn btn--primary" onClick={backToDraw}>
              Edit rough again
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

        <div className="demo__spacer" />
        <button
          type="button"
          className="btn"
          onClick={clearAll}
          disabled={rough.length === 0 && !proposed}
        >
          Clear
        </button>
      </div>

      <canvas
        ref={canvasRef}
        className={`demo__canvas${phase === 'draw' ? '' : ' demo__canvas--locked'}`}
        aria-label={
          phase === 'draw'
            ? 'Drawing board — draw your rough sketch'
            : phase === 'review'
              ? 'Review board — compare proposed cleanup to rough'
              : 'Accepted cleanup layer'
        }
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      />

      <p className="demo__status" role="status">
        {status}
      </p>
      <p className="demo__note">
        Local geometry stand-in for model-backed cleanup. The product point is the loop:
        your rough stays sacred until you accept a proposed layer.
      </p>
    </div>
  )
}
