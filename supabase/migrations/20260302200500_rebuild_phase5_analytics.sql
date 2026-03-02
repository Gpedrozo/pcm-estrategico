-- FASE 5 - CAMADA ANALÍTICA (BI READY)

BEGIN;

CREATE SCHEMA IF NOT EXISTS analytics;

CREATE OR REPLACE VIEW analytics.dim_empresa AS
SELECT
  id AS empresa_id,
  nome,
  slug,
  status,
  plano,
  created_at
FROM public.empresas;

CREATE OR REPLACE VIEW analytics.dim_equipamento AS
SELECT
  e.id AS equipamento_id,
  e.empresa_id,
  e.tag,
  e.nome,
  e.criticidade,
  e.nivel_risco,
  e.ativo
FROM public.equipamentos e;

CREATE OR REPLACE VIEW analytics.fato_os AS
SELECT
  os.id AS os_id,
  os.empresa_id,
  os.numero_os,
  os.tipo,
  os.prioridade,
  os.status,
  os.data_solicitacao,
  os.data_fechamento,
  os.tempo_estimado,
  EXTRACT(EPOCH FROM (COALESCE(os.data_fechamento, now()) - os.data_solicitacao)) / 3600.0 AS lead_time_horas
FROM public.ordens_servico os;

CREATE OR REPLACE VIEW analytics.fato_execucoes_os AS
SELECT
  eo.id AS execucao_id,
  eo.empresa_id,
  eo.os_id,
  eo.data_execucao,
  eo.tempo_execucao,
  eo.custo_mao_obra,
  eo.custo_materiais,
  eo.custo_terceiros,
  eo.custo_total
FROM public.execucoes_os eo;

CREATE OR REPLACE VIEW analytics.fato_agenda_manutencao AS
SELECT
  ms.id,
  ms.empresa_id,
  ms.tipo,
  ms.origem_id,
  ms.equipamento_id,
  ms.data_programada,
  ms.status,
  ms.responsavel
FROM public.maintenance_schedule ms;

CREATE OR REPLACE VIEW analytics.fato_alertas_criticos AS
SELECT
  eal.id,
  eal.empresa_id,
  eal.created_at,
  COALESCE(eal.action_type, eal.operation) AS evento,
  eal.source,
  eal.severity,
  eal.details
FROM public.enterprise_audit_logs eal
WHERE eal.severity = 'critical';

COMMIT;
