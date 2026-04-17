import { beforeEach, describe, expect, it, vi } from 'vitest'
import { callOwnerAdmin, deleteCompanyByOwner, listPlans, listSubscriptions, purgeTableData } from './ownerPortal.service'

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
<<<<<<< HEAD

  // ── Subscription / Plans consistency tests ──

  it('listPlans retorna planos com campos code e name mapeados', async () => {
    invoke.mockResolvedValue({
      data: {
        plans: [
          { id: 'plano-1', codigo: 'free', nome: 'Free', price_month: 0, code: 'free', name: 'Free' },
          { id: 'plano-2', codigo: 'basic', nome: 'Basico', price_month: 300, code: 'basic', name: 'Basico' },
        ],
      },
      error: null,
    })

    const plans = await listPlans()
    expect(plans).toHaveLength(2)
    // Ensure frontend-expected fields exist
    for (const p of plans) {
      expect(p.id).toBeTruthy()
      expect(typeof p.code === 'string' || p.code === null).toBe(true)
      expect(typeof p.name === 'string' || p.name === null).toBe(true)
    }
  })

  it('listSubscriptions retorna assinaturas com plan_id que pode ser encontrado em planos', async () => {
    const planId = 'plano-1'
    invoke
      .mockResolvedValueOnce({
        data: {
          subscriptions: [
            { id: 'sub-1', empresa_id: 'emp-1', plan_id: planId, status: 'ativa', planos: { id: planId, codigo: 'free', nome: 'Free' } },
          ],
        },
        error: null,
      })

    const subs = await listSubscriptions()
    expect(subs).toHaveLength(1)
    expect(subs[0].plan_id).toBe(planId)
    expect(subs[0].status).toBe('ativa')
  })

  it('listPlans IDs são compatíveis com subscription.plan_id (planos table)', async () => {
    const sharedPlanId = '22eb37ac-15df-4d67-a31a-e06b9c0318e6'
    // Simulate listPlans response (from planos table)
    invoke
      .mockResolvedValueOnce({
        data: {
          plans: [
            { id: sharedPlanId, codigo: 'free', nome: 'Free', price_month: 0, code: 'free', name: 'Free' },
          ],
        },
        error: null,
      })
      .mockResolvedValueOnce({
        data: {
          subscriptions: [
            { id: 'sub-1', empresa_id: 'emp-1', plan_id: sharedPlanId, status: 'ativa' },
          ],
        },
        error: null,
      })

    const plans = await listPlans()
    const subs = await listSubscriptions()

    // Critical: subscription.plan_id must match a plan.id
    const planIds = new Set(plans.map(p => p.id))
    for (const sub of subs) {
      if (sub.plan_id) {
        expect(planIds.has(sub.plan_id)).toBe(true)
      }
    }
  })

  it('listSubscriptions aceita status em português (ativa/teste/atrasada/cancelada)', async () => {
    const statuses = ['ativa', 'teste', 'atrasada', 'cancelada']
    invoke.mockResolvedValue({
      data: {
        subscriptions: statuses.map((s, i) => ({
          id: `sub-${i}`,
          empresa_id: `emp-${i}`,
          plan_id: 'plano-1',
          status: s,
        })),
      },
      error: null,
    })

    const subs = await listSubscriptions()
    const returnedStatuses = subs.map(s => s.status)
    expect(returnedStatuses).toEqual(statuses)
  })
=======

  // ── Subscription / Plans consistency tests ──

  it('listPlans retorna planos com campos code e name mapeados', async () => {
    invoke.mockResolvedValue({
      data: {
        plans: [
          { id: 'plano-1', codigo: 'free', nome: 'Free', price_month: 0, code: 'free', name: 'Free' },
          { id: 'plano-2', codigo: 'basic', nome: 'Basico', price_month: 300, code: 'basic', name: 'Basico' },
        ],
      },
      error: null,
    })

    const plans = await listPlans()
    expect(plans).toHaveLength(2)
    for (const p of plans) {
      expect(p.id).toBeTruthy()
      expect(typeof p.code === 'string' || p.code === null).toBe(true)
      expect(typeof p.name === 'string' || p.name === null).toBe(true)
    }
  })

  it('listSubscriptions retorna assinaturas com plan_id que pode ser encontrado em planos', async () => {
    const planId = 'plano-1'
    invoke
      .mockResolvedValueOnce({
        data: {
          subscriptions: [
            { id: 'sub-1', empresa_id: 'emp-1', plan_id: planId, status: 'ativa', planos: { id: planId, codigo: 'free', nome: 'Free' } },
          ],
        },
        error: null,
      })

    const subs = await listSubscriptions()
    expect(subs).toHaveLength(1)
    expect(subs[0].plan_id).toBe(planId)
    expect(subs[0].status).toBe('ativa')
  })

  it('listPlans IDs são compatíveis com subscription.plan_id (planos table)', async () => {
    const sharedPlanId = '22eb37ac-15df-4d67-a31a-e06b9c0318e6'
    invoke
      .mockResolvedValueOnce({
        data: {
          plans: [
            { id: sharedPlanId, codigo: 'free', nome: 'Free', price_month: 0, code: 'free', name: 'Free' },
          ],
        },
        error: null,
      })
      .mockResolvedValueOnce({
        data: {
          subscriptions: [
            { id: 'sub-1', empresa_id: 'emp-1', plan_id: sharedPlanId, status: 'ativa' },
          ],
        },
        error: null,
      })

    const plans = await listPlans()
    const subs = await listSubscriptions()

    const planIds = new Set(plans.map(p => p.id))
    for (const sub of subs) {
      if (sub.plan_id) {
        expect(planIds.has(sub.plan_id)).toBe(true)
      }
    }
  })

  it('listSubscriptions aceita status em português (ativa/teste/atrasada/cancelada)', async () => {
    const statuses = ['ativa', 'teste', 'atrasada', 'cancelada']
    invoke.mockResolvedValue({
      data: {
        subscriptions: statuses.map((s, i) => ({
          id: `sub-${i}`,
          empresa_id: `emp-${i}`,
          plan_id: 'plano-1',
          status: s,
        })),
      },
      error: null,
    })

    const subs = await listSubscriptions()
    const returnedStatuses = subs.map(s => s.status)
    expect(returnedStatuses).toEqual(statuses)
  })
>>>>>>> c1232ead9c597b7e3f6db18c57adcf1a346abf83
})
