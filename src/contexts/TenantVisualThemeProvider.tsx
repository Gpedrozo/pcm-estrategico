import { useEffect } from 'react';
import { useTenantAdminConfig } from '@/hooks/useTenantAdminConfig';

type HexColor = `#${string}`;

interface TenantVisualConfig {
  cor_primaria?: HexColor;
  cor_sidebar_primaria?: HexColor;
  cor_sidebar_fundo?: HexColor;
  cor_acento?: HexColor;
}

const visualDefault: TenantVisualConfig = {};

const CSS_KEYS = [
  '--primary',
  '--primary-foreground',
  '--sidebar-primary',
  '--sidebar-primary-foreground',
  '--sidebar-background',
  '--accent',
  '--accent-foreground',
] as const;

function isValidHexColor(color?: string | null): color is HexColor {
  return Boolean(color && /^#[0-9A-Fa-f]{6}$/.test(color));
}

function hexToRgb(color: HexColor) {
  const normalized = color.replace('#', '');
  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);
  return { r, g, b };
}

function rgbToHslToken(r: number, g: number, b: number) {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;

  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;

  let h = 0;
  if (delta !== 0) {
    if (max === rn) h = ((gn - bn) / delta) % 6;
    else if (max === gn) h = (bn - rn) / delta + 2;
    else h = (rn - gn) / delta + 4;
  }

  h = Math.round(h * 60);
  if (h < 0) h += 360;

  const l = (max + min) / 2;
  const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));

  return `${h} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

function toHslToken(color: HexColor) {
  const { r, g, b } = hexToRgb(color);
  return rgbToHslToken(r, g, b);
}

function getContrastToken(color: HexColor) {
  const { r, g, b } = hexToRgb(color);
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return luminance > 0.58 ? '215 25% 12%' : '0 0% 100%';
}

function applyCssVar(name: string, value: string) {
  document.documentElement.style.setProperty(name, value);
}

function clearVisualOverrides() {
  CSS_KEYS.forEach((key) => {
    document.documentElement.style.removeProperty(key);
  });
}

export function TenantVisualThemeProvider({ children }: { children: React.ReactNode }) {
  const { data: visualConfig } = useTenantAdminConfig<TenantVisualConfig>('tenant.admin.visual', visualDefault);

  useEffect(() => {
    const primary = isValidHexColor(visualConfig?.cor_primaria) ? visualConfig?.cor_primaria : null;
    const sidebarPrimary = isValidHexColor(visualConfig?.cor_sidebar_primaria) ? visualConfig?.cor_sidebar_primaria : null;
    const sidebarBackground = isValidHexColor(visualConfig?.cor_sidebar_fundo) ? visualConfig?.cor_sidebar_fundo : null;
    const accent = isValidHexColor(visualConfig?.cor_acento) ? visualConfig?.cor_acento : null;

    clearVisualOverrides();

    if (primary) {
      applyCssVar('--primary', toHslToken(primary));
      applyCssVar('--primary-foreground', getContrastToken(primary));
    }

    if (sidebarPrimary) {
      applyCssVar('--sidebar-primary', toHslToken(sidebarPrimary));
      applyCssVar('--sidebar-primary-foreground', getContrastToken(sidebarPrimary));
    }

    if (sidebarBackground) {
      applyCssVar('--sidebar-background', toHslToken(sidebarBackground));
    }

    if (accent) {
      applyCssVar('--accent', toHslToken(accent));
      applyCssVar('--accent-foreground', getContrastToken(accent));
    }

    return () => {
      clearVisualOverrides();
    };
  }, [visualConfig]);

  return <>{children}</>;
}
