import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockInit = vi.fn()
const mockWithScope = vi.fn()
const mockCaptureException = vi.fn()
const mockSetUser = vi.fn()
const mockSetTag = vi.fn()

vi.mock('@sentry/react', () => ({
  init: mockInit,
  browserTracingIntegration: vi.fn(() => ({})),
  replayIntegration: vi.fn(() => ({})),
  withScope: mockWithScope,
  captureException: mockCaptureException,
  setUser: mockSetUser,
  setTag: mockSetTag,
}))

describe('monitoring', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it('initMonitoring does not crash when SENTRY_DSN is empty', async () => {
    const mod = await import('@/lib/monitoring')
    expect(() => mod.initMonitoring()).not.toThrow()
  })

  it('captureError does not throw when not initialized', async () => {
    const mod = await import('@/lib/monitoring')
    expect(() => mod.captureError(new Error('test'))).not.toThrow()
  })

  it('setMonitoringUser does not throw when not initialized', async () => {
    const mod = await import('@/lib/monitoring')
    expect(() => mod.setMonitoringUser('id1', 'a@b.com')).not.toThrow()
  })

  it('setMonitoringTag does not throw when not initialized', async () => {
    const mod = await import('@/lib/monitoring')
    expect(() => mod.setMonitoringTag('env', 'test')).not.toThrow()
  })

  it('all exported functions exist', async () => {
    const mod = await import('@/lib/monitoring')
    expect(typeof mod.initMonitoring).toBe('function')
    expect(typeof mod.captureError).toBe('function')
    expect(typeof mod.setMonitoringUser).toBe('function')
    expect(typeof mod.setMonitoringTag).toBe('function')
  })
})
