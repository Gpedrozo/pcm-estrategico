-- ============================================================
-- Sprint 3a — Módulo de Representantes Comerciais
-- Data: 2026-04-22
-- Descrição:
--   1. Tabela representantes (empresa parceira comercial)
--   2. Tabela gastos_sistema (hospedagem, domínio, APIs, etc.)
--   3. Tabela comissoes_representantes (extrato mensal por rep)
--   4. Colunas representante_id + vendedor em empresas
-- ============================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────
-- 1. Representantes comerciais
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.representantes (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  nome                 text        NOT NULL,
  razao_social         text,
  cnpj                 text,
  email                text,
  telefone             text,
  -- 'liquido' = comissão sobre receita bruta - custos proporcionais
  -- 'bruto'   = comissão sobre receita bruta diretamente
  modelo_comissao      text        NOT NULL DEFAULT 'bruto'
                         CHECK (modelo_comissao IN ('liquido', 'bruto')),
  percentual_comissao  numeric(5,2) NOT NULL DEFAULT 0
                         CHECK (percentual_comissao >= 0 AND percentual_comissao <= 100),
  ativo                boolean     NOT NULL DEFAULT true,
  observacoes          text,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.representantes IS 'Empresas ou pessoas parceiras que vendem o sistema e recebem comissão';
COMMENT ON COLUMN public.representantes.modelo_comissao IS 'liquido: comissao calculada sobre receita apos deduzir custos proporcionais; bruto: sobre receita total';

-- ─────────────────────────────────────────────────────────────
-- 2. Gastos do sistema (hospedagem, domínio, APIs, etc.)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.gastos_sistema (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  descricao       text        NOT NULL,
  categoria       text        NOT NULL DEFAULT 'outros'
                    CHECK (categoria IN ('hospedagem', 'dominio', 'api', 'outros')),
  valor           numeric(12,2) NOT NULL DEFAULT 0 CHECK (valor >= 0),
  recorrencia     text        NOT NULL DEFAULT 'mensal'
                    CHECK (recorrencia IN ('mensal', 'anual', 'avulso')),
  -- Para recorrência mensal: qualquer data do mês de competência
  -- Para anual: data do ano de competência
  -- Para avulso: data exata do gasto
  data_referencia date        NOT NULL DEFAULT CURRENT_DATE,
  ativo           boolean     NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.gastos_sistema IS 'Gastos operacionais do sistema (hosting, dominio, APIs). Usados no calculo de comissao modelo liquido.';

-- ─────────────────────────────────────────────────────────────
-- 3. Extrato de comissões por período
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.comissoes_representantes (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  representante_id     uuid        NOT NULL
                         REFERENCES public.representantes(id) ON DELETE CASCADE,
  periodo_referencia   date        NOT NULL, -- sempre 1º do mês: '2026-04-01'
  receita_bruta        numeric(12,2) NOT NULL DEFAULT 0,   -- sum mensalidades clientes deste rep
  gastos_alocados      numeric(12,2) NOT NULL DEFAULT 0,   -- custo proporcional (modelo liquido) ou 0
  base_calculo         numeric(12,2) NOT NULL DEFAULT 0,   -- receita_bruta - gastos_alocados
  percentual           numeric(5,2)  NOT NULL DEFAULT 0,
  valor_comissao       numeric(12,2) NOT NULL DEFAULT 0,   -- ROUND(base_calculo * percentual / 100, 2)
  status               text        NOT NULL DEFAULT 'pendente'
                         CHECK (status IN ('pendente', 'pago')),
  data_pagamento       date,
  observacoes          text,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  UNIQUE (representante_id, periodo_referencia)  -- idempotente: pode recalcular sem duplicar
);

COMMENT ON TABLE public.comissoes_representantes IS 'Extrato mensal de comissoes por representante. Idempotente via UNIQUE(rep, periodo).';

-- ─────────────────────────────────────────────────────────────
-- 4. Colunas em empresas: representante + vendedor
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.empresas
  ADD COLUMN IF NOT EXISTS representante_id uuid
    REFERENCES public.representantes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS vendedor text; -- Nome da pessoa que fechou a venda (texto livre)

COMMENT ON COLUMN public.empresas.representante_id IS 'Representante comercial que captou este cliente (nullable = venda direta)';
COMMENT ON COLUMN public.empresas.vendedor IS 'Nome do vendedor pessoa fisica que fechou o negocio';

-- ─────────────────────────────────────────────────────────────
-- 5. Índices de performance
-- ─────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_representantes_ativo
  ON public.representantes(ativo);

CREATE INDEX IF NOT EXISTS idx_gastos_sistema_lookup
  ON public.gastos_sistema(ativo, recorrencia, data_referencia);

CREATE INDEX IF NOT EXISTS idx_comissoes_rep_periodo
  ON public.comissoes_representantes(representante_id, periodo_referencia);

CREATE INDEX IF NOT EXISTS idx_empresas_representante
  ON public.empresas(representante_id)
  WHERE representante_id IS NOT NULL;

-- ─────────────────────────────────────────────────────────────
-- 6. RLS — somente SYSTEM_OWNER / SYSTEM_ADMIN e service_role
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.representantes          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gastos_sistema          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comissoes_representantes ENABLE ROW LEVEL SECURITY;

-- service_role (edge functions) tem acesso total
CREATE POLICY rep_service_all ON public.representantes
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY gastos_service_all ON public.gastos_sistema
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY comissoes_service_all ON public.comissoes_representantes
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Autenticados: somente SYSTEM_OWNER e SYSTEM_ADMIN
CREATE POLICY rep_owner_admin ON public.representantes
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role IN ('SYSTEM_OWNER', 'SYSTEM_ADMIN')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role IN ('SYSTEM_OWNER', 'SYSTEM_ADMIN')
    )
  );

CREATE POLICY gastos_owner_admin ON public.gastos_sistema
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role IN ('SYSTEM_OWNER', 'SYSTEM_ADMIN')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role IN ('SYSTEM_OWNER', 'SYSTEM_ADMIN')
    )
  );

CREATE POLICY comissoes_owner_admin ON public.comissoes_representantes
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role IN ('SYSTEM_OWNER', 'SYSTEM_ADMIN')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role IN ('SYSTEM_OWNER', 'SYSTEM_ADMIN')
    )
  );

-- ─────────────────────────────────────────────────────────────
-- 7. Triggers de updated_at
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_representantes_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_representantes_updated_at
  BEFORE UPDATE ON public.representantes
  FOR EACH ROW EXECUTE FUNCTION public.set_representantes_updated_at();

CREATE TRIGGER trg_gastos_updated_at
  BEFORE UPDATE ON public.gastos_sistema
  FOR EACH ROW EXECUTE FUNCTION public.set_representantes_updated_at();

CREATE TRIGGER trg_comissoes_updated_at
  BEFORE UPDATE ON public.comissoes_representantes
  FOR EACH ROW EXECUTE FUNCTION public.set_representantes_updated_at();

COMMIT;
