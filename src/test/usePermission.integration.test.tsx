import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { usePermission } from '@/hooks/usePermission';
import { supabase } from '@/integrations/supabase/client';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: vi.fn(),
  },
}));

const mockedRpc = vi.mocked(supabase.rpc);

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('usePermission integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns allowed when has_permission grants access for profile and empresa', async () => {
    mockedRpc.mockResolvedValue({ data: true, error: null });

    const { result } = renderHook(() => usePermission('ordens_servico.editar', 'empresa-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockedRpc).toHaveBeenCalledWith('has_permission', {
      p_permission_code: 'ordens_servico.editar',
      p_empresa_id: 'empresa-1',
    });
    expect(result.current.data).toBe(true);
  });

  it('returns denied when has_permission does not grant access for another empresa', async () => {
    mockedRpc.mockResolvedValue({ data: false, error: null });

    const { result } = renderHook(() => usePermission('ordens_servico.editar', 'empresa-2'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockedRpc).toHaveBeenCalledWith('has_permission', {
      p_permission_code: 'ordens_servico.editar',
      p_empresa_id: 'empresa-2',
    });
    expect(result.current.data).toBe(false);
  });
});
