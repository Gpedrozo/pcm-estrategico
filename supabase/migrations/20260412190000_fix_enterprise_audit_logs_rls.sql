-- =============================================================================
-- MIGRATION: Fix enterprise_audit_logs RLS + garantir colunas bilíngues
-- Date: 2026-04-12
-- Problemas corrigidos:
--   1. SELECT policy usava (auth.jwt()->>'empresa_id')::UUID que é NULL para
--      usuários comuns → página /auditoria sempre retornava 0 linhas.
--   2. INSERT deny policy usava USING(false) que é sintaxe inválida para INSERT
--      (deve usar WITH CHECK). Refeito corretamente.
--   3. Garante que todas as colunas em PT existem (idempotente).
-- =============================================================================

-- ──────────────────────────────────────────────────────────────────────────────
-- 1. Garantir colunas PT (idempotente — já foram adicionadas em 20260406)
-- ──────────────────────────────────────────────────────────────────────────────
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

-- ──────────────────────────────────────────────────────────────────────────────
-- 2. Garantir RLS habilitado e FORCE RLS
-- ──────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.enterprise_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enterprise_audit_logs FORCE ROW LEVEL SECURITY;

-- ──────────────────────────────────────────────────────────────────────────────
-- 3. Remover TODAS as policies anteriores (conflitantes entre v4..v8)
-- ──────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  pol TEXT;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'enterprise_audit_logs'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.enterprise_audit_logs', pol);
  END LOOP;
  RAISE NOTICE '[FIX-AUDIT-RLS] Todas as policies antigas removidas.';
END $$;

-- ──────────────────────────────────────────────────────────────────────────────
-- 4. Recriar policies corretas
-- ──────────────────────────────────────────────────────────────────────────────

-- SELECT: tenant vê seus próprios logs via can_access_empresa (profiles-based)
-- SYSTEM_OWNER / MASTER_TI / SYSTEM_ADMIN vêem todos
CREATE POLICY "audit_select_tenant_or_admin"
  ON public.enterprise_audit_logs
  FOR SELECT
  TO authenticated
  USING (
    public.can_access_empresa(empresa_id)
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('SYSTEM_OWNER', 'MASTER_TI', 'SYSTEM_ADMIN')
    )
  );

-- SELECT para empresa_id NULL (logs de plataforma / sistema): somente admins
CREATE POLICY "audit_select_platform_admin"
  ON public.enterprise_audit_logs
  FOR SELECT
  TO authenticated
  USING (
    empresa_id IS NULL
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('SYSTEM_OWNER', 'SYSTEM_ADMIN')
    )
  );

-- INSERT: bloqueado por padrão para authenticated (somente via RPC SECURITY DEFINER)
CREATE POLICY "audit_insert_deny_direct"
  ON public.enterprise_audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (FALSE);

-- INSERT / ALL: service_role tem acesso total (edge functions, RPCs)
CREATE POLICY "audit_service_role_all"
  ON public.enterprise_audit_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- UPDATE / DELETE: ninguém além do service_role
CREATE POLICY "audit_deny_update"
  ON public.enterprise_audit_logs
  FOR UPDATE
  TO authenticated
  USING (FALSE)
  WITH CHECK (FALSE);

CREATE POLICY "audit_deny_delete"
  ON public.enterprise_audit_logs
  FOR DELETE
  TO authenticated
  USING (FALSE);

-- ──────────────────────────────────────────────────────────────────────────────
-- 5. Garantir GRANTs corretos
-- ──────────────────────────────────────────────────────────────────────────────
GRANT SELECT ON public.enterprise_audit_logs TO authenticated;
GRANT ALL ON public.enterprise_audit_logs TO service_role;
REVOKE INSERT, UPDATE, DELETE ON public.enterprise_audit_logs FROM anon;
REVOKE SELECT ON public.enterprise_audit_logs FROM anon;

-- ──────────────────────────────────────────────────────────────────────────────
-- 6. Índice de performance na coluna ocorreu_em (ordenação da página /auditoria)
-- ──────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_enterprise_audit_empresa_ocorreu
  ON public.enterprise_audit_logs(empresa_id, ocorreu_em DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_enterprise_audit_empresa_acao_ocorreu
  ON public.enterprise_audit_logs(empresa_id, acao, ocorreu_em DESC NULLS LAST)
  WHERE empresa_id IS NOT NULL;

NOTIFY pgrst, 'reload schema';

DO $$ BEGIN
  RAISE NOTICE '[FIX-AUDIT-RLS] Concluído. Políticas RLS corrigidas para enterprise_audit_logs.';
END $$;
