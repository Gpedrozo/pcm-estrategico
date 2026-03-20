import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { proxyOwnerAction } from "../_shared/ownerActionProxy.ts";

const ALLOWED_ACTIONS = [
  "health_check",
  "list_plans",
  "create_plan",
  "update_plan",
  "list_subscriptions",
  "create_subscription",
  "set_subscription_status",
  "update_subscription_billing",
  "list_subscription_payments",
  "asaas_link_subscription",
  "asaas_sync_subscription",
  "change_plan",
  "list_contracts",
  "update_contract",
  "regenerate_contract",
  "delete_contract",
] as const;

Deno.serve((req) => proxyOwnerAction(req, {
  serviceName: "owner-billing",
  allowedActions: [...ALLOWED_ACTIONS],
}));
