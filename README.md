# Draftline

Stage-wise AI co-pilot for traditional 2D animation — **speed the pipeline, don’t skip it**.

## Try the Studio (real tool)

Open **`#/studio`** after starting the app — a tablet-ready timeline where you draw keys, propose cleanup, insert inbetweens, play, and export PNGs.

```bash
npm install
npm run dev
```

Then go to `http://localhost:5173/#/studio` (or GitHub Pages `/Drawing-assistance/#/studio`).

### Studio workflow

1. **Draw** closed line art (e.g. hair silhouette) with pen / stylus / mouse  
2. Switch to **Paint (prompt)** — type or **Voice prompt** (“paint this hair green with vivid highlights”)  
3. **Click inside** the closed region → vivid cel paint (base + highlight + shadow) is proposed  
4. **Accept paint** / **Reject** / **Undo** anytime  
5. Optional: mark keys → **Insert inbetweens**, cleanup, **Play**, **Export PNGs**

## Why not a CSP / Procreate Dreams plugin?

Clip Studio Paint and Procreate Dreams do **not** expose open plugin APIs for embedding this kind of assist inside their canvases. Draftline is a **browser studio** that works with drawing tablets via Pointer Events. Longer-term bridges are more realistic toward hosts with open APIs (e.g. Krita, OpenToonz) plus file export — not closed CSP / Dreams extensions.

## Product spine

| Stage | Human owns | AI assists |
| --- | --- | --- |
| Rough / scratch | Acting, timing | Consistency checks |
| Layout / blocking | Camera, staging | Ground-plane snap |
| Cleanup / douga | Line style, keys | Cleanup + inbetween drafts |
| Color / finish | Palette, mood | Flats + palette lock |

### Assist loop

Artist draws → AI proposes layer → ghost / compare → accept / reject → export

## Demos on the landing page

Interactive stand-alone slices for cleanup/flats, inbetweens, and layout snap. The **Studio** is where you make a short animation yourself.

## Build

```bash
npm run build
npm run preview
```
