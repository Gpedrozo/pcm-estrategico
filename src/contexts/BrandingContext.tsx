import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/contexts/TenantContext';

interface BrandingData {
  logo_url: string | null;
  cor_primaria: string;
  cor_secundaria: string;
  nome_sistema: string;
  favicon_url: string | null;
  css_customizado: string | null;
}

interface BrandingContextType {
  branding: BrandingData | null;
}

const BrandingContext = createContext<BrandingContextType | undefined>(undefined);

const defaultBranding: BrandingData = {
  logo_url: null,
  cor_primaria: '#1e3a5f',
  cor_secundaria: '#38bdf8',
  nome_sistema: 'PCM Estratégico',
  favicon_url: null,
  css_customizado: null,
};

function hexToHslTriplet(hex: string): string | null {
  const value = hex.replace('#', '');
  if (![3, 6].includes(value.length)) return null;

  const normalized = value.length === 3 ? value.split('').map((c) => `${c}${c}`).join('') : value;
  const r = parseInt(normalized.slice(0, 2), 16) / 255;
  const g = parseInt(normalized.slice(2, 4), 16) / 255;
  const b = parseInt(normalized.slice(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  const l = (max + min) / 2;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));

  if (d !== 0) {
    switch (max) {
      case r:
        h = ((g - b) / d) % 6;
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      default:
        h = (r - g) / d + 4;
        break;
    }
    h = Math.round(h * 60);
    if (h < 0) h += 360;
  }

  return `${h} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

export function BrandingProvider({ children }: { children: React.ReactNode }) {
  const { empresaId, tenant } = useTenant();
  const [branding, setBranding] = useState<BrandingData | null>(defaultBranding);

  useEffect(() => {
    let mounted = true;

    const loadBranding = async () => {
      if (!empresaId) {
        setBranding(defaultBranding);
        return;
      }

      const { data, error } = await (supabase as any)
        .from('empresa_branding')
        .select('logo_url, cor_primaria, cor_secundaria, nome_sistema, favicon_url, css_customizado')
        .eq('empresa_id', empresaId)
        .maybeSingle();

      if (!mounted) return;
      if (error || !data) {
        setBranding({ ...defaultBranding, nome_sistema: tenant?.nome || defaultBranding.nome_sistema });
      } else {
        setBranding(data as BrandingData);
      }
    };

    loadBranding();
    return () => {
      mounted = false;
    };
  }, [empresaId, tenant?.nome]);

  useEffect(() => {
    if (!branding) return;
    document.title = branding.nome_sistema || defaultBranding.nome_sistema;

    const primary = hexToHslTriplet(branding.cor_primaria);
    const secondary = hexToHslTriplet(branding.cor_secundaria);
    if (primary) document.documentElement.style.setProperty('--primary', primary);
    if (secondary) document.documentElement.style.setProperty('--accent', secondary);

    let customStyle = document.getElementById('tenant-custom-css');
    if (!customStyle) {
      customStyle = document.createElement('style');
      customStyle.id = 'tenant-custom-css';
      document.head.appendChild(customStyle);
    }
    customStyle.textContent = branding.css_customizado || '';

    let favicon = document.querySelector("link[rel*='icon']") as HTMLLinkElement | null;
    if (!favicon) {
      favicon = document.createElement('link');
      favicon.rel = 'icon';
      document.head.appendChild(favicon);
    }
    if (branding.favicon_url) {
      favicon.href = branding.favicon_url;
    }
  }, [branding]);

  const value = useMemo(() => ({ branding }), [branding]);
  return <BrandingContext.Provider value={value}>{children}</BrandingContext.Provider>;
}

export function useBranding() {
  const context = useContext(BrandingContext);
  if (!context) {
    throw new Error('useBranding must be used within BrandingProvider');
  }
  return context;
}
