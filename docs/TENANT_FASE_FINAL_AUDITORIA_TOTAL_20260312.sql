-- Fase final: auditoria total obrigatoria por empresa_id
-- Data: 2026-03-12
-- Alvo imediato: tabelas migradas nesta fase
--   - solicitacoes
--   - solicitacoes_manutencao
--   - subscription_payments
--   - contract_versions

BEGIN;

-- 0) Preflight minimo
DO $$
BEGIN
  IF to_regclass('public.enterprise_audit_logs') IS NULL THEN
    RAISE EXCEPTION 'Tabela public.enterprise_audit_logs nao encontrada.';
  END IF;
END $$;

-- 0.1) Garantir funcao de trigger de auditoria (fallback)
DO $$
BEGIN
  IF to_regprocedure('public.log_enterprise_audit()') IS NULL THEN
    CREATE OR REPLACE FUNCTION public.log_enterprise_audit()
    RETURNS trigger
    LANGUAGE plpgsql
    AS $fn$
    DECLARE
      v_record_id text;
    BEGIN
      v_record_id := COALESCE(NEW.id::text, OLD.id::text, NULL);

      INSERT INTO public.enterprise_audit_logs (
        empresa_id,
        table_name,
        operation,
        record_id,
        actor_id,
        old_data,
        new_data,
        created_at
      )
      VALUES (
        COALESCE(NEW.empresa_id, OLD.empresa_id),
        TG_TABLE_NAME,
        TG_OP,
        v_record_id,
        auth.uid(),
        CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) END,
        CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) END,
        now()
      );

      RETURN COALESCE(NEW, OLD);
    END;
    $fn$;
  END IF;
END $$;

-- 1) Hardening de indice para leitura por tenant/tempo
CREATE INDEX IF NOT EXISTS idx_enterprise_audit_logs_empresa_created_at
  ON public.enterprise_audit_logs (empresa_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_enterprise_audit_logs_table_created_at
  ON public.enterprise_audit_logs (table_name, created_at DESC);

-- 2) Anexar trigger de auditoria por tabela (idempotente)
DO $$
DECLARE
  v_table text;
  v_targets text[] := ARRAY[
    'solicitacoes',
    'solicitacoes_manutencao',
    'subscription_payments',
    'contract_versions'
  ];
BEGIN
  FOREACH v_table IN ARRAY v_targets LOOP
    IF to_regclass(format('public.%I', v_table)) IS NOT NULL THEN
      -- garante que a tabela eh tenant-scoped antes de auditar por empresa_id
      IF EXISTS (
        SELECT 1
        FROM information_schema.columns c
        WHERE c.table_schema = 'public'
          AND c.table_name = v_table
          AND c.column_name = 'empresa_id'
      ) THEN
        EXECUTE format('DROP TRIGGER IF EXISTS trg_enterprise_audit ON public.%I', v_table);
        EXECUTE format(
          'CREATE TRIGGER trg_enterprise_audit AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.log_enterprise_audit()',
          v_table
        );
      END IF;
    END IF;
  END LOOP;
END $$;

-- 3) Politica de leitura da auditoria (tenant ou operador global)
ALTER TABLE public.enterprise_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS enterprise_audit_logs_tenant_read ON public.enterprise_audit_logs;
CREATE POLICY enterprise_audit_logs_tenant_read
ON public.enterprise_audit_logs
FOR SELECT
TO authenticated
USING (
  public.is_control_plane_operator()
  OR empresa_id = public.get_current_empresa_id()
);

-- 4) Escrita da auditoria: somente backend/triggers (nao liberar insert amplo ao cliente)
-- Mantemos sem policy de INSERT para clientes authenticated.
-- Se existir policy legada de INSERT ampla, removemos.
DROP POLICY IF EXISTS enterprise_audit_logs_insert ON public.enterprise_audit_logs;
DROP POLICY IF EXISTS enterprise_audit_logs_write ON public.enterprise_audit_logs;

COMMIT;

-- 5) Validacao operacional
-- 5.1 Triggers anexadas nas 4 tabelas alvo
SELECT
  event_object_table AS table_name,
  trigger_name,
  action_timing,
  event_manipulation
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND trigger_name = 'trg_enterprise_audit'
  AND event_object_table IN ('solicitacoes','solicitacoes_manutencao','subscription_payments','contract_versions')
ORDER BY event_object_table, event_manipulation;

-- 5.2 Cobertura de logs recentes por tabela
SELECT
  table_name,
  count(*)::bigint AS total_logs,
  max(created_at) AS last_event_at
FROM public.enterprise_audit_logs
WHERE table_name IN ('solicitacoes','solicitacoes_manutencao','subscription_payments','contract_versions')
GROUP BY table_name
ORDER BY table_name;

-- 5.3 Verificar se ha log sem empresa_id (nao deve haver para tabelas tenant)
SELECT
  table_name,
  count(*)::bigint AS logs_sem_empresa_id
FROM public.enterprise_audit_logs
WHERE table_name IN ('solicitacoes','solicitacoes_manutencao','subscription_payments','contract_versions')
  AND empresa_id IS NULL
GROUP BY table_name
ORDER BY table_name;
