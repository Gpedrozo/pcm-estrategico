-- Migration: Plano Trial para self-service do site institucional
-- Data: 2026-04-26
-- Cria o plano trial na tabela plans usando schema real de producao.
-- Idempotente - usa ON CONFLICT DO UPDATE.

INSERT INTO public.plans (
  code,
  name,
  description,
  active,
  price_month,
  user_limit,
  company_limit,
  data_limit_mb,
  module_flags,
  premium_features
)
VALUES (
  'trial',
  'Trial 30 dias',
  'Periodo de avaliacao gratuita de 30 dias com acesso completo ao sistema.',
  true,
  0,
  10,
  1,
  500,
  '{"os":true,"preventiva":true,"preditiva":true,"lubrificacao":true,"ssma":true,"relatorios":true}'::jsonb,
  '{}'::jsonb
)
ON CONFLICT (code) DO UPDATE
  SET
    name          = EXCLUDED.name,
    description   = EXCLUDED.description,
    active        = true,
    price_month   = 0,
    user_limit    = EXCLUDED.user_limit,
    company_limit = EXCLUDED.company_limit,
    data_limit_mb = EXCLUDED.data_limit_mb;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'planos'
  ) THEN
    INSERT INTO public.planos (codigo, nome, descricao, ativo, price_month, active, asset_limit, os_limit, storage_limit_mb, user_limit)
    VALUES ('trial', 'Trial 30 dias', 'Avaliacao gratuita 30 dias', true, 0, true, 500, 1000, 512, 10)
    ON CONFLICT (codigo) DO UPDATE SET ativo = true, price_month = 0, active = true;
  END IF;
  RAISE NOTICE '[migration] Plano trial criado/atualizado com sucesso.';
END;
$$;