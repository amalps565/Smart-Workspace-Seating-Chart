import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterAll, afterEach, beforeAll } from 'vitest'
import { resetSessionForTests } from '../auth/session'
import { renderProbe } from '../features/floor/renderProbe'
import { server } from './server'

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' })
})

afterEach(() => {
  cleanup()
  server.resetHandlers()
  sessionStorage.clear()
  resetSessionForTests()
  renderProbe.onCellRender = undefined
})

afterAll(() => {
  server.close()
})
