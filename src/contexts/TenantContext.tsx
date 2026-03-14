import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { resolveEmpresaSlug } from '@/lib/security';

export interface Tenant {
  id: string;
  slug: string;
  name: string;
  is_active: boolean;
}

interface TenantContextValue {
  tenant: Tenant | null;
  tenantSlug: string;
  isLoading: boolean;
  error: string | null;
}

const TenantContext = createContext<TenantContextValue | undefined>(undefined);

const TENANT_BASE_DOMAIN = (import.meta.env.VITE_TENANT_BASE_DOMAIN || 'gppis.com.br').toLowerCase();

function isTenantBaseDomain(hostname: string) {
  const normalized = hostname.toLowerCase();
  return normalized === TENANT_BASE_DOMAIN || normalized === `www.${TENANT_BASE_DOMAIN}`;
}


export function TenantProvider({ children }: { children: React.ReactNode }) {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const tenantSlug = useMemo(() => resolveEmpresaSlug(window.location.hostname), []);

  useEffect(() => {
    let isMounted = true;

    async function loadTenant() {
      setIsLoading(true);
      setError(null);

      const hostname = window.location.hostname;

      const { data: domainConfig, error: domainError } = await supabase
        .from('empresa_config')
        .select('empresa_id')
        .eq('dominio_custom', hostname)
        .maybeSingle();

      if (!isMounted) return;

      if (domainError) {
        setTenant(null);
        setError(domainError.message);
        setIsLoading(false);
        return;
      }

      let empresaId = domainConfig?.empresa_id ?? null;

      if (!empresaId && isTenantBaseDomain(hostname)) {
        const { data: authUser } = await supabase.auth.getUser();
        const userId = authUser?.user?.id ?? null;

        if (userId) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('empresa_id')
            .eq('id', userId)
            .maybeSingle();

          empresaId = profile?.empresa_id ?? null;

          if (!empresaId) {
            const { data: roleRows } = await supabase
              .from('user_roles')
              .select('empresa_id')
              .eq('user_id', userId)
              .not('empresa_id', 'is', null)
              .limit(1);

            empresaId = roleRows?.[0]?.empresa_id ?? null;
          }
        }
      }

      if (!empresaId) {
        setTenant(null);
        setError('Domínio tenant não autorizado');
        setIsLoading(false);
        return;
      }

      const { data, error: fetchError } = await supabase
        .from('empresas')
        .select('id, nome, ativo, slug')
        .eq('id', empresaId)
        .maybeSingle();

      if (!isMounted) return;

      if (fetchError || !data) {
        setTenant(null);
        setError(fetchError?.message || 'Empresa não encontrada');
      } else {
        setTenant({
          id: data.id,
          slug: (data.slug || tenantSlug || 'default').toLowerCase(),
          name: data.nome,
          is_active: data.ativo,
        });
      }

      setIsLoading(false);
    }

    loadTenant();

    return () => {
      isMounted = false;
    };
  }, [tenantSlug]);

  return (
    <TenantContext.Provider value={{ tenant, tenantSlug, isLoading, error }}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error('useTenant must be used within TenantProvider');
  }
  return context;
}
