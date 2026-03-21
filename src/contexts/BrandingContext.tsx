import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/contexts/TenantContext';

export interface BrandingData {
  razao_social: string;
  nome_fantasia: string | null;
  logo_principal_url: string | null;
  logo_login_url: string | null;
  logo_menu_url: string | null;
  logo_os_url: string | null;
  logo_pdf_url: string | null;
  logo_relatorio_url: string | null;
}

interface BrandingContextValue {
  branding: BrandingData | null;
  isLoading: boolean;
  error: string | null;
}

const BrandingContext = createContext<BrandingContextValue | undefined>(undefined);

export function BrandingProvider({ children }: { children: React.ReactNode }) {
  const { tenant } = useTenant();
  const [branding, setBranding] = useState<BrandingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadBranding() {
      if (!tenant?.id) {
        setBranding(null);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('dados_empresa')
        .select('razao_social, nome_fantasia, logo_url, logo_os_url')
        .eq('empresa_id', tenant.id)
        .limit(1)
        .maybeSingle();

      if (!isMounted) return;

      if (fetchError) {
        setError(fetchError.message);
        setBranding(null);
      } else {
        if (!data) {
          setBranding(null);
        } else {
          const logoPrincipal = data.logo_url ?? null;
          const logoOS = data.logo_os_url ?? logoPrincipal;

          setBranding({
            razao_social: data.razao_social ?? '',
            nome_fantasia: data.nome_fantasia ?? null,
            logo_principal_url: logoPrincipal,
            logo_login_url: logoPrincipal,
            logo_menu_url: logoPrincipal,
            logo_os_url: logoOS,
            logo_pdf_url: logoOS,
            logo_relatorio_url: logoOS,
          });
        }
      }

      setIsLoading(false);
    }

    loadBranding();

    return () => {
      isMounted = false;
    };
  }, [tenant?.id]);

  return (
    <BrandingContext.Provider value={{ branding, isLoading, error }}>
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding() {
  const context = useContext(BrandingContext);
  if (!context) {
    throw new Error('useBranding must be used within BrandingProvider');
  }
  return context;
}
