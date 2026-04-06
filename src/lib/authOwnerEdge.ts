import { OWNER_EDGE_LOGIN_ENDPOINT } from '@/lib/authConstants';

export type OwnerEdgeLoginResult = {
  ok: boolean;
  status: number;
  message: string;
  payload: any;
  accessToken: string | null;
  refreshToken: string | null;
  user: any | null;
};

export function getPublicAnonKey() {
  const key = String(
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
    ?? import.meta.env.VITE_SUPABASE_ANON_KEY
    ?? '',
  ).trim();
  return key || null;
}

export async function signInThroughOwnerEdge(email: string, password: string): Promise<OwnerEdgeLoginResult> {
  const baseUrl = String(import.meta.env.VITE_SUPABASE_URL ?? '').trim();
  const anonKey = getPublicAnonKey();

  if (!baseUrl || !anonKey) {
    return {
      ok: false,
      status: 500,
      message: 'Owner login edge misconfigured',
      payload: null,
      accessToken: null,
      refreshToken: null,
      user: null,
    };
  }

  try {
    const response = await fetch(`${baseUrl}${OWNER_EDGE_LOGIN_ENDPOINT}`, {
      method: 'POST',
      headers: {
        apikey: anonKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
      signal: AbortSignal.timeout(15_000),
    });

    const payload = await response.json().catch(() => null);
    const accessToken = String(payload?.session?.access_token ?? payload?.access_token ?? '').trim() || null;
    const refreshToken = String(payload?.session?.refresh_token ?? payload?.refresh_token ?? '').trim() || null;
    const user = payload?.user ?? payload?.session?.user ?? null;

    const message = String(
      payload?.error
      ?? payload?.message
      ?? payload?.details?.auth_message
      ?? payload?.msg
      ?? '',
    ).trim();

    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        message,
        payload,
        accessToken: null,
        refreshToken: null,
        user: null,
      };
    }

    if (!accessToken || !refreshToken || !user?.id) {
      return {
        ok: false,
        status: 502,
        message: 'Owner login response missing session payload',
        payload,
        accessToken: null,
        refreshToken: null,
        user: null,
      };
    }

    return {
      ok: true,
      status: response.status,
      message,
      payload,
      accessToken,
      refreshToken,
      user,
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      message: String(error),
      payload: null,
      accessToken: null,
      refreshToken: null,
      user: null,
    };
  }
}
