-- Migration: Allow lubrication points linked directly to a plan (without route)
-- This enables embedding route points inside the lubrication plan form

-- Make rota_id nullable (points can belong to a plan directly)
ALTER TABLE public.rotas_lubrificacao_pontos
  ALTER COLUMN rota_id DROP NOT NULL;

-- Add index for plano_id lookups
CREATE INDEX IF NOT EXISTS idx_rotas_lubrificacao_pontos_plano
  ON public.rotas_lubrificacao_pontos(plano_id);

-- Drop the old RLS policy that only works via rota_id
DROP POLICY IF EXISTS "rotas_lubrificacao_pontos_tenant_isolation"
  ON public.rotas_lubrificacao_pontos;

-- New RLS: allow access via rota_id OR plano_id tenant path
CREATE POLICY "rotas_lubrificacao_pontos_tenant_v2"
  ON public.rotas_lubrificacao_pontos
  FOR ALL
  USING (
    (rota_id IS NOT NULL AND rota_id IN (
      SELECT id FROM public.rotas_lubrificacao
      WHERE empresa_id = (current_setting('app.current_tenant', true))::uuid
    ))
    OR
    (plano_id IS NOT NULL AND plano_id IN (
      SELECT id FROM public.planos_lubrificacao
      WHERE empresa_id = (current_setting('app.current_tenant', true))::uuid
    ))
  )
  WITH CHECK (
    (rota_id IS NOT NULL AND rota_id IN (
      SELECT id FROM public.rotas_lubrificacao
      WHERE empresa_id = (current_setting('app.current_tenant', true))::uuid
    ))
    OR
    (plano_id IS NOT NULL AND plano_id IN (
      SELECT id FROM public.planos_lubrificacao
      WHERE empresa_id = (current_setting('app.current_tenant', true))::uuid
    ))
  );
