import { HeroSketch } from './components/HeroSketch'
import { LineCleanupDemo } from './components/LineCleanupDemo'
import './App.css'

const stages = [
  {
    name: 'Line cleanup',
    detail:
      'Structure-preserving models turn rough pencil into clean, vector-ready line art without erasing your stroke personality.',
    state: 'Live in this demo',
  },
  {
    name: 'Voice coloring',
    detail:
      'Natural-language and voice prompts apply flats, lighting, and shading masks while locking palette consistency across frames.',
    state: 'Next slice',
  },
  {
    name: 'Editable layers',
    detail:
      'Every AI step lands as an intermediate layer you can reject, refine, or redraw — pixel-level authority stays with you.',
    state: 'Planned',
  },
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
          <a href="#demo">Try cleanup</a>
        </nav>
      </header>

      <main id="top">
        <section className="hero" aria-labelledby="hero-title">
          <HeroSketch />
          <div className="hero__content">
            <p className="hero__brand">Draftline</p>
            <h1 id="hero-title">AI that assists the frame — not replaces the artist.</h1>
            <p className="hero__lede">
              A human-in-the-loop studio tool for illustrators and 2D animators: clean lines,
              guided color, and editable stages built for traditional craft.
            </p>
            <div className="hero__cta">
              <a className="btn btn--primary btn--lg" href="#demo">
                Try line cleanup
              </a>
              <a className="btn btn--lg" href="#pipeline">
                See the pipeline
              </a>
            </div>
          </div>
        </section>

        <section className="section section--problem" aria-labelledby="problem-title">
          <div className="section__inner">
            <h2 id="problem-title">End-to-end generation skips the craft.</h2>
            <p>
              Generative tools often jump from prompt to finished image, stripping control over
              line quality, framing, and emotional nuance. Traditional production stays stuck on
              cleanup, in-betweens, and flats — the repetitive work that steals time from
              storytelling.
            </p>
          </div>
        </section>

        <section id="pipeline" className="section section--pipeline" aria-labelledby="pipeline-title">
          <div className="section__inner">
            <h2 id="pipeline-title">Modular stages inside your existing pipeline.</h2>
            <p className="section__lede">
              Controllable models sit beside each craft step — cleanup, color, layers — so AI
              behaves like a precision studio assistant, not an opaque generator.
            </p>
            <ol className="stages">
              {stages.map((stage, i) => (
                <li key={stage.name} className="stages__item">
                  <span className="stages__index">{String(i + 1).padStart(2, '0')}</span>
                  <div>
                    <div className="stages__head">
                      <h3>{stage.name}</h3>
                      <span className="stages__state">{stage.state}</span>
                    </div>
                    <p>{stage.detail}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="demo" className="section section--demo" aria-labelledby="demo-title">
          <div className="section__inner">
            <h2 id="demo-title">Demo: rough sketch → cleaned line art</h2>
            <p className="section__lede">
              Draw freely, then run cleanup. Toggle rough vs clean, keep a ghost of your original
              strokes, undo anytime. This is the first assistive slice — local geometry today,
              model-backed cleanup next.
            </p>
            <LineCleanupDemo />
          </div>
        </section>

        <section className="section section--next" aria-labelledby="next-title">
          <div className="section__inner">
            <h2 id="next-title">Where this goes next</h2>
            <p>
              Interviews with independent animators are mapping pain points across storyboarding,
              keyframing, and coloring. The next interactive slice we are considering is{' '}
              <strong>voice / prompt coloring</strong> on a cleaned frame — say “warm muted ochre
              coat, rim light on the left” — with strict palette locks. Tell us if you’d rather
              see in-between assist or layer export first.
            </p>
          </div>
        </section>
      </main>

      <footer className="footer">
        <p>
          <span className="footer__brand">Draftline</span> — human-in-the-loop animation
          assistance for traditional artists.
        </p>
      </footer>
    </div>
  )
}
