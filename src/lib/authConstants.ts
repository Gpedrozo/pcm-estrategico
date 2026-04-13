/**
 * Constantes centralizadas do sistema de autenticação.
 * Usadas por AuthContext, Login, e outros componentes auth.
 */

// --- Domain ---
export const TENANT_BASE_DOMAIN = (
  (typeof import.meta !== 'undefined' ? import.meta.env?.VITE_TENANT_BASE_DOMAIN : '') || 'gppis.com.br'
).toLowerCase();

// --- Storage Keys ---
export const IMPERSONATION_STORAGE_KEY = 'pcm.owner.impersonation.session';
export const TAB_CLOSE_MARKER_STORAGE_KEY = 'pcm.auth.window_closed.v1';
export const INACTIVITY_NOTICE_STORAGE_KEY = 'pcm.auth.inactivity.notice.v1';
export const SESSION_TRANSFER_REDIRECT_STORAGE_KEY = 'pcm.auth.session_transfer.redirect.v1';
export const SESSION_TRANSFER_CONSUMED_STORAGE_KEY = 'pcm.auth.session_transfer.consumed.v1';
export const CROSS_DOMAIN_REDIRECT_MARKER_STORAGE_KEY = 'pcm.auth.cross_domain_redirect.v1';
export const AUTH_REDIRECT_RETRY_STORAGE_KEY = 'pcm.auth.redirect.retry.v1';
export const LOGIN_REDIRECT_LOCK_KEY = 'pcm.auth.login_redirect_lock.v2';

// --- Timeouts ---
export const DEFAULT_INACTIVITY_TIMEOUT_MS = 10 * 60 * 1000;
export const TAB_CLOSE_MARKER_MAX_AGE_MS = 12 * 60 * 60 * 1000;
export const SESSION_TRANSFER_MAX_AGE_MS = 2 * 60 * 1000;
export const SESSION_TRANSFER_REDIRECT_MAX_AGE_MS = 15_000;
export const CROSS_DOMAIN_REDIRECT_MARKER_MAX_AGE_MS = 60_000;
export const LOGIN_PROFILE_TIMEOUT_MS = 6_000;
export const TENANT_HOST_RESOLVE_TIMEOUT_MS = 6_000;
export const HYDRATION_TIMEOUT_MS = 8_000;
export const LOGIN_REDIRECT_LOCK_TTL_MS = 15_000;
export const SESSION_TRANSFER_CONSUMED_MAX_AGE_MS = 2 * 60 * 1000;
export const TENANT_REDIRECT_TIMEOUT_MS = 6_000;
export const TENANT_RESOLVE_TOTAL_TIMEOUT_MS = 12_000;

// --- Rate Limit (backend-enforced, estes são apenas para UX) ---
export const OWNER_EDGE_LOGIN_ENDPOINT = '/functions/v1/auth-login';

// --- URL Params ---
export const LOGOUT_MARKER_PARAM = 'logout';
export const LOGOUT_REASON_PARAM = 'reason';
export const SESSION_TRANSFER_PARAM = 'session_transfer';

// --- Auth Redirect ---
export const AUTH_REDIRECT_RETRY_MAX = 2;
