import { useMutation } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { api } from '../api/endpoints'
import { friendlyMessage } from '../api/errors'
import { signIn } from './session'

export function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const login = useMutation({
    mutationFn: () => api.login(username.trim(), password),
    onSuccess: (result) => signIn(result),
  })

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (!login.isPending) login.mutate()
  }

  return (
    <main className="app login">
      <h1>Hot-Desking Map</h1>
      <form className="login__form" onSubmit={onSubmit} aria-labelledby="login-heading">
        <h2 id="login-heading">Sign in</h2>
        <label>
          Username
          <input
            name="username"
            autoComplete="username"
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </label>
        <label>
          Password
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {login.isError && (
          <p role="alert" className="form-error">
            {friendlyMessage(login.error)}
          </p>
        )}
        <button type="submit" aria-disabled={login.isPending || undefined}>
          {login.isPending ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </main>
  )
}
