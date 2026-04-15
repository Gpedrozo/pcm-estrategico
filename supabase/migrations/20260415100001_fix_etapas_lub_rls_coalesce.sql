-- Fix: etapas_ponto_lubrificacao RLS policies
-- Alinha com padrao COALESCE usado nas demais tabelas

DROP POLICY IF EXISTS etapas_ponto_lub_select ON public.etapas_ponto_lubrificacao;
CREATE POLICY etapas_ponto_lub_select ON public.etapas_ponto_lubrificacao
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.rotas_lubrificacao_pontos rp
      JOIN public.planos_lubrificacao pl ON pl.id = rp.plano_id
      WHERE rp.id = etapas_ponto_lubrificacao.ponto_id
        AND pl.empresa_id = (NULLIF(COALESCE(auth.jwt()->> 'empresa_id', auth.jwt()->> 'tenant_id', (auth.jwt()->'app_metadata'->> 'empresa_id'), (auth.jwt()->'app_metadata'->> 'tenant_id')), ''))::uuid
    )
    OR upper(COALESCE(auth.jwt()->> 'role', auth.jwt()->> 'user_role', (auth.jwt()->'app_metadata'->> 'role'), (auth.jwt()->'user_metadata'->> 'role'), '')) = ANY(ARRAY['MASTER_TI','SYSTEM_OWNER','SYSTEM_ADMIN'])
  );

DROP POLICY IF EXISTS etapas_ponto_lub_insert ON public.etapas_ponto_lubrificacao;
CREATE POLICY etapas_ponto_lub_insert ON public.etapas_ponto_lubrificacao
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.rotas_lubrificacao_pontos rp
      JOIN public.planos_lubrificacao pl ON pl.id = rp.plano_id
      WHERE rp.id = etapas_ponto_lubrificacao.ponto_id
        AND pl.empresa_id = (NULLIF(COALESCE(auth.jwt()->> 'empresa_id', auth.jwt()->> 'tenant_id', (auth.jwt()->'app_metadata'->> 'empresa_id'), (auth.jwt()->'app_metadata'->> 'tenant_id')), ''))::uuid
    )
    OR upper(COALESCE(auth.jwt()->> 'role', auth.jwt()->> 'user_role', (auth.jwt()->'app_metadata'->> 'role'), (auth.jwt()->'user_metadata'->> 'role'), '')) = ANY(ARRAY['MASTER_TI','SYSTEM_OWNER','SYSTEM_ADMIN'])
  );

DROP POLICY IF EXISTS etapas_ponto_lub_update ON public.etapas_ponto_lubrificacao;
CREATE POLICY etapas_ponto_lub_update ON public.etapas_ponto_lubrificacao
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.rotas_lubrificacao_pontos rp
      JOIN public.planos_lubrificacao pl ON pl.id = rp.plano_id
      WHERE rp.id = etapas_ponto_lubrificacao.ponto_id
        AND pl.empresa_id = (NULLIF(COALESCE(auth.jwt()->> 'empresa_id', auth.jwt()->> 'tenant_id', (auth.jwt()->'app_metadata'->> 'empresa_id'), (auth.jwt()->'app_metadata'->> 'tenant_id')), ''))::uuid
    )
    OR upper(COALESCE(auth.jwt()->> 'role', auth.jwt()->> 'user_role', (auth.jwt()->'app_metadata'->> 'role'), (auth.jwt()->'user_metadata'->> 'role'), '')) = ANY(ARRAY['MASTER_TI','SYSTEM_OWNER','SYSTEM_ADMIN'])
  );

DROP POLICY IF EXISTS etapas_ponto_lub_delete ON public.etapas_ponto_lubrificacao;
CREATE POLICY etapas_ponto_lub_delete ON public.etapas_ponto_lubrificacao
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.rotas_lubrificacao_pontos rp
      JOIN public.planos_lubrificacao pl ON pl.id = rp.plano_id
      WHERE rp.id = etapas_ponto_lubrificacao.ponto_id
        AND pl.empresa_id = (NULLIF(COALESCE(auth.jwt()->> 'empresa_id', auth.jwt()->> 'tenant_id', (auth.jwt()->'app_metadata'->> 'empresa_id'), (auth.jwt()->'app_metadata'->> 'tenant_id')), ''))::uuid
    )
    OR upper(COALESCE(auth.jwt()->> 'role', auth.jwt()->> 'user_role', (auth.jwt()->'app_metadata'->> 'role'), (auth.jwt()->'user_metadata'->> 'role'), '')) = ANY(ARRAY['MASTER_TI','SYSTEM_OWNER','SYSTEM_ADMIN'])
  );
