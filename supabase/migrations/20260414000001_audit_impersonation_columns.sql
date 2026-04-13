-- =============================================================================
-- ETAPA 1.6: Adicionar colunas de impersonação à enterprise_audit_logs
-- e atualizar app_write_audit_log para registrar quem estava impersonando.
-- =============================================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Adicionar colunas (idempotente)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.enterprise_audit_logs
  ADD COLUMN IF NOT EXISTS impersonado_por_id    UUID,
  ADD COLUMN IF NOT EXISTS impersonado_por_email TEXT;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Dropar a assinatura antiga (12 params) para evitar sobrecarga ambígua
-- ─────────────────────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.app_write_audit_log(
  UUID, UUID, TEXT, TEXT, TEXT, JSONB, JSONB, INET, TEXT, TEXT, TEXT, TEXT
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Recriar com 2 params opcionais de impersonação no final
--    Callers existentes continuam funcionando (novos params = DEFAULT NULL)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE FUNCTION public.app_write_audit_log(
  p_empresa_id           UUID,
  p_usuario_id           UUID    DEFAULT NULL,
  p_acao                 TEXT    DEFAULT NULL,
  p_tabela               TEXT    DEFAULT NULL,
  p_registro_id          TEXT    DEFAULT NULL,
  p_dados_antes          JSONB   DEFAULT NULL,
  p_dados_depois         JSONB   DEFAULT NULL,
  p_ip_address           INET    DEFAULT NULL,
  p_user_agent           TEXT    DEFAULT NULL,
  p_correlacao_id        TEXT    DEFAULT NULL,
  p_resultado            TEXT    DEFAULT 'sucesso',
  p_mensagem_erro        TEXT    DEFAULT NULL,
  p_impersonado_por_id   UUID    DEFAULT NULL,
  p_impersonado_por_email TEXT   DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_log_id              UUID;
  v_usuario_email       TEXT;
  v_diferenca           JSONB;
  v_acao                TEXT;
BEGIN
  -- Normalizar ação
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

  -- Calcular diff
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
    operation,
    registro_id,
    dados_antes,
    dados_depois,
    diferenca,
    ip_address,
    user_agent,
    correlacao_id,
    resultado,
    mensagem_erro,
    impersonado_por_id,
    impersonado_por_email,
    ocorreu_em
  ) VALUES (
    p_empresa_id,
    COALESCE(p_usuario_id, auth.uid()),
    v_usuario_email,
    v_acao,
    COALESCE(p_tabela, 'unknown'),
    COALESCE(p_tabela, 'unknown'),
    v_acao,
    p_registro_id,
    p_dados_antes,
    p_dados_depois,
    v_diferenca,
    p_ip_address,
    p_user_agent,
    p_correlacao_id,
    COALESCE(p_resultado, 'sucesso'),
    p_mensagem_erro,
    p_impersonado_por_id,
    p_impersonado_por_email,
    now()
  ) RETURNING id INTO v_log_id;

  RETURN v_log_id;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING '[app_write_audit_log] Erro ignorado: %', SQLERRM;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Permissões (nova assinatura com 14 params)
-- ─────────────────────────────────────────────────────────────────────────────
REVOKE EXECUTE ON FUNCTION public.app_write_audit_log(
  UUID, UUID, TEXT, TEXT, TEXT, JSONB, JSONB, INET, TEXT, TEXT, TEXT, TEXT, UUID, TEXT
) FROM anon, PUBLIC;

GRANT EXECUTE ON FUNCTION public.app_write_audit_log(
  UUID, UUID, TEXT, TEXT, TEXT, JSONB, JSONB, INET, TEXT, TEXT, TEXT, TEXT, UUID, TEXT
) TO authenticated, service_role;

DO $$ BEGIN
  RAISE NOTICE '[ETAPA-1.6] Colunas impersonado_por_id/email adicionadas e RPC atualizada.';
END $$;

COMMIT;
