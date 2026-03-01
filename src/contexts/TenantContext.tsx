import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { resolveTenantSlug } from '@/lib/security';

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

  const tenantSlug = useMemo(() => resolveTenantSlug(window.location.hostname), []);

  useEffect(() => {
    let isMounted = true;

    async function loadTenant() {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('tenants' as any)
        .select('id, slug, name, is_active')
        .eq('slug', tenantSlug)
        .maybeSingle();

      if (!isMounted) return;

      if (fetchError || !data) {
        setTenant(null);
        setError(fetchError?.message || 'Tenant nao encontrado');
      } else {
        setTenant(data as Tenant);
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
