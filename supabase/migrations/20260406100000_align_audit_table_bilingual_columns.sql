-- Migration: Align enterprise_audit_logs table with bilingual column support
-- Date: 2026-04-06
-- Purpose: The table was created with English columns (migration 20260301) but the
--          RPC app_write_audit_log (migration 20260402) writes to Portuguese columns.
--          This migration adds the Portuguese columns so both schemas work side-by-side.
--          Backfills existing English-column data into the new Portuguese columns.

BEGIN;

-- ============================================================
-- Add Portuguese columns if they don't already exist
-- (They WILL already exist if 20260402 CREATE TABLE succeeded,
--  but WON'T exist if the table was already present from 20260301)
-- ============================================================

ALTER TABLE public.enterprise_audit_logs ADD COLUMN IF NOT EXISTS acao TEXT;
ALTER TABLE public.enterprise_audit_logs ADD COLUMN IF NOT EXISTS tabela TEXT;
ALTER TABLE public.enterprise_audit_logs ADD COLUMN IF NOT EXISTS registro_id TEXT;
ALTER TABLE public.enterprise_audit_logs ADD COLUMN IF NOT EXISTS usuario_id UUID;
ALTER TABLE public.enterprise_audit_logs ADD COLUMN IF NOT EXISTS usuario_email TEXT;
ALTER TABLE public.enterprise_audit_logs ADD COLUMN IF NOT EXISTS dados_antes JSONB;
ALTER TABLE public.enterprise_audit_logs ADD COLUMN IF NOT EXISTS dados_depois JSONB;
ALTER TABLE public.enterprise_audit_logs ADD COLUMN IF NOT EXISTS diferenca JSONB;
ALTER TABLE public.enterprise_audit_logs ADD COLUMN IF NOT EXISTS ip_address TEXT;
ALTER TABLE public.enterprise_audit_logs ADD COLUMN IF NOT EXISTS ocorreu_em TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.enterprise_audit_logs ADD COLUMN IF NOT EXISTS correlacao_id TEXT;
ALTER TABLE public.enterprise_audit_logs ADD COLUMN IF NOT EXISTS resultado TEXT DEFAULT 'sucesso';
ALTER TABLE public.enterprise_audit_logs ADD COLUMN IF NOT EXISTS mensagem_erro TEXT;

-- ============================================================
-- Backfill: Copy English column data → Portuguese columns
-- Only runs if the English columns actually exist in this environment
-- ============================================================

DO $$
BEGIN
  -- action → acao
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='enterprise_audit_logs' AND column_name='action') THEN
    UPDATE public.enterprise_audit_logs SET acao = action WHERE acao IS NULL AND action IS NOT NULL;
  END IF;

  -- target_entity → tabela
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='enterprise_audit_logs' AND column_name='target_entity') THEN
    UPDATE public.enterprise_audit_logs SET tabela = target_entity WHERE tabela IS NULL AND target_entity IS NOT NULL;
  END IF;

  -- target_id → registro_id
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='enterprise_audit_logs' AND column_name='target_id') THEN
    UPDATE public.enterprise_audit_logs SET registro_id = target_id WHERE registro_id IS NULL AND target_id IS NOT NULL;
  END IF;

  -- executor_id → usuario_id
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='enterprise_audit_logs' AND column_name='executor_id') THEN
    UPDATE public.enterprise_audit_logs SET usuario_id = executor_id WHERE usuario_id IS NULL AND executor_id IS NOT NULL;
  END IF;

  -- "before" → dados_antes
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='enterprise_audit_logs' AND column_name='before') THEN
    EXECUTE 'UPDATE public.enterprise_audit_logs SET dados_antes = "before" WHERE dados_antes IS NULL AND "before" IS NOT NULL';
  END IF;

  -- "after" → dados_depois
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='enterprise_audit_logs' AND column_name='after') THEN
    EXECUTE 'UPDATE public.enterprise_audit_logs SET dados_depois = "after" WHERE dados_depois IS NULL AND "after" IS NOT NULL';
  END IF;

  -- ip → ip_address
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='enterprise_audit_logs' AND column_name='ip') THEN
    UPDATE public.enterprise_audit_logs SET ip_address = ip WHERE ip_address IS NULL AND ip IS NOT NULL;
  END IF;
END
$$;

-- Backfill usuario_email from auth.users where possible
UPDATE public.enterprise_audit_logs eal
SET usuario_email = u.email
FROM auth.users u
WHERE eal.usuario_email IS NULL
  AND eal.usuario_id IS NOT NULL
  AND eal.usuario_id = u.id;

-- Set ocorreu_em from created_at if missing
UPDATE public.enterprise_audit_logs
SET ocorreu_em = created_at
WHERE ocorreu_em IS NULL
  AND created_at IS NOT NULL;

-- ============================================================
-- Indexes for Portuguese columns (idempotent)
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_eal_empresa_acao
ON public.enterprise_audit_logs(empresa_id, acao, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_eal_usuario
ON public.enterprise_audit_logs(usuario_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_eal_tabela_registro
ON public.enterprise_audit_logs(tabela, registro_id, created_at DESC);

-- ============================================================
-- Ensure the app_write_audit_log RPC still works after schema change
-- Re-create it to handle both the case where Portuguese columns exist
-- ============================================================

CREATE OR REPLACE FUNCTION public.app_write_audit_log(
  p_empresa_id UUID,
  p_usuario_id UUID DEFAULT NULL,
  p_acao TEXT DEFAULT NULL,
  p_tabela TEXT DEFAULT NULL,
  p_registro_id UUID DEFAULT NULL,
  p_dados_antes JSONB DEFAULT NULL,
  p_dados_depois JSONB DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_correlacao_id TEXT DEFAULT NULL,
  p_resultado TEXT DEFAULT 'sucesso',
  p_mensagem_erro TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
  v_usuario_email TEXT;
  v_diferenca JSONB;
BEGIN
  IF p_empresa_id IS NULL THEN
    RAISE EXCEPTION 'empresa_id obrigatório';
  END IF;

  IF p_acao IS NOT NULL AND p_acao NOT IN (
    'CREATE', 'UPDATE', 'DELETE', 'CLOSE', 'APPROVE', 'REJECT', 'LOGIN', 'LOGOUT', 'EXPORT'
  ) THEN
    RAISE EXCEPTION 'acao inválida: %', p_acao;
  END IF;

  IF p_resultado IS NOT NULL AND p_resultado NOT IN ('sucesso', 'erro', 'rejeitado') THEN
    RAISE EXCEPTION 'resultado inválido: %', p_resultado;
  END IF;

  -- Get user email
  IF p_usuario_id IS NOT NULL THEN
    SELECT email INTO v_usuario_email FROM auth.users WHERE id = p_usuario_id;
  END IF;

  -- Calculate diff
  IF p_dados_antes IS NOT NULL AND p_dados_depois IS NOT NULL THEN
    SELECT jsonb_object_agg(
      key,
      jsonb_build_object('antes', p_dados_antes->>key, 'depois', p_dados_depois->>key)
    ) INTO v_diferenca
    FROM jsonb_object_keys(p_dados_depois) AS key
    WHERE (p_dados_antes->>key) IS DISTINCT FROM (p_dados_depois->>key);
  END IF;

  -- Insert into Portuguese columns (guaranteed to exist after this migration)
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
    mensagem_erro
  ) VALUES (
    p_empresa_id,
    COALESCE(p_usuario_id, auth.uid()),
    v_usuario_email,
    COALESCE(p_acao, 'UPDATE'),
    COALESCE(p_tabela, 'unknown'),
    p_registro_id,
    p_dados_antes,
    p_dados_depois,
    v_diferenca,
    p_ip_address,
    p_user_agent,
    p_correlacao_id,
    COALESCE(p_resultado, 'sucesso'),
    p_mensagem_erro
  ) RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

GRANT EXECUTE ON FUNCTION public.app_write_audit_log(UUID, UUID, TEXT, TEXT, UUID, JSONB, JSONB, INET, TEXT, TEXT, TEXT, TEXT)
TO authenticated, service_role;

COMMIT;
