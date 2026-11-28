import type { Point, Stroke } from './strokeCleanup'

export type LayoutSet = {
  /** Vanishing point for simple 1-pt perspective. */
  vp: Point
  /** Horizon y in canvas coords. */
  horizonY: number
  /** Floor baseline y (near plane). */
  floorY: number
  /** Left/right floor edge x at near plane. */
  floorLeft: number
  floorRight: number
}

export type CharacterPlacement = {
  strokes: Stroke[]
  /** Foot contact point in canvas space (pre-snap). */
  foot: Point
  /** Approx character height in px (for scale). */
  height: number
}

export type SnapProposal = {
  strokes: Stroke[]
  foot: Point
  /** Draft contact shadow ellipse. */
  shadow: { cx: number; cy: number; rx: number; ry: number }
  /** Scale applied around the foot. */
  scale: number
}

function transformPoint(p: Point, foot: Point, targetFoot: Point, scale: number): Point {
  return {
    x: targetFoot.x + (p.x - foot.x) * scale,
    y: targetFoot.y + (p.y - foot.y) * scale,
  }
}

/** Ground y along a vertical screen x, using simple 1-pt floor fan. */
export function groundYAtX(set: LayoutSet, x: number, depth = 0.55): number {
  // Lerp between near floor and a mid-depth floor line converging to VP.
  const t = Math.max(0.15, Math.min(0.9, depth))
  const nearY = set.floorY
  const farY = set.horizonY + (set.floorY - set.horizonY) * 0.35
  const baseY = nearY + (farY - nearY) * (1 - t)
  // Slight perspective bend toward VP.x
  const pull = (set.vp.x - x) * 0.02 * t
  return baseY + pull
}

/**
 * Client-side stand-in for layout / 3D snap:
 * plant feet on the ground plane, normalize scale vs depth, draft a contact shadow.
 */
export function proposeLayoutSnap(
  set: LayoutSet,
  character: CharacterPlacement,
  options?: { depth?: number; targetHeightRatio?: number },
): SnapProposal {
  const depth = options?.depth ?? 0.55
  const targetHeightRatio = options?.targetHeightRatio ?? 0.42
  const targetFoot: Point = {
    x: character.foot.x,
    y: groundYAtX(set, character.foot.x, depth),
  }

  const boardHeight = set.floorY - set.horizonY || 1
  const desiredHeight = boardHeight * targetHeightRatio
  const scale =
    character.height > 1 ? Math.max(0.55, Math.min(1.35, desiredHeight / character.height)) : 1

  const strokes = character.strokes.map((s) => ({
    ...s,
    id: `snap-${s.id}`,
    points: s.points.map((p) => transformPoint(p, character.foot, targetFoot, scale)),
  }))

  const shadow = {
    cx: targetFoot.x,
    cy: targetFoot.y + 2,
    rx: Math.max(18, character.height * scale * 0.22),
    ry: Math.max(6, character.height * scale * 0.06),
  }

  return { strokes, foot: targetFoot, shadow, scale }
}
