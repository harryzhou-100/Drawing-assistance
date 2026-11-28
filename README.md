# Draftline

Stage-wise AI co-pilot for traditional 2D animation — **speed the pipeline, don’t skip it**.

Rather than prompt → finished shot, Draftline embeds assistive models into each existing production stage so artists keep judgment and pixel-level authority.

## Product spine

| Stage | Human owns | AI assists |
| --- | --- | --- |
| **1. Rough / scratch** | Acting, composition, timing | Volume ghosts, consistency checks |
| **2. Layout / blocking** | Camera, staging | Ground-plane snap, scale, contact shadow drafts |
| **3. Cleanup / douga** | Line style, keys, final silhouettes | Cleanup layers + key-to-key inbetween drafts |
| **4. Color / finish** | Palette, mood, lighting | Flats, palette lock, draft shadows |

### Assist loop (every tool)

1. Artist draws / picks keys  
2. AI proposes next layer  
3. Ghost + compare  
4. Accept / reject / redraw  
5. Export stage asset  

## This repo (P0–P3 demos)

1. **Cleanup → flats** — propose cleanup, then locked-palette flats with Frame 2 lock  
2. **Inbetweens** — Key A / Key B, draft volumes, scrub timing, accept/reject  
3. **Layout snap** — 1-pt set + floating rough → plant feet, scale, draft contact shadow  

No cloud inference yet — local geometry stand-ins teach the human-in-the-loop interaction.

## Roadmap

- **P0** Cleanup assist  
- **P1** Auto-flat + palette lock  
- **P2** Key-to-key inbetween drafts  
- **P3** Layout / 3D snap *(this demo)*  

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

P0–P3 cover the stage-wise assist spine end-to-end as interaction demos. Next: deeper model-backed cleanup / flatting, or tighter 2D–3D layout integration.
