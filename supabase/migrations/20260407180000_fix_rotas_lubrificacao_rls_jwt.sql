-- ============================================================================
-- Migration: Corrige RLS de rotas_lubrificacao e rotas_lubrificacao_pontos
-- Data: 2026-04-07
-- Motivo: As policies usavam current_setting('app.current_tenant') que NUNCA
--         e setado pelo Supabase JS client. Substituimos pelo padrao JWT
--         (auth.jwt() ->> 'empresa_id') igual ao restante do sistema.
-- Corrige: "Falha ao salvar plano ou pontos" no modulo de Lubrificacao.
-- ============================================================================

-- 1) TABELA: rotas_lubrificacao

DROP POLICY IF EXISTS "rotas_lubrificacao_tenant_isolation" ON public.rotas_lubrificacao;

CREATE POLICY "rotas_lubrificacao_tenant_jwt"
  ON public.rotas_lubrificacao
  FOR ALL
  TO authenticated
  USING (
    empresa_id = NULLIF(
      COALESCE(
        auth.jwt() ->> 'empresa_id',
        auth.jwt() ->> 'tenant_id',
        auth.jwt() -> 'app_metadata' ->> 'empresa_id',
        auth.jwt() -> 'app_metadata' ->> 'tenant_id'
      ),
      ''
    )::uuid
    OR UPPER(COALESCE(
      auth.jwt() ->> 'role',
      auth.jwt() ->> 'user_role',
      auth.jwt() -> 'app_metadata' ->> 'role',
      auth.jwt() -> 'user_metadata' ->> 'role',
      ''
    )) IN ('MASTER_TI', 'SYSTEM_OWNER', 'SYSTEM_ADMIN')
  )
  WITH CHECK (
    empresa_id = NULLIF(
      COALESCE(
        auth.jwt() ->> 'empresa_id',
        auth.jwt() ->> 'tenant_id',
        auth.jwt() -> 'app_metadata' ->> 'empresa_id',
        auth.jwt() -> 'app_metadata' ->> 'tenant_id'
      ),
      ''
    )::uuid
    OR UPPER(COALESCE(
      auth.jwt() ->> 'role',
      auth.jwt() ->> 'user_role',
      auth.jwt() -> 'app_metadata' ->> 'role',
      auth.jwt() -> 'user_metadata' ->> 'role',
      ''
    )) IN ('MASTER_TI', 'SYSTEM_OWNER', 'SYSTEM_ADMIN')
  );

-- 2) TABELA: rotas_lubrificacao_pontos

DROP POLICY IF EXISTS "rotas_lubrificacao_pontos_tenant_v2" ON public.rotas_lubrificacao_pontos;
DROP POLICY IF EXISTS "rotas_lubrificacao_pontos_tenant_isolation" ON public.rotas_lubrificacao_pontos;

CREATE POLICY "rotas_lubrificacao_pontos_tenant_jwt"
  ON public.rotas_lubrificacao_pontos
  FOR ALL
  TO authenticated
  USING (
    (rota_id IS NOT NULL AND rota_id IN (
      SELECT id FROM public.rotas_lubrificacao
      WHERE empresa_id = NULLIF(
        COALESCE(
          auth.jwt() ->> 'empresa_id',
          auth.jwt() ->> 'tenant_id',
          auth.jwt() -> 'app_metadata' ->> 'empresa_id',
          auth.jwt() -> 'app_metadata' ->> 'tenant_id'
        ),
        ''
      )::uuid
    ))
    OR
    (plano_id IS NOT NULL AND plano_id IN (
      SELECT id FROM public.planos_lubrificacao
      WHERE empresa_id = NULLIF(
        COALESCE(
          auth.jwt() ->> 'empresa_id',
          auth.jwt() ->> 'tenant_id',
          auth.jwt() -> 'app_metadata' ->> 'empresa_id',
          auth.jwt() -> 'app_metadata' ->> 'tenant_id'
        ),
        ''
      )::uuid
    ))
    OR
    UPPER(COALESCE(
      auth.jwt() ->> 'role',
      auth.jwt() ->> 'user_role',
      auth.jwt() -> 'app_metadata' ->> 'role',
      auth.jwt() -> 'user_metadata' ->> 'role',
      ''
    )) IN ('MASTER_TI', 'SYSTEM_OWNER', 'SYSTEM_ADMIN')
  )
  WITH CHECK (
    (rota_id IS NOT NULL AND rota_id IN (
      SELECT id FROM public.rotas_lubrificacao
      WHERE empresa_id = NULLIF(
        COALESCE(
          auth.jwt() ->> 'empresa_id',
          auth.jwt() ->> 'tenant_id',
          auth.jwt() -> 'app_metadata' ->> 'empresa_id',
          auth.jwt() -> 'app_metadata' ->> 'tenant_id'
        ),
        ''
      )::uuid
    ))
    OR
    (plano_id IS NOT NULL AND plano_id IN (
      SELECT id FROM public.planos_lubrificacao
      WHERE empresa_id = NULLIF(
        COALESCE(
          auth.jwt() ->> 'empresa_id',
          auth.jwt() ->> 'tenant_id',
          auth.jwt() -> 'app_metadata' ->> 'empresa_id',
          auth.jwt() -> 'app_metadata' ->> 'tenant_id'
        ),
        ''
      )::uuid
    ))
    OR
    UPPER(COALESCE(
      auth.jwt() ->> 'role',
      auth.jwt() ->> 'user_role',
      auth.jwt() -> 'app_metadata' ->> 'role',
      auth.jwt() -> 'user_metadata' ->> 'role',
      ''
    )) IN ('MASTER_TI', 'SYSTEM_OWNER', 'SYSTEM_ADMIN')
  );