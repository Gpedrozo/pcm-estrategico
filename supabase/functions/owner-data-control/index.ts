import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { proxyOwnerAction } from "../_shared/ownerActionProxy.ts";

const ALLOWED_ACTIONS = [
  "list_database_tables",
  "cleanup_company_data",
  "purge_table_data",
  "delete_company",
  "cleanup_owner_stress_data",
] as const;

Deno.serve((req) => proxyOwnerAction(req, {
  serviceName: "owner-data-control",
  allowedActions: [...ALLOWED_ACTIONS],
}));
