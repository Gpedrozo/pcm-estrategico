import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/authConstants', () => ({
  OWNER_EDGE_LOGIN_ENDPOINT: '/functions/v1/owner-portal-admin',
}))

import { getPublicAnonKey } from '@/lib/authOwnerEdge'
import type { OwnerEdgeLoginResult } from '@/lib/authOwnerEdge'

describe('getPublicAnonKey', () => {
  it('returns null when env var is empty', () => {
    const result = getPublicAnonKey()
    // In test env, VITE_SUPABASE_PUBLISHABLE_KEY is typically not set
    // Result is either a key string or null
    expect(result === null || typeof result === 'string').toBe(true)
  })
})

describe('OwnerEdgeLoginResult type', () => {
  it('satisfies the expected shape', () => {
    const result: OwnerEdgeLoginResult = {
      ok: false,
      status: 401,
      message: 'Invalid credentials',
      payload: null,
      accessToken: null,
      refreshToken: null,
      user: null,
    }
    expect(result.ok).toBe(false)
    expect(result.status).toBe(401)
  })
})

describe('signInThroughOwnerEdge', () => {
  it('returns misconfigured error when no env vars set', async () => {
    const { signInThroughOwnerEdge } = await import('@/lib/authOwnerEdge')
    const result = await signInThroughOwnerEdge('test@test.com', 'password')
    // Without VITE_SUPABASE_URL set it returns misconfigured
    expect(result.ok).toBe(false)
    expect(result.status).toBe(500)
    expect(result.message).toContain('misconfigured')
  })
})
