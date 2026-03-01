import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface EmpresaBranding {
  dominio_custom: string | null;
  logo_url: string | null;
  cor_primaria: string;
  cor_secundaria: string;
  nome_exibicao: string;
  favicon_url: string | null;
}

const defaultBranding: EmpresaBranding = {
  dominio_custom: null,
  logo_url: null,
  cor_primaria: '#2563eb',
  cor_secundaria: '#0f172a',
  nome_exibicao: 'PCM ESTRATÉGICO',
  favicon_url: null,
};

export function resolveEmpresaBranding(input: Partial<EmpresaBranding> | null | undefined): EmpresaBranding {
  return {
    dominio_custom: input?.dominio_custom ?? defaultBranding.dominio_custom,
    logo_url: input?.logo_url ?? defaultBranding.logo_url,
    cor_primaria: input?.cor_primaria?.trim() ? input.cor_primaria : defaultBranding.cor_primaria,
    cor_secundaria: input?.cor_secundaria?.trim() ? input.cor_secundaria : defaultBranding.cor_secundaria,
    nome_exibicao: input?.nome_exibicao?.trim() ? input.nome_exibicao : defaultBranding.nome_exibicao,
    favicon_url: input?.favicon_url ?? defaultBranding.favicon_url,
  };
}

export function useEmpresaBranding() {
  const query = useQuery({
    queryKey: ['empresa-branding'],
    queryFn: async () => {
      const hostname = typeof window === 'undefined' ? null : window.location.hostname;

      const domainQuery = supabase
        .from('empresa_config' as never)
        .select('dominio_custom,logo_url,cor_primaria,cor_secundaria,nome_exibicao,favicon_url')
        .eq('dominio_custom', hostname ?? '')
        .limit(1)
        .maybeSingle();

      const fallbackQuery = supabase
        .from('empresa_config' as never)
        .select('dominio_custom,logo_url,cor_primaria,cor_secundaria,nome_exibicao,favicon_url')
        .is('dominio_custom', null)
        .limit(1)
        .maybeSingle();

      const [domainResult, fallbackResult] = await Promise.all([
        hostname && hostname !== 'localhost' && hostname !== '127.0.0.1' ? domainQuery : Promise.resolve({ data: null, error: null }),
        fallbackQuery,
      ]);

      if (domainResult.error && fallbackResult.error) {
        throw domainResult.error;
      }

      const rawBranding = (domainResult.data ?? fallbackResult.data) as Partial<EmpresaBranding> | null;
      return resolveEmpresaBranding(rawBranding);
    },
  });

  useEffect(() => {
    const favicon = query.data?.favicon_url;

    if (!favicon || typeof document === 'undefined') {
      return;
    }

    const icon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (icon) {
      icon.href = favicon;
    }
  }, [query.data?.favicon_url]);

  return {
    ...query,
    branding: query.data ?? defaultBranding,
  };
}
