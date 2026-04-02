-- Migration: Consolidate Audit Trail
-- Date: 2026-04-02

BEGIN;

CREATE TABLE IF NOT EXISTS public.enterprise_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL,
  usuario_id UUID,
  usuario_email TEXT,
  acao TEXT NOT NULL CHECK (acao IN ('CREATE','UPDATE','DELETE','CLOSE','APPROVE','REJECT','LOGIN','LOGOUT','EXPORT')),
  tabela TEXT NOT NULL,
  registro_id UUID,
  dados_antes JSONB,
  dados_depois JSONB,
  ip_address INET,
  user_agent TEXT,
  ocorreu_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resultado TEXT CHECK (resultado IN ('sucesso','erro','rejeitado')) DEFAULT 'sucesso',
  mensagem_erro TEXT
);

CREATE INDEX IF NOT EXISTS idx_enterprise_audit_empresa_acao
ON enterprise_audit_logs(empresa_id, acao, ocorreu_em DESC);

CREATE INDEX IF NOT EXISTS idx_enterprise_audit_usuario
ON enterprise_audit_logs(usuario_id, ocorreu_em DESC);

ALTER TABLE enterprise_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY audit_logs_see_own_empresa ON enterprise_audit_logs
  FOR SELECT USING (
    empresa_id = (auth.jwt()->>'empresa_id')::UUID
    OR EXISTS (SELECT 1 FROM user_roles ur WHERE ur.usuario_id = auth.uid() AND ur.role IN ('SYSTEM_OWNER', 'MASTER_TI', 'SYSTEM_ADMIN'))
  );

CREATE POLICY audit_logs_deny_direct_write ON enterprise_audit_logs FOR INSERT USING (FALSE);
CREATE POLICY audit_logs_deny_direct_update ON enterprise_audit_logs FOR UPDATE USING (FALSE);
CREATE POLICY audit_logs_deny_direct_delete ON enterprise_audit_logs FOR DELETE USING (FALSE);

CREATE OR REPLACE FUNCTION public.app_write_audit_log(
  p_empresa_id UUID,
  p_usuario_id UUID DEFAULT NULL,
  p_acao TEXT,
  p_tabela TEXT,
  p_registro_id UUID DEFAULT NULL,
  p_dados_antes JSONB DEFAULT NULL,
  p_dados_depois JSONB DEFAULT NULL,
  p_resultado TEXT DEFAULT 'sucesso'
)
RETURNS UUID AS ✅ Migration 1 created
DECLARE v_log_id UUID;
BEGIN
  IF p_empresa_id IS NULL THEN RAISE EXCEPTION 'empresa_id obrigatório'; END IF;
  INSERT INTO enterprise_audit_logs (empresa_id, usuario_id, acao, tabela, registro_id, dados_antes, dados_depois, resultado)
  VALUES (p_empresa_id, p_usuario_id, p_acao, p_tabela, p_registro_id, p_dados_antes, p_dados_depois, p_resultado)
  RETURNING id INTO v_log_id;
  RETURN v_log_id;
END;
✅ Migration 1 created LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.app_write_audit_log(UUID, UUID, TEXT, TEXT, UUID, JSONB, JSONB, TEXT) TO authenticated, service_role;

COMMIT;
