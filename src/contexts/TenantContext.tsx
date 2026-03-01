import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { getTenantSlugFromHostname } from '@/lib/tenant';

interface TenantData {
  id: string;
  nome: string;
  slug: string | null;
  dominio_customizado: string | null;
  ativo: boolean;
}

interface TenantContextType {
  tenant: TenantData | null;
  empresaId: string | null;
  isTenantLoading: boolean;
  tenantError: string | null;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const [tenant, setTenant] = useState<TenantData | null>(null);
  const [isTenantLoading, setIsTenantLoading] = useState(true);
  const [tenantError, setTenantError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const resolveTenant = async () => {
      setIsTenantLoading(true);
      setTenantError(null);

      try {
        const hostname = window.location.hostname;
        const slugFromSubdomain = getTenantSlugFromHostname(hostname);
        const slugFromQuery = new URLSearchParams(location.search).get('tenant');
        const slug = slugFromSubdomain || slugFromQuery;

        let query = (supabase as any)
          .from('empresas')
          .select('id, nome, slug, dominio_customizado, ativo')
          .limit(1);

        if (slug) {
          query = query.eq('slug', slug);
        } else if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
          query = query.eq('dominio_customizado', hostname);
        } else {
          query = query.order('created_at', { ascending: true });
        }

        const { data, error } = await query.maybeSingle();
        if (error) throw error;

        if (!data) {
          if (mounted) {
            setTenant(null);
            setTenantError('Tenant não encontrado para este domínio.');
          }
          return;
        }

        if (!data.ativo) {
          if (mounted) {
            setTenant(null);
            setTenantError('Tenant inativo.');
          }
          return;
        }

        const { data: activeCheck, error: activeError } = await (supabase as any).rpc('verificar_empresa_ativa', {
          _empresa_id: data.id,
        });

        if (activeError) throw activeError;
        if (!activeCheck) {
          if (mounted) {
            setTenant(null);
            setTenantError('Empresa sem assinatura ativa.');
          }
          return;
        }

        if (mounted) {
          setTenant(data as TenantData);
        }
      } catch (error) {
        if (mounted) {
          setTenant(null);
          setTenantError('Falha ao resolver tenant.');
        }
      } finally {
        if (mounted) {
          setIsTenantLoading(false);
        }
      }
    };

    resolveTenant();
    return () => {
      mounted = false;
    };
  }, [location.search]);

  const value = useMemo(
    () => ({
      tenant,
      empresaId: tenant?.id ?? null,
      isTenantLoading,
      tenantError,
    }),
    [tenant, isTenantLoading, tenantError],
  );

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
}

export function useTenant() {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error('useTenant must be used within TenantProvider');
  }
  return context;
}
