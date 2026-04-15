-- ═══════════════════════════════════════════════════════════════════════
-- Fix: etapas_ponto_lubrificacao RLS policies usavam current_setting()
-- que retorna NULL quando empresa_id não está no JWT top-level.
-- Alinha com o padrão COALESCE(auth.jwt()→empresa_id, tenant_id,
-- app_metadata→empresa_id, app_metadata→tenant_id) usado nas demais tabelas.
-- Também adiciona bypass para roles administrativas (MASTER_TI, SYSTEM_OWNER, SYSTEM_ADMIN).
-- ═══════════════════════════════════════════════════════════════════════

-- Helper expression used in all policies (same pattern as rotas_lubrificacao_pontos):
-- empresa_id resolved via join:  etapas→ponto→plano.empresa_id

-- SELECT
DROP POLICY IF EXISTS etapas_ponto_lub_select ON public.etapas_ponto_lubrificacao;
CREATE POLICY etapas_ponto_lub_select ON public.etapas_ponto_lubrificacao
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.rotas_lubrificacao_pontos rp
      JOIN public.planos_lubrificacao pl ON pl.id = rp.plano_id
      WHERE rp.id = etapas_ponto_lubrificacao.ponto_id
        AND pl.empresa_id = (
          NULLIF(COALESCE(
            auth.jwt() ->> 'empresa_id',
            auth.jwt() ->> 'tenant_id',
            (auth.jwt() -> 'app_metadata' ->> 'empresa_id'),
            (auth.jwt() -> 'app_metadata' ->> 'tenant_id')
          ), '')::uuid
        )
    )
    OR upper(COALESCE(
      auth.jwt() ->> 'role',
      auth.jwt() ->> 'user_role',
      (auth.jwt() -> 'app_metadata' ->> 'role'),
      (auth.jwt() -> 'user_metadata' ->> 'role'),
      ''
    )) = ANY(ARRAY['MASTER_TI','SYSTEM_OWNER','SYSTEM_ADMIN'])
  );

-- INSERT
DROP POLICY IF EXISTS etapas_ponto_lub_insert ON public.etapas_ponto_lubrificacao;
CREATE POLICY etapas_ponto_lub_insert ON public.etapas_ponto_lubrificacao
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.rotas_lubrificacao_pontos rp
      JOIN public.planos_lubrificacao pl ON pl.id = rp.plano_id
      WHERE rp.id = etapas_ponto_lubrificacao.ponto_id
        AND pl.empresa_id = (
          NULLIF(COALESCE(
            auth.jwt() ->> 'empresa_id',
            auth.jwt() ->> 'tenant_id',
            (auth.jwt() -> 'app_metadata' ->> 'empresa_id'),
            (auth.jwt() -> 'app_metadata' ->> 'tenant_id')
          ), '')::uuid
        )
    )
    OR upper(COALESCE(
      auth.jwt() ->> 'role',
      auth.jwt() ->> 'user_role',
      (auth.jwt() -> 'app_metadata' ->> 'role'),
      (auth.jwt() -> 'user_metadata' ->> 'role'),
      ''
    )) = ANY(ARRAY['MASTER_TI','SYSTEM_OWNER','SYSTEM_ADMIN'])
  );

-- UPDATE
DROP POLICY IF EXISTS etapas_ponto_lub_update ON public.etapas_ponto_lubrificacao;
CREATE POLICY etapas_ponto_lub_update ON public.etapas_ponto_lubrificacao
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.rotas_lubrificacao_pontos rp
      JOIN public.planos_lubrificacao pl ON pl.id = rp.plano_id
      WHERE rp.id = etapas_ponto_lubrificacao.ponto_id
        AND pl.empresa_id = (
          NULLIF(COALESCE(
            auth.jwt() ->> 'empresa_id',
            auth.jwt() ->> 'tenant_id',
            (auth.jwt() -> 'app_metadata' ->> 'empresa_id'),
            (auth.jwt() -> 'app_metadata' ->> 'tenant_id')
          ), '')::uuid
        )
    )
    OR upper(COALESCE(
      auth.jwt() ->> 'role',
      auth.jwt() ->> 'user_role',
      (auth.jwt() -> 'app_metadata' ->> 'role'),
      (auth.jwt() -> 'user_metadata' ->> 'role'),
      ''
    )) = ANY(ARRAY['MASTER_TI','SYSTEM_OWNER','SYSTEM_ADMIN'])
  );

-- DELETE
DROP POLICY IF EXISTS etapas_ponto_lub_delete ON public.etapas_ponto_lubrificacao;
CREATE POLICY etapas_ponto_lub_delete ON public.etapas_ponto_lubrificacao
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.rotas_lubrificacao_pontos rp
      JOIN public.planos_lubrificacao pl ON pl.id = rp.plano_id
      WHERE rp.id = etapas_ponto_lubrificacao.ponto_id
        AND pl.empresa_id = (
          NULLIF(COALESCE(
            auth.jwt() ->> 'empresa_id',
            auth.jwt() ->> 'tenant_id',
            (auth.jwt() -> 'app_metadata' ->> 'empresa_id'),
            (auth.jwt() -> 'app_metadata' ->> 'tenant_id')
          ), '')::uuid
        )
    )
    OR upper(COALESCE(
      auth.jwt() ->> 'role',
      auth.jwt() ->> 'user_role',
      (auth.jwt() -> 'app_metadata' ->> 'role'),
      (auth.jwt() -> 'user_metadata' ->> 'role'),
      ''
    )) = ANY(ARRAY['MASTER_TI','SYSTEM_OWNER','SYSTEM_ADMIN'])
  );
