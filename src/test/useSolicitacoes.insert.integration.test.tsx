import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useCreateSolicitacao } from '@/hooks/useSolicitacoes';

const mocks = vi.hoisted(() => {
  const invalidateQueriesSpy = vi.fn();
  const toastSpy = vi.fn();
  const singleSpy = vi.fn();
  const limitSpy = vi.fn();
  const probeSelectSpy = vi.fn(() => ({ limit: limitSpy }));
  const selectSpy = vi.fn(() => ({ single: singleSpy }));
  const insertSpy = vi.fn(() => ({ select: selectSpy }));
  const fromSpy = vi.fn(() => ({
    insert: insertSpy,
    select: probeSelectSpy,
  }));

  return {
    invalidateQueriesSpy,
    toastSpy,
    singleSpy,
    limitSpy,
    probeSelectSpy,
    selectSpy,
    insertSpy,
    fromSpy,
  };
});

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: mocks.fromSpy,
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  },
}));

vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual<typeof import('@tanstack/react-query')>('@tanstack/react-query');
  return {
    ...actual,
    useQueryClient: () => ({
      invalidateQueries: mocks.invalidateQueriesSpy,
    }),
  };
});

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: mocks.toastSpy,
  }),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ tenantId: 'tenant-test-id' }),
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('useCreateSolicitacao integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.limitSpy.mockResolvedValue({ data: [], error: null });

    mocks.singleSpy.mockResolvedValue({
      data: {
        id: 'sol-1',
        numero_solicitacao: 1001,
        equipamento_id: null,
        tag: 'BOMBA-01',
        solicitante_nome: 'Operador 1',
        solicitante_setor: 'Produção',
        descricao_falha: 'Vibração acima do normal',
        impacto: 'ALTO',
        classificacao: 'URGENTE',
        status: 'PENDENTE',
        os_id: null,
        sla_horas: 8,
        data_limite: new Date().toISOString(),
        observacoes: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      error: null,
    });
  });

  it('insere solicitação com SLA calculado e invalida cache', async () => {
    const { result } = renderHook(() => useCreateSolicitacao(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      tag: 'BOMBA-01',
      solicitante_nome: 'Operador 1',
      solicitante_setor: 'Produção',
      descricao_falha: 'Vibração acima do normal',
      impacto: 'ALTO',
      classificacao: 'URGENTE',
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mocks.fromSpy).toHaveBeenCalledWith('solicitacoes_manutencao');

    const insertPayload = mocks.insertSpy.mock.calls[0][0];
    expect(insertPayload.tag).toBe('BOMBA-01');
    expect(insertPayload.classificacao).toBe('URGENTE');
    expect(insertPayload.sla_horas).toBe(8);
    expect(typeof insertPayload.data_limite).toBe('string');

    expect(mocks.invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['solicitacoes', 'tenant-test-id'] });
    expect(mocks.toastSpy).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Solicitação criada' }),
    );
  });
});
