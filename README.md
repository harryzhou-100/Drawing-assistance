# Draftline

Human-in-the-loop AI assistance for traditional illustrators and 2D animators.

Rather than end-to-end image generation, Draftline embeds controllable models into granular stages of the production pipeline so artists keep pixel-level authority.

## Pipeline (product vision)

1. **Line cleanup** — Structure-preserving image-to-image models (ControlNet / custom adapters) convert rough pencil into clean, vector-ready line art without flattening personal stroke style.
2. **Voice coloring** — Multimodal prompt and voice commands apply flats, lighting references, and shading masks with strict palette consistency.
3. **Editable layers** — Every AI step lands as an intermediate layer the artist can reject, refine, or redraw.

## This repo (demo)

Interactive site + a **client-side line cleanup** mini-demo:

- Draw rough strokes on a canvas
- Run local smoothing + path simplification (stand-in for the real model)
- Toggle rough / clean, ghost the original, undo, clear

No cloud inference yet — the demo teaches the interaction loop.

## Try it

- **GitHub Pages** (after this workflow is on `main`): https://harryzhou-100.github.io/Drawing-assistance/
- Locally:

```bash
npm install
npm run dev
```

```bash
npm run build
```


## Status

Workflow interviews with independent animators/illustrators are mapping pain points across storyboarding, keyframing, and coloring. Next interactive slice under consideration: voice/prompt coloring on a cleaned frame.
