-- Auditoria total de tabelas referenciadas no frontend (src/**)
-- Data: 2026-03-09
-- Execute no Supabase SQL Editor (Run)

-- 1) Checklist detalhado de existência por tabela
with required_tables(table_name) as (
  values
    ('acoes_corretivas'),
    ('ai_root_cause_analysis'),
    ('analise_causa_raiz'),
    ('anomalias_inspecao'),
    ('areas'),
    ('atividades_lubrificacao'),
    ('atividades_preventivas'),
    ('audit_logs'),
    ('componentes_equipamento'),
    ('configuracoes_sistema'),
    ('contratos'),
    ('dados_empresa'),
    ('document_layouts'),
    ('document_sequences'),
    ('documentos_tecnicos'),
    ('empresa_config'),
    ('empresas'),
    ('enterprise_audit_logs'),
    ('equipamentos'),
    ('execucoes_lubrificacao'),
    ('execucoes_os'),
    ('execucoes_preventivas'),
    ('fmea'),
    ('fornecedores'),
    ('incidentes_ssma'),
    ('inspecoes'),
    ('maintenance_schedule'),
    ('materiais'),
    ('materiais_os'),
    ('mecanicos'),
    ('medicoes_preditivas'),
    ('melhorias'),
    ('movimentacoes_materiais'),
    ('ordens_servico'),
    ('permissoes_granulares'),
    ('permissoes_trabalho'),
    ('planos_lubrificacao'),
    ('planos_preventivos'),
    ('plantas'),
    ('profiles'),
    ('security_logs'),
    ('servicos_preventivos'),
    ('sistemas'),
    ('solicitacoes_manutencao'),
    ('templates_preventivos'),
    ('user_roles')
), existing as (
  select table_name
  from information_schema.tables
  where table_schema = 'public'
)
select
  rt.table_name,
  case when e.table_name is null then 'MISSING' else 'OK' end as status
from required_tables rt
left join existing e on e.table_name = rt.table_name
order by status desc, rt.table_name;

-- 2) Resumo quantitativo
with required_tables(table_name) as (
  values
    ('acoes_corretivas'),
    ('ai_root_cause_analysis'),
    ('analise_causa_raiz'),
    ('anomalias_inspecao'),
    ('areas'),
    ('atividades_lubrificacao'),
    ('atividades_preventivas'),
    ('audit_logs'),
    ('componentes_equipamento'),
    ('configuracoes_sistema'),
    ('contratos'),
    ('dados_empresa'),
    ('document_layouts'),
    ('document_sequences'),
    ('documentos_tecnicos'),
    ('empresa_config'),
    ('empresas'),
    ('enterprise_audit_logs'),
    ('equipamentos'),
    ('execucoes_lubrificacao'),
    ('execucoes_os'),
    ('execucoes_preventivas'),
    ('fmea'),
    ('fornecedores'),
    ('incidentes_ssma'),
    ('inspecoes'),
    ('maintenance_schedule'),
    ('materiais'),
    ('materiais_os'),
    ('mecanicos'),
    ('medicoes_preditivas'),
    ('melhorias'),
    ('movimentacoes_materiais'),
    ('ordens_servico'),
    ('permissoes_granulares'),
    ('permissoes_trabalho'),
    ('planos_lubrificacao'),
    ('planos_preventivos'),
    ('plantas'),
    ('profiles'),
    ('security_logs'),
    ('servicos_preventivos'),
    ('sistemas'),
    ('solicitacoes_manutencao'),
    ('templates_preventivos'),
    ('user_roles')
), existing as (
  select table_name
  from information_schema.tables
  where table_schema = 'public'
)
select
  count(*) as total_referenciadas,
  count(e.table_name) as existentes,
  count(*) - count(e.table_name) as faltantes
from required_tables rt
left join existing e on e.table_name = rt.table_name;

-- 3) Lista curta somente das faltantes (para ação)
with required_tables(table_name) as (
  values
    ('acoes_corretivas'),
    ('ai_root_cause_analysis'),
    ('analise_causa_raiz'),
    ('anomalias_inspecao'),
    ('areas'),
    ('atividades_lubrificacao'),
    ('atividades_preventivas'),
    ('audit_logs'),
    ('componentes_equipamento'),
    ('configuracoes_sistema'),
    ('contratos'),
    ('dados_empresa'),
    ('document_layouts'),
    ('document_sequences'),
    ('documentos_tecnicos'),
    ('empresa_config'),
    ('empresas'),
    ('enterprise_audit_logs'),
    ('equipamentos'),
    ('execucoes_lubrificacao'),
    ('execucoes_os'),
    ('execucoes_preventivas'),
    ('fmea'),
    ('fornecedores'),
    ('incidentes_ssma'),
    ('inspecoes'),
    ('maintenance_schedule'),
    ('materiais'),
    ('materiais_os'),
    ('mecanicos'),
    ('medicoes_preditivas'),
    ('melhorias'),
    ('movimentacoes_materiais'),
    ('ordens_servico'),
    ('permissoes_granulares'),
    ('permissoes_trabalho'),
    ('planos_lubrificacao'),
    ('planos_preventivos'),
    ('plantas'),
    ('profiles'),
    ('security_logs'),
    ('servicos_preventivos'),
    ('sistemas'),
    ('solicitacoes_manutencao'),
    ('templates_preventivos'),
    ('user_roles')
)
select rt.table_name as tabela_faltante
from required_tables rt
where not exists (
  select 1
  from information_schema.tables t
  where t.table_schema = 'public'
    and t.table_name = rt.table_name
)
order by rt.table_name;