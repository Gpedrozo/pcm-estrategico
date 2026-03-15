// @ts-nocheck

export type RateLimitOptions = {
  scope: string;
  identifier?: string | null;
  maxRequests?: number;
  windowSeconds?: number;
  blockSeconds?: number;
};

export async function enforceRateLimit(admin: any, options: RateLimitOptions) {
  const { data, error } = await admin.rpc("app_check_rate_limit_ip", {
    p_scope: options.scope,
    p_identifier: options.identifier ?? null,
    p_max_requests: options.maxRequests ?? 60,
    p_window_seconds: options.windowSeconds ?? 60,
    p_block_seconds: options.blockSeconds ?? 900,
  });

  if (error) {
    return {
      allowed: false,
      reason: `rate_limit_check_failed: ${error.message}`,
    };
  }

  return {
    allowed: Boolean(data),
    reason: Boolean(data) ? null : "rate_limited",
  };
}
