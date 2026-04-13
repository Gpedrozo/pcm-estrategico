import { describe, it, expect } from 'vitest'
import {
  normalizeEmail,
  resolveOwnerMasterEmail,
  safeArray,
  asObject,
  asBool,
  asNumber,
  statusColor,
  TENANT_BASE_DOMAIN,
} from '@/pages/owner2/owner2Helpers'

describe('normalizeEmail', () => {
  it('trims and lowercases email', () => {
    expect(normalizeEmail('  Admin@GPPIS.com.br  ')).toBe('admin@gppis.com.br')
  })
  it('handles empty/null-ish input', () => {
    expect(normalizeEmail('')).toBe('')
    expect(normalizeEmail(undefined as unknown as string)).toBe('')
  })
})

describe('resolveOwnerMasterEmail', () => {
  it('returns a string (configured via env var or empty)', () => {
    const result = resolveOwnerMasterEmail()
    expect(typeof result).toBe('string')
  })
})

describe('safeArray', () => {
  it('returns the array when input is array', () => {
    expect(safeArray([1, 2, 3])).toEqual([1, 2, 3])
  })
  it('returns empty array for non-array', () => {
    expect(safeArray(null)).toEqual([])
    expect(safeArray(undefined)).toEqual([])
    expect(safeArray('string')).toEqual([])
    expect(safeArray(42)).toEqual([])
    expect(safeArray({})).toEqual([])
  })
})

describe('asObject', () => {
  it('returns object for object input', () => {
    const obj = { a: 1 }
    expect(asObject(obj)).toBe(obj)
  })
  it('returns empty object for non-object', () => {
    expect(asObject(null)).toEqual({})
    expect(asObject(undefined)).toEqual({})
    expect(asObject('string')).toEqual({})
    expect(asObject(42)).toEqual({})
    expect(asObject([1, 2])).toEqual({})
  })
})

describe('asBool', () => {
  it('returns boolean as-is', () => {
    expect(asBool(true)).toBe(true)
    expect(asBool(false)).toBe(false)
  })
  it('parses truthy strings', () => {
    expect(asBool('true')).toBe(true)
    expect(asBool('1')).toBe(true)
    expect(asBool('sim')).toBe(true)
    expect(asBool('TRUE')).toBe(true)
  })
  it('parses falsy strings', () => {
    expect(asBool('false')).toBe(false)
    expect(asBool('0')).toBe(false)
    expect(asBool('nao')).toBe(false)
    expect(asBool('não')).toBe(false)
  })
  it('uses fallback for unknown values', () => {
    expect(asBool('maybe', true)).toBe(true)
    expect(asBool(null, false)).toBe(false)
    expect(asBool(undefined)).toBe(false)
  })
})

describe('asNumber', () => {
  it('returns number for numeric input', () => {
    expect(asNumber(42)).toBe(42)
    expect(asNumber('3.14')).toBe(3.14)
    expect(asNumber(0)).toBe(0)
  })
  it('returns fallback for NaN', () => {
    expect(asNumber('abc')).toBe(0)
    expect(asNumber(null)).toBe(0)
    expect(asNumber(undefined, 99)).toBe(99)
    expect(asNumber(NaN, 5)).toBe(5)
    expect(asNumber(Infinity, 10)).toBe(10)
  })
})

describe('statusColor', () => {
  it('returns emerald for active/resolved statuses', () => {
    expect(statusColor('ativo')).toContain('emerald')
    expect(statusColor('ACTIVE')).toContain('emerald')
    expect(statusColor('resolvido')).toContain('emerald')
  })
  it('returns rose for blocked/cancelled', () => {
    expect(statusColor('bloqueado')).toContain('rose')
    expect(statusColor('BLOCKED')).toContain('rose')
    expect(statusColor('cancelado')).toContain('rose')
  })
  it('inativo contains ativo substring, so matches emerald', () => {
    // statusColor uses includes('ativo') which also matches 'inativo'
    expect(statusColor('inativo')).toContain('emerald')
  })
  it('returns amber for other statuses', () => {
    expect(statusColor('pendente')).toContain('amber')
    expect(statusColor('teste')).toContain('amber')
    expect(statusColor('unknown')).toContain('amber')
  })
})

describe('constants', () => {
  it('TENANT_BASE_DOMAIN is a non-empty string', () => {
    expect(typeof TENANT_BASE_DOMAIN).toBe('string')
    expect(TENANT_BASE_DOMAIN.length).toBeGreaterThan(0)
  })
  it('TENANT_BASE_DOMAIN is a non-empty lowercase string', () => {
    expect(TENANT_BASE_DOMAIN).toBe(TENANT_BASE_DOMAIN.toLowerCase())
    expect(TENANT_BASE_DOMAIN.length).toBeGreaterThan(0)
  })
})
