import { useEffect, useId, useRef, useState } from 'react'
import {
  proposeLayoutSnap,
  type CharacterPlacement,
  type LayoutSet,
  type SnapProposal,
} from '../lib/layoutSnap'
import {
  buildFloatingCharacter,
  buildSampleSet,
  buildSetStrokes,
} from '../lib/sampleLayout'
import type { Stroke } from '../lib/strokeCleanup'

type Phase = 'layout' | 'review' | 'accepted'

function drawStrokes(
  ctx: CanvasRenderingContext2D,
  strokes: Stroke[],
  style: { color: string; width: number; alpha: number; dash?: number[] },
) {
  ctx.save()
  ctx.strokeStyle = style.color
  ctx.lineWidth = style.width
  ctx.globalAlpha = style.alpha
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  if (style.dash) ctx.setLineDash(style.dash)
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

function drawShadow(
  ctx: CanvasRenderingContext2D,
  shadow: SnapProposal['shadow'],
  alpha: number,
) {
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.fillStyle = 'rgba(20, 22, 24, 0.35)'
  ctx.beginPath()
  ctx.ellipse(shadow.cx, shadow.cy, shadow.rx, shadow.ry, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

function paintBoard(
  canvas: HTMLCanvasElement,
  set: LayoutSet | null,
  setStrokes: Stroke[],
  character: CharacterPlacement | null,
  proposal: SnapProposal | null,
  phase: Phase,
  ghostOriginal: boolean,
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
  wash.addColorStop(0, 'rgba(255,255,255,0.4)')
  wash.addColorStop(0.45, 'rgba(214,222,228,0.25)')
  wash.addColorStop(1, 'rgba(42,107,95,0.08)')
  ctx.fillStyle = wash
  ctx.fillRect(0, 0, w, h)

  if (setStrokes.length > 0) {
    drawStrokes(ctx, setStrokes, {
      color: '#7A8692',
      width: 1.35,
      alpha: 0.75,
      dash: [5, 4],
    })
  }

  if (set) {
    ctx.save()
    ctx.fillStyle = '#2A6B5F'
    ctx.beginPath()
    ctx.arc(set.vp.x, set.vp.y, 3.5, 0, Math.PI * 2)
    ctx.fill()
    ctx.font = '600 11px "IBM Plex Sans", sans-serif'
    ctx.fillStyle = '#5A636C'
    ctx.fillText('VP', set.vp.x + 8, set.vp.y - 6)
    ctx.restore()
  }

  const showGhost =
    ghostOriginal && character && (phase === 'review' || phase === 'accepted')
  if (showGhost) {
    drawStrokes(ctx, character.strokes, { color: '#8A7F72', width: 1.7, alpha: 0.28 })
  }

  if (phase === 'layout' && character) {
    drawStrokes(ctx, character.strokes, { color: '#5A5348', width: 2.4, alpha: 0.95 })
    ctx.save()
    ctx.font = '600 12px "IBM Plex Sans", sans-serif'
    ctx.fillStyle = '#C45C3A'
    ctx.fillText('Floating rough (needs snap)', character.foot.x - 40, character.foot.y - 12)
    ctx.restore()
  }

  if ((phase === 'review' || phase === 'accepted') && proposal) {
    drawShadow(ctx, proposal.shadow, phase === 'accepted' ? 0.45 : 0.35)
    drawStrokes(ctx, proposal.strokes, {
      color: phase === 'accepted' ? '#0E1012' : '#1A3D38',
      width: 2.35,
      alpha: 1,
    })
  }
}

const LOOP_STEPS = [
  { id: 'layout', label: '1. Layout' },
  { id: 'propose', label: '2. Propose snap' },
  { id: 'compare', label: '3. Compare' },
  { id: 'decide', label: '4. Accept / reject' },
]

export function LayoutSnapDemo() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const ghostId = useId()

  const [set, setSet] = useState<LayoutSet | null>(null)
  const [setStrokes, setSetStrokes] = useState<Stroke[]>([])
  const [character, setCharacter] = useState<CharacterPlacement | null>(null)
  const [proposal, setProposal] = useState<SnapProposal | null>(null)
  const [phase, setPhase] = useState<Phase>('layout')
  const [ghostOriginal, setGhostOriginal] = useState(true)
  const [status, setStatus] = useState(
    'Load a sample set + floating rough. You own camera and staging; AI only proposes a ground-plane snap.',
  )

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    paintBoard(canvas, set, setStrokes, character, proposal, phase, ghostOriginal)
  }, [set, setStrokes, character, proposal, phase, ghostOriginal])

  useEffect(() => {
    const onResize = () => {
      const canvas = canvasRef.current
      if (!canvas) return
      paintBoard(canvas, set, setStrokes, character, proposal, phase, ghostOriginal)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [set, setStrokes, character, proposal, phase, ghostOriginal])

  function loadSampleLayout() {
    const canvas = canvasRef.current
    const w = canvas?.clientWidth || 640
    const h = canvas?.clientHeight || 400
    const nextSet = buildSampleSet(w, h)
    const nextChar = buildFloatingCharacter(w, h)
    setSet(nextSet)
    setSetStrokes(buildSetStrokes(nextSet))
    setCharacter(nextChar)
    setProposal(null)
    setPhase('layout')
    setStatus(
      'Sample layout loaded: 1-pt set + floating rough. Propose snap to plant feet and draft contact shadow.',
    )
  }

  function proposeSnap() {
    if (!set || !character) {
      setStatus('Load a sample layout first — snap needs a set and a rough.')
      return
    }
    const next = proposeLayoutSnap(set, character)
    setProposal(next)
    setPhase('review')
    setStatus(
      `Snap proposed (scale ×${next.scale.toFixed(2)}). Ghost the original placement, then Accept or Reject.`,
    )
  }

  function acceptSnap() {
    if (!proposal) return
    setPhase('accepted')
    setStatus(
      'Snap accepted as a layout assist layer — staging and camera stay yours. Contact shadow is a draft only.',
    )
  }

  function rejectSnap() {
    setProposal(null)
    setPhase('layout')
    setStatus('Snap rejected. Floating rough unchanged — adjust staging, then propose again.')
  }

  function clearAll() {
    setSet(null)
    setSetStrokes([])
    setCharacter(null)
    setProposal(null)
    setPhase('layout')
    setStatus('Cleared. Load a sample layout to start again.')
  }

  function loopStepState(stepId: string): 'active' | 'done' | 'idle' {
    if (stepId === 'layout') {
      if (phase === 'layout') return 'active'
      return set ? 'done' : 'idle'
    }
    if (stepId === 'propose') {
      if (phase === 'layout' && set) return 'active'
      if (phase === 'review' || phase === 'accepted') return 'done'
      return 'idle'
    }
    if (stepId === 'compare') {
      if (phase === 'review') return 'active'
      if (phase === 'accepted') return 'done'
      return 'idle'
    }
    return phase === 'accepted' ? 'active' : 'idle'
  }

  return (
    <div className="demo">
      <ol className="demo__loop" aria-label="Layout snap assist steps">
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

      <div className="demo__toolbar" role="toolbar" aria-label="Layout snap controls">
        {phase === 'layout' && (
          <>
            <button type="button" className="btn btn--primary" onClick={loadSampleLayout}>
              Load sample layout
            </button>
            <button type="button" className="btn" onClick={proposeSnap} disabled={!set || !character}>
              Propose snap
            </button>
          </>
        )}

        {phase === 'review' && (
          <>
            <button type="button" className="btn btn--primary" onClick={acceptSnap}>
              Accept snap
            </button>
            <button type="button" className="btn" onClick={rejectSnap}>
              Reject
            </button>
            <label className="demo__ghost" htmlFor={ghostId}>
              <input
                id={ghostId}
                type="checkbox"
                checked={ghostOriginal}
                onChange={(e) => setGhostOriginal(e.target.checked)}
              />
              Ghost original
            </label>
          </>
        )}

        {phase === 'accepted' && (
          <>
            <button type="button" className="btn btn--primary" onClick={proposeSnap}>
              Re-propose snap
            </button>
            <button type="button" className="btn" onClick={clearAll}>
              Start over
            </button>
            <label className="demo__ghost" htmlFor={ghostId}>
              <input
                id={ghostId}
                type="checkbox"
                checked={ghostOriginal}
                onChange={(e) => setGhostOriginal(e.target.checked)}
              />
              Ghost original
            </label>
          </>
        )}

        <div className="demo__spacer" />
        <button type="button" className="btn" onClick={clearAll} disabled={!set && !character}>
          Clear
        </button>
      </div>

      <canvas
        ref={canvasRef}
        className="demo__canvas demo__canvas--locked"
        aria-label="Layout snap board with perspective set and character rough"
      />

      <p className="demo__status" role="status">
        {status}
      </p>
      <p className="demo__note">
        Local 1-pt perspective stand-in for layout / 3D snap. Camera and staging stay human —
        AI only proposes planting feet, scale, and a draft contact shadow.
      </p>
    </div>
  )
}
