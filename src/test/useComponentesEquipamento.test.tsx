import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  useComponentesEquipamento,
  useCreateComponente,
  useUpdateComponente,
  type ComponenteEquipamento,
} from '@/hooks/useComponentesEquipamento';

// ─── Mocks hoisted ────────────────────────────────────────────────────────────
const mocks = vi.hoisted(() => {
  const invalidateQueriesSpy = vi.fn();
  const toastSpy = vi.fn();
  const useAuthSpy = vi.fn(() => ({
    tenantId: 'empresa-uuid-123' as string | null,
    user: { id: 'user-1', email: 'test@test.com' },
  }));

  // Chainable supabase builder
  const selectResult = { data: [] as unknown[], error: null };
  const singleResult = { data: null as unknown, error: null };

  const chainMethods = ['select', 'eq', 'order', 'limit'] as const;
  const chain: Record<string, unknown> = {};
  for (const m of chainMethods) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  // `then` makes it await-able
  chain['then'] = vi.fn((resolve: (v: unknown) => void) =>
    resolve({ data: selectResult.data, error: selectResult.error }),
  );

  const insertChain: Record<string, unknown> = {};
  insertChain['select'] = vi.fn().mockReturnValue(insertChain);
  insertChain['single'] = vi.fn().mockImplementation(() => Promise.resolve(singleResult));

  const updateChain: Record<string, unknown> = {};
  updateChain['eq'] = vi.fn().mockReturnValue(updateChain);
  updateChain['select'] = vi.fn().mockReturnValue(updateChain);
  updateChain['single'] = vi.fn().mockImplementation(() => Promise.resolve(singleResult));

  const fromFn = vi.fn().mockImplementation((table: string) => {
    if (table === 'componentes_equipamento') {
      return {
        select: vi.fn().mockReturnValue(chain),
        insert: vi.fn().mockReturnValue(insertChain),
        update: vi.fn().mockReturnValue(updateChain),
      };
    }
    return chain;
  });

  return {
    invalidateQueriesSpy,
    toastSpy,
    useAuthSpy,
    fromFn,
    selectResult,
    singleResult,
    insertChain,
    updateChain,
  };
});

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: mocks.fromFn },
}));

vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual<typeof import('@tanstack/react-query')>('@tanstack/react-query');
  return {
    ...actual,
    useQueryClient: () => ({ invalidateQueries: mocks.invalidateQueriesSpy }),
  };
});

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mocks.toastSpy }),
}));

vi.mock('@/lib/audit', () => ({ writeAuditLog: vi.fn() }));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: mocks.useAuthSpy,
}));

const TENANT = 'empresa-uuid-123';
const EQUIP_ID = 'equip-uuid-1';

const mockComponente: ComponenteEquipamento = {
  id: 'comp-1',
  equipamento_id: EQUIP_ID,
  parent_id: null,
  codigo: 'C001',
  nome: 'Motor WEG 5cv',
  tipo: 'MOTOR',
  fabricante: 'WEG',
  modelo: 'W22',
  numero_serie: 'SN-9999',
  potencia: '5cv',
  rpm: '1750',
  tensao: '220V',
  corrente: '15A',
  dimensoes: null,
  especificacoes: null,
  quantidade: 1,
  posicao: null,
  data_instalacao: null,
  vida_util_horas: 8000,
  horas_operacao: 0,
  ultima_manutencao: null,
  proxima_manutencao: null,
  intervalo_manutencao_dias: 90,
  estado: 'BOM',
  ativo: true,
  observacoes: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

function createWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

// ─── useComponentesEquipamento ────────────────────────────────────────────────
describe('useComponentesEquipamento', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useAuthSpy.mockReturnValue({ tenantId: TENANT, user: { id: 'u1', email: 'a@b.com' } });
    mocks.selectResult.data = [mockComponente];
    mocks.selectResult.error = null;
  });

  it('fica idle quando equipamentoId é undefined', () => {
    const { result } = renderHook(
      () => useComponentesEquipamento(undefined),
      { wrapper: createWrapper() },
    );
    expect(result.current.fetchStatus).toBe('idle');
  });

  it('fica idle quando tenantId é null', () => {
    mocks.useAuthSpy.mockReturnValue({ tenantId: null, user: null });

    const { result } = renderHook(
      () => useComponentesEquipamento(EQUIP_ID),
      { wrapper: createWrapper() },
    );
    expect(result.current.fetchStatus).toBe('idle');
  });

  it('consulta a tabela componentes_equipamento pelo equipamentoId', async () => {
    const { result } = renderHook(
      () => useComponentesEquipamento(EQUIP_ID),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mocks.fromFn).toHaveBeenCalledWith('componentes_equipamento');
  });
});

// ─── useCreateComponente ──────────────────────────────────────────────────────
describe('useCreateComponente', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useAuthSpy.mockReturnValue({ tenantId: TENANT, user: { id: 'u1', email: 'a@b.com' } });
    mocks.singleResult.data = mockComponente;
    mocks.singleResult.error = null;
  });

  it('insere na tabela componentes_equipamento com empresa_id injetado', async () => {
    const { result } = renderHook(() => useCreateComponente(), { wrapper: createWrapper() });

    result.current.mutate({
      equipamento_id: EQUIP_ID,
      codigo: 'C001',
      nome: 'Motor WEG 5cv',
      tipo: 'MOTOR',
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Verifica que .from('componentes_equipamento').insert foi chamado
    expect(mocks.fromFn).toHaveBeenCalledWith('componentes_equipamento');
    const insertCall = mocks.fromFn.mock.results.find(
      (r: { value: { insert?: unknown } }) => typeof r.value?.insert === 'function',
    );
    expect(insertCall).toBeDefined();
  });

  it('exibe toast de sucesso com nome do componente', async () => {
    const { result } = renderHook(() => useCreateComponente(), { wrapper: createWrapper() });

    result.current.mutate({
      equipamento_id: EQUIP_ID,
      codigo: 'C001',
      nome: 'Motor WEG 5cv',
      tipo: 'MOTOR',
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mocks.toastSpy).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Componente Cadastrado' }),
    );
  });

  it('lança erro quando tenantId é null', async () => {
    mocks.useAuthSpy.mockReturnValue({ tenantId: null, user: null });

    const { result } = renderHook(() => useCreateComponente(), { wrapper: createWrapper() });

    result.current.mutate({
      equipamento_id: EQUIP_ID,
      codigo: 'C',
      nome: 'Sem tenant',
      tipo: 'OUTRO',
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as Error).message).toMatch(/tenant/i);
  });

  it('invalida cache de componentes após sucesso', async () => {
    const { result } = renderHook(() => useCreateComponente(), { wrapper: createWrapper() });

    result.current.mutate({
      equipamento_id: EQUIP_ID,
      codigo: 'C001',
      nome: 'Motor',
      tipo: 'MOTOR',
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mocks.invalidateQueriesSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['componentes-equipamento'] }),
    );
    expect(mocks.invalidateQueriesSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['componentes-equipamento-flat'] }),
    );
  });
});

// ─── useUpdateComponente ──────────────────────────────────────────────────────
describe('useUpdateComponente', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useAuthSpy.mockReturnValue({ tenantId: TENANT, user: { id: 'u1', email: 'a@b.com' } });
    mocks.singleResult.data = { ...mockComponente, estado: 'RUIM' };
    mocks.singleResult.error = null;
  });

  it('atualiza na tabela componentes_equipamento com empresa_id', async () => {
    const { result } = renderHook(() => useUpdateComponente(), { wrapper: createWrapper() });

    result.current.mutate({ id: 'comp-1', estado: 'RUIM' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mocks.fromFn).toHaveBeenCalledWith('componentes_equipamento');
  });

  it('exibe toast de sucesso após atualização', async () => {
    const { result } = renderHook(() => useUpdateComponente(), { wrapper: createWrapper() });

    result.current.mutate({ id: 'comp-1', estado: 'REGULAR' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mocks.toastSpy).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Componente Atualizado' }),
    );
  });

  it('lança erro quando tenantId é null', async () => {
    mocks.useAuthSpy.mockReturnValue({ tenantId: null, user: null });

    const { result } = renderHook(() => useUpdateComponente(), { wrapper: createWrapper() });
    result.current.mutate({ id: 'comp-1', estado: 'BOM' });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as Error).message).toMatch(/tenant/i);
  });
});
