import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  usePlantas,
  useCreatePlanta,
  useUpdatePlanta,
  useDeletePlanta,
  useAreas,
  useCreateArea,
  useSistemas,
  useCreateSistema,
} from '@/hooks/useHierarquia';

// ─── Mocks hoisted ────────────────────────────────────────────────────────────
const mocks = vi.hoisted(() => {
  const invalidateQueriesSpy = vi.fn();
  const toastSpy = vi.fn();
  const listarPlantasSpy = vi.fn();
  const criarPlantaSpy = vi.fn();
  const atualizarPlantaSpy = vi.fn();
  const excluirPlantaSpy = vi.fn();
  const listarAreasSpy = vi.fn();
  const criarAreaSpy = vi.fn();
  const listarSistemasSpy = vi.fn();
  const criarSistemaSpy = vi.fn();
  const useAuthSpy = vi.fn(() => ({ tenantId: 'empresa-uuid-123' as string | null }));
  return {
    invalidateQueriesSpy,
    toastSpy,
    listarPlantasSpy,
    criarPlantaSpy,
    atualizarPlantaSpy,
    excluirPlantaSpy,
    listarAreasSpy,
    criarAreaSpy,
    listarSistemasSpy,
    criarSistemaSpy,
    useAuthSpy,
  };
});

vi.mock('@/services/hierarquia.service', () => ({
  hierarquiaService: {
    listarPlantas: mocks.listarPlantasSpy,
    criarPlanta: mocks.criarPlantaSpy,
    atualizarPlanta: mocks.atualizarPlantaSpy,
    excluirPlanta: mocks.excluirPlantaSpy,
    listarAreas: mocks.listarAreasSpy,
    criarArea: mocks.criarAreaSpy,
    listarSistemas: mocks.listarSistemasSpy,
    criarSistema: mocks.criarSistemaSpy,
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
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: vi.fn().mockReturnValue({ select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), order: vi.fn().mockReturnThis(), limit: vi.fn().mockResolvedValue({ data: [], error: null }) }) },
}));
vi.mock('@/lib/supabaseCompat', () => ({
  isMissingTableError: vi.fn().mockReturnValue(false),
  getSupabaseErrorMessage: vi.fn((e: unknown) => String(e)),
  insertWithColumnFallback: vi.fn(),
  updateWithColumnFallback: vi.fn(),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: mocks.useAuthSpy,
}));

const TENANT = 'empresa-uuid-123';
const PLANTA_ID = 'planta-uuid-1';
const AREA_ID = 'area-uuid-1';

const mockPlanta = {
  id: PLANTA_ID,
  codigo: 'P001',
  nome: 'Planta Principal',
  endereco: 'Rua A, 123',
  responsavel: 'João',
  ativo: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const mockArea = {
  id: AREA_ID,
  planta_id: PLANTA_ID,
  codigo: 'A001',
  nome: 'Área de Produção',
  descricao: null,
  ativo: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const mockSistema = {
  id: 'sistema-uuid-1',
  area_id: AREA_ID,
  codigo: 'S001',
  nome: 'Sistema Hidráulico',
  descricao: null,
  funcao_principal: null,
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

// ─── usePlantas ───────────────────────────────────────────────────────────────
describe('usePlantas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useAuthSpy.mockReturnValue({ tenantId: TENANT });
  });

  it('retorna lista de plantas', async () => {
    mocks.listarPlantasSpy.mockResolvedValue([mockPlanta]);

    const { result } = renderHook(() => usePlantas(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mocks.listarPlantasSpy).toHaveBeenCalledWith(TENANT);
    expect(result.current.data![0].codigo).toBe('P001');
  });

  it('fica idle quando tenantId é null', () => {
    mocks.useAuthSpy.mockReturnValue({ tenantId: null });

    const { result } = renderHook(() => usePlantas(), { wrapper: createWrapper() });

    expect(result.current.fetchStatus).toBe('idle');
  });

  it('propaga erro do service', async () => {
    mocks.listarPlantasSpy.mockRejectedValue(new Error('Tabela ausente'));

    const { result } = renderHook(() => usePlantas(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as Error).message).toMatch(/tabela ausente/i);
  });
});

// ─── useCreatePlanta ──────────────────────────────────────────────────────────
describe('useCreatePlanta', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useAuthSpy.mockReturnValue({ tenantId: TENANT });
  });

  it('chama hierarquiaService.criarPlanta com tenantId', async () => {
    mocks.criarPlantaSpy.mockResolvedValue(mockPlanta);

    const { result } = renderHook(() => useCreatePlanta(), { wrapper: createWrapper() });
    result.current.mutate({ codigo: 'P001', nome: 'Planta Principal' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const [, tenantArg] = mocks.criarPlantaSpy.mock.calls[0] as [unknown, string];
    expect(tenantArg).toBe(TENANT);
  });

  it('exibe toast de sucesso', async () => {
    mocks.criarPlantaSpy.mockResolvedValue(mockPlanta);

    const { result } = renderHook(() => useCreatePlanta(), { wrapper: createWrapper() });
    result.current.mutate({ codigo: 'P001', nome: 'Planta Principal' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mocks.toastSpy).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Planta criada' }),
    );
  });

  it('exibe toast de erro em falha', async () => {
    mocks.criarPlantaSpy.mockRejectedValue(new Error('Código duplicado'));

    const { result } = renderHook(() => useCreatePlanta(), { wrapper: createWrapper() });
    result.current.mutate({ codigo: 'DUP', nome: 'Duplicada' });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(mocks.toastSpy).toHaveBeenCalledWith(
      expect.objectContaining({ variant: 'destructive', title: 'Erro ao criar planta' }),
    );
  });

  it('lança erro quando tenantId é null', async () => {
    mocks.useAuthSpy.mockReturnValue({ tenantId: null });

    const { result } = renderHook(() => useCreatePlanta(), { wrapper: createWrapper() });
    result.current.mutate({ codigo: 'P', nome: 'Sem tenant' });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as Error).message).toMatch(/tenant/i);
  });

  it('invalida cache de plantas após sucesso', async () => {
    mocks.criarPlantaSpy.mockResolvedValue(mockPlanta);

    const { result } = renderHook(() => useCreatePlanta(), { wrapper: createWrapper() });
    result.current.mutate({ codigo: 'P001', nome: 'Nova Planta' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mocks.invalidateQueriesSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['plantas', TENANT] }),
    );
  });
});

// ─── useUpdatePlanta ──────────────────────────────────────────────────────────
describe('useUpdatePlanta', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useAuthSpy.mockReturnValue({ tenantId: TENANT });
  });

  it('chama hierarquiaService.atualizarPlanta com id e tenantId', async () => {
    mocks.atualizarPlantaSpy.mockResolvedValue({ ...mockPlanta, nome: 'Atualizada' });

    const { result } = renderHook(() => useUpdatePlanta(), { wrapper: createWrapper() });
    result.current.mutate({ id: PLANTA_ID, nome: 'Atualizada' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const [idArg, , tenantArg] = mocks.atualizarPlantaSpy.mock.calls[0] as [string, unknown, string];
    expect(idArg).toBe(PLANTA_ID);
    expect(tenantArg).toBe(TENANT);
  });
});

// ─── useDeletePlanta ──────────────────────────────────────────────────────────
describe('useDeletePlanta', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useAuthSpy.mockReturnValue({ tenantId: TENANT });
  });

  it('chama hierarquiaService.excluirPlanta com id e tenantId', async () => {
    mocks.excluirPlantaSpy.mockResolvedValue(undefined);

    const { result } = renderHook(() => useDeletePlanta(), { wrapper: createWrapper() });
    result.current.mutate(PLANTA_ID);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const [idArg, tenantArg] = mocks.excluirPlantaSpy.mock.calls[0] as [string, string];
    expect(idArg).toBe(PLANTA_ID);
    expect(tenantArg).toBe(TENANT);
  });

  it('exibe toast de sucesso após exclusão', async () => {
    mocks.excluirPlantaSpy.mockResolvedValue(undefined);

    const { result } = renderHook(() => useDeletePlanta(), { wrapper: createWrapper() });
    result.current.mutate(PLANTA_ID);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mocks.toastSpy).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Planta excluída' }),
    );
  });
});

// ─── useAreas ─────────────────────────────────────────────────────────────────
describe('useAreas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useAuthSpy.mockReturnValue({ tenantId: TENANT });
  });

  it('retorna lista de áreas', async () => {
    mocks.listarAreasSpy.mockResolvedValue([mockArea]);

    const { result } = renderHook(() => useAreas(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data![0].codigo).toBe('A001');
  });
});

// ─── useCreateArea ────────────────────────────────────────────────────────────
describe('useCreateArea', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useAuthSpy.mockReturnValue({ tenantId: TENANT });
  });

  it('chama hierarquiaService.criarArea com tenantId', async () => {
    mocks.criarAreaSpy.mockResolvedValue(mockArea);

    const { result } = renderHook(() => useCreateArea(), { wrapper: createWrapper() });
    result.current.mutate({ planta_id: PLANTA_ID, codigo: 'A001', nome: 'Área de Produção' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const [, tenantArg] = mocks.criarAreaSpy.mock.calls[0] as [unknown, string];
    expect(tenantArg).toBe(TENANT);
  });

  it('exibe toast ao criar área', async () => {
    mocks.criarAreaSpy.mockResolvedValue(mockArea);

    const { result } = renderHook(() => useCreateArea(), { wrapper: createWrapper() });
    result.current.mutate({ planta_id: PLANTA_ID, codigo: 'A002', nome: 'Área Teste' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mocks.toastSpy).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Área criada' }),
    );
  });
});

// ─── useSistemas ──────────────────────────────────────────────────────────────
describe('useSistemas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useAuthSpy.mockReturnValue({ tenantId: TENANT });
  });

  it('retorna lista de sistemas', async () => {
    mocks.listarSistemasSpy.mockResolvedValue([mockSistema]);

    const { result } = renderHook(() => useSistemas(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data![0].codigo).toBe('S001');
  });
});

// ─── useCreateSistema ─────────────────────────────────────────────────────────
describe('useCreateSistema', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useAuthSpy.mockReturnValue({ tenantId: TENANT });
  });

  it('chama hierarquiaService.criarSistema com tenantId', async () => {
    mocks.criarSistemaSpy.mockResolvedValue(mockSistema);

    const { result } = renderHook(() => useCreateSistema(), { wrapper: createWrapper() });
    result.current.mutate({ area_id: AREA_ID, codigo: 'S001', nome: 'Sistema Hidráulico' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const [, tenantArg] = mocks.criarSistemaSpy.mock.calls[0] as [unknown, string];
    expect(tenantArg).toBe(TENANT);
  });

  it('exibe toast ao criar sistema', async () => {
    mocks.criarSistemaSpy.mockResolvedValue(mockSistema);

    const { result } = renderHook(() => useCreateSistema(), { wrapper: createWrapper() });
    result.current.mutate({ area_id: AREA_ID, codigo: 'S002', nome: 'Sistema Elétrico' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mocks.toastSpy).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Sistema criado' }),
    );
  });

  it('invalida cache de sistemas após sucesso', async () => {
    mocks.criarSistemaSpy.mockResolvedValue(mockSistema);

    const { result } = renderHook(() => useCreateSistema(), { wrapper: createWrapper() });
    result.current.mutate({ area_id: AREA_ID, codigo: 'S003', nome: 'Sistema Vapor' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mocks.invalidateQueriesSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['sistemas', TENANT] }),
    );
  });
});
