import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { User } from './types'
import { api } from './lib/db'
import { Icon } from './components/Icon'

/* --------------------------------- auth --------------------------------- */

interface AuthCtx {
  user: User | null
  loading: boolean
  signUp(i: { name: string; email: string; password: string }): Promise<User>
  login(i: { email: string; password: string }): Promise<User>
  loginWithGoogle(): Promise<User>
  logout(): Promise<void>
  refresh(): Promise<void>
}

const Auth = createContext<AuthCtx | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setUser(await api.auth.me())
  }, [])

  useEffect(() => {
    refresh().finally(() => setLoading(false))
  }, [refresh])

  const value = useMemo<AuthCtx>(
    () => ({
      user,
      loading,
      refresh,
      signUp: async (i) => {
        const u = await api.auth.signUp(i)
        setUser(u)
        return u
      },
      login: async (i) => {
        const u = await api.auth.login(i)
        setUser(u)
        return u
      },
      loginWithGoogle: async () => {
        const u = await api.auth.loginWithGoogle()
        setUser(u)
        return u
      },
      logout: async () => {
        await api.auth.logout()
        setUser(null)
      },
    }),
    [user, loading, refresh],
  )
  return <Auth.Provider value={value}>{children}</Auth.Provider>
}

export function useAuth() {
  const c = useContext(Auth)
  if (!c) throw new Error('useAuth outside AuthProvider')
  return c
}

/* --------------------------------- toasts --------------------------------- */

interface Toast {
  id: number
  text: string
  kind: 'ok' | 'error' | 'info'
}
interface ToastCtx {
  toast(text: string, kind?: Toast['kind']): void
}
const ToastC = createContext<ToastCtx>({ toast: () => undefined })

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([])
  const toast = useCallback((text: string, kind: Toast['kind'] = 'ok') => {
    const id = Date.now() + Math.random()
    setItems((l) => [...l.slice(-3), { id, text, kind }])
    setTimeout(() => setItems((l) => l.filter((t) => t.id !== id)), 3600)
  }, [])
  const value = useMemo(() => ({ toast }), [toast])
  return (
    <ToastC.Provider value={value}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={`toast toast-${t.kind}`}>
            <Icon name={t.kind === 'error' ? 'alert' : t.kind === 'info' ? 'info' : 'check'} size={18} />
            <span>{t.text}</span>
          </div>
        ))}
      </div>
    </ToastC.Provider>
  )
}

export const useToast = () => useContext(ToastC).toast
