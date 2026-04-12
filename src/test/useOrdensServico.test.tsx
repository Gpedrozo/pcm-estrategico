import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  useOrdensServico,
  useCreateOrdemServico,
  useUpdateOrdemServico,
} from '@/hooks/useOrdensServico';

// ─── Mocks hoisted ────────────────────────────────────────────────────────────
const mocks = vi.hoisted(() => {
  const invalidateQueriesSpy = vi.fn();
  const toastSpy = vi.fn();
  const listarSpy = vi.fn();
  const criarSpy = vi.fn();
  const atualizarSpy = vi.fn();
  const useAuthSpy = vi.fn(() => ({ tenantId: 'empresa-uuid-123' as string | null }));
  return { invalidateQueriesSpy, toastSpy, listarSpy, criarSpy, atualizarSpy, useAuthSpy };
});

vi.mock('@/services/ordensServico.service', () => ({
  ordensServicoService: {
    listar: mocks.listarSpy,
    listarRecentes: vi.fn().mockResolvedValue([]),
    listarPendentes: vi.fn().mockResolvedValue([]),
    criar: mocks.criarSpy,
    atualizar: mocks.atualizarSpy,
  },
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

const mockTenantId = 'empresa-uuid-123';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: mocks.useAuthSpy,
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────
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

const mockOS = {
  id: 'os-1',
  numero_os: 1001,
  tipo: 'CORRETIVA',
  prioridade: 'ALTA',
  tag: 'BOMBA-01',
  equipamento: 'Bomba Centrífuga',
  solicitante: 'João',
  problema: 'Vibração anormal',
  data_solicitacao: new Date().toISOString(),
  status: 'ABERTA',
  data_fechamento: null,
  tempo_estimado: null,
  modo_falha: null,
  causa_raiz: null,
  acao_corretiva: null,
  licoes_aprendidas: null,
  usuario_abertura: null,
  usuario_fechamento: null,
  mecanico_responsavel_id: null,
  mecanico_responsavel_codigo: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

// ─── Testes ───────────────────────────────────────────────────────────────────
describe('useOrdensServico', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useAuthSpy.mockReturnValue({ tenantId: mockTenantId });
  });

  it('retorna dados quando tenantId está disponível', async () => {
    mocks.listarSpy.mockResolvedValue([mockOS]);

    const { result } = renderHook(() => useOrdensServico(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mocks.listarSpy).toHaveBeenCalledWith(mockTenantId);
    expect(result.current.data).toEqual([mockOS]);
  });

  it('fica desabilitado (enabled=false) quando tenantId é null', async () => {
    mocks.useAuthSpy.mockReturnValue({ tenantId: null });

    const { result } = renderHook(() => useOrdensServico(), { wrapper: createWrapper() });

    // Com enabled=false a query não deve disparar
    expect(result.current.isLoading).toBe(false);
    expect(result.current.fetchStatus).toBe('idle');
    expect(mocks.listarSpy).not.toHaveBeenCalled();
  });

  it('propaga erro do service corretamente', async () => {
    const err = new Error('Falha de conexão');
    mocks.listarSpy.mockRejectedValue(err);

    const { result } = renderHook(() => useOrdensServico(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBe(err);
  });
});

describe('useCreateOrdemServico', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useAuthSpy.mockReturnValue({ tenantId: mockTenantId });
  });

  it('chama ordensServicoService.criar com tenantId correto', async () => {
    mocks.criarSpy.mockResolvedValue({ ...mockOS, id: 'os-new' });

    const { result } = renderHook(() => useCreateOrdemServico(), { wrapper: createWrapper() });

    result.current.mutate({
      tipo: 'CORRETIVA',
      tag: 'BOMBA-01',
      equipamento: 'Bomba Centrífuga',
      solicitante: 'João',
      problema: 'Vibração',
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const [payloadArg, tenantArg] = mocks.criarSpy.mock.calls[0];
    expect(tenantArg).toBe(mockTenantId);
    expect(payloadArg).toMatchObject({ tipo: 'CORRETIVA', tag: 'BOMBA-01' });
  });

  it('exibe toast de sucesso com numero_os', async () => {
    mocks.criarSpy.mockResolvedValue({ ...mockOS, numero_os: 999 });

    const { result } = renderHook(() => useCreateOrdemServico(), { wrapper: createWrapper() });
    result.current.mutate({ tipo: 'CORRETIVA', tag: 'X', equipamento: 'Y', solicitante: 'Z', problema: 'P' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mocks.toastSpy).toHaveBeenCalledWith(
      expect.objectContaining({ description: expect.stringContaining('999') }),
    );
  });

  it('exibe toast de erro em falha de schema mismatch', async () => {
    mocks.criarSpy.mockRejectedValue(new Error('schema cache: column not found'));

    const { result } = renderHook(() => useCreateOrdemServico(), { wrapper: createWrapper() });
    result.current.mutate({ tipo: 'CORRETIVA', tag: 'X', equipamento: 'Y', solicitante: 'Z', problema: 'P' });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(mocks.toastSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        variant: 'destructive',
        description: expect.stringContaining('incompatibilidade'),
      }),
    );
  });

  it('invalida queries corretas após sucesso', async () => {
    mocks.criarSpy.mockResolvedValue(mockOS);

    const { result } = renderHook(() => useCreateOrdemServico(), { wrapper: createWrapper() });
    result.current.mutate({ tipo: 'CORRETIVA', tag: 'X', equipamento: 'Y', solicitante: 'Z', problema: 'P' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const calledKeys = mocks.invalidateQueriesSpy.mock.calls.map((c) => c[0]?.queryKey?.[0]);
    expect(calledKeys).toContain('ordens-servico');
    expect(calledKeys).toContain('indicadores');
  });
});

describe('useUpdateOrdemServico', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useAuthSpy.mockReturnValue({ tenantId: mockTenantId });
  });

  it('chama ordensServicoService.atualizar com id e tenantId', async () => {
    mocks.atualizarSpy.mockResolvedValue({ ...mockOS, status: 'FECHADA' });

    const { result } = renderHook(() => useUpdateOrdemServico(), { wrapper: createWrapper() });
    result.current.mutate({ id: 'os-1', status: 'FECHADA' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mocks.atualizarSpy).toHaveBeenCalledWith(
      'os-1',
      expect.objectContaining({ status: 'FECHADA' }),
      mockTenantId,
    );
  });
});
