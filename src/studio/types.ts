import type { Stroke } from '../lib/strokeCleanup'

export type StudioFrame = {
  id: string
  /** Rough / working strokes the artist draws. */
  strokes: Stroke[]
  /** Optional accepted cleanup layer. */
  cleaned: Stroke[] | null
  /** Artist-marked keyframe for inbetween assist. */
  isKey: boolean
}

export type StudioProject = {
  name: string
  fps: number
  frames: StudioFrame[]
  activeIndex: number
}
