import { Suspense, lazy } from 'react'
import { Link, Route, Routes } from 'react-router-dom'
import { Landing } from './pages/Landing'
import { Forgot, Login, Signup } from './pages/Auth'
import { InvitePage } from './pages/InvitePage'
import { Icon } from './components/Icon'

// the builder and admin console are only needed after login – keep them out of the guest bundle
const Dashboard = lazy(() => import('./dashboard/Dashboard').then((m) => ({ default: m.Dashboard })))
const Admin = lazy(() => import('./pages/Admin').then((m) => ({ default: m.Admin })))

function NotFound() {
  return (
    <main className="notice-page">
      <div className="notice glass">
        <span className="notice-ico"><Icon name="heart" size={30} /></span>
        <h1>Page not found</h1>
        <p>We could not find what you were looking for.</p>
        <Link className="btn btn-primary" to="/">Back home</Link>
      </div>
    </main>
  )
}

const Loading = () => (
  <div className="page-loading" role="status" aria-label="Loading">
    <span className="big-heart float"><Icon name="heart" size={40} filled /></span>
  </div>
)

export default function App() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot" element={<Forgot />} />
        <Route path="/invite/:slug" element={<InvitePage />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/dashboard/:tab" element={<Dashboard />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  )
}
