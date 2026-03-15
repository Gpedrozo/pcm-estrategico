import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { proxyOwnerAction } from "../_shared/ownerActionProxy.ts";

const ALLOWED_ACTIONS = [
  "list_audit_logs",
  "list_support_tickets",
  "respond_support_ticket",
  "get_company_settings",
  "update_company_settings",
] as const;

Deno.serve((req) => proxyOwnerAction(req, {
  serviceName: "owner-audit",
  allowedActions: [...ALLOWED_ACTIONS],
}));
