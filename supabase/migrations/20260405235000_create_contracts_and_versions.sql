-- ============================================================
-- Migration: Cria tabelas contracts e contract_versions
-- Objetivo: Gerar contrato automaticamente na criacao da empresa/assinatura
-- ============================================================

-- 1) Tabela principal de contratos
CREATE TABLE IF NOT EXISTS public.contracts (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id    uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  subscription_id uuid REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  plan_id       uuid REFERENCES public.plans(id) ON DELETE SET NULL,
  content       text NOT NULL DEFAULT '',
  generated_at  timestamptz NOT NULL DEFAULT now(),
  starts_at     date,
  ends_at       date,
  amount        numeric(12,2) DEFAULT 0,
  payment_method text,
  version       integer NOT NULL DEFAULT 1,
  status        text NOT NULL DEFAULT 'ativo',
  signed_at     timestamptz,
  signed_by     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.contracts IS 'Contratos gerados automaticamente a partir de assinaturas';

CREATE INDEX IF NOT EXISTS idx_contracts_empresa_id ON public.contracts(empresa_id);
CREATE INDEX IF NOT EXISTS idx_contracts_subscription_id ON public.contracts(subscription_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON public.contracts(status);

-- 2) Tabela de versoes historicas do contrato
CREATE TABLE IF NOT EXISTS public.contract_versions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id     uuid NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  version         integer NOT NULL DEFAULT 1,
  content         text NOT NULL DEFAULT '',
  change_summary  text,
  created_by      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contract_versions_contract_id ON public.contract_versions(contract_id);

-- 3) Trigger updated_at automatico para contracts
CREATE OR REPLACE FUNCTION public.contracts_set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_contracts_updated_at ON public.contracts;
CREATE TRIGGER trg_contracts_updated_at
  BEFORE UPDATE ON public.contracts
  FOR EACH ROW EXECUTE FUNCTION public.contracts_set_updated_at();

-- 4) RLS
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY contracts_service_all ON public.contracts
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY contract_versions_service_all ON public.contract_versions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY contracts_tenant_select ON public.contracts
  FOR SELECT TO authenticated
  USING (
    empresa_id IN (
      SELECT empresa_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY contract_versions_tenant_select ON public.contract_versions
  FOR SELECT TO authenticated
  USING (
    contract_id IN (
      SELECT c.id FROM public.contracts c
      JOIN public.profiles p ON p.empresa_id = c.empresa_id
      WHERE p.id = auth.uid()
    )
  );
