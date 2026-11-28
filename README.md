# Draftline

Stage-wise AI co-pilot for traditional 2D animation — **speed the pipeline, don’t skip it**.

Rather than prompt → finished shot, Draftline embeds assistive models into each existing production stage so artists keep judgment and pixel-level authority.

## Product spine

| Stage | Human owns | AI assists |
| --- | --- | --- |
| **1. Rough / scratch** | Acting, composition, timing | Volume ghosts, consistency checks |
| **2. Layout / blocking** | Camera, staging | Perspective / contact snap to set |
| **3. Cleanup / douga** | Line style, final silhouettes | Propose cleaned strokes as a layer |
| **4. Color / finish** | Palette, mood, lighting | Flats, palette lock, draft shadows |

### Assist loop (every tool)

1. Artist draws / picks keys  
2. AI proposes next layer  
3. Ghost + compare  
4. Accept / reject / redraw  
5. Export stage asset  

## This repo (P0 + P1 demo)

Interactive site with a chained assist board:

1. **Cleanup** — draw a rough (or load a sample), propose cleanup, accept/reject  
2. **Flats** — propose enclosed-region flats from a **locked palette**; click a region + swatch to reassign within the lock  
3. **Palette lock** — accepting flats propagates the same swatch mapping onto a Frame 2 preview  

No cloud inference yet — local geometry + flood-fill stand in for model-backed assists so the interaction loop is real.

## Roadmap

- **P0** Cleanup assist with propose / ghost / accept  
- **P1** Auto-flat + palette lock on cleaned frames *(this demo)*  
- **P2** Key-to-key inbetween drafts  
- **P3** Layout / 3D snap assist  

## Try it

- **GitHub Pages** (after deploy on `main`): https://harryzhou-100.github.io/Drawing-assistance/
- Locally:

```bash
npm install
npm run dev
```

```bash
npm run build
```

## Status

P0 + P1 ship the stage-wise framing, cleanup assist loop, and flat / palette-lock assist. Next interactive slice: key-to-key inbetween drafts.
