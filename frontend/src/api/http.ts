import { authHeaders, signOut } from '../auth/session'
import { ApiError } from './errors'
import type { ErrorBody } from './types'

interface RequestOptions {
  method?: 'GET' | 'POST' | 'DELETE'
  body?: unknown
  /** The login call handles its own 401 and must not sign the user out. */
  anonymous?: boolean
}

function toUrl(path: string): string {
  return new URL(path, window.location.origin).toString()
}

async function readError(response: Response): Promise<ApiError> {
  let body: Partial<ErrorBody> = {}
  try {
    body = (await response.json()) as Partial<ErrorBody>
  } catch {
    // Not JSON (for example a proxy error page); fall back to the status.
  }
  const code = typeof body.code === 'string' ? body.code : response.status === 401 ? 'UNAUTHORIZED' : `HTTP_${response.status}`
  const message = typeof body.message === 'string' ? body.message : response.statusText
  return new ApiError(response.status, code, message)
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (!options.anonymous) Object.assign(headers, authHeaders())
  if (options.body !== undefined) headers['Content-Type'] = 'application/json'

  let response: Response
  try {
    response = await fetch(toUrl(path), {
      method: options.method ?? 'GET',
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    })
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', 'Network error')
  }

  if (!response.ok) {
    const error = await readError(response)
    if (response.status === 401 && !options.anonymous) signOut()
    throw error
  }
  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}
