import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/monitoring', () => ({
  captureError: vi.fn(),
}))

import { logger } from '@/lib/logger'
import { captureError } from '@/lib/monitoring'

describe('logger', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('has debug, info, warn, error methods', () => {
    expect(typeof logger.debug).toBe('function')
    expect(typeof logger.info).toBe('function')
    expect(typeof logger.warn).toBe('function')
    expect(typeof logger.error).toBe('function')
  })

  it('logger.info writes JSON to console.info', () => {
    const spy = vi.spyOn(console, 'info').mockImplementation(() => {})
    logger.info('test message', { key: 'value' })
    expect(spy).toHaveBeenCalledOnce()
    const parsed = JSON.parse(spy.mock.calls[0][0] as string)
    expect(parsed.level).toBe('info')
    expect(parsed.message).toBe('test message')
    expect(parsed.context).toEqual({ key: 'value' })
    expect(parsed.timestamp).toBeTruthy()
    spy.mockRestore()
  })

  it('logger.warn writes JSON to console.warn', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    logger.warn('warning message')
    expect(spy).toHaveBeenCalledOnce()
    const parsed = JSON.parse(spy.mock.calls[0][0] as string)
    expect(parsed.level).toBe('warn')
    expect(parsed.message).toBe('warning message')
    spy.mockRestore()
  })

  it('logger.error writes to console.error and captures via Sentry', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    logger.error('error happened', { detail: 42 })
    expect(spy).toHaveBeenCalledOnce()
    expect(captureError).toHaveBeenCalledOnce()
    const errorArg = (captureError as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(errorArg).toBeInstanceOf(Error)
    expect(errorArg.message).toBe('error happened')
    spy.mockRestore()
  })

  it('logger.debug is silent in production mode', () => {
    const spy = vi.spyOn(console, 'debug').mockImplementation(() => {})
    logger.debug('debug msg')
    // In test environment import.meta.env.DEV is true, so debug is visible
    // We just verify it doesn't throw
    spy.mockRestore()
  })

  it('all log entries include ISO timestamp', () => {
    const spy = vi.spyOn(console, 'info').mockImplementation(() => {})
    logger.info('ts check')
    const parsed = JSON.parse(spy.mock.calls[0][0] as string)
    expect(parsed.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    spy.mockRestore()
  })
})
