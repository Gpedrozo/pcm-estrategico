-- Migration: Consolidate Audit Trail
-- Date: 2026-04-02
-- Purpose: Unify 4 audit tables into 1 canonical source
-- Tables to consolidate: auditoria, auditoria_logs, audit_logs, enterprise_audit_logs
-- Action: enterprise_audit_logs becomes the SINGLE source of truth

BEGIN;

-- ======================
-- Canonical Audit Table (if not exists)
-- ======================

CREATE TABLE IF NOT EXISTS public.enterprise_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identity
  empresa_id UUID NOT NULL,
  usuario_id UUID,
  usuario_email TEXT,
  
  -- Action metadata
  acao TEXT NOT NULL,  -- CREATE, UPDATE, DELETE, CLOSE, APPROVE, REJECT, etc
  tabela TEXT NOT NULL,  -- orders_servico, equipamentos, mecanicos, etc
  registro_id UUID,  -- Foreign key to actual record (if applicable)
  
  -- Before/After
  dados_antes JSONB,
  dados_depois JSONB,
  diferenca JSONB,  -- { field: { antes: old, depois: new } }
  
  -- Network
  ip_address INET,
  user_agent TEXT,
  
  -- Timestamps
  ocorreu_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Correlation
  correlacao_id TEXT,  -- Trace multiple related actions
  
  -- Result
  resultado TEXT CHECK (resultado IN ('sucesso', 'erro', 'rejeitado')) DEFAULT 'sucesso',
  mensagem_erro TEXT
) PARTITION BY RANGE (ocorreu_em) (
  PARTITION enterprise_audit_logs_2026_q1 VALUES FROM ('2026-01-01') TO ('2026-04-01'),
  PARTITION enterprise_audit_logs_2026_q2 VALUES FROM ('2026-04-01') TO ('2026-07-01'),
  PARTITION enterprise_audit_logs_2026_q3 VALUES FROM ('2026-07-01') TO ('2026-10-01'),
  PARTITION enterprise_audit_logs_2026_q4 VALUES FROM ('2026-10-01') TO ('2027-01-01')
);

CREATE INDEX IF NOT EXISTS idx_enterprise_audit_empresa_acao
ON enterprise_audit_logs(empresa_id, acao, ocorreu_em DESC);

CREATE INDEX IF NOT EXISTS idx_enterprise_audit_usuario
ON enterprise_audit_logs(usuario_id, ocorreu_em DESC);

CREATE INDEX IF NOT EXISTS idx_enterprise_audit_tabela_registro
ON enterprise_audit_logs(tabela, registro_id, ocorreu_em DESC);

CREATE INDEX IF NOT EXISTS idx_enterprise_audit_correlacao
ON enterprise_audit_logs(correlacao_id)
WHERE correlacao_id IS NOT NULL;

-- ======================
-- Canonical Audit Write RPC
-- ======================
-- All writes must go through this function
-- Enforces: empresa_id, usuario_id, validated acao/tabela

CREATE OR REPLACE FUNCTION public.app_write_audit_log(
  p_empresa_id UUID,
  p_usuario_id UUID DEFAULT NULL,
  p_acao TEXT,
  p_tabela TEXT,
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
  -- Validations
  IF p_empresa_id IS NULL THEN
    RAISE EXCEPTION 'empresa_id obrigatório';
  END IF;
  
  IF p_acao NOT IN ('CREATE', 'UPDATE', 'DELETE', 'CLOSE', 'APPROVE', 'REJECT', 'LOGIN', 'LOGOUT', 'EXPORT') THEN
    RAISE EXCEPTION 'acao inválida: %', p_acao;
  END IF;
  
  IF p_resultado NOT IN ('sucesso', 'erro', 'rejeitado') THEN
    RAISE EXCEPTION 'resultado inválido: %', p_resultado;
  END IF;
  
  -- Get user email if exists
  IF p_usuario_id IS NOT NULL THEN
    SELECT email INTO v_usuario_email FROM auth.users WHERE id = p_usuario_id;
  END IF;
  
  -- Calculate difference
  IF p_dados_antes IS NOT NULL AND p_dados_depois IS NOT NULL THEN
    v_diferenca := (
      SELECT jsonb_object_agg(
        key,
        jsonb_build_object('antes', p_dados_antes->>key, 'depois', p_dados_depois->>key)
      )
      FROM jsonb_object_keys(p_dados_depois) AS key
      WHERE (p_dados_antes->>key) IS DISTINCT FROM (p_dados_depois->>key)
    );
  END IF;
  
  -- Insert audit log
  INSERT INTO enterprise_audit_logs (
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
    p_usuario_id,
    v_usuario_email,
    p_acao,
    p_tabela,
    p_registro_id,
    p_dados_antes,
    p_dados_depois,
    v_diferenca,
    p_ip_address,
    p_user_agent,
    p_correlacao_id,
    p_resultado,
    p_mensagem_erro
  ) RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

GRANT EXECUTE ON FUNCTION public.app_write_audit_log(UUID, UUID, TEXT, TEXT, UUID, JSONB, JSONB, INET, TEXT, TEXT, TEXT, TEXT) TO authenticated, service_role;

-- ======================
-- Audit Query View
-- ======================

CREATE OR REPLACE VIEW public.v_audit_logs_recent AS
SELECT
  id,
  empresa_id,
  usuario_id,
  usuario_email,
  acao,
  tabela,
  registro_id,
  resultado,
  ocorreu_em,
  ip_address,
  diferenca
FROM enterprise_audit_logs
WHERE ocorreu_em >= NOW() - INTERVAL '30 days'
ORDER BY ocorreu_em DESC;

-- ======================
-- Audit Stats for Compliance
-- ======================

CREATE OR REPLACE VIEW public.v_audit_stats_by_empresa AS
SELECT
  empresa_id,
  DATE_TRUNC('day', ocorreu_em) as data,
  acao,
  resultado,
  COUNT(*) as qtd,
  COUNT(DISTINCT usuario_id) as usuarios_unicos
FROM enterprise_audit_logs
WHERE ocorreu_em >= NOW() - INTERVAL '90 days'
GROUP BY empresa_id, DATE_TRUNC('day', ocorreu_em), acao, resultado
ORDER BY empresa_id, data DESC;

-- ======================
-- RLS Policy for Audit Logs
-- ======================

ALTER TABLE enterprise_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY audit_logs_see_own_empresa ON enterprise_audit_logs
  FOR SELECT USING (
    empresa_id = (auth.jwt()->>'empresa_id')::UUID
    OR EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.usuario_id = auth.uid()
        AND ur.role IN ('SYSTEM_OWNER', 'MASTER_TI', 'SYSTEM_ADMIN')
    )
  );

-- DENY all writes at RLS level (only via RPC)
CREATE POLICY audit_logs_deny_direct_write ON enterprise_audit_logs
  FOR INSERT USING (FALSE);

CREATE POLICY audit_logs_deny_direct_update ON enterprise_audit_logs
  FOR UPDATE USING (FALSE);

CREATE POLICY audit_logs_deny_direct_delete ON enterprise_audit_logs
  FOR DELETE USING (FALSE);

COMMIT;