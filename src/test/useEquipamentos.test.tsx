import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  useEquipamentos,
  useCreateEquipamento,
  useUpdateEquipamento,
} from '@/hooks/useEquipamentos';

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

vi.mock('@/services/equipamentos.service', () => ({
  equipamentosService: {
    listar: mocks.listarSpy,
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

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: mocks.useAuthSpy,
}));

const TENANT = 'empresa-uuid-123';

const mockEquipamento = {
  id: 'equip-1',
  tag: 'BOMBA-01',
  nome: 'Bomba Centrífuga',
  criticidade: 'A',
  nivel_risco: 'ALTO',
  localizacao: 'Casa de bombas',
  fabricante: 'WEG',
  modelo: 'XY100',
  numero_serie: 'SN-001',
  data_instalacao: '2024-01-01',
  sistema_id: null,
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

// ─── useEquipamentos ──────────────────────────────────────────────────────────
describe('useEquipamentos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useAuthSpy.mockReturnValue({ tenantId: TENANT });
  });

  it('retorna lista quando tenantId está disponível', async () => {
    mocks.listarSpy.mockResolvedValue([mockEquipamento]);

    const { result } = renderHook(() => useEquipamentos(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mocks.listarSpy).toHaveBeenCalledWith(TENANT);
    expect(result.current.data).toHaveLength(1);
    expect(result.current.data![0].tag).toBe('BOMBA-01');
  });

  it('fica idle quando tenantId é null', () => {
    mocks.useAuthSpy.mockReturnValue({ tenantId: null });

    const { result } = renderHook(() => useEquipamentos(), { wrapper: createWrapper() });

    expect(result.current.fetchStatus).toBe('idle');
    expect(mocks.listarSpy).not.toHaveBeenCalled();
  });

  it('propaga erro do service', async () => {
    mocks.listarSpy.mockRejectedValue(new Error('DB offline'));

    const { result } = renderHook(() => useEquipamentos(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as Error).message).toBe('DB offline');
  });
});

// ─── useCreateEquipamento ─────────────────────────────────────────────────────
describe('useCreateEquipamento', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useAuthSpy.mockReturnValue({ tenantId: TENANT });
  });

  it('chama equipamentosService.criar com tenantId correto', async () => {
    mocks.criarSpy.mockResolvedValue(mockEquipamento);

    const { result } = renderHook(() => useCreateEquipamento(), { wrapper: createWrapper() });

    result.current.mutate({ tag: 'BOMBA-01', nome: 'Bomba Centrífuga' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const [payloadArg, tenantArg] = mocks.criarSpy.mock.calls[0] as [unknown, string];
    expect(tenantArg).toBe(TENANT);
    expect(payloadArg).toMatchObject({ tag: 'BOMBA-01', nome: 'Bomba Centrífuga' });
  });

  it('exibe toast de sucesso com TAG do equipamento', async () => {
    mocks.criarSpy.mockResolvedValue({ ...mockEquipamento, tag: 'MOTOR-99' });

    const { result } = renderHook(() => useCreateEquipamento(), { wrapper: createWrapper() });
    result.current.mutate({ tag: 'MOTOR-99', nome: 'Motor Elétrico' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mocks.toastSpy).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Equipamento Cadastrado' }),
    );
  });

  it('exibe toast de erro quando service falha', async () => {
    mocks.criarSpy.mockRejectedValue(new Error('Validação falhou'));

    const { result } = renderHook(() => useCreateEquipamento(), { wrapper: createWrapper() });
    result.current.mutate({ tag: 'ERR', nome: 'Teste' });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(mocks.toastSpy).toHaveBeenCalledWith(
      expect.objectContaining({ variant: 'destructive' }),
    );
  });

  it('lança erro quando tenantId é null', async () => {
    mocks.useAuthSpy.mockReturnValue({ tenantId: null });

    const { result } = renderHook(() => useCreateEquipamento(), { wrapper: createWrapper() });
    result.current.mutate({ tag: 'X', nome: 'Y' });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as Error).message).toMatch(/tenant/i);
  });

  it('invalida cache de equipamentos após sucesso', async () => {
    mocks.criarSpy.mockResolvedValue(mockEquipamento);

    const { result } = renderHook(() => useCreateEquipamento(), { wrapper: createWrapper() });
    result.current.mutate({ tag: 'BOMBA-01', nome: 'Bomba' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mocks.invalidateQueriesSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['equipamentos', TENANT] }),
    );
  });
});

// ─── useUpdateEquipamento ─────────────────────────────────────────────────────
describe('useUpdateEquipamento', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useAuthSpy.mockReturnValue({ tenantId: TENANT });
  });

  it('chama equipamentosService.atualizar com id e tenantId', async () => {
    mocks.atualizarSpy.mockResolvedValue({ ...mockEquipamento, nome: 'Bomba Atualizada' });

    const { result } = renderHook(() => useUpdateEquipamento(), { wrapper: createWrapper() });
    result.current.mutate({ id: 'equip-1', nome: 'Bomba Atualizada' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const [idArg, updatesArg, tenantArg] = mocks.atualizarSpy.mock.calls[0] as [string, unknown, string];
    expect(idArg).toBe('equip-1');
    expect(updatesArg).toMatchObject({ nome: 'Bomba Atualizada' });
    expect(tenantArg).toBe(TENANT);
  });

  it('invalida cache após atualização', async () => {
    mocks.atualizarSpy.mockResolvedValue(mockEquipamento);

    const { result } = renderHook(() => useUpdateEquipamento(), { wrapper: createWrapper() });
    result.current.mutate({ id: 'equip-1', ativo: false });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mocks.invalidateQueriesSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['equipamentos', TENANT] }),
    );
  });
});
