import { createContext, useContext } from 'react'

export type Tone = 'info' | 'success' | 'error'
export type Announce = (text: string, tone?: Tone) => void

export const AnnounceContext = createContext<Announce>(() => {})

/** Posts a message to the page's polite `aria-live` region. */
export function useAnnounce(): Announce {
  return useContext(AnnounceContext)
}
