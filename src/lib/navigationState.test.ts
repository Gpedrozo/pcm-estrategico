import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('@/lib/security', () => ({
  getPostLoginPath: vi.fn().mockReturnValue('/dashboard'),
}))

import { isPersistableAppPath, persistLastAppRoute, consumePreferredPostLoginPath } from '@/lib/navigationState'

describe('isPersistableAppPath', () => {
  it('returns false for empty string', () => {
    expect(isPersistableAppPath('')).toBe(false)
  })
  it('returns false for root path', () => {
    expect(isPersistableAppPath('/')).toBe(false)
  })
  it('returns false for blocked prefixes', () => {
    expect(isPersistableAppPath('/login')).toBe(false)
    expect(isPersistableAppPath('/login?redirect=/admin')).toBe(false)
    expect(isPersistableAppPath('/forgot-password')).toBe(false)
    expect(isPersistableAppPath('/reset-password')).toBe(false)
    expect(isPersistableAppPath('/change-password')).toBe(false)
  })
  it('returns false for paths not starting with /', () => {
    expect(isPersistableAppPath('dashboard')).toBe(false)
  })
  it('returns true for valid app paths', () => {
    expect(isPersistableAppPath('/dashboard')).toBe(true)
    expect(isPersistableAppPath('/ordens-servico')).toBe(true)
    expect(isPersistableAppPath('/admin/settings')).toBe(true)
    expect(isPersistableAppPath('/equipamentos?tab=all')).toBe(true)
  })
})

describe('persistLastAppRoute', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  it('saves valid path to sessionStorage', () => {
    persistLastAppRoute('/dashboard')
    expect(sessionStorage.getItem('pcm.nav.last_route.v1')).toBe('/dashboard')
  })

  it('does not save blocked paths', () => {
    persistLastAppRoute('/login')
    expect(sessionStorage.getItem('pcm.nav.last_route.v1')).toBeNull()
  })

  it('does not save empty path', () => {
    persistLastAppRoute('')
    expect(sessionStorage.getItem('pcm.nav.last_route.v1')).toBeNull()
  })
})

describe('consumePreferredPostLoginPath', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  it('returns fallback when no stored route', () => {
    const result = consumePreferredPostLoginPath('ADMIN')
    expect(result).toBe('/dashboard')
  })

  it('returns stored route when available', () => {
    sessionStorage.setItem('pcm.nav.last_route.v1', '/equipamentos')
    const result = consumePreferredPostLoginPath('ADMIN')
    expect(result).toBe('/equipamentos')
  })

  it('returns fallback when stored route is a blocked path', () => {
    sessionStorage.setItem('pcm.nav.last_route.v1', '/login')
    const result = consumePreferredPostLoginPath('ADMIN')
    expect(result).toBe('/dashboard')
  })
})
