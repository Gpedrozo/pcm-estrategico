# Auditoria de Uso de Tabelas por Modulo

Gerado em: 2026-03-22T20:48:40.197Z

## Resumo

- Modulos auditados: 46
- Tabelas criadas em migrations: 106
- Tabelas usadas pelos modulos: 40
- Tabelas usadas no frontend (global): 45
- Tabelas usadas por edge functions: 35
- Tabelas usadas no total: 65
- Candidatas sem uso (modulos + edge): 41

## Candidatas Sem Uso

- ativos
- auditoria
- avaliacoes_fornecedores
- billing_customers
- billing_invoices
- causas
- checklists
- company_usage_metrics
- edge_refactor_contract
- enterprise_companies
- enterprise_plans
- enterprise_system_integrity
- execucoes_os_pausas
- falhas
- feature_flags
- indicadores_kpi
- ip_rate_limits
- legacy_tenant_rollback_snapshot
- localizacoes
- maintenance_action_suggestions
- membros_empresa
- migration_validation_windows
- orcamentos_manutencao
- owner_full_seed_log
- permissoes
- planos_manutencao
- rate_limits
- rate_limits_por_empresa
- rbac_permissions
- rbac_role_permissions
- rbac_roles
- rbac_user_roles
- role_permissions
- saas_metrics_daily
- solicitacoes_manutencao
- system_error_events
- system_notifications
- system_owner_allowlist
- tags_ativos
- tarefas_plano
- unidades

## Uso por Modulo (Pagina -> Dependencias Locais)

### Administracao

- Entrada: src/pages/Administracao.tsx
- Arquivos no grafo: 27
- Tabelas acessadas: 5
- configuracoes_sistema: select, upsert
- empresa_config: select
- empresas: select
- profiles: select, update
- user_roles: select, update

### ArquivosOwner

- Entrada: src/pages/ArquivosOwner.tsx
- Arquivos no grafo: 1
- Tabelas acessadas: 0
- Sem acesso direto a tabelas Supabase no grafo local.

### Auditoria

- Entrada: src/pages/Auditoria.tsx
- Arquivos no grafo: 20
- Tabelas acessadas: 6
- audit_logs: select
- configuracoes_sistema: select
- empresa_config: select
- empresas: select
- profiles: select, update
- user_roles: select

### Backlog

- Entrada: src/pages/Backlog.tsx
- Arquivos no grafo: 31
- Tabelas acessadas: 6
- configuracoes_sistema: select, upsert
- empresa_config: select
- empresas: select
- ordens_servico: insert, select, update
- profiles: select, update
- user_roles: select

### ChangePassword

- Entrada: src/pages/ChangePassword.tsx
- Arquivos no grafo: 17
- Tabelas acessadas: 5
- configuracoes_sistema: select
- empresa_config: select
- empresas: select
- profiles: select, update
- user_roles: select

### ConfiguracoesEmpresa

- Entrada: src/pages/ConfiguracoesEmpresa.tsx
- Arquivos no grafo: 25
- Tabelas acessadas: 6
- configuracoes_sistema: select, upsert
- dados_empresa: select, update, upsert
- empresa_config: select
- empresas: select
- profiles: select, update
- user_roles: select

### Contratos

- Entrada: src/pages/Contratos.tsx
- Arquivos no grafo: 30
- Tabelas acessadas: 7
- configuracoes_sistema: select
- contratos: delete, insert, select, update
- empresa_config: select
- empresas: select
- fornecedores: insert, select, update
- profiles: select, update
- user_roles: select

### Custos

- Entrada: src/pages/Custos.tsx
- Arquivos no grafo: 30
- Tabelas acessadas: 7
- configuracoes_sistema: select
- empresa_config: select
- empresas: select
- execucoes_os: insert, select
- ordens_servico: insert, select, update
- profiles: select, update
- user_roles: select

### Dashboard

- Entrada: src/pages/Dashboard.tsx
- Arquivos no grafo: 50
- Tabelas acessadas: 11
- areas: delete, insert, select, update
- configuracoes_sistema: select, upsert
- empresa_config: select
- empresas: select
- execucoes_os: insert, select
- mecanicos: delete, insert, select, update
- ordens_servico: insert, select, update
- plantas: delete, insert, select, update
- profiles: select, update
- sistemas: delete, insert, select, update
- user_roles: select

### DocumentosTecnicos

- Entrada: src/pages/DocumentosTecnicos.tsx
- Arquivos no grafo: 31
- Tabelas acessadas: 6
- configuracoes_sistema: select
- documentos_tecnicos: insert, select
- empresa_config: select
- empresas: select
- profiles: select, update
- user_roles: select

### Equipamentos

- Entrada: src/pages/Equipamentos.tsx
- Arquivos no grafo: 46
- Tabelas acessadas: 11
- areas: delete, insert, select, update
- componentes_equipamento: delete, insert, select, update
- configuracoes_sistema: select
- empresa_config: select
- empresas: select
- execucoes_os: insert, select
- ordens_servico: insert, select, update
- plantas: delete, insert, select, update
- profiles: select, update
- sistemas: delete, insert, select, update
- user_roles: select

### FecharOS

- Entrada: src/pages/FecharOS.tsx
- Arquivos no grafo: 42
- Tabelas acessadas: 12
- audit_logs: select
- configuracoes_sistema: select
- empresa_config: select
- empresas: select
- execucoes_os: insert, select
- materiais: delete, insert, select, update
- materiais_os: delete, insert, select
- mecanicos: delete, insert, select, update
- movimentacoes_materiais: insert, select
- ordens_servico: insert, select, update
- profiles: select, update
- user_roles: select

### FMEA

- Entrada: src/pages/FMEA.tsx
- Arquivos no grafo: 29
- Tabelas acessadas: 6
- configuracoes_sistema: select
- empresa_config: select
- empresas: select
- fmea: delete, insert, select, update
- profiles: select, update
- user_roles: select

### ForgotPassword

- Entrada: src/pages/ForgotPassword.tsx
- Arquivos no grafo: 8
- Tabelas acessadas: 0
- Sem acesso direto a tabelas Supabase no grafo local.

### Fornecedores

- Entrada: src/pages/Fornecedores.tsx
- Arquivos no grafo: 26
- Tabelas acessadas: 7
- configuracoes_sistema: select
- contratos: insert, select, update
- empresa_config: select
- empresas: select
- fornecedores: insert, select, update
- profiles: select, update
- user_roles: select

### Hierarquia

- Entrada: src/pages/Hierarquia.tsx
- Arquivos no grafo: 30
- Tabelas acessadas: 8
- areas: delete, insert, select, update
- configuracoes_sistema: select
- empresa_config: select
- empresas: select
- plantas: delete, insert, select, update
- profiles: select, update
- sistemas: delete, insert, select, update
- user_roles: select

### HistoricoOS

- Entrada: src/pages/HistoricoOS.tsx
- Arquivos no grafo: 47
- Tabelas acessadas: 8
- configuracoes_sistema: select, upsert
- dados_empresa: select, update, upsert
- empresa_config: select
- empresas: select
- execucoes_os: insert, select
- ordens_servico: insert, select, update
- profiles: select, update
- user_roles: select

### Index

- Entrada: src/pages/Index.tsx
- Arquivos no grafo: 15
- Tabelas acessadas: 5
- configuracoes_sistema: select
- empresa_config: select
- empresas: select
- profiles: select, update
- user_roles: select

### Inspecoes

- Entrada: src/pages/Inspecoes.tsx
- Arquivos no grafo: 34
- Tabelas acessadas: 9
- anomalias_inspecao: insert, select
- configuracoes_sistema: select
- empresa_config: select
- empresas: select
- inspecoes: insert, select, update
- maintenance_schedule: delete, upsert
- ordens_servico: insert, select, update
- profiles: select, update
- user_roles: select

### Instalar

- Entrada: src/pages/Instalar.tsx
- Arquivos no grafo: 6
- Tabelas acessadas: 0
- Sem acesso direto a tabelas Supabase no grafo local.

### Login

- Entrada: src/pages/Login.tsx
- Arquivos no grafo: 21
- Tabelas acessadas: 6
- configuracoes_sistema: select
- dados_empresa: select
- empresa_config: select
- empresas: select, update
- profiles: select, update
- user_roles: select

### Lubrificacao

- Entrada: src/pages/Lubrificacao.tsx
- Arquivos no grafo: 36
- Tabelas acessadas: 11
- configuracoes_sistema: select
- document_layouts: insert, select, update
- document_sequences: select, update, upsert
- empresa_config: select
- empresas: select
- execucoes_lubrificacao: insert, select, update
- maintenance_schedule: delete, upsert
- ordens_servico: insert
- planos_lubrificacao: delete, insert, select, update
- profiles: select, update
- user_roles: select

### LubrificacaoDetalhe

- Entrada: src/pages/lubrificacao/LubrificacaoDetalhe.tsx
- Arquivos no grafo: 24
- Tabelas acessadas: 5
- configuracoes_sistema: select
- empresa_config: select
- empresas: select
- profiles: select, update
- user_roles: select

### LubrificacaoForm

- Entrada: src/pages/lubrificacao/LubrificacaoForm.tsx
- Arquivos no grafo: 28
- Tabelas acessadas: 7
- configuracoes_sistema: select
- document_layouts: insert, select, update
- document_sequences: select, update, upsert
- empresa_config: select
- empresas: select
- profiles: select, update
- user_roles: select

### LubrificacaoList

- Entrada: src/pages/lubrificacao/LubrificacaoList.tsx
- Arquivos no grafo: 26
- Tabelas acessadas: 5
- configuracoes_sistema: select
- empresa_config: select
- empresas: select
- profiles: select, update
- user_roles: select

### ManualOperacao

- Entrada: src/pages/ManualOperacao.tsx
- Arquivos no grafo: 15
- Tabelas acessadas: 6
- configuracoes_sistema: select
- dados_empresa: select
- empresa_config: select
- empresas: select
- profiles: select, update
- user_roles: select

### MasterTI

- Entrada: src/pages/MasterTI.tsx
- Arquivos no grafo: 15
- Tabelas acessadas: 5
- configuracoes_sistema: select
- empresa_config: select
- empresas: select
- profiles: select, update
- user_roles: select

### Materiais

- Entrada: src/pages/Materiais.tsx
- Arquivos no grafo: 29
- Tabelas acessadas: 8
- configuracoes_sistema: select
- empresa_config: select
- empresas: select
- materiais: delete, insert, select, update
- materiais_os: delete, insert, select
- movimentacoes_materiais: insert, select
- profiles: select, update
- user_roles: select

### Mecanicos

- Entrada: src/pages/Mecanicos.tsx
- Arquivos no grafo: 32
- Tabelas acessadas: 8
- configuracoes_sistema: select
- empresa_config: select
- empresas: select
- execucoes_os: insert, select
- mecanicos: delete, insert, select, update
- ordens_servico: insert, select, update
- profiles: select, update
- user_roles: select

### Melhorias

- Entrada: src/pages/Melhorias.tsx
- Arquivos no grafo: 29
- Tabelas acessadas: 6
- configuracoes_sistema: select
- empresa_config: select
- empresas: select
- melhorias: insert, select, update
- profiles: select, update
- user_roles: select

### NotFound

- Entrada: src/pages/NotFound.tsx
- Arquivos no grafo: 3
- Tabelas acessadas: 0
- Sem acesso direto a tabelas Supabase no grafo local.

### NovaOS

- Entrada: src/pages/NovaOS.tsx
- Arquivos no grafo: 41
- Tabelas acessadas: 9
- audit_logs: select
- configuracoes_sistema: select, upsert
- dados_empresa: select, update, upsert
- empresa_config: select
- empresas: select
- mecanicos: delete, insert, select, update
- ordens_servico: insert, select, update
- profiles: select, update
- user_roles: select

### Owner

- Entrada: src/pages/Owner.tsx
- Arquivos no grafo: 16
- Tabelas acessadas: 5
- configuracoes_sistema: select
- empresa_config: select
- empresas: select, update
- profiles: select, update
- user_roles: select

### Owner2

- Entrada: src/pages/Owner2.tsx
- Arquivos no grafo: 16
- Tabelas acessadas: 5
- configuracoes_sistema: select
- empresa_config: select
- empresas: select, update
- profiles: select, update
- user_roles: select

### PortalMecanicoOS

- Entrada: src/pages/PortalMecanicoOS.tsx
- Arquivos no grafo: 27
- Tabelas acessadas: 7
- configuracoes_sistema: select
- empresa_config: select
- empresas: select
- mecanicos: delete, insert, select, update
- ordens_servico: insert, select, update
- profiles: select, update
- user_roles: select

### Preditiva

- Entrada: src/pages/Preditiva.tsx
- Arquivos no grafo: 35
- Tabelas acessadas: 8
- configuracoes_sistema: select
- empresa_config: select
- empresas: select
- maintenance_schedule: delete, upsert
- medicoes_preditivas: insert, select
- ordens_servico: insert, select, update
- profiles: select, update
- user_roles: select

### Preventiva

- Entrada: src/pages/Preventiva.tsx
- Arquivos no grafo: 47
- Tabelas acessadas: 13
- atividades_preventivas: delete, insert, select, update
- configuracoes_sistema: select
- dados_empresa: select, update, upsert
- empresa_config: select
- empresas: select
- execucoes_preventivas: insert, select, update
- maintenance_schedule: delete, upsert
- mecanicos: delete, insert, select, update
- planos_preventivos: delete, insert, select, update
- profiles: select, update
- servicos_preventivos: delete, insert, select, update
- templates_preventivos: delete, insert, select
- user_roles: select

### Programacao

- Entrada: src/pages/Programacao.tsx
- Arquivos no grafo: 35
- Tabelas acessadas: 8
- configuracoes_sistema: select
- dados_empresa: select, update, upsert
- empresa_config: select
- empresas: select
- maintenance_schedule: delete, select, update, upsert
- ordens_servico: insert, select, update
- profiles: select, update
- user_roles: select

### RCA

- Entrada: src/pages/RCA.tsx
- Arquivos no grafo: 29
- Tabelas acessadas: 7
- acoes_corretivas: insert, select, update
- analise_causa_raiz: insert, select, update
- configuracoes_sistema: select
- empresa_config: select
- empresas: select
- profiles: select, update
- user_roles: select

### Relatorios

- Entrada: src/pages/Relatorios.tsx
- Arquivos no grafo: 30
- Tabelas acessadas: 8
- configuracoes_sistema: select
- dados_empresa: select, update, upsert
- empresa_config: select
- empresas: select
- execucoes_os: select
- ordens_servico: insert, select, update
- profiles: select, update
- user_roles: select

### ResetPassword

- Entrada: src/pages/ResetPassword.tsx
- Arquivos no grafo: 17
- Tabelas acessadas: 5
- configuracoes_sistema: select
- empresa_config: select
- empresas: select
- profiles: select, update
- user_roles: select

### Solicitacoes

- Entrada: src/pages/Solicitacoes.tsx
- Arquivos no grafo: 31
- Tabelas acessadas: 5
- configuracoes_sistema: select, upsert
- empresa_config: select
- empresas: select
- profiles: select, update
- user_roles: select

### SSMA

- Entrada: src/pages/SSMA.tsx
- Arquivos no grafo: 30
- Tabelas acessadas: 7
- configuracoes_sistema: select
- empresa_config: select
- empresas: select
- incidentes_ssma: insert, select, update
- permissoes_trabalho: insert, select, update
- profiles: select, update
- user_roles: select

### Suporte

- Entrada: src/pages/Suporte.tsx
- Arquivos no grafo: 22
- Tabelas acessadas: 6
- configuracoes_sistema: select
- empresa_config: select
- empresas: select
- profiles: select, update
- support_tickets: insert, select, update
- user_roles: select

### SystemStatus

- Entrada: src/pages/SystemStatus.tsx
- Arquivos no grafo: 17
- Tabelas acessadas: 6
- configuracoes_sistema: select
- empresa_config: select
- empresas: select
- ordens_servico: select
- profiles: select, update
- user_roles: select

### Usuarios

- Entrada: src/pages/Usuarios.tsx
- Arquivos no grafo: 23
- Tabelas acessadas: 5
- configuracoes_sistema: select
- empresa_config: select
- empresas: select
- profiles: select, update
- user_roles: select, update

