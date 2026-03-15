import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { proxyOwnerAction } from "../_shared/ownerActionProxy.ts";

const ALLOWED_ACTIONS = [
  "health_check",
  "dashboard",
  "platform_stats",
  "list_companies",
  "create_company",
  "update_company",
  "set_company_status",
  "block_company",
] as const;

Deno.serve((req) => proxyOwnerAction(req, {
  serviceName: "owner-companies",
  allowedActions: [...ALLOWED_ACTIONS],
}));
