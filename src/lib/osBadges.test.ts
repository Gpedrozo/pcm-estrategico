import { describe, it, expect } from 'vitest'
import { normalizeOSType, normalizeOSStatus } from '@/lib/osBadges'

describe('normalizeOSType', () => {
  it('returns valid type as-is', () => {
    expect(normalizeOSType('CORRETIVA')).toBe('CORRETIVA')
    expect(normalizeOSType('PREVENTIVA')).toBe('PREVENTIVA')
    expect(normalizeOSType('PREDITIVA')).toBe('PREDITIVA')
    expect(normalizeOSType('INSPECAO')).toBe('INSPECAO')
    expect(normalizeOSType('MELHORIA')).toBe('MELHORIA')
  })
  it('returns CORRETIVA for invalid input', () => {
    expect(normalizeOSType('INVALIDO')).toBe('CORRETIVA')
    expect(normalizeOSType('')).toBe('CORRETIVA')
    expect(normalizeOSType('corretiva')).toBe('CORRETIVA')
  })
})

describe('normalizeOSStatus', () => {
  it('returns valid status as-is', () => {
    expect(normalizeOSStatus('ABERTA')).toBe('ABERTA')
    expect(normalizeOSStatus('EM_ANDAMENTO')).toBe('EM_ANDAMENTO')
    expect(normalizeOSStatus('AGUARDANDO_MATERIAL')).toBe('AGUARDANDO_MATERIAL')
    expect(normalizeOSStatus('AGUARDANDO_APROVACAO')).toBe('AGUARDANDO_APROVACAO')
    expect(normalizeOSStatus('FECHADA')).toBe('FECHADA')
    expect(normalizeOSStatus('CANCELADA')).toBe('CANCELADA')
  })
  it('returns ABERTA for invalid input', () => {
    expect(normalizeOSStatus('INVALIDO')).toBe('ABERTA')
    expect(normalizeOSStatus('')).toBe('ABERTA')
    expect(normalizeOSStatus('aberta')).toBe('ABERTA')
  })
})
