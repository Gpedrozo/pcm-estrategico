import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useCreateSolicitacao } from '@/hooks/useSolicitacoes';

const {
  invalidateQueriesSpy,
  toastSpy,
  singleSpy,
  selectSpy: _selectSpy,
  insertSpy,
  limitSpy,
  probeSelectSpy,
  fromSpy,
} = vi.hoisted(() => {
  const invalidateQueriesSpy = vi.fn();
  const toastSpy = vi.fn();
  const singleSpy = vi.fn();
  const selectSpy = vi.fn(() => ({ single: singleSpy }));
  const insertSpy = vi.fn(() => ({ select: selectSpy }));
  const limitSpy = vi.fn(async () => ({ error: null }));
  const probeSelectSpy = vi.fn(() => ({ limit: limitSpy }));
  const fromSpy = vi.fn(() => ({
    select: probeSelectSpy,
    insert: insertSpy,
  }));

  return {
    invalidateQueriesSpy,
    toastSpy,
    singleSpy,
    selectSpy,
    insertSpy,
    limitSpy,
    probeSelectSpy,
    fromSpy,
  };
});

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: fromSpy,
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  },
}));

vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual<typeof import('@tanstack/react-query')>('@tanstack/react-query');
  return {
    ...actual,
    useQueryClient: () => ({
      invalidateQueries: invalidateQueriesSpy,
    }),
  };
});

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: toastSpy,
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

    singleSpy.mockResolvedValue({
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

    await result.current.mutateAsync({
      tag: 'BOMBA-01',
      solicitante_nome: 'Operador 1',
      solicitante_setor: 'Produção',
      descricao_falha: 'Vibração acima do normal',
      impacto: 'ALTO',
      classificacao: 'URGENTE',
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(fromSpy).toHaveBeenCalledWith('solicitacoes_manutencao');
    expect(probeSelectSpy).toHaveBeenCalledWith('id');
    expect(limitSpy).toHaveBeenCalledWith(1);

    const insertPayload = insertSpy.mock.calls[0][0];
    expect(insertPayload.tag).toBe('BOMBA-01');
    expect(insertPayload.classificacao).toBe('URGENTE');
    expect(insertPayload.sla_horas).toBe(8);
    expect(typeof insertPayload.data_limite).toBe('string');

    expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['solicitacoes', 'tenant-test-id'] });
    expect(toastSpy).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Solicitação criada' }),
    );
  });
});
