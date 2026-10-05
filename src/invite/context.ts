import { createContext, useContext } from 'react'
import type { AnalyticsKind, Invitation, Photo } from '../types'

export interface InviteCtx {
  inv: Invitation
  /** preview = inside the dashboard editor: nothing is written to the guest database. */
  mode: 'public' | 'preview'
  track(kind: AnalyticsKind): void
  openPhotos(photos: Photo[], index: number, slideshow?: boolean): void
  scrollTo(id: string): void
  shareUrl: string
}

export const InviteContext = createContext<InviteCtx | null>(null)

export function useInvite(): InviteCtx {
  const c = useContext(InviteContext)
  if (!c) throw new Error('useInvite outside InvitationView')
  return c
}
