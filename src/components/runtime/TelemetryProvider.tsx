import { useEffect } from 'react';

type TelemetryProviderType = 'cloudflare' | 'none';

const rawTelemetryProvider = String(import.meta.env.VITE_ANALYTICS_PROVIDER ?? 'cloudflare').trim().toLowerCase();

function resolveTelemetryProvider(value: string): TelemetryProviderType {
  if (value === 'cloudflare' || value === 'none') {
    return value;
  }
  return 'cloudflare';
}

const telemetryProvider = resolveTelemetryProvider(rawTelemetryProvider);
const cloudflareToken = String(import.meta.env.VITE_CLOUDFLARE_WEB_ANALYTICS_TOKEN ?? '').trim();

function useCloudflareBeacon(enabled: boolean, token: string) {
  useEffect(() => {
    if (!enabled || !token) return;

    const existing = document.querySelector('script[data-pcm-cf-beacon="true"]');
    if (existing) return;

    const script = document.createElement('script');
    script.defer = true;
    script.src = 'https://static.cloudflareinsights.com/beacon.min.js/v8c78df7c7c0f484497ecbca7046644da1771523124516';
    script.crossOrigin = 'anonymous';
    script.setAttribute('data-pcm-cf-beacon', 'true');
    script.setAttribute('data-cf-beacon', JSON.stringify({ token }));

    document.head.appendChild(script);
  }, [enabled, token]);
}

export function TelemetryProvider() {
  const cloudflareEnabled = telemetryProvider === 'cloudflare' && Boolean(cloudflareToken);
  useCloudflareBeacon(cloudflareEnabled, cloudflareToken);

  return null;
}
