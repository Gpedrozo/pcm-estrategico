-- FASE 4 - COMPATIBILIDADE TEMPORÁRIA PARA FRONTEND LEGADO
-- Mantém módulos antigos funcionando durante migração gradual.

BEGIN;

CREATE OR REPLACE VIEW public.auditoria AS
SELECT
  al.id,
  al.actor_user_id AS usuario_id,
  COALESCE(al.actor_email, 'SISTEMA') AS usuario_nome,
  al.action AS acao,
  COALESCE(al.metadata ->> 'descricao', al.action) AS descricao,
  al.metadata ->> 'tag' AS tag,
  al.created_at AS data_hora,
  al.empresa_id
FROM public.audit_logs al;

-- Auditoria de banco legada -> enterprise_audit_logs
CREATE OR REPLACE VIEW public.auditoria_logs AS
SELECT
  eal.id,
  COALESCE(eal.table_name, eal.details ->> 'table') AS tabela,
  COALESCE(eal.operation, eal.action_type, 'UNKNOWN') AS operacao,
  COALESCE(eal.record_id, eal.details ->> 'record_id') AS registro_id,
  eal.actor_id AS usuario_id,
  eal.old_data,
  eal.new_data,
  eal.created_at,
  eal.empresa_id
FROM public.enterprise_audit_logs eal;

COMMIT;
