import { useCallback, useState, type ReactNode } from 'react'
import { AnnounceContext, type Tone } from './announce'

interface Message {
  text: string
  tone: Tone
}

/**
 * Provides `useAnnounce()` and renders a visible, polite live region. The region stays
 * mounted so screen readers pick up every change to its text.
 */
export function AnnouncerProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<Message>({ text: '', tone: 'info' })
  const announce = useCallback((text: string, tone: Tone = 'info') => setMessage({ text, tone }), [])

  return (
    <AnnounceContext.Provider value={announce}>
      <div role="status" aria-live="polite" aria-atomic="true" className={`announcer announcer--${message.tone}`}>
        {message.text}
      </div>
      {children}
    </AnnounceContext.Provider>
  )
}
