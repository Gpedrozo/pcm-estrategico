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

      const hostname = window.location.hostname.toLowerCase();

      const { data: domainConfig, error: domainError } = await supabase
        .from('empresa_config')
        .select('empresa_id')
        .eq('dominio_custom', hostname)
        .maybeSingle();

      if (!isMounted) return;

      let empresaId = domainConfig?.empresa_id ?? null;
      if (!empresaId && tenantSlug !== 'default') {
        const { data: slugCompany, error: slugError } = await supabase
          .from('empresas')
          .select('id')
          .eq('slug', tenantSlug)
          .maybeSingle();

        if (slugError) {
          setTenant(null);
          setError(slugError.message);
          setIsLoading(false);
          return;
        }

        empresaId = slugCompany?.id ?? null;
      }

      if (!empresaId) {
        const baseDomain = (import.meta.env.VITE_TENANT_BASE_DOMAIN || 'gppis.com.br').toLowerCase();
        const isBaseDomainHost = hostname === baseDomain || hostname === `www.${baseDomain}`;

        if (isBaseDomainHost) {
          setTenant(null);
          setError(null);
          setIsLoading(false);
          return;
        }

        if (hostname.endsWith(`.${baseDomain}`)) {
          const slug = hostname.replace(`.${baseDomain}`, '').split('.')[0]?.trim().toLowerCase();
          if (slug && slug !== 'www') {
            const { data: companyBySlug } = await supabase
              .from('empresas')
              .select('id')
              .eq('slug', slug)
              .maybeSingle();

            empresaId = companyBySlug?.id ?? null;
          }
        }
      }

      if (!empresaId) {
        setTenant(null);
        setError(domainError?.message || 'Domínio tenant não autorizado');
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

export function useOptionalTenant() {
  return useContext(TenantContext);
}
