import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { proxyOwnerAction } from "../_shared/ownerActionProxy.ts";

const ALLOWED_ACTIONS = [
  "list_users",
  "create_user",
  "set_user_status",
  "create_system_admin",
  "impersonate_company",
  "stop_impersonation",
  "list_platform_owners",
  "create_platform_owner",
] as const;

Deno.serve((req) => proxyOwnerAction(req, {
  serviceName: "owner-users",
  allowedActions: [...ALLOWED_ACTIONS],
}));
