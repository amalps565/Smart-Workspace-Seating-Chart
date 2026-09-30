import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { LoginPage } from './auth/LoginPage'
import { signOut, useCurrentUser, type CurrentUser } from './auth/session'
import { SocketContext } from './features/floor/context'
import { FloorPage } from './features/floor/FloorPage'
import { createStompSocket, type FloorSocket } from './features/floor/socket'

interface AppProps {
  /** Injected in tests to replace the real STOMP client. */
  createSocket?: () => FloorSocket
  queryClient?: QueryClient
}

function createQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 30_000 } } })
}

function App({ createSocket = createStompSocket, queryClient }: AppProps) {
  const [client] = useState(() => queryClient ?? createQueryClient())
  const user = useCurrentUser()

  return (
    <QueryClientProvider client={client}>
      {user ? <SignedIn key={user.username} user={user} createSocket={createSocket} /> : <LoginPage />}
    </QueryClientProvider>
  )
}

function SignedIn({ user, createSocket }: { user: CurrentUser; createSocket: () => FloorSocket }) {
  const queryClient = useQueryClient()
  const [socket] = useState(createSocket)

  useEffect(() => {
    socket.start()
    return () => {
      socket.stop()
      // Drop the signed-in user's cached data (also after a 401 signs them out).
      queryClient.clear()
    }
  }, [socket, queryClient])

  return (
    <SocketContext.Provider value={socket}>
      <FloorPage user={user} onSignOut={signOut} />
    </SocketContext.Provider>
  )
}

export default App
