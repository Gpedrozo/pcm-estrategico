// Structured logger for mecanico-app.
// In __DEV__ (Expo dev mode) all logs are emitted.
// In production builds only `error` reaches the console.

declare const __DEV__: boolean;

function fmt(scope: string, msg: string) {
  return `[${scope}] ${msg}`;
}

export const logger = {
  info(scope: string, msg: string, meta?: Record<string, unknown>) {
    if (__DEV__) console.log(fmt(scope, msg), meta ?? '');
  },
  warn(scope: string, msg: string, meta?: Record<string, unknown>) {
    if (__DEV__) console.warn(fmt(scope, msg), meta ?? '');
  },
  error(scope: string, msg: string, meta?: Record<string, unknown>) {
    console.error(fmt(scope, msg), meta ?? '');
  },
};
