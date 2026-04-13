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

      // Single query — read all branding data directly from dados_empresa.
      // Includes the new per-context logo columns added in migration 20260412200000.
      const { data, error: fetchError } = await supabase
        .from('dados_empresa')
        .select('razao_social, nome_fantasia, logo_url, logo_os_url, logo_principal_url, logo_menu_url, logo_login_url, logo_pdf_url, logo_relatorio_url')
        .eq('empresa_id', tenant.id)
        .limit(1)
        .maybeSingle();

      if (!isMounted) return;

      if (fetchError) {
        setError(fetchError.message);
        setBranding(null);
        setIsLoading(false);
        return;
      }

      // Cast to a loose record so we can access new columns safely even before
      // DB migration runs (they will be undefined -> null).
      const r = data as Record<string, string | null | undefined> | null;

      // Check if the new per-context columns are populated.
      const hasNewCols = Boolean(r?.logo_principal_url || r?.logo_login_url || r?.logo_os_url);

      // Fallback: if new columns don't exist yet, read from configuracoes_sistema.
      let fallbackLogoPrincipal: string | null = null;
      let fallbackLogoOS: string | null = null;

      if (!hasNewCols) {
        const { data: configData } = await supabase
          .from('configuracoes_sistema')
          .select('valor')
          .eq('empresa_id', tenant.id)
          .eq('chave', 'tenant.logos')
          .maybeSingle();

        if (!isMounted) return;

        if (configData?.valor) {
          try {
            const logos = typeof configData.valor === 'string'
              ? JSON.parse(configData.valor)
              : configData.valor as Record<string, string | null>;
            fallbackLogoPrincipal = logos.logo_url ?? null;
            fallbackLogoOS = logos.logo_os_url ?? fallbackLogoPrincipal;
          } catch {
            // Malformed JSON — ignore
          }
        }
      }

      if (!r && !fallbackLogoPrincipal) {
        setBranding(null);
        setIsLoading(false);
        return;
      }

      const logoP  = r?.logo_principal_url ?? r?.logo_url ?? fallbackLogoPrincipal ?? null;
      const logoOS = r?.logo_os_url ?? r?.logo_url ?? fallbackLogoOS ?? logoP;

      setBranding({
        razao_social:       r?.razao_social       ?? '',
        nome_fantasia:      r?.nome_fantasia       ?? null,
        logo_principal_url: logoP,
        logo_menu_url:      r?.logo_menu_url       ?? logoP,
        logo_login_url:     r?.logo_login_url      ?? logoP,
        logo_os_url:        logoOS,
        logo_pdf_url:       r?.logo_pdf_url        ?? logoOS ?? logoP,
        logo_relatorio_url: r?.logo_relatorio_url  ?? logoOS ?? logoP,
      });


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
