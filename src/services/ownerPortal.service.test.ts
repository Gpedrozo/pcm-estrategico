import { beforeEach, describe, expect, it, vi } from 'vitest'
import { callOwnerAdmin, deleteCompanyByOwner, purgeTableData } from './ownerPortal.service'

const { getSession, invoke, rpc } = vi.hoisted(() => ({
  getSession: vi.fn(),
  invoke: vi.fn(),
  rpc: vi.fn(),
}))

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: { getSession },
    functions: { invoke },
    rpc,
  },
}))

describe('ownerPortal.service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getSession.mockResolvedValue({
      data: {
        session: {
          access_token: 'token-test',
        },
      },
    })
  })

  it('retorna erro sanitizado quando API devolve owner error payload', async () => {
    invoke.mockResolvedValue({
      data: { success: false, error: 'Forbidden' },
      error: null,
    })

    await expect(callOwnerAdmin({ action: 'list_companies' })).rejects.toThrow('Forbidden')
  })

  it('retorna erro de senha incorreta no purge', async () => {
    invoke.mockResolvedValue({
      data: null,
      error: {
        message: 'Edge Function returned a non-2xx status code',
        context: {
          status: 401,
          statusText: 'Unauthorized',
          clone() { return this },
          async json() {
            return { error: 'Senha inválida para confirmar a operação.' }
          },
          async text() {
            return ''
          },
        },
      },
    })

    await expect(
      purgeTableData({ table_name: 'ordens_servico', empresa_id: 'emp-1', auth_password: 'senha-errada' }),
    ).rejects.toThrow('Senha inválida para confirmar a operação.')
  })

  it('executa delete_company quando backend suporta a ação', async () => {
    invoke
      .mockResolvedValueOnce({
        data: {
          service: 'owner-portal-admin',
          status: 'ok',
          version: 'test',
          supported_actions: ['delete_company'],
          timestamp: new Date().toISOString(),
        },
        error: null,
      })
      .mockResolvedValueOnce({
        data: { success: true, operation_id: 'op-123' },
        error: null,
      })

    const result = await deleteCompanyByOwner({
      empresa_id: 'emp-1',
      auth_password: 'senha-certa',
      include_auth_users: true,
    })

    expect(result).toEqual({ success: true, operation_id: 'op-123' })
    expect(invoke).toHaveBeenCalledTimes(2)
  })

  it('bloqueia delete_company quando backend não suporta ação', async () => {
    invoke.mockResolvedValue({
      data: {
        service: 'owner-portal-admin',
        status: 'ok',
        version: 'legacy',
        supported_actions: ['list_companies'],
        timestamp: new Date().toISOString(),
      },
      error: null,
    })

    await expect(deleteCompanyByOwner({
      empresa_id: 'emp-1',
      auth_password: 'senha-certa',
    })).rejects.toThrow('Acao delete_company indisponivel no backend owner.')
  })
})
