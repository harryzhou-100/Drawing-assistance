import { useEffect, useId, useRef, useState } from 'react'
import { proposeInbetweens } from '../lib/inbetween'
import { cleanupStrokes, type Point, type Stroke } from '../lib/strokeCleanup'
import { frameDisplayStrokes, frameToPngBlob, paintStudioBoard } from './draw'
import type { StudioFrame } from './types'
import './studio.css'

function newFrame(partial?: Partial<StudioFrame>): StudioFrame {
  return {
    id: crypto.randomUUID(),
    strokes: [],
    cleaned: null,
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

export function StudioApp() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawingRef = useRef(false)
  const strokeIdRef = useRef<string | null>(null)
  const playTimerRef = useRef<number | null>(null)
  const onionId = useId()
  const ghostId = useId()

  const [frames, setFrames] = useState<StudioFrame[]>(() => [newFrame({ isKey: true })])
  const [activeIndex, setActiveIndex] = useState(0)
  const [onionSkin, setOnionSkin] = useState(true)
  const [showCleaned, setShowCleaned] = useState(true)
  const [proposedCleanup, setProposedCleanup] = useState<Stroke[] | null>(null)
  const [ghostRough, setGhostRough] = useState(true)
  const [playing, setPlaying] = useState(false)
  const [fps, setFps] = useState(8)
  const [status, setStatus] = useState(
    'Draw on the tablet. Mark keys, propose cleanup, or insert inbetweens between two keys.',
  )

  const active = frames[activeIndex] ?? frames[0]

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !active) return
    const prev = activeIndex > 0 ? frames[activeIndex - 1] : null
    const next = activeIndex < frames.length - 1 ? frames[activeIndex + 1] : null
    paintStudioBoard(canvas, {
      strokes: active.strokes,
      cleaned: active.cleaned,
      onionPrev: onionSkin && prev ? frameDisplayStrokes(prev.strokes, prev.cleaned) : null,
      onionNext: onionSkin && next ? frameDisplayStrokes(next.strokes, next.cleaned) : null,
      proposedCleanup,
      ghostRough,
      showCleaned,
    })
  }, [frames, activeIndex, active, onionSkin, proposedCleanup, ghostRough, showCleaned])

  useEffect(() => {
    const onResize = () => {
      const canvas = canvasRef.current
      if (!canvas || !active) return
      const prev = activeIndex > 0 ? frames[activeIndex - 1] : null
      const next = activeIndex < frames.length - 1 ? frames[activeIndex + 1] : null
      paintStudioBoard(canvas, {
        strokes: active.strokes,
        cleaned: active.cleaned,
        onionPrev: onionSkin && prev ? frameDisplayStrokes(prev.strokes, prev.cleaned) : null,
        onionNext: onionSkin && next ? frameDisplayStrokes(next.strokes, next.cleaned) : null,
        proposedCleanup,
        ghostRough,
        showCleaned,
      })
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [frames, activeIndex, active, onionSkin, proposedCleanup, ghostRough, showCleaned])

  useEffect(() => {
    if (!playing) {
      if (playTimerRef.current) window.clearInterval(playTimerRef.current)
      playTimerRef.current = null
      return
    }
    playTimerRef.current = window.setInterval(() => {
      setActiveIndex((i) => (i + 1) % Math.max(1, frames.length))
      setProposedCleanup(null)
    }, Math.max(40, 1000 / fps))
    return () => {
      if (playTimerRef.current) window.clearInterval(playTimerRef.current)
    }
  }, [playing, fps, frames.length])

  function updateActive(mutator: (frame: StudioFrame) => StudioFrame) {
    setFrames((prev) => prev.map((f, i) => (i === activeIndex ? mutator(f) : f)))
  }

  function pointerPos(e: React.PointerEvent<HTMLCanvasElement>): Point {
    const rect = e.currentTarget.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  function onPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    if (playing || proposedCleanup) return
    e.currentTarget.setPointerCapture(e.pointerId)
    drawingRef.current = true
    const id = crypto.randomUUID()
    strokeIdRef.current = id
    const p = pointerPos(e)
    updateActive((frame) => ({
      ...frame,
      cleaned: null,
      strokes: [...frame.strokes, { id, points: [p] }],
    }))
  }

  function onPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current || !strokeIdRef.current || proposedCleanup) return
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
    const copy = newFrame({
      strokes: cloneStrokes(active.strokes),
      cleaned: active.cleaned ? cloneStrokes(active.cleaned) : null,
      isKey: false,
    })
    setFrames((prev) => {
      const next = [...prev]
      next.splice(activeIndex + 1, 0, copy)
      return next
    })
    setActiveIndex((i) => i + 1)
    setStatus('Frame duplicated. Tweak the pose or mark it as a key.')
  }

  function deleteFrame() {
    if (frames.length <= 1) {
      setStatus('Need at least one frame.')
      return
    }
    setPlaying(false)
    setProposedCleanup(null)
    setFrames((prev) => prev.filter((_, i) => i !== activeIndex))
    setActiveIndex((i) => Math.max(0, Math.min(i, frames.length - 2)))
    setStatus('Frame deleted.')
  }

  function toggleKey() {
    updateActive((f) => ({ ...f, isKey: !f.isKey }))
    setStatus(active.isKey ? 'Key mark removed.' : 'Marked as key — use Insert inbetweens between two keys.')
  }

  function undoStroke() {
    if (proposedCleanup) {
      setProposedCleanup(null)
      setStatus('Cleanup proposal dismissed.')
      return
    }
    updateActive((f) => ({
      ...f,
      cleaned: null,
      strokes: f.strokes.slice(0, -1),
    }))
  }

  function clearFrame() {
    setProposedCleanup(null)
    updateActive((f) => ({ ...f, strokes: [], cleaned: null }))
    setStatus('Frame cleared.')
  }

  function proposeCleanup() {
    if (active.strokes.length === 0) {
      setStatus('Draw something first, then propose cleanup.')
      return
    }
    setPlaying(false)
    setProposedCleanup(cleanupStrokes(active.strokes))
    setStatus('Cleanup proposed as a layer. Accept or Reject — your rough stays until you decide.')
  }

  function acceptCleanup() {
    if (!proposedCleanup) return
    updateActive((f) => ({ ...f, cleaned: proposedCleanup }))
    setProposedCleanup(null)
    setStatus('Cleanup accepted on this frame.')
  }

  function rejectCleanup() {
    setProposedCleanup(null)
    setStatus('Cleanup rejected. Rough unchanged.')
  }

  function insertInbetweens() {
    const keyIndexes = frames
      .map((f, i) => (f.isKey ? i : -1))
      .filter((i) => i >= 0)
    if (keyIndexes.length < 2) {
      setStatus(
        'Mark at least two keyframes (adjacent on the timeline), then Insert inbetweens.',
      )
      return
    }

    // Prefer the key pair that brackets the playhead; else the last complete pair.
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

    if (b !== a + 1) {
      setStatus(
        `Keys ${a + 1} and ${b + 1} need to be adjacent. Delete frames between them, then insert.`,
      )
      return
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
        isKey: false,
      }),
    )

    setPlaying(false)
    setProposedCleanup(null)
    setFrames((prev) => {
      const next = [...prev]
      next.splice(a + 1, 0, ...newFrames)
      return next
    })
    setActiveIndex(a + 1)
    setStatus(
      `Inserted ${newFrames.length} inbetween drafts between keys ${a + 1} and ${b + 1}. Scrub and edit — keys stay sacred.`,
    )
  }

  async function exportPngSequence() {
    setStatus('Exporting PNG sequence…')
    for (let i = 0; i < frames.length; i++) {
      const frame = frames[i]
      const blob = await frameToPngBlob(frame.strokes, frame.cleaned)
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
          <p className="studio__rail-label">Draw</p>
          <button type="button" className="btn studio__tool" onClick={undoStroke}>
            Undo stroke
          </button>
          <button type="button" className="btn studio__tool" onClick={clearFrame}>
            Clear frame
          </button>

          <p className="studio__rail-label">Assist</p>
          {!proposedCleanup ? (
            <button type="button" className="btn btn--primary studio__tool" onClick={proposeCleanup}>
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
            Show cleaned layer
          </label>
        </aside>

        <main className="studio__stage">
          <canvas
            ref={canvasRef}
            className={`studio__canvas${proposedCleanup || playing ? ' studio__canvas--locked' : ''}`}
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
                setActiveIndex(i)
              }}
            >
              <span className="studio__cell-num">{i + 1}</span>
              {frame.isKey && <span className="studio__cell-key">K</span>}
              <span className="studio__cell-dots" aria-hidden="true">
                {frame.strokes.length > 0 ? '●' : '○'}
                {frame.cleaned ? '+' : ''}
              </span>
            </button>
          ))}
        </div>
      </footer>
    </div>
  )
}
