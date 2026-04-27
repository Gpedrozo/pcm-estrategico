-- ============================================================================
-- Migration: Plano Trial para self-service do site institucional
-- Data: 2026-04-26
-- Descrição:
--   Cria o plano 'trial' na tabela plans (e planos) para ser usado pelo
--   fluxo de cadastro automático via edge function trial-register.
--   Idempotente — usa ON CONFLICT DO NOTHING.
-- ============================================================================

-- ── Plano trial em `plans` (tabela EN) ──────────────────────────────────────
INSERT INTO public.plans (
  code,
  name,
  description,
  active,
  price_month,
  user_limit,
  company_limit,
  module_flags,
  data_limit_mb
)
VALUES (
  'trial',
  'Trial 30 dias',
  'Período de avaliação gratuita de 30 dias com acesso completo ao sistema.',
  true,
  0,
  10,
  1,
  '{
    "os": true,
    "preventiva": true,
    "preditiva": true,
    "lubrificacao": true,
    "inspecoes": true,
    "fmea": true,
    "rca": true,
    "ssma": true,
    "custos": true,
    "relatorios": true,
    "mecanico_app": true,
    "portal_mecanico": true,
    "kpi": true,
    "backlog": true,
    "programacao": true
  }'::jsonb,
  500
)
ON CONFLICT (code) DO UPDATE
  SET
    name        = EXCLUDED.name,
    description = EXCLUDED.description,
    active      = true,
    price_month = 0;

-- ── Plano trial em `planos` (tabela PT) ─────────────────────────────────────
-- Verifica se a tabela planos existe antes de inserir
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'planos'
  ) THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'planos' AND column_name = 'code'
    ) THEN
      INSERT INTO public.planos (code, name, description, active, price_month)
      VALUES ('trial', 'Trial 30 dias', 'Avaliação gratuita 30 dias', true, 0)
      ON CONFLICT (code) DO UPDATE SET active = true, price_month = 0;
    ELSIF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'planos' AND column_name = 'nome'
    ) THEN
      INSERT INTO public.planos (nome, descricao, ativo, preco_mensal)
      VALUES ('Trial 30 dias', 'Avaliação gratuita 30 dias', true, 0)
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;
  RAISE NOTICE '[migration] Plano trial criado/atualizado com sucesso.';
END;
$$;
