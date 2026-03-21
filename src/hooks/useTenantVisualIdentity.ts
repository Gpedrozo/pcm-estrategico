import { useEffect } from 'react';
import { useTenantAdminConfig } from '@/hooks/useTenantAdminConfig';

export type VisualIdentityMode = 'SYSTEM' | 'TENANT';

export interface TenantVisualIdentityConfig {
  mode: VisualIdentityMode;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
}

export const tenantVisualIdentityDefault: TenantVisualIdentityConfig = {
  mode: 'SYSTEM',
  primaryColor: '#1b3f60',
  secondaryColor: '#d8dde3',
  accentColor: '#b8c8d8',
};

function normalizeHex(value: string, fallback: string): string {
  const raw = String(value || '').trim();
  if (!raw) return fallback;

  const withHash = raw.startsWith('#') ? raw : `#${raw}`;
  if (/^#[0-9a-fA-F]{6}$/.test(withHash)) return withHash;
  return fallback;
}

function hexToHslTriplet(hex: string): string {
  const normalized = normalizeHex(hex, '#1b3f60').replace('#', '');
  const r = parseInt(normalized.slice(0, 2), 16) / 255;
  const g = parseInt(normalized.slice(2, 4), 16) / 255;
  const b = parseInt(normalized.slice(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  const l = (max + min) / 2;

  let h = 0;
  let s = 0;

  if (delta !== 0) {
    s = delta / (1 - Math.abs(2 * l - 1));

    switch (max) {
      case r:
        h = ((g - b) / delta) % 6;
        break;
      case g:
        h = (b - r) / delta + 2;
        break;
      default:
        h = (r - g) / delta + 4;
        break;
    }
  }

  const hue = Math.round((h * 60 + 360) % 360);
  const sat = Math.round(s * 100);
  const light = Math.round(l * 100);

  return `${hue} ${sat}% ${light}%`;
}

export function useTenantVisualIdentity() {
  return useTenantAdminConfig<TenantVisualIdentityConfig>(
    'tenant.admin.visual_identity',
    tenantVisualIdentityDefault,
  );
}

export function useApplyTenantVisualIdentity(identity?: TenantVisualIdentityConfig | null) {
  useEffect(() => {
    const root = document.documentElement;

    if (!identity || identity.mode === 'SYSTEM') {
      root.removeAttribute('data-tenant-theme');
      root.style.removeProperty('--primary');
      root.style.removeProperty('--secondary');
      root.style.removeProperty('--accent');
      root.style.removeProperty('--ring');
      root.style.removeProperty('--sidebar-primary');
      return;
    }

    root.setAttribute('data-tenant-theme', 'custom');

    const primary = normalizeHex(identity.primaryColor, tenantVisualIdentityDefault.primaryColor);
    const secondary = normalizeHex(identity.secondaryColor, tenantVisualIdentityDefault.secondaryColor);
    const accent = normalizeHex(identity.accentColor, tenantVisualIdentityDefault.accentColor);

    root.style.setProperty('--primary', hexToHslTriplet(primary));
    root.style.setProperty('--secondary', hexToHslTriplet(secondary));
    root.style.setProperty('--accent', hexToHslTriplet(accent));
    root.style.setProperty('--ring', hexToHslTriplet(primary));
    root.style.setProperty('--sidebar-primary', hexToHslTriplet(primary));
  }, [identity]);
}
