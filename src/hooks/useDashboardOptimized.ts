import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useState, useCallback } from 'react';

// Dashboard aggregation hook — replaces 4 separate queries
export function useDashboardSummary() {
  const { tenantId } = useAuth();

  return useQuery({
    queryKey: ['dashboard_summary', tenantId],
    queryFn: async () => {
      if (!tenantId) throw new Error('Tenant não resolvido');

      const { data, error } = await supabase.rpc('dashboard_summary', {
        empresa_id: tenantId,
      });

      if (error) throw error;
      return data?.[0] || null;
    },
    enabled: !!tenantId,
    staleTime: 30_000, // 30s cache
    refetchInterval: 60_000, // Auto-refresh every 60s
  });
}

// Equipamentos search hook — async search + pagination
export function useEquipamentosSearch(searchTerm: string = '', page: number = 0) {
  const { tenantId } = useAuth();
  const pageSize = 50;
  const offset = page * pageSize;

  return useQuery({
    queryKey: ['equipamentos_search', tenantId, searchTerm, page],
    queryFn: async () => {
      if (!tenantId) throw new Error('Tenant não resolvido');

      const { data, error } = await supabase.rpc('search_equipamentos', {
        search_term: searchTerm || '',
        limit_val: pageSize,
        offset_val: offset,
      });

      if (error) throw error;
      return {
        items: data || [],
        total: data?.[0]?.total_count || 0,
        hasMore: (data?.length || 0) === pageSize,
      };
    },
    enabled: !!tenantId,
    staleTime: 60_000, // 60s cache for searches
  });
}

// Audit logs hook
export function useAuditLogs(empresa_id?: string, limit: number = 100) {
  const { tenantId } = useAuth();
  const empresaId = empresa_id || tenantId;

  return useQuery({
    queryKey: ['audit_logs_recent', empresaId],
    queryFn: async () => {
      if (!empresaId) throw new Error('Tenant não resolvido');

      const { data, error } = await supabase
        .from('v_audit_logs_recent')
        .select('*')
        .eq('empresa_id', empresaId)
        .order('ocorreu_em', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    },
    enabled: !!empresaId,
    staleTime: 45_000,
  });
}

// REMOVED: duplicate writeAuditLog that used wrong param names (no p_ prefix).
// Use writeAuditLog from '@/lib/audit' instead.
