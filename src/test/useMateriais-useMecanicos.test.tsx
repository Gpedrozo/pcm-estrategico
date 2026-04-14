import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  useMateriais,
  useCreateMaterial,
  useUpdateMaterial,
} from '@/hooks/useMateriais';
import {
  useMecanicos,
  useCreateMecanico,
  useUpdateMecanico,
} from '@/hooks/useMecanicos';

// ─── Mocks hoisted ────────────────────────────────────────────────────────────
const mocks = vi.hoisted(() => {
  const invalidateQueriesSpy = vi.fn();
  const toastSpy = vi.fn();
  const matListarSpy = vi.fn();
  const matCriarSpy = vi.fn();
  const matAtualizarSpy = vi.fn();
  const mecListarSpy = vi.fn();
  const mecCriarSpy = vi.fn();
  const mecAtualizarSpy = vi.fn();
  const useAuthSpy = vi.fn(() => ({ tenantId: 'empresa-uuid-123' as string | null }));
  return {
    invalidateQueriesSpy,
    toastSpy,
    matListarSpy,
    matCriarSpy,
    matAtualizarSpy,
    mecListarSpy,
    mecCriarSpy,
    mecAtualizarSpy,
    useAuthSpy,
  };
});

vi.mock('@/services/materiais.service', () => ({
  materiaisService: {
    listar: mocks.matListarSpy,
    listarAtivos: mocks.matListarSpy,
    criar: mocks.matCriarSpy,
    atualizar: mocks.matAtualizarSpy,
  },
}));

vi.mock('@/services/mecanicos.service', () => ({
  mecanicosService: {
    listar: mocks.mecListarSpy,
    listarAtivos: mocks.mecListarSpy,
    criar: mocks.mecCriarSpy,
    atualizar: mocks.mecAtualizarSpy,
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
vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: mocks.useAuthSpy,
}));

const TENANT = 'empresa-uuid-123';

const mockMaterial = {
  id: 'mat-1',
  codigo: 'MAT001',
  nome: 'Rolamento 6205',
  unidade: 'UN',
  custo_unitario: 45.0,
  estoque_atual: 10,
  estoque_minimo: 2,
  localizacao: 'Prateleira A-01',
  ativo: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const mockMecanico = {
  id: 'mec-1',
  nome: 'Carlos Silva',
  telefone: '51999990000',
  tipo: 'INTERNO',
  especialidade: 'Elétrica',
  custo_hora: 80,
  ativo: true,
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

// ─── useMateriais ─────────────────────────────────────────────────────────────
describe('useMateriais', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useAuthSpy.mockReturnValue({ tenantId: TENANT });
  });

  it('retorna lista com tenantId disponível', async () => {
    mocks.matListarSpy.mockResolvedValue([mockMaterial]);

    const { result } = renderHook(() => useMateriais(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mocks.matListarSpy).toHaveBeenCalledWith(TENANT);
    expect(result.current.data).toHaveLength(1);
  });

  it('fica idle quando tenantId é null', () => {
    mocks.useAuthSpy.mockReturnValue({ tenantId: null });

    const { result } = renderHook(() => useMateriais(), { wrapper: createWrapper() });

    expect(result.current.fetchStatus).toBe('idle');
    expect(mocks.matListarSpy).not.toHaveBeenCalled();
  });
});

// ─── useCreateMaterial ────────────────────────────────────────────────────────
describe('useCreateMaterial', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useAuthSpy.mockReturnValue({ tenantId: TENANT });
  });

  it('chama materiaisService.criar com tenantId correto', async () => {
    mocks.matCriarSpy.mockResolvedValue(mockMaterial);

    const { result } = renderHook(() => useCreateMaterial(), { wrapper: createWrapper() });
    result.current.mutate({ codigo: 'MAT001', nome: 'Rolamento 6205', usuario_nome: 'Admin' } as never);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const [, tenantArg] = mocks.matCriarSpy.mock.calls[0] as [unknown, string];
    expect(tenantArg).toBe(TENANT);
  });

  it('exibe toast de sucesso', async () => {
    mocks.matCriarSpy.mockResolvedValue(mockMaterial);

    const { result } = renderHook(() => useCreateMaterial(), { wrapper: createWrapper() });
    result.current.mutate({ codigo: 'MAT001', nome: 'Rolamento 6205' } as never);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mocks.toastSpy).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Material criado' }),
    );
  });

  it('exibe toast de erro em falha', async () => {
    mocks.matCriarSpy.mockRejectedValue(new Error('Código duplicado'));

    const { result } = renderHook(() => useCreateMaterial(), { wrapper: createWrapper() });
    result.current.mutate({ codigo: 'DUP', nome: 'Material' } as never);

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(mocks.toastSpy).toHaveBeenCalledWith(
      expect.objectContaining({ variant: 'destructive' }),
    );
  });

  it('lança erro quando tenantId é null', async () => {
    mocks.useAuthSpy.mockReturnValue({ tenantId: null });

    const { result } = renderHook(() => useCreateMaterial(), { wrapper: createWrapper() });
    result.current.mutate({ codigo: 'X', nome: 'Y' } as never);

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as Error).message).toMatch(/tenant/i);
  });

  it('invalida cache de materiais após sucesso', async () => {
    mocks.matCriarSpy.mockResolvedValue(mockMaterial);

    const { result } = renderHook(() => useCreateMaterial(), { wrapper: createWrapper() });
    result.current.mutate({ codigo: 'MAT001', nome: 'Rolamento' } as never);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mocks.invalidateQueriesSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['materiais', TENANT] }),
    );
  });
});

// ─── useUpdateMaterial ────────────────────────────────────────────────────────
describe('useUpdateMaterial', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useAuthSpy.mockReturnValue({ tenantId: TENANT });
  });

  it('chama materiaisService.atualizar com id e updates', async () => {
    mocks.matAtualizarSpy.mockResolvedValue({ ...mockMaterial, nome: 'Rolamento Atualizado' });

    const { result } = renderHook(() => useUpdateMaterial(), { wrapper: createWrapper() });
    result.current.mutate({ id: 'mat-1', nome: 'Rolamento Atualizado' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const [idArg, , tenantArg] = mocks.matAtualizarSpy.mock.calls[0] as [string, unknown, string];
    expect(idArg).toBe('mat-1');
    expect(tenantArg).toBe(TENANT);
  });
});

// ─── useMecanicos ─────────────────────────────────────────────────────────────
describe('useMecanicos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useAuthSpy.mockReturnValue({ tenantId: TENANT });
  });

  it('retorna lista de mecânicos', async () => {
    mocks.mecListarSpy.mockResolvedValue([mockMecanico]);

    const { result } = renderHook(() => useMecanicos(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data![0].nome).toBe('Carlos Silva');
  });

  it('fica idle quando tenantId é null', () => {
    mocks.useAuthSpy.mockReturnValue({ tenantId: null });

    const { result } = renderHook(() => useMecanicos(), { wrapper: createWrapper() });

    expect(result.current.fetchStatus).toBe('idle');
  });
});

// ─── useCreateMecanico ────────────────────────────────────────────────────────
describe('useCreateMecanico', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useAuthSpy.mockReturnValue({ tenantId: TENANT });
  });

  it('chama mecanicosService.criar com tenantId', async () => {
    mocks.mecCriarSpy.mockResolvedValue(mockMecanico);

    const { result } = renderHook(() => useCreateMecanico(), { wrapper: createWrapper() });
    result.current.mutate({ nome: 'Carlos Silva' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const [, tenantArg] = mocks.mecCriarSpy.mock.calls[0] as [unknown, string];
    expect(tenantArg).toBe(TENANT);
  });

  it('exibe toast com nome do mecânico', async () => {
    mocks.mecCriarSpy.mockResolvedValue({ ...mockMecanico, nome: 'Ana Paula' });

    const { result } = renderHook(() => useCreateMecanico(), { wrapper: createWrapper() });
    result.current.mutate({ nome: 'Ana Paula' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mocks.toastSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Mecânico Cadastrado',
        description: expect.stringContaining('Ana Paula'),
      }),
    );
  });

  it('invalida cache de mecanicos e mecanicos-ativos', async () => {
    mocks.mecCriarSpy.mockResolvedValue(mockMecanico);

    const { result } = renderHook(() => useCreateMecanico(), { wrapper: createWrapper() });
    result.current.mutate({ nome: 'Carlos' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mocks.invalidateQueriesSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['mecanicos', TENANT] }),
    );
    expect(mocks.invalidateQueriesSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['mecanicos-ativos', TENANT] }),
    );
  });

  it('lança erro quando tenantId é null', async () => {
    mocks.useAuthSpy.mockReturnValue({ tenantId: null });

    const { result } = renderHook(() => useCreateMecanico(), { wrapper: createWrapper() });
    result.current.mutate({ nome: 'Sem Tenant' });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as Error).message).toMatch(/tenant/i);
  });
});

// ─── useUpdateMecanico ────────────────────────────────────────────────────────
describe('useUpdateMecanico', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useAuthSpy.mockReturnValue({ tenantId: TENANT });
  });

  it('chama mecanicosService.atualizar com id e updates', async () => {
    mocks.mecAtualizarSpy.mockResolvedValue({ ...mockMecanico, ativo: false });

    const { result } = renderHook(() => useUpdateMecanico(), { wrapper: createWrapper() });
    result.current.mutate({ id: 'mec-1', ativo: false });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const [idArg, , tenantArg] = mocks.mecAtualizarSpy.mock.calls[0] as [string, unknown, string];
    expect(idArg).toBe('mec-1');
    expect(tenantArg).toBe(TENANT);
  });
});
