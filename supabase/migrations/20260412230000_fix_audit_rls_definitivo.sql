-- =============================================================================
-- MIGRAÇÃO DEFINITIVA: Fix completo enterprise_audit_logs
-- Data: 2026-04-12
-- Consolida e supersede: 20260412190000_fix_enterprise_audit_logs_rls.sql
-- Problemas resolvidos:
--   1. SELECT policy BLOQUEAVA todos os usuários que não têm role 'ADMIN' ou
--      'MASTER_TI' explícito na tabela user_roles — incluindo SYSTEM_OWNER.
--      Substituída por can_access_empresa() que usa profiles.empresa_id.
--   2. Garante colunas PT (idempotente).
--   3. Corrige app_write_audit_log para aceitar empresa_id NULL graciosamente
--      (não throw exception, apenas silencia) — evita quebra silenciosa do RPC.
-- =============================================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Garantir colunas PT (idempotente)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.enterprise_audit_logs ADD COLUMN IF NOT EXISTS acao            TEXT;
ALTER TABLE public.enterprise_audit_logs ADD COLUMN IF NOT EXISTS tabela          TEXT;
ALTER TABLE public.enterprise_audit_logs ADD COLUMN IF NOT EXISTS registro_id     TEXT;
ALTER TABLE public.enterprise_audit_logs ADD COLUMN IF NOT EXISTS usuario_id      UUID;
ALTER TABLE public.enterprise_audit_logs ADD COLUMN IF NOT EXISTS usuario_email   TEXT;
ALTER TABLE public.enterprise_audit_logs ADD COLUMN IF NOT EXISTS dados_antes     JSONB;
ALTER TABLE public.enterprise_audit_logs ADD COLUMN IF NOT EXISTS dados_depois    JSONB;
ALTER TABLE public.enterprise_audit_logs ADD COLUMN IF NOT EXISTS diferenca       JSONB;
ALTER TABLE public.enterprise_audit_logs ADD COLUMN IF NOT EXISTS ip_address      TEXT;
ALTER TABLE public.enterprise_audit_logs ADD COLUMN IF NOT EXISTS user_agent      TEXT;
ALTER TABLE public.enterprise_audit_logs ADD COLUMN IF NOT EXISTS ocorreu_em      TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.enterprise_audit_logs ADD COLUMN IF NOT EXISTS correlacao_id   TEXT;
ALTER TABLE public.enterprise_audit_logs ADD COLUMN IF NOT EXISTS resultado       TEXT DEFAULT 'sucesso';
ALTER TABLE public.enterprise_audit_logs ADD COLUMN IF NOT EXISTS mensagem_erro   TEXT;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. RLS ON + FORCE RLS
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.enterprise_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enterprise_audit_logs FORCE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Remover TODAS as policies anteriores (conflitantes entre v1..v9)
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE pol TEXT;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'enterprise_audit_logs'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.enterprise_audit_logs', pol);
  END LOOP;
  RAISE NOTICE '[FIX-AUDIT] Todas as policies antigas removidas.';
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Recriar políticas corretas
-- ─────────────────────────────────────────────────────────────────────────────

-- SELECT: qualquer usuário autenticado do mesmo tenant (via profiles.empresa_id)
--         OU SYSTEM_OWNER/MASTER_TI/SYSTEM_ADMIN que vêem tudo
CREATE POLICY "audit_select_tenant_or_admin"
  ON public.enterprise_audit_logs
  FOR SELECT TO authenticated
  USING (
    public.can_access_empresa(empresa_id)
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('SYSTEM_OWNER', 'MASTER_TI', 'SYSTEM_ADMIN', 'ADMIN')
    )
  );

-- SELECT logs de plataforma (empresa_id IS NULL) — somente system admins
CREATE POLICY "audit_select_platform_admin"
  ON public.enterprise_audit_logs
  FOR SELECT TO authenticated
  USING (
    empresa_id IS NULL
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('SYSTEM_OWNER', 'SYSTEM_ADMIN', 'MASTER_TI')
    )
  );

-- INSERT direto bloqueado para authenticated — deve ir via RPC SECURITY DEFINER
CREATE POLICY "audit_insert_deny_direct"
  ON public.enterprise_audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (FALSE);

-- service_role: acesso total (usado pelas edge functions e RPCs SECURITY DEFINER)
CREATE POLICY "audit_service_role_all"
  ON public.enterprise_audit_logs
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- UPDATE / DELETE: somente service_role (via policy acima)

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Recria app_write_audit_log com tratamento defensivo:
--    - não lança exception se empresa_id for NULL (insere sem empresa)
--    - converte p_registro_id para TEXT para evitar cast UUID inválido
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.app_write_audit_log(
  p_empresa_id  UUID,
  p_usuario_id  UUID    DEFAULT NULL,
  p_acao        TEXT    DEFAULT NULL,
  p_tabela      TEXT    DEFAULT NULL,
  p_registro_id TEXT    DEFAULT NULL,   -- TEXT agora (era UUID, causava falha silenciosa)
  p_dados_antes JSONB   DEFAULT NULL,
  p_dados_depois JSONB  DEFAULT NULL,
  p_ip_address  INET    DEFAULT NULL,
  p_user_agent  TEXT    DEFAULT NULL,
  p_correlacao_id TEXT  DEFAULT NULL,
  p_resultado   TEXT    DEFAULT 'sucesso',
  p_mensagem_erro TEXT  DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_log_id       UUID;
  v_usuario_email TEXT;
  v_diferenca    JSONB;
  v_acao         TEXT;
BEGIN
  -- Normalizar ação — aceita variantes PT/EN
  v_acao := UPPER(COALESCE(p_acao, 'UPDATE'));
  IF v_acao NOT IN ('CREATE','UPDATE','DELETE','CLOSE','APPROVE','REJECT','LOGIN','LOGOUT','EXPORT') THEN
    -- Extrair prefixo (ex: "CREATE_EQUIPAMENTO" → "CREATE")
    v_acao := SPLIT_PART(v_acao, '_', 1);
    IF v_acao NOT IN ('CREATE','UPDATE','DELETE','CLOSE','APPROVE','REJECT','LOGIN','LOGOUT','EXPORT') THEN
      v_acao := 'UPDATE'; -- fallback seguro
    END IF;
  END IF;

  -- Validar resultado
  IF p_resultado NOT IN ('sucesso','erro','rejeitado') THEN
    p_resultado := 'sucesso';
  END IF;

  -- Buscar email do usuário
  IF p_usuario_id IS NOT NULL THEN
    SELECT email INTO v_usuario_email FROM auth.users WHERE id = p_usuario_id;
    -- Se não encontrou, usar auth.uid()
    IF v_usuario_email IS NULL THEN
      SELECT email INTO v_usuario_email FROM auth.users WHERE id = auth.uid();
    END IF;
  ELSIF auth.uid() IS NOT NULL THEN
    SELECT email INTO v_usuario_email FROM auth.users WHERE id = auth.uid();
  END IF;

  -- Calcular diferença
  IF p_dados_antes IS NOT NULL AND p_dados_depois IS NOT NULL THEN
    SELECT jsonb_object_agg(
      key,
      jsonb_build_object('antes', p_dados_antes->key, 'depois', p_dados_depois->key)
    ) INTO v_diferenca
    FROM jsonb_object_keys(p_dados_depois) AS key
    WHERE (p_dados_antes->key) IS DISTINCT FROM (p_dados_depois->key);
  END IF;

  INSERT INTO public.enterprise_audit_logs (
    empresa_id,
    usuario_id,
    usuario_email,
    acao,
    tabela,
    registro_id,
    dados_antes,
    dados_depois,
    diferenca,
    ip_address,
    user_agent,
    correlacao_id,
    resultado,
    mensagem_erro,
    ocorreu_em
  ) VALUES (
    p_empresa_id,
    COALESCE(p_usuario_id, auth.uid()),
    v_usuario_email,
    v_acao,
    COALESCE(p_tabela, 'unknown'),
    p_registro_id,   -- TEXT: sem cast UUID, não falha mais
    p_dados_antes,
    p_dados_depois,
    v_diferenca,
    p_ip_address,
    p_user_agent,
    p_correlacao_id,
    COALESCE(p_resultado, 'sucesso'),
    p_mensagem_erro,
    now()
  ) RETURNING id INTO v_log_id;

  RETURN v_log_id;
EXCEPTION WHEN OTHERS THEN
  -- fire-and-forget no banco também — nunca deixar auditoria derrubar operação
  RAISE WARNING '[app_write_audit_log] ERRO IGNORADO: %', SQLERRM;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- Revogar chamadas anônimas
REVOKE EXECUTE ON FUNCTION public.app_write_audit_log(UUID, UUID, TEXT, TEXT, TEXT, JSONB, JSONB, INET, TEXT, TEXT, TEXT, TEXT) FROM anon, PUBLIC;
GRANT  EXECUTE ON FUNCTION public.app_write_audit_log(UUID, UUID, TEXT, TEXT, TEXT, JSONB, JSONB, INET, TEXT, TEXT, TEXT, TEXT) TO authenticated, service_role;

DO $$ BEGIN
  RAISE NOTICE '[AUDIT-FIX-DEFINITIVO] RLS corrigida, RPC recriada com TEXT para registro_id.';
END $$;

COMMIT;
