import { describe, it, expect } from 'vitest'
import { OWNER_TABS, OWNER_TAB_LABELS } from '@/pages/owner2/owner2Types'
import type { OwnerTab, CompanyCredentialNote, CriticalActionRequest } from '@/pages/owner2/owner2Types'

describe('owner2Types', () => {
  it('OWNER_TABS has 16 entries', () => {
    expect(OWNER_TABS).toHaveLength(16)
  })

  it('OWNER_TABS includes all expected tabs', () => {
    const expected = [
      'dashboard', 'monitoramento', 'cadastro', 'empresas', 'usuarios',
      'comercial', 'financeiro', 'contratos', 'suporte',
      'configuracoes', 'feature-flags', 'auditoria', 'logs',
      'sistema', 'owner-master', 'dispositivos',
    ]
    for (const tab of expected) {
      expect(OWNER_TABS).toContain(tab)
    }
  })

  it('OWNER_TAB_LABELS has a label for every tab', () => {
    for (const tab of OWNER_TABS) {
      expect(OWNER_TAB_LABELS[tab]).toBeTruthy()
      expect(typeof OWNER_TAB_LABELS[tab]).toBe('string')
    }
  })

  it('OWNER_TAB_LABELS values are non-empty strings', () => {
    for (const tab of OWNER_TABS) {
      expect(OWNER_TAB_LABELS[tab].length).toBeGreaterThan(0)
    }
  })

  it('type CompanyCredentialNote has expected shape', () => {
    const note: CompanyCredentialNote = {
      companyName: 'Test',
      companySlug: 'test',
      masterEmail: 'a@b.com',
      initialPassword: '123',
      loginUrl: 'https://test.gppis.com.br',
      noteText: 'note',
    }
    expect(note.companyName).toBe('Test')
  })

  it('type CriticalActionRequest has expected shape', () => {
    const action: CriticalActionRequest = {
      title: 'Delete',
      description: 'Delete company',
      confirmText: 'DELETE',
      action: 'delete_company',
      payload: { empresa_id: '123' },
      successMessage: 'Deleted',
      masterOnly: true,
    }
    expect(action.action).toBe('delete_company')
  })
})
