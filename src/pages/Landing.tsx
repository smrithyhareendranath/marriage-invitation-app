import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '../components/Icon'
import type { IconName } from '../components/Icon'
import { useAuth } from '../context'
import { api } from '../lib/db'
import { DEFAULT_PRICING, FAQS, TESTIMONIALS } from '../data/pricing'
import { THEMES, getFontPair } from '../data/themes'
import { Particles } from '../components/Particles'
import { Reveal } from '../invite/parts'
import { useTitle } from '../hooks'
import type { PricingPlan } from '../types'

const FEATURES: { icon: IconName; title: string; text: string }[] = [
  { icon: 'heart', title: 'A cinematic opening', text: 'Guests open your invitation with a gentle animation, falling petals and your music.' },
  { icon: 'sparkle', title: 'Your love story', text: 'An animated timeline of milestones with photos and video — as long as your story needs.' },
  { icon: 'image', title: 'Beautiful photo albums', text: 'Drag-and-drop uploads, cropping, slideshows and full-screen swipe viewing.' },
  { icon: 'calendar', title: 'Every event, perfectly planned', text: 'Mehendi to reception — countdowns, calendar buttons and Google Maps directions.' },
  { icon: 'check', title: 'RSVPs without the chasing', text: 'Headcount, meal choices and messages in one private dashboard you can export.' },
  { icon: 'whatsapp', title: 'Made for WhatsApp', text: 'One unique link and QR code that looks stunning on every phone.' },
]

const STEPS = [
  { n: '1', title: 'Pick a style', text: 'Choose from ten hand-crafted themes — from Kerala traditional to modern luxury.' },
  { n: '2', title: 'Add your story', text: 'Photos, events and memories, with a guided editor and a live preview.' },
  { n: '3', title: 'Share the joy', text: 'Publish, send your link, and watch the RSVPs roll in.' },
]

function PhoneMock({ themeIdx, className = '' }: { themeIdx: number; className?: string }) {
  const t = THEMES[themeIdx % THEMES.length]
  const f = getFontPair(t.fontPairId)
  const light = !t.dark && t.id !== 'royal' && t.id !== 'indian'
  return (
    <div className={`phone ${className}`} aria-hidden="true">
      <div className="phone-screen" style={{ background: t.cover, color: light ? t.text : '#fff', fontFamily: f.body }}>
        <small>Together with their families</small>
        <b style={{ fontFamily: f.script }}>Arjun &amp; Anjali</b>
        <span style={{ fontFamily: f.heading }}>20 December 2026</span>
        <i style={{ background: t.primary, color: '#fff' }}>Open Invitation</i>
      </div>
    </div>
  )
}

export function Landing() {
  useTitle('Marriage Invitation App — interactive wedding invitations')
  const { user } = useAuth()
  const [plans, setPlans] = useState<PricingPlan[]>(DEFAULT_PRICING)
  const [menu, setMenu] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    api.settings.get().then((s) => setPlans(s.pricing))
    const on = () => setScrolled(window.scrollY > 20)
    on()
    window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [])

  const cta = user ? '/dashboard' : '/signup'

  return (
    <div className="landing">
      <header className={`l-nav ${scrolled ? 'scrolled' : ''}`}>
        <Link to="/" className="brand"><Icon name="heart" size={22} filled /> <span>Marriage Invitation</span></Link>
        <nav className={menu ? 'open' : ''} aria-label="Main">
          <a href="#examples" onClick={() => setMenu(false)}>Examples</a>
          <a href="#features" onClick={() => setMenu(false)}>Features</a>
          <a href="#pricing" onClick={() => setMenu(false)}>Pricing</a>
          <a href="#faq" onClick={() => setMenu(false)}>FAQ</a>
        </nav>
        <div className="l-actions">
          {user ? <Link className="btn btn-primary sm" to="/dashboard">Dashboard</Link> : (<><Link className="btn btn-ghost sm hide-narrow" to="/login">Log in</Link><Link className="btn btn-primary sm" to="/signup">Get started</Link></>)}
          <button className="icon-btn only-narrow" onClick={() => setMenu((m) => !m)} aria-label="Toggle menu" aria-expanded={menu}><Icon name={menu ? 'x' : 'menu'} size={22} /></button>
        </div>
      </header>

      <section className="l-hero">
        <Particles kind="petals" color="#d98aa6" color2="#e9b8c8" />
        <div className="l-hero-copy">
          <p className="eyebrow">Digital wedding invitations</p>
          <h1>Your Love Story Deserves More Than an Invitation.</h1>
          <p className="lead">Create a beautiful, interactive wedding invitation that tells your story, shares your memories, and brings everyone together.</p>
          <div className="l-cta">
            <Link className="btn btn-primary lg" to={cta}>Create Your Invitation</Link>
            <a className="btn btn-ghost lg" href="#examples">Explore Examples</a>
          </div>
          <p className="muted small">Free to start · No credit card · Ready in minutes</p>
        </div>
        <div className="l-hero-art">
          <PhoneMock themeIdx={2} className="p1" />
          <PhoneMock themeIdx={0} className="p2" />
          <PhoneMock themeIdx={7} className="p3" />
        </div>
      </section>

      <section id="examples" className="l-sec">
        <Reveal><h2>See it in action</h2><p className="lead">Open the live demo — then pick any theme to see it reimagined.</p></Reveal>
        <div className="theme-showcase">
          {THEMES.map((t, i) => (
            <Reveal key={t.id} variant="zoom" delay={(i % 5) * 60}>
              <Link to={`/invite/arjun-anjali?theme=${t.id}`} className="showcase-card">
                <PhoneMock themeIdx={i} />
                <strong>{t.name}</strong>
                <small>{t.tagline}</small>
              </Link>
            </Reveal>
          ))}
        </div>
        <div className="center"><Link className="btn btn-primary lg" to="/invite/arjun-anjali">Open the live demo invitation</Link></div>
      </section>

      <section id="features" className="l-sec alt">
        <Reveal><h2>Everything for your big day</h2><p className="lead">A luxury invitation, a love story, a photo album and an event guide — in one link.</p></Reveal>
        <div className="feature-grid">
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={(i % 3) * 80} className="feature glass">
              <span className="f-ico"><Icon name={f.icon} size={22} /></span>
              <h3>{f.title}</h3>
              <p>{f.text}</p>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="l-sec">
        <Reveal><h2>How it works</h2></Reveal>
        <ol className="steps">
          {STEPS.map((s, i) => (
            <Reveal as="li" key={s.n} delay={i * 100}>
              <span className="step-n">{s.n}</span>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
            </Reveal>
          ))}
        </ol>
      </section>

      <section id="pricing" className="l-sec alt">
        <Reveal><h2>Simple pricing</h2><p className="lead">Start free. Upgrade only when you want the full experience.</p></Reveal>
        <div className="pricing">
          {plans.map((p, i) => (
            <Reveal key={p.id} delay={i * 100} className={`price-card ${p.highlight ? 'hl' : ''}`}>
              {p.highlight && <span className="badge">Most popular</span>}
              <h3>{p.name}</h3>
              <p className="price">{p.price === 0 ? 'Free' : <>${p.price}<small> {p.period}</small></>}</p>
              <p className="muted">{p.blurb}</p>
              <ul>{p.features.map((f) => <li key={f}><Icon name="check" size={16} /> {f}</li>)}</ul>
              <Link className={`btn block ${p.highlight ? 'btn-primary' : 'btn-ghost'}`} to={cta}>{p.price === 0 ? 'Start free' : `Choose ${p.name}`}</Link>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="l-sec">
        <Reveal><h2>Loved by couples</h2></Reveal>
        <div className="testimonials">
          {TESTIMONIALS.map((t, i) => (
            <Reveal key={t.name} as="figure" delay={i * 100} className="testimonial glass">
              <blockquote>“{t.quote}”</blockquote>
              <figcaption><strong>{t.name}</strong> · {t.place}</figcaption>
            </Reveal>
          ))}
        </div>
        <p className="muted small center">Sample testimonials shown for the demo.</p>
      </section>

      <section id="faq" className="l-sec alt">
        <Reveal><h2>Questions, answered</h2></Reveal>
        <div className="faq">
          {FAQS.map((f) => (
            <details key={f.q}><summary>{f.q}</summary><p>{f.a}</p></details>
          ))}
        </div>
      </section>

      <section className="l-final">
        <Particles kind="hearts" color="#ffffff" color2="#ffd7e4" />
        <h2>Ready to invite the people you love?</h2>
        <p>Create your invitation in minutes — your guests will remember it for years.</p>
        <Link className="btn btn-light lg" to={cta}>Create Your Invitation</Link>
      </section>

      <footer className="l-foot">
        <Link to="/" className="brand"><Icon name="heart" size={18} filled /> <span>Marriage Invitation</span></Link>
        <p>© {new Date().getFullYear()} Marriage Invitation App · Made with love</p>
        <div><Link to="/login">Log in</Link> · <Link to="/signup">Sign up</Link> · <Link to="/invite/arjun-anjali">Demo</Link></div>
      </footer>
    </div>
  )
}
