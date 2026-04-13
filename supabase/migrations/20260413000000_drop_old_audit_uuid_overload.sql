-- =============================================================================
-- CORREÇÃO CRÍTICA: Remove sobrecarga UUID da função app_write_audit_log
-- Problema: Duas funções com mesmo nome mas assinaturas diferentes causam erro
-- "function app_write_audit_log is not unique" no PostgREST, silenciando TODOS
-- os registros de auditoria no sistema.
-- Solução: Dropa o overload antigo (UUID) e mantém apenas o novo (TEXT).
-- =============================================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Dropar overload antigo: p_registro_id UUID
--    (criado em 20260406100000_align_audit_table_bilingual_columns.sql)
-- ─────────────────────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.app_write_audit_log(
  UUID, UUID, TEXT, TEXT, UUID, JSONB, JSONB, INET, TEXT, TEXT, TEXT, TEXT
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Garantir que o overload TEXT (correto) existe e está atualizado
--    (já foi criado em 20260412230000, mas recria para garantir idempotência)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.app_write_audit_log(
  p_empresa_id    UUID,
  p_usuario_id    UUID    DEFAULT NULL,
  p_acao          TEXT    DEFAULT NULL,
  p_tabela        TEXT    DEFAULT NULL,
  p_registro_id   TEXT    DEFAULT NULL,
  p_dados_antes   JSONB   DEFAULT NULL,
  p_dados_depois  JSONB   DEFAULT NULL,
  p_ip_address    INET    DEFAULT NULL,
  p_user_agent    TEXT    DEFAULT NULL,
  p_correlacao_id TEXT    DEFAULT NULL,
  p_resultado     TEXT    DEFAULT 'sucesso',
  p_mensagem_erro TEXT    DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_log_id        UUID;
  v_usuario_email TEXT;
  v_diferenca     JSONB;
  v_acao          TEXT;
BEGIN
  -- Normalizar ação: aceita PT e EN, composta ou simples
  v_acao := UPPER(COALESCE(p_acao, 'UPDATE'));
  IF v_acao NOT IN ('CREATE','UPDATE','DELETE','CLOSE','APPROVE','REJECT','LOGIN','LOGOUT','EXPORT') THEN
    v_acao := SPLIT_PART(v_acao, '_', 1);
    IF v_acao NOT IN ('CREATE','UPDATE','DELETE','CLOSE','APPROVE','REJECT','LOGIN','LOGOUT','EXPORT') THEN
      v_acao := 'UPDATE';
    END IF;
  END IF;

  -- Normalizar resultado
  IF COALESCE(p_resultado, 'sucesso') NOT IN ('sucesso','erro','rejeitado') THEN
    p_resultado := 'sucesso';
  END IF;

  -- Buscar email do usuário
  BEGIN
    IF p_usuario_id IS NOT NULL THEN
      SELECT email INTO v_usuario_email FROM auth.users WHERE id = p_usuario_id;
    END IF;
    IF v_usuario_email IS NULL AND auth.uid() IS NOT NULL THEN
      SELECT email INTO v_usuario_email FROM auth.users WHERE id = auth.uid();
    END IF;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  -- Calcular diff entre antes e depois
  IF p_dados_antes IS NOT NULL AND p_dados_depois IS NOT NULL THEN
    BEGIN
      SELECT jsonb_object_agg(
        key,
        jsonb_build_object('antes', p_dados_antes->key, 'depois', p_dados_depois->key)
      ) INTO v_diferenca
      FROM jsonb_object_keys(p_dados_depois) AS key
      WHERE (p_dados_antes->key) IS DISTINCT FROM (p_dados_depois->key);
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END IF;

  INSERT INTO public.enterprise_audit_logs (
    empresa_id,
    usuario_id,
    usuario_email,
    acao,
    tabela,
    table_name,
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
    COALESCE(p_tabela, 'unknown'),
    p_registro_id,
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
  RAISE WARNING '[app_write_audit_log] Erro ignorado: %', SQLERRM;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.app_write_audit_log(UUID, UUID, TEXT, TEXT, TEXT, JSONB, JSONB, INET, TEXT, TEXT, TEXT, TEXT) FROM anon, PUBLIC;
GRANT  EXECUTE ON FUNCTION public.app_write_audit_log(UUID, UUID, TEXT, TEXT, TEXT, JSONB, JSONB, INET, TEXT, TEXT, TEXT, TEXT) TO authenticated, service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Também dropar outros possíveis overloads sobrando de migrações anteriores
-- ─────────────────────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.app_write_audit_log(TEXT, TEXT, TEXT, UUID, TEXT, TEXT, JSONB, UUID);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Garantir RLS correta (idempotente — consolida 20260412190000 e 20260412230000)
-- ─────────────────────────────────────────────────────────────────────────────

-- Garantir colunas PT existem
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

ALTER TABLE public.enterprise_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enterprise_audit_logs FORCE ROW LEVEL SECURITY;

-- Dropar todas as policies antigas
DO $$
DECLARE pol TEXT;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'enterprise_audit_logs'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.enterprise_audit_logs', pol);
  END LOOP;
END $$;

-- SELECT: tenant vê seus logs; admins vêem tudo
CREATE POLICY "audit_select_tenant_or_admin"
  ON public.enterprise_audit_logs FOR SELECT TO authenticated
  USING (
    public.can_access_empresa(empresa_id)
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('SYSTEM_OWNER','MASTER_TI','SYSTEM_ADMIN','ADMIN')
    )
  );

-- SELECT logs plataforma (empresa_id NULL) — somente system admins
CREATE POLICY "audit_select_platform_admin"
  ON public.enterprise_audit_logs FOR SELECT TO authenticated
  USING (
    empresa_id IS NULL
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('SYSTEM_OWNER','SYSTEM_ADMIN','MASTER_TI')
    )
  );

-- INSERT direto bloqueado — somente via RPC SECURITY DEFINER
CREATE POLICY "audit_insert_deny_direct"
  ON public.enterprise_audit_logs FOR INSERT TO authenticated
  WITH CHECK (FALSE);

-- service_role tem acesso total
CREATE POLICY "audit_service_role_all"
  ON public.enterprise_audit_logs FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Inserir registro de teste para confirmar que a cadeia funciona
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_empresa_id UUID;
BEGIN
  -- Pegar primeira empresa ativa do banco
  SELECT id INTO v_empresa_id FROM public.empresas WHERE status = 'ativo' LIMIT 1;
  IF v_empresa_id IS NULL THEN
    SELECT id INTO v_empresa_id FROM public.empresas LIMIT 1;
  END IF;

  IF v_empresa_id IS NOT NULL THEN
    INSERT INTO public.enterprise_audit_logs (
      empresa_id, acao, tabela, table_name, registro_id, resultado, usuario_email, ocorreu_em
    ) VALUES (
      v_empresa_id, 'UPDATE', 'migration_test', 'migration_test', '20260413000000', 'sucesso',
      'sistema@pcm-estrategico', now()
    );
    RAISE NOTICE '[AUDIT-TEST] Registro de teste inserido para empresa_id=%', v_empresa_id;
  ELSE
    RAISE NOTICE '[AUDIT-TEST] Nenhuma empresa encontrada — registro de teste não inserido';
  END IF;
END $$;

COMMIT;
