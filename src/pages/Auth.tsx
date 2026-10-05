import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Icon } from '../components/Icon'
import { useAuth } from '../context'
import { ADMIN_LOGIN, DEMO_LOGIN, api } from '../lib/db'
import { useTitle } from '../hooks'

function Shell({ title, sub, children, foot }: { title: string; sub: string; children: React.ReactNode; foot: React.ReactNode }) {
  return (
    <main className="auth">
      <div className="auth-art" aria-hidden="true">
        <div className="auth-quote">
          <Icon name="heart" size={28} filled />
          <p>“Two hearts, one beautiful journey…”</p>
        </div>
      </div>
      <div className="auth-panel">
        <Link to="/" className="brand"><Icon name="heart" size={20} filled /> <span>Marriage Invitation</span></Link>
        <h1>{title}</h1>
        <p className="muted">{sub}</p>
        {children}
        <p className="auth-foot">{foot}</p>
      </div>
    </main>
  )
}

function GoogleButton({ onClick, busy }: { onClick(): void; busy: boolean }) {
  return (
    <button type="button" className="btn btn-google block" onClick={onClick} disabled={busy}>
      <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
        <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
        <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.6 5.9c4.4-4.1 7-10.1 7-17.6z" />
        <path fill="#FBBC05" d="M10.5 28.7a14.5 14.5 0 0 1 0-9.4l-7.9-6.1a24 24 0 0 0 0 21.6l7.9-6.1z" />
        <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.6-5.9c-2.1 1.4-4.9 2.3-8.3 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z" />
      </svg>
      Continue with Google
    </button>
  )
}

function useRedirect() {
  const loc = useLocation()
  const from = (loc.state as { from?: string } | null)?.from
  return from && from.startsWith('/') ? from : null
}

export function Login() {
  useTitle('Log in · Marriage Invitation App')
  const { user, login, loginWithGoogle } = useAuth()
  const nav = useNavigate()
  const from = useRedirect()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (user) return <Navigate to={user.role === 'admin' ? '/admin' : from ?? '/dashboard'} replace />

  const go = async (fn: () => Promise<{ role: string }>) => {
    setBusy(true)
    setError('')
    try {
      const u = await fn()
      nav(u.role === 'admin' ? '/admin' : from ?? '/dashboard', { replace: true })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
      setBusy(false)
    }
  }
  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password) return setError('Please enter your email and password.')
    void go(() => login({ email, password }))
  }

  return (
    <Shell title="Welcome back" sub="Log in to continue building your invitation." foot={<>New here? <Link to="/signup">Create your invitation</Link></>}>
      <GoogleButton busy={busy} onClick={() => void go(loginWithGoogle)} />
      <div className="or"><span>or</span></div>
      <form onSubmit={submit} noValidate>
        <div className="field"><label htmlFor="email">Email</label><input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" /></div>
        <div className="field">
          <label htmlFor="pw">Password</label>
          <input id="pw" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <Link className="field-link" to="/forgot">Forgot password?</Link>
        </div>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="btn btn-primary block lg" disabled={busy}>{busy ? 'Logging in…' : 'Log in'}</button>
      </form>
      <div className="demo-logins">
        <p>Try the demo</p>
        <button className="btn btn-ghost sm" onClick={() => void go(() => login(DEMO_LOGIN))}>Couple demo (Arjun &amp; Anjali)</button>
        <button className="btn btn-ghost sm" onClick={() => void go(() => login(ADMIN_LOGIN))}>Admin demo</button>
      </div>
    </Shell>
  )
}

export function Signup() {
  useTitle('Create your invitation · Marriage Invitation App')
  const { user, signUp, loginWithGoogle } = useAuth()
  const nav = useNavigate()
  const [f, setF] = useState({ name: '', email: '', password: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  if (user) return <Navigate to="/dashboard" replace />

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const err: Record<string, string> = {}
    if (f.name.trim().length < 2) err.name = 'Please enter your name.'
    if (!/^\S+@\S+\.\S+$/.test(f.email)) err.email = 'Enter a valid email address.'
    if (f.password.length < 8) err.password = 'Use at least 8 characters.'
    setErrors(err)
    if (Object.keys(err).length) return
    setBusy(true)
    setError('')
    try {
      await signUp(f)
      nav('/dashboard', { replace: true })
    } catch (x) {
      setError(x instanceof Error ? x.message : 'Could not create your account')
      setBusy(false)
    }
  }
  const field = (k: 'name' | 'email' | 'password', label: string, type: string, ph: string, ac: string) => (
    <div className="field">
      <label htmlFor={`su-${k}`}>{label}</label>
      <input id={`su-${k}`} type={type} autoComplete={ac} value={f[k]} placeholder={ph} aria-invalid={!!errors[k]} onChange={(e) => { setF({ ...f, [k]: e.target.value }); setErrors({ ...errors, [k]: '' }) }} />
      {errors[k] && <small className="err">{errors[k]}</small>}
    </div>
  )
  return (
    <Shell title="Create your invitation" sub="Free to start. Your first invitation takes just a few minutes." foot={<>Already have an account? <Link to="/login">Log in</Link></>}>
      <GoogleButton busy={busy} onClick={() => { setBusy(true); loginWithGoogle().then(() => nav('/dashboard', { replace: true })).catch((e) => { setError(e.message); setBusy(false) }) }} />
      <div className="or"><span>or</span></div>
      <form onSubmit={submit} noValidate>
        {field('name', 'Your name', 'text', 'e.g. Anjali', 'name')}
        {field('email', 'Email', 'email', 'you@example.com', 'email')}
        {field('password', 'Password', 'password', 'At least 8 characters', 'new-password')}
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="btn btn-primary block lg" disabled={busy}>{busy ? 'Creating account…' : 'Create account'}</button>
      </form>
    </Shell>
  )
}

export function Forgot() {
  useTitle('Reset password · Marriage Invitation App')
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError('Enter a valid email address.')
    setError('')
    setBusy(true)
    await api.auth.requestPasswordReset(email)
    setBusy(false)
    setSent(true)
  }
  return (
    <Shell title="Reset your password" sub="We will email you a link to choose a new one." foot={<Link to="/login">Back to log in</Link>}>
      {sent ? (
        <div className="rsvp-done" role="status">
          <span className="big-heart"><Icon name="mail" size={36} /></span>
          <h3>Check your inbox</h3>
          <p>If an account exists for <strong>{email}</strong>, a reset link is on its way.</p>
          <p className="hint">Demo mode: no email is actually sent. A real backend sends a one-time link here.</p>
        </div>
      ) : (
        <form onSubmit={submit} noValidate>
          <div className="field"><label htmlFor="fe">Email</label><input id="fe" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />{error && <small className="err">{error}</small>}</div>
          <button className="btn btn-primary block lg" disabled={busy}>{busy ? 'Sending…' : 'Send reset link'}</button>
        </form>
      )}
    </Shell>
  )
}
