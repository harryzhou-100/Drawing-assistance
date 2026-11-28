import { HeroSketch } from './components/HeroSketch'
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
      'Camera and staging stay yours. AI can snap scale to a 3D set and flag contact errors without replacing layout.',
    state: 'Planned',
    owns: 'Artist + assist',
  },
  {
    name: 'Cleanup / douga',
    detail:
      'AI proposes cleaned strokes as a separate layer. You compare against the rough ghost, then accept, reject, or redraw.',
    state: 'Live in this demo',
    owns: 'Assist loop',
  },
  {
    name: 'Color / finish',
    detail:
      'After cleanup: auto-flat, palette lock across frames, draft shadows from lighting refs — every fill remains editable.',
    state: 'Next slice',
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

export default function App() {
  return (
    <div className="page">
      <header className="nav">
        <a className="nav__brand" href="#top">
          Draftline
        </a>
        <nav className="nav__links" aria-label="Primary">
          <a href="#pipeline">Pipeline</a>
          <a href="#loop">Assist loop</a>
          <a href="#demo">Try cleanup</a>
        </nav>
      </header>

      <main id="top">
        <section className="hero" aria-labelledby="hero-title">
          <HeroSketch />
          <div className="hero__content">
            <p className="hero__brand">Draftline</p>
            <h1 id="hero-title">Speed the pipeline — don’t skip it.</h1>
            <p className="hero__lede">
              Keep rough → layout → cleanup → color. AI drafts the tedious intermediate
              labor as editable layers. You still own every creative call.
            </p>
            <div className="hero__cta">
              <a className="btn btn--primary btn--lg" href="#demo">
                Try the assist loop
              </a>
              <a className="btn btn--lg" href="#pipeline">
                See the stages
              </a>
            </div>
          </div>
        </section>

        <section className="section section--problem" aria-labelledby="problem-title">
          <div className="section__inner">
            <h2 id="problem-title">Instant generation skips the craft.</h2>
            <p>
              Prompt-to-finished tools jump over acting, layout, and line decisions.
              Traditional production is slow for another reason: cleanup, inbetweens, and
              flats — repetitive work that steals time from storytelling. Draftline
              targets that drag, not the craft itself.
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
          </div>
        </section>

        <section id="demo" className="section section--demo" aria-labelledby="demo-title">
          <div className="section__inner">
            <h2 id="demo-title">Step 1 demo: rough → proposed cleanup</h2>
            <p className="section__lede">
              Draw freely. Propose a cleanup layer. Ghost-compare, then Accept or Reject.
              Your rough never disappears until you say so.
            </p>
            <LineCleanupDemo />
          </div>
        </section>

        <section className="section section--next" aria-labelledby="next-title">
          <div className="section__inner">
            <h2 id="next-title">Roadmap from here</h2>
            <ol className="roadmap">
              <li>
                <strong>P0 — Cleanup assist</strong>
                <span>Propose / ghost / accept loop (this demo)</span>
              </li>
              <li>
                <strong>P1 — Auto-flat + palette lock</strong>
                <span>Named regions on cleaned frames; color continuity across frames</span>
              </li>
              <li>
                <strong>P2 — Key-to-key inbetween drafts</strong>
                <span>Human keys and timing stay sacred; AI drafts volumes between them</span>
              </li>
              <li>
                <strong>P3 — Layout / 3D snap</strong>
                <span>Contact and perspective assist without replacing set design</span>
              </li>
            </ol>
          </div>
        </section>
      </main>

      <footer className="footer">
        <p>
          <span className="footer__brand">Draftline</span> — stage-wise co-pilot for
          traditional 2D production.
        </p>
      </footer>
    </div>
  )
}
