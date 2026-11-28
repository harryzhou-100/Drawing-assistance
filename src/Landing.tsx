import { HeroSketch } from './components/HeroSketch'
import { InbetweenDemo } from './components/InbetweenDemo'
import { LayoutSnapDemo } from './components/LayoutSnapDemo'
import { LineCleanupDemo } from './components/LineCleanupDemo'
import './App.css'

const stages = [
  {
    name: 'Rough / scratch',
    detail:
      'You own acting, composition, and timing. AI may offer volume ghosts or consistency checks — never invent the pose.',
    state: 'Human-led',
    owns: 'Artist',
  },
  {
    name: 'Layout / blocking',
    detail:
      'Camera and staging stay yours. Propose a ground-plane snap: plant feet, correct scale vs depth, draft a contact shadow — then accept or reject.',
    state: 'Live in this demo',
    owns: 'Assist loop',
  },
  {
    name: 'Cleanup / douga',
    detail:
      'AI proposes cleaned strokes as a separate layer. Key-to-key inbetween drafts sit here too — keys stay sacred.',
    state: 'Live in this demo',
    owns: 'Assist loop',
  },
  {
    name: 'Color / finish',
    detail:
      'Auto-flat enclosed regions from a locked character palette. Reassign only within the lock; accept to propagate colors to the next frame.',
    state: 'Live in this demo',
    owns: 'Assist loop',
  },
]

const loop = [
  'Artist draws / picks keys',
  'AI proposes next layer',
  'Ghost + compare',
  'Accept / reject / redraw',
  'Export stage asset',
]

export function Landing() {
  return (
    <div className="page">
      <header className="nav">
        <a className="nav__brand" href="#top">
          Draftline
        </a>
        <nav className="nav__links" aria-label="Primary">
          <a href="#/studio">Studio</a>
          <a href="#pipeline">Pipeline</a>
          <a href="#demo">Demos</a>
        </nav>
      </header>

      <main id="top">
        <section className="hero" aria-labelledby="hero-title">
          <HeroSketch />
          <div className="hero__content">
            <p className="hero__brand">Draftline</p>
            <h1 id="hero-title">Speed the pipeline — don’t skip it.</h1>
            <p className="hero__lede">
              Draw line art, then voice-prompt vivid cel paint inside closed regions —
              highlights, shadows, undo anytime. Assist the craft; don’t skip it.
            </p>
            <div className="hero__cta">
              <a className="btn btn--primary btn--lg" href="#/studio">
                Open studio
              </a>
              <a className="btn btn--lg" href="#pipeline">
                See the pipeline
              </a>
            </div>
          </div>
        </section>

        <section className="section section--problem" aria-labelledby="problem-title">
          <div className="section__inner">
            <h2 id="problem-title">Why not a CSP / Procreate plugin?</h2>
            <p>
              Clip Studio Paint and Procreate Dreams don’t offer open plugin APIs for
              embedding this kind of assist inside their canvases today. Draftline ships as
              a browser studio that works with drawing tablets (pen / stylus via Pointer
              Events). Longer term: export bridges and hosts with open APIs (e.g. Krita /
              OpenToonz) are more realistic than CSP or Dreams extensions.
            </p>
          </div>
        </section>

        <section id="pipeline" className="section section--pipeline" aria-labelledby="pipeline-title">
          <div className="section__inner">
            <h2 id="pipeline-title">Four stages. Same process. Less repetition.</h2>
            <p className="section__lede">
              Each assist maps to an existing production step. No prompt → finished shot.
            </p>
            <ol className="stages">
              {stages.map((stage, i) => (
                <li key={stage.name} className="stages__item">
                  <span className="stages__index">{String(i + 1).padStart(2, '0')}</span>
                  <div>
                    <div className="stages__head">
                      <h3>{stage.name}</h3>
                      <span className="stages__state">{stage.state}</span>
                      <span className="stages__owns">{stage.owns}</span>
                    </div>
                    <p>{stage.detail}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="loop" className="section section--loop" aria-labelledby="loop-title">
          <div className="section__inner">
            <h2 id="loop-title">One interaction loop for every tool</h2>
            <p className="section__lede">
              Same rhythm as a cleanup artist or painter — just faster. Hide the
              intermediate step and the product collapses into generation.
            </p>
            <ol className="loop">
              {loop.map((step, i) => (
                <li key={step} className="loop__item">
                  <span className="loop__num">{String(i + 1).padStart(2, '0')}</span>
                  <span className="loop__label">{step}</span>
                </li>
              ))}
            </ol>
            <p className="section__lede" style={{ marginTop: '1.5rem' }}>
              <a className="btn btn--primary" href="#/studio">
                Make a short animation in Studio
              </a>
            </p>
          </div>
        </section>

        <section id="layout" className="section section--layout" aria-labelledby="layout-title">
          <div className="section__inner">
            <h2 id="layout-title">Demo C: layout / ground-plane snap</h2>
            <p className="section__lede">
              Load a 1-pt set with a floating rough. Propose a snap to plant feet, correct
              scale, and draft a contact shadow — then Accept or Reject.
            </p>
            <LayoutSnapDemo />
          </div>
        </section>

        <section id="demo" className="section section--demo" aria-labelledby="demo-title">
          <div className="section__inner">
            <h2 id="demo-title">Demo A: cleanup → flats → palette lock</h2>
            <p className="section__lede">
              Propose cleanup, accept it, then propose flats from a locked palette. Reassign
              only within the lock; accept to push colors onto the next frame.
            </p>
            <LineCleanupDemo />
          </div>
        </section>

        <section id="inbetween" className="section section--inbetween" aria-labelledby="inbetween-title">
          <div className="section__inner">
            <h2 id="inbetween-title">Demo B: key → inbetween drafts</h2>
            <p className="section__lede">
              Load Key A and Key B. Propose draft volumes between them, scrub the timing chart,
              ghost the keys, then Accept or Reject. Keys stay sacred.
            </p>
            <InbetweenDemo />
          </div>
        </section>

        <section className="section section--next" aria-labelledby="next-title">
          <div className="section__inner">
            <h2 id="next-title">Roadmap</h2>
            <ol className="roadmap">
              <li>
                <strong>P0–P3 demos</strong>
                <span>Cleanup, flats, inbetweens, layout snap</span>
              </li>
              <li>
                <strong>Studio app</strong>
                <span>Tablet-ready timeline + assist loop (live)</span>
              </li>
              <li>
                <strong>Model-backed assists</strong>
                <span>Replace local geometry stand-ins</span>
              </li>
              <li>
                <strong>Host bridges</strong>
                <span>Export / open-API hosts — not closed CSP / Dreams plugins</span>
              </li>
            </ol>
          </div>
        </section>
      </main>

      <footer className="footer">
        <p>
          <span className="footer__brand">Draftline</span> — stage-wise co-pilot for
          traditional 2D production.{' '}
          <a href="#/studio">Open studio</a>
        </p>
      </footer>
    </div>
  )
}
