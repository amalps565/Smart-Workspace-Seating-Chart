import { setupServer } from 'msw/node'

/** MSW server shared by all tests. Each test registers its handlers with `server.use`. */
export const server = setupServer()
