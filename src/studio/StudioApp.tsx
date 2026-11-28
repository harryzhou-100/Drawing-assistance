import { useEffect, useId, useRef, useState } from 'react'
import { proposeInbetweens } from '../lib/inbetween'
import {
  clonePaintProposal,
  paletteFromPrompt,
  proposeRegionPaint,
  type PaintProposal,
} from '../lib/promptPaint'
import { cleanupStrokes, type Point, type Stroke } from '../lib/strokeCleanup'
import { frameDisplayStrokes, frameToPngBlob, paintStudioBoard } from './draw'
import type { StudioFrame, StudioTool } from './types'
import './studio.css'

type SpeechRec = {
  lang: string
  continuous: boolean
  interimResults: boolean
  start: () => void
  stop: () => void
  onresult: ((ev: { results: { [i: number]: { [j: number]: { transcript: string } } } }) => void) | null
  onerror: ((ev: { error: string }) => void) | null
  onend: (() => void) | null
}

function newFrame(partial?: Partial<StudioFrame>): StudioFrame {
  return {
    id: crypto.randomUUID(),
    strokes: [],
    cleaned: null,
    paints: [],
    isKey: false,
    ...partial,
  }
}

function cloneStrokes(strokes: Stroke[]): Stroke[] {
  return strokes.map((s) => ({
    id: crypto.randomUUID(),
    points: s.points.map((p) => ({ ...p })),
  }))
}

function cloneFrame(frame: StudioFrame): StudioFrame {
  return {
    id: frame.id,
    strokes: cloneStrokes(frame.strokes),
    cleaned: frame.cleaned ? cloneStrokes(frame.cleaned) : null,
    paints: frame.paints.map(clonePaintProposal),
    isKey: frame.isKey,
  }
}

export function StudioApp() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawingRef = useRef(false)
  const strokeIdRef = useRef<string | null>(null)
  const playTimerRef = useRef<number | null>(null)
  const recognitionRef = useRef<SpeechRec | null>(null)
  const onionId = useId()
  const ghostId = useId()
  const promptId = useId()

  const [frames, setFrames] = useState<StudioFrame[]>(() => [newFrame({ isKey: true })])
  const [activeIndex, setActiveIndex] = useState(0)
  const [tool, setTool] = useState<StudioTool>('draw')
  const [onionSkin, setOnionSkin] = useState(true)
  const [showCleaned, setShowCleaned] = useState(true)
  const [proposedCleanup, setProposedCleanup] = useState<Stroke[] | null>(null)
  const [proposedPaint, setProposedPaint] = useState<PaintProposal | null>(null)
  const [ghostRough, setGhostRough] = useState(true)
  const [playing, setPlaying] = useState(false)
  const [listening, setListening] = useState(false)
  const [fps, setFps] = useState(8)
  const [prompt, setPrompt] = useState(
    'paint this hair green with vivid highlights and soft shadows',
  )
  const [undoStack, setUndoStack] = useState<StudioFrame[][]>([])
  const [status, setStatus] = useState(
    'Draw closed line art, switch to Paint, click inside a region, speak or type a prompt, then Propose paint.',
  )

  const active = frames[activeIndex] ?? frames[0]

  function pushUndo() {
    setUndoStack((prev) => [...prev.slice(-29), frames.map(cloneFrame)])
  }

  function undo() {
    if (proposedPaint) {
      setProposedPaint(null)
      setStatus('Paint proposal discarded.')
      return
    }
    if (proposedCleanup) {
      setProposedCleanup(null)
      setStatus('Cleanup proposal discarded.')
      return
    }
    setUndoStack((prev) => {
      if (prev.length === 0) {
        setStatus('Nothing to undo.')
        return prev
      }
      const next = [...prev]
      const snapshot = next.pop()!
      setFrames(snapshot)
      setStatus('Undid last change.')
      return next
    })
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !active) return
    const prev = activeIndex > 0 ? frames[activeIndex - 1] : null
    const next = activeIndex < frames.length - 1 ? frames[activeIndex + 1] : null
    paintStudioBoard(canvas, {
      strokes: active.strokes,
      cleaned: active.cleaned,
      paints: active.paints,
      onionPrev: onionSkin && prev ? frameDisplayStrokes(prev.strokes, prev.cleaned) : null,
      onionNext: onionSkin && next ? frameDisplayStrokes(next.strokes, next.cleaned) : null,
      proposedCleanup,
      proposedPaint,
      ghostRough,
      showCleaned,
    })
  }, [
    frames,
    activeIndex,
    active,
    onionSkin,
    proposedCleanup,
    proposedPaint,
    ghostRough,
    showCleaned,
  ])

  useEffect(() => {
    const onResize = () => {
      const canvas = canvasRef.current
      if (!canvas || !active) return
      const prev = activeIndex > 0 ? frames[activeIndex - 1] : null
      const next = activeIndex < frames.length - 1 ? frames[activeIndex + 1] : null
      paintStudioBoard(canvas, {
        strokes: active.strokes,
        cleaned: active.cleaned,
        paints: active.paints,
        onionPrev: onionSkin && prev ? frameDisplayStrokes(prev.strokes, prev.cleaned) : null,
        onionNext: onionSkin && next ? frameDisplayStrokes(next.strokes, next.cleaned) : null,
        proposedCleanup,
        proposedPaint,
        ghostRough,
        showCleaned,
      })
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [
    frames,
    activeIndex,
    active,
    onionSkin,
    proposedCleanup,
    proposedPaint,
    ghostRough,
    showCleaned,
  ])

  useEffect(() => {
    if (!playing) {
      if (playTimerRef.current) window.clearInterval(playTimerRef.current)
      playTimerRef.current = null
      return
    }
    playTimerRef.current = window.setInterval(() => {
      setActiveIndex((i) => (i + 1) % Math.max(1, frames.length))
      setProposedCleanup(null)
      setProposedPaint(null)
    }, Math.max(40, 1000 / fps))
    return () => {
      if (playTimerRef.current) window.clearInterval(playTimerRef.current)
    }
  }, [playing, fps, frames.length])

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop()
    }
  }, [])

  function updateActive(mutator: (frame: StudioFrame) => StudioFrame) {
    setFrames((prev) => prev.map((f, i) => (i === activeIndex ? mutator(f) : f)))
  }

  function pointerPos(e: React.PointerEvent<HTMLCanvasElement>): Point {
    const rect = e.currentTarget.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  function onPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    if (playing || proposedCleanup) return

    if (tool === 'paint') {
      const canvas = canvasRef.current
      if (!canvas) return
      const p = pointerPos(e)
      const w = canvas.clientWidth
      const h = canvas.clientHeight
      const lines = frameDisplayStrokes(active.strokes, active.cleaned)
      if (lines.length === 0) {
        setStatus('Draw closed line art first, then click inside the region to paint.')
        return
      }
      const proposal = proposeRegionPaint(lines, w, h, p, prompt)
      if (!proposal) {
        setStatus(
          'Could not fill that click — close the shape (hair outline), click inside it, and try again.',
        )
        return
      }
      const pal = paletteFromPrompt(prompt)
      setProposedPaint(proposal)
      setStatus(
        `Paint proposed (${pal.name}, ${proposal.pixelCount} px). Accept, Reject, or Undo. Prompt: “${prompt}”`,
      )
      return
    }

    e.currentTarget.setPointerCapture(e.pointerId)
    drawingRef.current = true
    const id = crypto.randomUUID()
    strokeIdRef.current = id
    const p = pointerPos(e)
    pushUndo()
    updateActive((frame) => ({
      ...frame,
      cleaned: null,
      strokes: [...frame.strokes, { id, points: [p] }],
    }))
  }

  function onPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (tool !== 'draw' || !drawingRef.current || !strokeIdRef.current || proposedCleanup) return
    const p = pointerPos(e)
    const id = strokeIdRef.current
    updateActive((frame) => ({
      ...frame,
      strokes: frame.strokes.map((s) =>
        s.id === id ? { ...s, points: [...s.points, p] } : s,
      ),
    }))
  }

  function onPointerUp() {
    drawingRef.current = false
    strokeIdRef.current = null
  }

  function addFrameAfter() {
    setPlaying(false)
    setProposedCleanup(null)
    setProposedPaint(null)
    pushUndo()
    setFrames((prev) => {
      const next = [...prev]
      next.splice(activeIndex + 1, 0, newFrame())
      return next
    })
    setActiveIndex((i) => i + 1)
    setStatus('Blank frame added. Draw the next pose.')
  }

  function duplicateFrame() {
    setPlaying(false)
    setProposedCleanup(null)
    setProposedPaint(null)
    pushUndo()
    const copy = newFrame({
      strokes: cloneStrokes(active.strokes),
      cleaned: active.cleaned ? cloneStrokes(active.cleaned) : null,
      paints: active.paints.map(clonePaintProposal),
      isKey: false,
    })
    setFrames((prev) => {
      const next = [...prev]
      next.splice(activeIndex + 1, 0, copy)
      return next
    })
    setActiveIndex((i) => i + 1)
    setStatus('Frame duplicated.')
  }

  function deleteFrame() {
    if (frames.length <= 1) {
      setStatus('Need at least one frame.')
      return
    }
    setPlaying(false)
    setProposedCleanup(null)
    setProposedPaint(null)
    pushUndo()
    setFrames((prev) => prev.filter((_, i) => i !== activeIndex))
    setActiveIndex((i) => Math.max(0, Math.min(i, frames.length - 2)))
    setStatus('Frame deleted.')
  }

  function toggleKey() {
    pushUndo()
    updateActive((f) => ({ ...f, isKey: !f.isKey }))
    setStatus(active.isKey ? 'Key mark removed.' : 'Marked as key.')
  }

  function clearFrame() {
    pushUndo()
    setProposedCleanup(null)
    setProposedPaint(null)
    updateActive((f) => ({ ...f, strokes: [], cleaned: null, paints: [] }))
    setStatus('Frame cleared.')
  }

  function proposeCleanup() {
    if (active.strokes.length === 0) {
      setStatus('Draw something first, then propose cleanup.')
      return
    }
    setPlaying(false)
    setProposedPaint(null)
    setProposedCleanup(cleanupStrokes(active.strokes))
    setStatus('Cleanup proposed. Accept or Reject.')
  }

  function acceptCleanup() {
    if (!proposedCleanup) return
    pushUndo()
    updateActive((f) => ({ ...f, cleaned: proposedCleanup }))
    setProposedCleanup(null)
    setStatus('Cleanup accepted on this frame.')
  }

  function rejectCleanup() {
    setProposedCleanup(null)
    setStatus('Cleanup rejected.')
  }

  function acceptPaint() {
    if (!proposedPaint) return
    pushUndo()
    updateActive((f) => ({ ...f, paints: [...f.paints, proposedPaint] }))
    setProposedPaint(null)
    setStatus('Paint layer accepted. Undo anytime, or paint another region.')
  }

  function rejectPaint() {
    setProposedPaint(null)
    setStatus('Paint rejected — line art unchanged.')
  }

  function insertInbetweens() {
    const keyIndexes = frames
      .map((f, i) => (f.isKey ? i : -1))
      .filter((i) => i >= 0)
    if (keyIndexes.length < 2) {
      setStatus('Mark at least two keyframes, then Insert inbetweens.')
      return
    }

    let a = -1
    let b = -1
    for (let i = 0; i < keyIndexes.length - 1; i++) {
      if (keyIndexes[i] <= activeIndex && activeIndex <= keyIndexes[i + 1]) {
        a = keyIndexes[i]
        b = keyIndexes[i + 1]
        break
      }
    }
    if (a < 0) {
      a = keyIndexes[keyIndexes.length - 2]
      b = keyIndexes[keyIndexes.length - 1]
    }

    const keyA = frames[a]
    const keyB = frames[b]
    const sourceA = frameDisplayStrokes(keyA.strokes, keyA.cleaned)
    const sourceB = frameDisplayStrokes(keyB.strokes, keyB.cleaned)
    if (sourceA.length === 0 || sourceB.length === 0) {
      setStatus('Both keys need drawings before inbetweens can be drafted.')
      return
    }

    const drafts = proposeInbetweens(sourceA, sourceB, 3)
    const newFrames = drafts.map((strokes) =>
      newFrame({
        strokes: cloneStrokes(strokes),
        cleaned: null,
        paints: [],
        isKey: false,
      }),
    )

    setPlaying(false)
    setProposedCleanup(null)
    setProposedPaint(null)
    pushUndo()
    setFrames((prev) => {
      const next = [...prev]
      // Replace any frames currently between the keys, then insert drafts.
      const removeCount = Math.max(0, b - a - 1)
      next.splice(a + 1, removeCount, ...newFrames)
      return next
    })
    setActiveIndex(a + 1)
    setStatus(
      `Inserted ${newFrames.length} inbetween drafts between keys ${a + 1} and ${b + 1}.`,
    )
  }

  function startVoicePrompt() {
    const SR =
      (window as unknown as { SpeechRecognition?: new () => SpeechRec }).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: new () => SpeechRec })
        .webkitSpeechRecognition
    if (!SR) {
      setStatus('Voice input not supported in this browser — type the prompt instead.')
      return
    }
    if (listening) {
      recognitionRef.current?.stop()
      setListening(false)
      return
    }
    const rec = new SR()
    recognitionRef.current = rec
    rec.lang = 'en-US'
    rec.continuous = false
    rec.interimResults = false
    rec.onresult = (ev) => {
      const text = ev.results[0]?.[0]?.transcript?.trim()
      if (text) {
        setPrompt(text)
        setStatus(`Heard: “${text}”. Click inside a closed region to propose paint.`)
        setTool('paint')
      }
    }
    rec.onerror = (ev) => {
      setListening(false)
      setStatus(`Voice error: ${ev.error}. You can type the prompt instead.`)
    }
    rec.onend = () => setListening(false)
    setListening(true)
    setStatus('Listening… say e.g. “paint this hair green with vivid highlights”.')
    rec.start()
  }

  async function exportPngSequence() {
    setStatus('Exporting PNG sequence…')
    for (let i = 0; i < frames.length; i++) {
      const frame = frames[i]
      const blob = await frameToPngBlob(frame.strokes, frame.cleaned, frame.paints)
      if (!blob) continue
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `draftline-frame-${String(i + 1).padStart(3, '0')}.png`
      a.click()
      URL.revokeObjectURL(url)
      await new Promise((r) => setTimeout(r, 120))
    }
    setStatus(`Exported ${frames.length} PNG frame${frames.length === 1 ? '' : 's'}.`)
  }

  function goLanding() {
    window.location.hash = '#/'
  }

  const canvasLocked = Boolean(proposedCleanup || playing)

  return (
    <div className="studio">
      <header className="studio__top">
        <div className="studio__brand">
          <button type="button" className="studio__link" onClick={goLanding}>
            Draftline
          </button>
          <span className="studio__title">Studio</span>
        </div>
        <div className="studio__top-actions">
          <button
            type="button"
            className="btn"
            onClick={undo}
            disabled={undoStack.length === 0 && !proposedPaint && !proposedCleanup}
            title="Undo last change"
          >
            Undo
          </button>
          <label className="studio__fps">
            FPS
            <input
              type="number"
              min={1}
              max={24}
              value={fps}
              onChange={(e) => setFps(Math.max(1, Math.min(24, Number(e.target.value) || 8)))}
            />
          </label>
          <button
            type="button"
            className={`btn ${playing ? 'btn--active' : 'btn--primary'}`}
            onClick={() => {
              setProposedCleanup(null)
              setProposedPaint(null)
              setPlaying((p) => !p)
            }}
          >
            {playing ? 'Stop' : 'Play'}
          </button>
          <button type="button" className="btn" onClick={exportPngSequence}>
            Export PNGs
          </button>
        </div>
      </header>

      <div className="studio__body">
        <aside className="studio__rail" aria-label="Tools">
          <p className="studio__rail-label">Tool</p>
          <button
            type="button"
            className={`btn studio__tool${tool === 'draw' ? ' btn--active' : ''}`}
            onClick={() => {
              setTool('draw')
              setProposedPaint(null)
              setStatus('Draw mode — close shapes for paint fills (e.g. hair outline).')
            }}
          >
            Draw
          </button>
          <button
            type="button"
            className={`btn studio__tool${tool === 'paint' ? ' btn--active' : ''}`}
            onClick={() => {
              setTool('paint')
              setProposedCleanup(null)
              setStatus('Paint mode — click inside a closed region to propose vivid cel paint.')
            }}
          >
            Paint (prompt)
          </button>

          <p className="studio__rail-label">Voice / prompt</p>
          <textarea
            id={promptId}
            className="studio__prompt"
            rows={3}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder='e.g. "paint this hair green with vivid highlights"'
          />
          <button
            type="button"
            className={`btn studio__tool${listening ? ' btn--active' : ''}`}
            onClick={startVoicePrompt}
          >
            {listening ? 'Stop listening' : 'Voice prompt'}
          </button>

          {proposedPaint ? (
            <>
              <button type="button" className="btn btn--primary studio__tool" onClick={acceptPaint}>
                Accept paint
              </button>
              <button type="button" className="btn studio__tool" onClick={rejectPaint}>
                Reject paint
              </button>
            </>
          ) : null}

          <p className="studio__rail-label">Edit</p>
          <button type="button" className="btn studio__tool" onClick={undo}>
            Undo
          </button>
          <button type="button" className="btn studio__tool" onClick={clearFrame}>
            Clear frame
          </button>

          <p className="studio__rail-label">Assist</p>
          {!proposedCleanup ? (
            <button
              type="button"
              className="btn studio__tool"
              onClick={proposeCleanup}
              disabled={active.strokes.length === 0}
            >
              Propose cleanup
            </button>
          ) : (
            <>
              <button type="button" className="btn btn--primary studio__tool" onClick={acceptCleanup}>
                Accept cleanup
              </button>
              <button type="button" className="btn studio__tool" onClick={rejectCleanup}>
                Reject cleanup
              </button>
              <label className="studio__check" htmlFor={ghostId}>
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
          <button type="button" className="btn studio__tool" onClick={toggleKey}>
            {active?.isKey ? 'Unmark key' : 'Mark as key'}
          </button>
          <button type="button" className="btn studio__tool" onClick={insertInbetweens}>
            Insert inbetweens
          </button>

          <p className="studio__rail-label">View</p>
          <label className="studio__check" htmlFor={onionId}>
            <input
              id={onionId}
              type="checkbox"
              checked={onionSkin}
              onChange={(e) => setOnionSkin(e.target.checked)}
            />
            Onion skin
          </label>
          <label className="studio__check">
            <input
              type="checkbox"
              checked={showCleaned}
              onChange={(e) => setShowCleaned(e.target.checked)}
            />
            Prefer cleaned lines
          </label>
        </aside>

        <main className="studio__stage">
          <canvas
            ref={canvasRef}
            className={`studio__canvas${canvasLocked ? ' studio__canvas--locked' : ''}${
              tool === 'paint' ? ' studio__canvas--paint' : ''
            }`}
            aria-label="Animation drawing board"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          />
          <p className="studio__status" role="status">
            {status}
          </p>
        </main>
      </div>

      <footer className="studio__timeline" aria-label="Timeline">
        <div className="studio__timeline-tools">
          <button type="button" className="btn" onClick={addFrameAfter}>
            + Frame
          </button>
          <button type="button" className="btn" onClick={duplicateFrame}>
            Duplicate
          </button>
          <button type="button" className="btn" onClick={deleteFrame}>
            Delete
          </button>
          <span className="studio__frame-meta">
            Frame {activeIndex + 1} / {frames.length}
            {active?.isKey ? ' · KEY' : ''}
            {active?.paints.length ? ` · ${active.paints.length} paint` : ''}
          </span>
        </div>
        <div className="studio__strip" role="list">
          {frames.map((frame, i) => (
            <button
              key={frame.id}
              type="button"
              role="listitem"
              className={
                i === activeIndex
                  ? 'studio__cell studio__cell--active'
                  : frame.isKey
                    ? 'studio__cell studio__cell--key'
                    : 'studio__cell'
              }
              onClick={() => {
                setPlaying(false)
                setProposedCleanup(null)
                setProposedPaint(null)
                setActiveIndex(i)
              }}
            >
              <span className="studio__cell-num">{i + 1}</span>
              {frame.isKey && <span className="studio__cell-key">K</span>}
              <span className="studio__cell-dots" aria-hidden="true">
                {frame.strokes.length > 0 ? '●' : '○'}
                {frame.cleaned ? '+' : ''}
                {frame.paints.length > 0 ? '■' : ''}
              </span>
            </button>
          ))}
        </div>
      </footer>
    </div>
  )
}
