-- FASE 3 - CONTRATO DE REFATORAÇÃO DAS EDGE FUNCTIONS
-- Este arquivo documenta e fixa as regras de integração obrigatórias para edge functions.

BEGIN;

CREATE TABLE IF NOT EXISTS public.edge_refactor_contract (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  function_name text NOT NULL UNIQUE,
  must_require_jwt boolean NOT NULL DEFAULT true,
  must_use_enterprise_audit boolean NOT NULL DEFAULT true,
  must_use_tenant_scope boolean NOT NULL DEFAULT true,
  status text NOT NULL DEFAULT 'pending',
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.edge_refactor_contract (function_name, status)
VALUES
  ('generate-preventive-os', 'pending'),
  ('kpi-report', 'pending'),
  ('system-health-check', 'in_progress'),
  ('stripe-webhook', 'in_progress'),
  ('analisar-causa-raiz', 'pending')
ON CONFLICT (function_name) DO UPDATE
SET updated_at = now();

COMMIT;
