import type { ConnectionStatus } from './socket'

const TEXT: Record<ConnectionStatus, string> = {
  connected: 'Live',
  connecting: 'Connecting… the map may be out of date',
  reconnecting: 'Reconnecting… the map may be out of date',
}

export function ConnectionIndicator({ status }: { status: ConnectionStatus }) {
  return (
    <p className={`connection connection--${status}`} data-testid="connection-status">
      <span className="connection__dot" aria-hidden="true">
        {status === 'connected' ? '●' : '◌'}
      </span>
      {TEXT[status]}
    </p>
  )
}
