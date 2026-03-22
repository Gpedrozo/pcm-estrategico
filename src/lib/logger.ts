import { captureError } from '@/lib/monitoring'

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogPayload {
  level: LogLevel
  message: string
  context?: Record<string, unknown>
  timestamp: string
}

function write(payload: LogPayload) {
  const serialized = JSON.stringify(payload)

  if (payload.level === 'error') {
    console.error(serialized)
    captureError(new Error(payload.message), payload.context)
    return
  }

  if (payload.level === 'warn') {
    console.warn(serialized)
    return
  }

  if (payload.level === 'debug') {
    if (import.meta.env.DEV) {
      console.debug(serialized)
    }
    return
  }

  console.info(serialized)
}

export const logger = {
  debug(message: string, context?: Record<string, unknown>) {
    write({ level: 'debug', message, context, timestamp: new Date().toISOString() })
  },
  info(message: string, context?: Record<string, unknown>) {
    write({ level: 'info', message, context, timestamp: new Date().toISOString() })
  },
  warn(message: string, context?: Record<string, unknown>) {
    write({ level: 'warn', message, context, timestamp: new Date().toISOString() })
  },
  error(message: string, context?: Record<string, unknown>) {
    write({ level: 'error', message, context, timestamp: new Date().toISOString() })
  },
}
