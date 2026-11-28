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

## This repo (P0 demo)

Interactive site + **client-side cleanup assist**:

- Draw a rough on the canvas  
- **Propose cleanup** as a separate layer (local smoothing + path simplification stand-in)  
- Ghost-compare, then **Accept** or **Reject**  
- Rough never disappears until you accept  

No cloud inference yet — the demo teaches the human-in-the-loop interaction.

## Roadmap

- **P0** Cleanup assist with propose / ghost / accept *(this demo)*  
- **P1** Auto-flat + palette lock on cleaned frames  
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

P0 ships the stage-wise product framing and the cleanup assist loop. Next interactive slice: flatting / palette lock on an accepted cleanup layer.
