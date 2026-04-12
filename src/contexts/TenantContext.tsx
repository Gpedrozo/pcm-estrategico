import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { resolveEmpresaSlug } from '@/lib/security';
import { logger } from '@/lib/logger';
import { TENANT_RESOLVE_TOTAL_TIMEOUT_MS } from '@/lib/authConstants';

const TENANT_SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const TENANT_RESOLVE_MAX_RETRIES = 3;
const TENANT_RESOLVE_RETRY_DELAY_MS = 600;

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

async function resolveEmpresaIdBySlug(slug: string): Promise<string | null> {
  const normalized = slug.trim().toLowerCase();
  if (!normalized) return null;

  const { data, error } = await supabase.rpc('resolve_empresa_id_by_slug', {
    p_slug: normalized,
  });

  if (error) return null;
  return typeof data === 'string' ? data : null;
}


export function TenantProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const previousTenantRef = useRef<string | null>(null);

  const tenantSlug = useMemo(() => resolveEmpresaSlug(window.location.hostname), []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      setReloadKey((current) => current + 1);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadTenant() {
      setIsLoading(true);
      setError(null);

      const hostname = window.location.hostname.toLowerCase();
      const baseDomain = (import.meta.env.VITE_TENANT_BASE_DOMAIN || 'gppis.com.br').toLowerCase();
      const isBaseDomainHost = hostname === baseDomain || hostname === `www.${baseDomain}`;
      const hostSlug = hostname.endsWith(`.${baseDomain}`)
        ? hostname.replace(`.${baseDomain}`, '').split('.')[0]?.trim().toLowerCase() || ''
        : '';

      if (!isBaseDomainHost && hostname.endsWith(`.${baseDomain}`) && (tenantSlug === 'default' || !TENANT_SLUG_REGEX.test(tenantSlug))) {
        setTenant(null);
        setError('Subdominio invalido para tenant.');
        logger.warn('tenant_resolution_invalid_subdomain', {
          hostname,
          tenantSlug,
        });
        setIsLoading(false);
        return;
      }

      const { data: domainConfig, error: _domainError } = await supabase
        .from('empresa_config')
        .select('empresa_id')
        .eq('dominio_custom', hostname)
        .maybeSingle();

      if (!isMounted) return;

      let empresaId = domainConfig?.empresa_id ?? null;

      for (let attempt = 0; !empresaId && attempt < TENANT_RESOLVE_MAX_RETRIES; attempt += 1) {
        if (attempt > 0) {
          await new Promise((resolve) => window.setTimeout(resolve, TENANT_RESOLVE_RETRY_DELAY_MS));
        }

        if (!empresaId && tenantSlug !== 'default') {
          empresaId = await resolveEmpresaIdBySlug(tenantSlug);
        }

        if (!empresaId && hostname.endsWith(`.${baseDomain}`)) {
          const slug = hostSlug;
          if (slug && slug !== 'www' && TENANT_SLUG_REGEX.test(slug)) {
            empresaId = await resolveEmpresaIdBySlug(slug);
          }
        }

        if (!empresaId) {
          const { data: authUserResult } = await supabase.auth.getUser();
          const authUser = authUserResult?.user;
          const metadataEmpresaId = typeof authUser?.app_metadata?.empresa_id === 'string'
            ? authUser.app_metadata.empresa_id
            : null;

          const metadataEmpresaSlug = String(
            authUser?.app_metadata?.empresa_slug
            ?? '',
          ).trim().toLowerCase();

          if (metadataEmpresaId && metadataEmpresaSlug) {
            if (metadataEmpresaSlug === tenantSlug || metadataEmpresaSlug === hostSlug) {
              empresaId = metadataEmpresaId;
            }
          }
        }

        if (empresaId) break;
      }

      if (!empresaId && tenantSlug !== 'default') {
        const empresaIdBySlug = await resolveEmpresaIdBySlug(tenantSlug);
        const slugCompany = empresaIdBySlug ? { id: empresaIdBySlug } : null;
        const slugError = empresaIdBySlug ? null : { message: 'slug_lookup_failed' };

        if (slugError && !slugCompany?.id) {
          // Do not fail early here. On first access, slug lookup can fail due to
          // propagation/RLS timing while auth metadata already has tenant identity.
          const { data: authUserResult } = await supabase.auth.getUser();
          const authUser = authUserResult?.user;
          const metadataEmpresaId = typeof authUser?.app_metadata?.empresa_id === 'string'
            ? authUser.app_metadata.empresa_id
            : null;
          const metadataEmpresaSlug = String(
            authUser?.app_metadata?.empresa_slug
            ?? '',
          ).trim().toLowerCase();

          if (metadataEmpresaId && metadataEmpresaSlug && metadataEmpresaSlug === tenantSlug) {
            empresaId = metadataEmpresaId;
          }
        }

        if (!empresaId) {
          empresaId = slugCompany?.id ?? null;
        }
      }

      if (!empresaId) {
        if (isBaseDomainHost) {
          setTenant(null);
          setError(null);
          setIsLoading(false);
          return;
        }

        if (hostname.endsWith(`.${baseDomain}`)) {
          const slug = hostSlug;
          if (slug && slug !== 'www' && TENANT_SLUG_REGEX.test(slug)) {
            empresaId = await resolveEmpresaIdBySlug(slug);

            if (!empresaId) {
              // First-access fallback: read tenant identity from auth metadata when slug matches host.
              const { data: authUserResult } = await supabase.auth.getUser();
              const authUser = authUserResult?.user;
              const metadataEmpresaId = typeof authUser?.app_metadata?.empresa_id === 'string'
                ? authUser.app_metadata.empresa_id
                : null;
              const metadataEmpresaSlug = String(
                authUser?.app_metadata?.empresa_slug
                ?? '',
              ).trim().toLowerCase();

              if (metadataEmpresaId && metadataEmpresaSlug && metadataEmpresaSlug === slug) {
                empresaId = metadataEmpresaId;
              }
            }
          }
        }
      }

      if (!empresaId) {
        setTenant(null);
        setError('Domínio tenant não autorizado');
        logger.warn('tenant_resolution_unauthorized_domain', {
          hostname,
          tenantSlug,
        });
        setIsLoading(false);
        return;
      }

      const { data, error: fetchError } = await supabase
        .from('empresas')
        .select('id, nome, status, slug')
        .eq('id', empresaId)
        .maybeSingle();

      if (!isMounted) return;

      if (fetchError || !data) {
        // Fallback for first login / restrictive RLS: keep tenant context from resolved host/id.
        // This prevents false negatives that block tenant login when empresa_id is already known.
        const fallbackSlug = (hostSlug || tenantSlug || 'default').toLowerCase();
        setTenant({
          id: empresaId,
          slug: fallbackSlug,
          name: fallbackSlug,
          is_active: true,
        });
        setError(null);
        logger.warn('tenant_resolution_company_not_found_fallback_applied', {
          hostname,
          tenantSlug,
          hostSlug,
          empresaId,
          error: fetchError?.message ?? null,
        });
      } else {
        const normalizedStatus = String((data as { status?: string | null })?.status ?? '').trim().toLowerCase();
        setTenant({
          id: data.id,
          slug: (data.slug || tenantSlug || 'default').toLowerCase(),
          name: data.nome,
          is_active: normalizedStatus === 'active' || normalizedStatus === 'ativo',
        });
      }

      setIsLoading(false);
    }

    const loadWithCeiling = async () => {
      const ceilingTimer = window.setTimeout(() => {
        if (!isMounted) return;
        logger.warn('tenant_resolution_total_timeout', { tenantSlug });
        setError('Timeout na resolução do tenant. Recarregue a página.');
        setIsLoading(false);
      }, TENANT_RESOLVE_TOTAL_TIMEOUT_MS);

      try {
        await loadTenant();
      } finally {
        window.clearTimeout(ceilingTimer);
      }
    };

    loadWithCeiling();

    return () => {
      isMounted = false;
    };
  }, [reloadKey, tenantSlug]);

  useEffect(() => {
    const previousTenantId = previousTenantRef.current;
    const currentTenantId = tenant?.id ?? null;

    if (previousTenantId === currentTenantId) {
      return;
    }

    const isolateTenantCache = async () => {
      await queryClient.cancelQueries();

      if (previousTenantId) {
        queryClient.resetQueries({
          predicate: (query) =>
            Array.isArray(query.queryKey) && query.queryKey.some((keyPart) => keyPart === previousTenantId),
        });

        queryClient.removeQueries({
          predicate: (query) =>
            Array.isArray(query.queryKey) && query.queryKey.some((keyPart) => keyPart === previousTenantId),
        });
      }

      queryClient.clear();
      previousTenantRef.current = currentTenantId;
    };

    void isolateTenantCache();
  }, [queryClient, tenant?.id]);

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
