import type { Point, Stroke } from './strokeCleanup'

export type CelPalette = {
  name: string
  base: [number, number, number]
  highlight: [number, number, number]
  shadow: [number, number, number]
}

export type PaintProposal = {
  id: string
  prompt: string
  width: number
  height: number
  /** RGBA pixels for the painted region only (transparent elsewhere). */
  rgba: Uint8ClampedArray
  pixelCount: number
}

const COLOR_TABLE: { keys: string[]; palette: CelPalette }[] = [
  {
    keys: ['green', 'teal', 'sage', 'mint', 'forest', 'emerald', 'jade'],
    palette: {
      // Tuned toward anime cel hair: dusty mid green, yellow-green sheen, cool shadow
      name: 'vivid green',
      base: [95, 145, 100],
      highlight: [210, 225, 125],
      shadow: [45, 75, 100],
    },
  },
  {
    keys: ['blue', 'navy', 'azure', 'cyan'],
    palette: {
      name: 'vivid blue',
      base: [90, 130, 175],
      highlight: [160, 200, 230],
      shadow: [40, 70, 110],
    },
  },
  {
    keys: ['red', 'crimson', 'scarlet', 'rose'],
    palette: {
      name: 'vivid red',
      base: [180, 85, 85],
      highlight: [230, 150, 140],
      shadow: [110, 45, 55],
    },
  },
  {
    keys: ['pink', 'magenta', 'blush'],
    palette: {
      name: 'vivid pink',
      base: [210, 130, 160],
      highlight: [245, 190, 205],
      shadow: [140, 70, 100],
    },
  },
  {
    keys: ['purple', 'violet', 'lilac', 'lavender'],
    palette: {
      name: 'vivid purple',
      base: [140, 110, 175],
      highlight: [200, 175, 230],
      shadow: [75, 55, 110],
    },
  },
  {
    keys: ['orange', 'amber', 'ginger'],
    palette: {
      name: 'vivid orange',
      base: [210, 130, 70],
      highlight: [245, 190, 120],
      shadow: [130, 70, 40],
    },
  },
  {
    keys: ['yellow', 'gold', 'blonde'],
    palette: {
      name: 'vivid yellow',
      base: [220, 190, 90],
      highlight: [250, 235, 160],
      shadow: [150, 120, 50],
    },
  },
  {
    keys: ['brown', 'auburn', 'chestnut', 'brunette'],
    palette: {
      name: 'warm brown',
      base: [140, 95, 70],
      highlight: [200, 155, 110],
      shadow: [75, 45, 35],
    },
  },
  {
    keys: ['black', 'dark', 'charcoal'],
    palette: {
      name: 'charcoal',
      base: [55, 58, 62],
      highlight: [120, 125, 130],
      shadow: [25, 26, 28],
    },
  },
  {
    keys: ['white', 'silver', 'gray', 'grey', 'ash'],
    palette: {
      name: 'silver',
      base: [180, 185, 190],
      highlight: [235, 238, 240],
      shadow: [110, 115, 120],
    },
  },
  {
    keys: ['skin', 'peach', 'flesh', 'beige'],
    palette: {
      name: 'skin',
      base: [232, 190, 165],
      highlight: [248, 220, 200],
      shadow: [190, 140, 120],
    },
  },
]

const DEFAULT_PALETTE: CelPalette = COLOR_TABLE[0].palette

/** Parse a voice/text prompt into a cel palette (base / highlight / shadow). */
export function paletteFromPrompt(prompt: string): CelPalette {
  const lower = prompt.toLowerCase()
  for (const entry of COLOR_TABLE) {
    if (entry.keys.some((k) => lower.includes(k))) {
      // Boost highlight if user asked for vivid / highlight / shine
      if (/vivid|highlight|shine|sheen|bright/.test(lower)) {
        const hi = entry.palette.highlight
        return {
          ...entry.palette,
          highlight: [
            Math.min(255, hi[0] + 20),
            Math.min(255, hi[1] + 25),
            Math.min(255, hi[2] + 10),
          ],
        }
      }
      return entry.palette
    }
  }
  return DEFAULT_PALETTE
}

function rasterizeLines(
  strokes: Stroke[],
  width: number,
  height: number,
  lineWidth = 3.2,
): Uint8ClampedArray {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, width, height)
  ctx.strokeStyle = '#000000'
  ctx.lineWidth = lineWidth
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
  const { data } = ctx.getImageData(0, 0, width, height)
  const mask = new Uint8ClampedArray(width * height)
  for (let i = 0; i < mask.length; i++) {
    mask[i] = data[i * 4] < 200 ? 1 : 0 // 1 = line barrier
  }
  return mask
}

function floodRegion(
  barriers: Uint8ClampedArray,
  width: number,
  height: number,
  seed: Point,
): { mask: Uint8Array; count: number; minY: number; maxY: number; minX: number; maxX: number } {
  const sx = Math.max(0, Math.min(width - 1, Math.floor(seed.x)))
  const sy = Math.max(0, Math.min(height - 1, Math.floor(seed.y)))
  const start = sy * width + sx
  if (barriers[start] === 1) {
    return { mask: new Uint8Array(width * height), count: 0, minY: 0, maxY: 0, minX: 0, maxX: 0 }
  }

  const mask = new Uint8Array(width * height)
  const stack = [start]
  let count = 0
  let minY = sy
  let maxY = sy
  let minX = sx
  let maxX = sx

  while (stack.length) {
    const idx = stack.pop()!
    if (idx < 0 || idx >= barriers.length) continue
    if (mask[idx] === 1 || barriers[idx] === 1) continue
    mask[idx] = 1
    count++
    const x = idx % width
    const y = (idx / width) | 0
    if (y < minY) minY = y
    if (y > maxY) maxY = y
    if (x < minX) minX = x
    if (x > maxX) maxX = x
    if (x + 1 < width) stack.push(idx + 1)
    if (x > 0) stack.push(idx - 1)
    if (y + 1 < height) stack.push(idx + width)
    if (y > 0) stack.push(idx - width)
  }

  return { mask, count, minY, maxY, minX, maxX }
}

/**
 * Propose a vivid cel-shaded paint fill strictly inside a clicked region.
 * Stand-in for a model-backed paint assist — output is an editable layer.
 */
export function proposeRegionPaint(
  strokes: Stroke[],
  width: number,
  height: number,
  seed: Point,
  prompt: string,
): PaintProposal | null {
  if (width < 8 || height < 8) return null
  const barriers = rasterizeLines(strokes, width, height)
  const region = floodRegion(barriers, width, height, seed)
  // Reject fills that spilled to almost the whole board (open region).
  if (region.count < 80 || region.count > width * height * 0.55) return null

  const palette = paletteFromPrompt(prompt)
  const rgba = new Uint8ClampedArray(width * height * 4)
  const spanY = Math.max(1, region.maxY - region.minY)
  const spanX = Math.max(1, region.maxX - region.minX)

  for (let y = region.minY; y <= region.maxY; y++) {
    for (let x = region.minX; x <= region.maxX; x++) {
      const idx = y * width + x
      if (region.mask[idx] !== 1) continue

      const ny = (y - region.minY) / spanY
      const nx = (x - region.minX) / spanX

      // Cel bands: highlight on upper masses, shadow in lower recesses + edge falloff
      const edge =
        (region.mask[idx - 1] !== 1 ? 1 : 0) +
        (region.mask[idx + 1] !== 1 ? 1 : 0) +
        (region.mask[idx - width] !== 1 ? 1 : 0) +
        (region.mask[idx + width] !== 1 ? 1 : 0)

      // Soft highlight lobes (sheen patches like anime hair)
      const sheenA = Math.exp(-(((nx - 0.32) * 2.8) ** 2 + ((ny - 0.16) * 3.8) ** 2))
      const sheenB = Math.exp(-(((nx - 0.68) * 3.4) ** 2 + ((ny - 0.26) * 4.2) ** 2))
      const sheen = Math.max(sheenA, sheenB * 0.9)

      let r = palette.base[0]
      let g = palette.base[1]
      let b = palette.base[2]

      // Soft shadow falloff (avoid a hard horizontal band)
      const shadowAmt = Math.max(0, (ny - 0.42) / 0.58) * 0.85 + edge * 0.08
      if (shadowAmt > 0) {
        const t = Math.min(1, shadowAmt)
        r = Math.round(r + (palette.shadow[0] - r) * t)
        g = Math.round(g + (palette.shadow[1] - g) * t)
        b = Math.round(b + (palette.shadow[2] - b) * t)
      }

      if (sheen > 0.28 && ny < 0.55) {
        const t = Math.min(1, (sheen - 0.28) * 2.6)
        r = Math.round(r + (palette.highlight[0] - r) * t)
        g = Math.round(g + (palette.highlight[1] - g) * t)
        b = Math.round(b + (palette.highlight[2] - b) * t)
      }

      const o = idx * 4
      rgba[o] = r
      rgba[o + 1] = g
      rgba[o + 2] = b
      rgba[o + 3] = 235
    }
  }

  return {
    id: crypto.randomUUID(),
    prompt,
    width,
    height,
    rgba,
    pixelCount: region.count,
  }
}

export function paintProposalToImageData(proposal: PaintProposal): ImageData {
  const copy = new Uint8ClampedArray(proposal.rgba)
  return new ImageData(copy, proposal.width, proposal.height)
}

export function clonePaintProposal(p: PaintProposal): PaintProposal {
  return {
    ...p,
    rgba: new Uint8ClampedArray(p.rgba),
  }
}
