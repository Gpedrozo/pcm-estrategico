import * as Sentry from '@sentry/react';

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN ?? '';

let initialized = false;

export function initMonitoring() {
  if (initialized || !SENTRY_DSN) return;

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: import.meta.env.MODE,
    release: `pcm@${import.meta.env.VITE_APP_VERSION ?? '0.0.0'}`,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({ maskAllText: true, blockAllMedia: true }),
    ],
    tracesSampleRate: import.meta.env.PROD ? 0.2 : 1.0,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: import.meta.env.PROD ? 1.0 : 0,
    beforeSend(event) {
      if (event.exception?.values?.some((v) => v.value?.includes('ChunkLoadError'))) {
        return null;
      }
      return event;
    },
  });

  initialized = true;
}

export function captureError(error: unknown, context?: Record<string, unknown>) {
  if (!initialized) return;
  Sentry.withScope((scope) => {
    if (context) scope.setExtras(context);
    Sentry.captureException(error);
  });
}

export function setMonitoringUser(id: string, email: string) {
  if (!initialized) return;
  Sentry.setUser({ id, email });
}

export function setMonitoringTag(key: string, value: string) {
  if (!initialized) return;
  Sentry.setTag(key, value);
}
