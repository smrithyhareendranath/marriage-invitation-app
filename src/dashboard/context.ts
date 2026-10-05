import { createContext, useContext } from 'react'
import type { Invitation, User } from '../types'
import type { PlanLimits } from '../data/pricing'

export type SaveState = 'saved' | 'dirty' | 'saving' | 'error'

export interface BuilderCtx {
  inv: Invitation
  user: User
  limits: PlanLimits
  saveState: SaveState
  photoCount: number
  update(patch: Partial<Invitation> | ((i: Invitation) => Invitation)): void
  saveNow(): Promise<void>
  setPublished(v: boolean): Promise<void>
  go(tab: string): void
  refreshUser(): Promise<void>
}

export const BuilderContext = createContext<BuilderCtx | null>(null)

export function useBuilder(): BuilderCtx {
  const c = useContext(BuilderContext)
  if (!c) throw new Error('useBuilder outside dashboard')
  return c
}

export function countPhotos(inv: Invitation): number {
  return inv.albums.reduce((n, a) => n + a.photos.length, 0)
}
