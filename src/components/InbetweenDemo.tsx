import { useEffect, useId, useRef, useState } from 'react'
import {
  draftAtTiming,
  proposeInbetweens,
} from '../lib/inbetween'
import { scaleSampleKeys } from '../lib/sampleKeys'
import type { Stroke } from '../lib/strokeCleanup'

type Phase = 'keys' | 'review' | 'accepted'

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
  keyA: Stroke[] | null,
  keyB: Stroke[] | null,
  draft: Stroke[] | null,
  phase: Phase,
  ghostKeys: boolean,
  timing: number,
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

  const showGhost = ghostKeys && (phase === 'review' || phase === 'accepted')

  if (phase === 'keys') {
    if (keyA) {
      drawStrokes(ctx, keyA, { color: '#6B6358', width: 2.4, alpha: 0.55 })
    }
    if (keyB) {
      drawStrokes(ctx, keyB, { color: '#2A6B5F', width: 2.4, alpha: 0.85 })
    }
    // Label cues
    ctx.save()
    ctx.font = '600 12px "IBM Plex Sans", sans-serif'
    ctx.fillStyle = '#5A636C'
    if (keyA) ctx.fillText('Key A', 16, 24)
    if (keyB) {
      ctx.fillStyle = '#2A6B5F'
      ctx.fillText('Key B', 16, 42)
    }
    ctx.restore()
    return
  }

  if (showGhost && keyA) {
    drawStrokes(ctx, keyA, { color: '#8A7F72', width: 1.6, alpha: 0.22 })
  }
  if (showGhost && keyB) {
    drawStrokes(ctx, keyB, { color: '#2A6B5F', width: 1.6, alpha: 0.22 })
  }

  if (draft) {
    drawStrokes(ctx, draft, {
      color: phase === 'accepted' ? '#0E1012' : '#1A3D38',
      width: 2.35,
      alpha: 1,
    })
  }

  ctx.save()
  ctx.font = '600 12px "IBM Plex Sans", sans-serif'
  ctx.fillStyle = '#5A636C'
  ctx.fillText(`t = ${timing.toFixed(2)}`, 16, 24)
  ctx.restore()
}

const LOOP_STEPS = [
  { id: 'keys', label: '1. Keys' },
  { id: 'propose', label: '2. Propose' },
  { id: 'scrub', label: '3. Scrub / compare' },
  { id: 'decide', label: '4. Accept / reject' },
]

export function InbetweenDemo() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const ghostId = useId()
  const timingId = useId()
  const boardSizeRef = useRef({ w: 640, h: 400 })

  const [keyA, setKeyA] = useState<Stroke[] | null>(null)
  const [keyB, setKeyB] = useState<Stroke[] | null>(null)
  const [frames, setFrames] = useState<Stroke[][] | null>(null)
  const [phase, setPhase] = useState<Phase>('keys')
  const [timing, setTiming] = useState(0.5)
  const [ghostKeys, setGhostKeys] = useState(true)
  const [frameIndex, setFrameIndex] = useState(0)
  const [status, setStatus] = useState(
    'Load sample keys A → B. You own the keys and timing; AI only drafts volumes between them.',
  )

  const draft =
    phase === 'keys' || !keyA || !keyB ? null : draftAtTiming(keyA, keyB, timing)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    boardSizeRef.current = { w: canvas.clientWidth, h: canvas.clientHeight }
    paintBoard(canvas, keyA, keyB, draft, phase, ghostKeys, timing)
  }, [keyA, keyB, draft, phase, ghostKeys, timing, frameIndex, frames])

  useEffect(() => {
    const onResize = () => {
      const canvas = canvasRef.current
      if (!canvas) return
      boardSizeRef.current = { w: canvas.clientWidth, h: canvas.clientHeight }
      paintBoard(canvas, keyA, keyB, draft, phase, ghostKeys, timing)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [keyA, keyB, draft, phase, ghostKeys, timing])

  function loadSampleKeys() {
    const canvas = canvasRef.current
    const w = canvas?.clientWidth || 640
    const h = canvas?.clientHeight || 400
    boardSizeRef.current = { w, h }
    const sample = scaleSampleKeys(w, h)
    setKeyA(sample.keyA)
    setKeyB(sample.keyB)
    setFrames(null)
    setPhase('keys')
    setTiming(0.5)
    setFrameIndex(0)
    setStatus('Sample keys loaded (arm rest → wave). Propose inbetween drafts next — keys stay locked.')
  }

  function proposeDrafts() {
    if (!keyA || !keyB) {
      setStatus('Load keys first — inbetweens need human Key A and Key B.')
      return
    }
    const next = proposeInbetweens(keyA, keyB, 5)
    setFrames(next)
    setFrameIndex(2)
    setTiming((2 + 1) / (5 + 1))
    setPhase('review')
    setStatus(
      'Five inbetween drafts proposed. Scrub timing or step frames, ghost the keys, then Accept or Reject.',
    )
  }

  function acceptDrafts() {
    if (!frames) return
    setPhase('accepted')
    setStatus(
      'Inbetween sheet accepted as draft volumes — not a finished shot. Keys and timing chart remain yours.',
    )
  }

  function rejectDrafts() {
    setFrames(null)
    setPhase('keys')
    setFrameIndex(0)
    setStatus('Inbetween proposal rejected. Keys unchanged — adjust timing intent, then propose again.')
  }

  function clearAll() {
    setKeyA(null)
    setKeyB(null)
    setFrames(null)
    setPhase('keys')
    setTiming(0.5)
    setFrameIndex(0)
    setStatus('Cleared. Load sample keys to start again.')
  }

  function onTimingChange(value: number) {
    setTiming(value)
    if (frames && frames.length > 0) {
      // Snap frame index to nearest proposed draft for stepping UI.
      const approx = Math.round(value * (frames.length + 1)) - 1
      setFrameIndex(Math.max(0, Math.min(frames.length - 1, approx)))
    }
  }

  function stepFrame(delta: number) {
    if (!frames || frames.length === 0) return
    const next = Math.max(0, Math.min(frames.length - 1, frameIndex + delta))
    setFrameIndex(next)
    setTiming((next + 1) / (frames.length + 1))
  }

  function loopStepState(stepId: string): 'active' | 'done' | 'idle' {
    if (stepId === 'keys') {
      if (phase === 'keys') return 'active'
      return keyA && keyB ? 'done' : 'idle'
    }
    if (stepId === 'propose') {
      if (phase === 'keys' && keyA && keyB) return 'active'
      if (phase === 'review' || phase === 'accepted') return 'done'
      return 'idle'
    }
    if (stepId === 'scrub') {
      if (phase === 'review') return 'active'
      if (phase === 'accepted') return 'done'
      return 'idle'
    }
    return phase === 'accepted' ? 'active' : phase === 'review' ? 'idle' : 'idle'
  }

  return (
    <div className="demo">
      <ol className="demo__loop" aria-label="Inbetween assist steps">
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

      <div className="demo__toolbar" role="toolbar" aria-label="Inbetween assist controls">
        {phase === 'keys' && (
          <>
            <button type="button" className="btn btn--primary" onClick={loadSampleKeys}>
              Load sample keys
            </button>
            <button
              type="button"
              className="btn"
              onClick={proposeDrafts}
              disabled={!keyA || !keyB}
            >
              Propose inbetweens
            </button>
          </>
        )}

        {phase === 'review' && (
          <>
            <button type="button" className="btn btn--primary" onClick={acceptDrafts}>
              Accept drafts
            </button>
            <button type="button" className="btn" onClick={rejectDrafts}>
              Reject
            </button>
            <button type="button" className="btn" onClick={() => stepFrame(-1)} disabled={frameIndex <= 0}>
              Prev
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => stepFrame(1)}
              disabled={!frames || frameIndex >= frames.length - 1}
            >
              Next
            </button>
            <label className="demo__ghost" htmlFor={ghostId}>
              <input
                id={ghostId}
                type="checkbox"
                checked={ghostKeys}
                onChange={(e) => setGhostKeys(e.target.checked)}
              />
              Ghost keys
            </label>
          </>
        )}

        {phase === 'accepted' && (
          <>
            <button type="button" className="btn btn--primary" onClick={proposeDrafts}>
              Re-propose
            </button>
            <button type="button" className="btn" onClick={clearAll}>
              Start over
            </button>
            <label className="demo__ghost" htmlFor={ghostId}>
              <input
                id={ghostId}
                type="checkbox"
                checked={ghostKeys}
                onChange={(e) => setGhostKeys(e.target.checked)}
              />
              Ghost keys
            </label>
          </>
        )}

        <div className="demo__spacer" />
        <button type="button" className="btn" onClick={clearAll} disabled={!keyA && !keyB}>
          Clear
        </button>
      </div>

      {(phase === 'review' || phase === 'accepted') && (
        <div className="demo__timing" role="group" aria-label="Timing chart">
          <label className="demo__timing-label" htmlFor={timingId}>
            Timing
          </label>
          <input
            id={timingId}
            className="demo__timing-slider"
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={timing}
            onChange={(e) => onTimingChange(Number(e.target.value))}
          />
          <span className="demo__timing-meta">
            {frames ? `Draft ${frameIndex + 1}/${frames.length}` : '—'} · Key A ← → Key B
          </span>
        </div>
      )}

      <canvas
        ref={canvasRef}
        className="demo__canvas demo__canvas--locked"
        aria-label="Inbetween assist board showing keys and draft volumes"
      />

      <p className="demo__status" role="status">
        {status}
      </p>
      <p className="demo__note">
        Local stroke interpolation stand-in for model-backed inbetweens. Keys and the timing
        chart stay human — AI only drafts the volumes between approved poses.
      </p>
    </div>
  )
}
