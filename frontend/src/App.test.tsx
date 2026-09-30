import { screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { makeSnapshot } from './test/fixtures'
import { server } from './test/server'
import { mockBackend, renderApp, signInAsAlice } from './test/utils'

describe('App', () => {
  it('renders the page heading', () => {
    renderApp()

    expect(screen.getByRole('heading', { name: 'Hot-Desking Map' })).toBeInTheDocument()
  })

  it('signs in and shows the floor', async () => {
    let sent: unknown = null
    server.use(
      http.post('*/api/auth/login', async ({ request }) => {
        sent = await request.json()
        return HttpResponse.json({ token: 'jwt-1', username: 'alice', displayName: 'Alice Anders' })
      }),
    )
    let authHeader: string | null = null
    mockBackend({ snapshot: () => makeSnapshot() })
    server.use(
      http.get('*/api/floors', ({ request }) => {
        authHeader = request.headers.get('Authorization')
        return HttpResponse.json([{ id: 1, name: 'Floor 3', rows: 3, cols: 4, neighbourMode: 'ORTHOGONAL' }])
      }),
    )
    const { user, socket } = renderApp()

    await user.type(screen.getByLabelText('Username'), 'alice')
    await user.type(screen.getByLabelText('Password'), 'password')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByText('Signed in as Alice Anders')).toBeInTheDocument()
    expect(await screen.findByRole('grid', { name: /Desks on Floor 3/ })).toBeInTheDocument()
    expect(sent).toEqual({ username: 'alice', password: 'password' })
    expect(authHeader).toBe('Bearer jwt-1')
    expect(socket.started).toBe(true)
  })

  it('shows an error for wrong credentials', async () => {
    server.use(
      http.post('*/api/auth/login', () =>
        HttpResponse.json({ code: 'INVALID_CREDENTIALS', message: 'Bad credentials' }, { status: 401 }),
      ),
    )
    const { user } = renderApp()

    await user.type(screen.getByLabelText('Username'), 'alice')
    await user.type(screen.getByLabelText('Password'), 'nope')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Wrong username or password.')
    expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument()
  })

  it('signs out when any API call returns 401', async () => {
    signInAsAlice()
    server.use(
      http.get('*/api/floors', () => HttpResponse.json({ code: 'UNAUTHORIZED', message: 'Expired' }, { status: 401 })),
      http.get('*/api/bookings/me', () => HttpResponse.json([])),
    )
    const { socket } = renderApp()

    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument()
    expect(sessionStorage.length).toBe(0)
    expect(socket.started).toBe(false)
  })
})
