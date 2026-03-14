# Auditoria de Uso de Tabelas por Modulo

Gerado em: 2026-03-13T23:51:23.642Z

## Resumo

- Modulos auditados: 39
- Tabelas criadas em migrations: 92
- Tabelas usadas pelos modulos: 41
- Tabelas usadas no frontend (global): 49
- Tabelas usadas por edge functions: 24
- Tabelas usadas no total: 58
- Candidatas sem uso (modulos + edge): 35

## Candidatas Sem Uso

- ativos
- auditoria
- avaliacoes_fornecedores
- causas
- checklists
- edge_refactor_contract
- enterprise_companies
- enterprise_impersonation_sessions
- enterprise_plans
- enterprise_subscriptions
- enterprise_system_integrity
- execucoes_os_pausas
- falhas
- indicadores_kpi
- legacy_tenant_rollback_snapshot
- localizacoes
- maintenance_action_suggestions
- membros_empresa
- migration_validation_windows
- orcamentos_manutencao
- permissoes
- planos_manutencao
- rate_limits
- rate_limits_por_empresa
- rbac_permissions
- rbac_role_permissions
- rbac_roles
- role_permissions
- subscription_payments
- system_notifications
- system_owner_allowlist
- tags_ativos
- tarefas_plano
- tenants
- unidades

## Uso por Modulo (Pagina -> Dependencias Locais)

### ArquivosOwner

- Entrada: src/pages/ArquivosOwner.tsx
- Arquivos no grafo: 1
- Tabelas acessadas: 0
- Sem acesso direto a tabelas Supabase no grafo local.

### Auditoria

- Entrada: src/pages/Auditoria.tsx
- Arquivos no grafo: 15
- Tabelas acessadas: 6
- audit_logs: select
- configuracoes_sistema: select
- empresa_config: select
- empresas: select
- profiles: select
- user_roles: select

### Backlog

- Entrada: src/pages/Backlog.tsx
- Arquivos no grafo: 18
- Tabelas acessadas: 1
- ordens_servico: insert, select, update

### ConfiguracoesEmpresa

- Entrada: src/pages/ConfiguracoesEmpresa.tsx
- Arquivos no grafo: 20
- Tabelas acessadas: 6
- configuracoes_sistema: select, upsert
- dados_empresa: select, update
- empresa_config: select
- empresas: select
- profiles: select
- user_roles: select

### Contratos

- Entrada: src/pages/Contratos.tsx
- Arquivos no grafo: 25
- Tabelas acessadas: 7
- configuracoes_sistema: select
- contratos: delete, insert, select, update
- empresa_config: select
- empresas: select
- fornecedores: insert, select, update
- profiles: select
- user_roles: select

### Custos

- Entrada: src/pages/Custos.tsx
- Arquivos no grafo: 21
- Tabelas acessadas: 8
- configuracoes_sistema: select
- empresa_config: select
- empresas: select
- equipamentos: delete, insert, select, update
- execucoes_os: insert, select
- ordens_servico: insert, select, update
- profiles: select
- user_roles: select

### Dashboard

- Entrada: src/pages/Dashboard.tsx
- Arquivos no grafo: 32
- Tabelas acessadas: 8
- configuracoes_sistema: select
- empresa_config: select
- empresas: select
- execucoes_os: insert, select
- ordens_servico: insert, select, update
- profiles: select
- user_roles: select
- v_dashboard_kpis: select

### DocumentosTecnicos

- Entrada: src/pages/DocumentosTecnicos.tsx
- Arquivos no grafo: 23
- Tabelas acessadas: 7
- configuracoes_sistema: select
- documentos_tecnicos: insert, select
- empresa_config: select
- empresas: select
- equipamentos: delete, insert, select, update
- profiles: select
- user_roles: select

### Equipamentos

- Entrada: src/pages/Equipamentos.tsx
- Arquivos no grafo: 32
- Tabelas acessadas: 10
- areas: delete, insert, select, update
- componentes_equipamento: delete, insert, select, update
- configuracoes_sistema: select
- empresa_config: select
- empresas: select
- equipamentos: delete, insert, select, update
- plantas: delete, insert, select, update
- profiles: select
- sistemas: delete, insert, select, update
- user_roles: select

### FecharOS

- Entrada: src/pages/FecharOS.tsx
- Arquivos no grafo: 31
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
- profiles: select
- user_roles: select

### FMEA

- Entrada: src/pages/FMEA.tsx
- Arquivos no grafo: 22
- Tabelas acessadas: 7
- configuracoes_sistema: select
- empresa_config: select
- empresas: select
- equipamentos: delete, insert, select, update
- fmea: delete, insert, select, update
- profiles: select
- user_roles: select

### Fornecedores

- Entrada: src/pages/Fornecedores.tsx
- Arquivos no grafo: 17
- Tabelas acessadas: 2
- contratos: insert, select, update
- fornecedores: insert, select, update

### Hierarquia

- Entrada: src/pages/Hierarquia.tsx
- Arquivos no grafo: 24
- Tabelas acessadas: 8
- areas: delete, insert, select, update
- configuracoes_sistema: select
- empresa_config: select
- empresas: select
- plantas: delete, insert, select, update
- profiles: select
- sistemas: delete, insert, select, update
- user_roles: select

### HistoricoOS

- Entrada: src/pages/HistoricoOS.tsx
- Arquivos no grafo: 36
- Tabelas acessadas: 9
- configuracoes_sistema: select
- dados_empresa: select, update
- empresa_config: select
- empresas: select
- equipamentos: delete, insert, select, update
- execucoes_os: insert, select
- ordens_servico: insert, select, update
- profiles: select
- user_roles: select

### Index

- Entrada: src/pages/Index.tsx
- Arquivos no grafo: 9
- Tabelas acessadas: 5
- configuracoes_sistema: select
- empresa_config: select
- empresas: select
- profiles: select
- user_roles: select

### Inspecoes

- Entrada: src/pages/Inspecoes.tsx
- Arquivos no grafo: 22
- Tabelas acessadas: 8
- anomalias_inspecao: insert, select
- configuracoes_sistema: select
- empresa_config: select
- empresas: select
- inspecoes: insert, select, update
- maintenance_schedule: delete, upsert
- profiles: select
- user_roles: select

### Instalar

- Entrada: src/pages/Instalar.tsx
- Arquivos no grafo: 5
- Tabelas acessadas: 0
- Sem acesso direto a tabelas Supabase no grafo local.

### Login

- Entrada: src/pages/Login.tsx
- Arquivos no grafo: 14
- Tabelas acessadas: 6
- configuracoes_sistema: select
- dados_empresa: select
- empresa_config: select
- empresas: select
- profiles: select
- user_roles: select

### Lubrificacao

- Entrada: src/pages/Lubrificacao.tsx
- Arquivos no grafo: 28
- Tabelas acessadas: 10
- configuracoes_sistema: select
- empresa_config: select
- empresas: select
- equipamentos: delete, insert, select, update
- execucoes_lubrificacao: insert, select, update
- maintenance_schedule: delete, upsert
- ordens_servico: insert
- planos_lubrificacao: delete, insert, select, update
- profiles: select
- user_roles: select

### LubrificacaoDetalhe

- Entrada: src/pages/lubrificacao/LubrificacaoDetalhe.tsx
- Arquivos no grafo: 17
- Tabelas acessadas: 6
- configuracoes_sistema: select
- empresa_config: select
- empresas: select
- equipamentos: delete, insert, select, update
- profiles: select
- user_roles: select

### LubrificacaoForm

- Entrada: src/pages/lubrificacao/LubrificacaoForm.tsx
- Arquivos no grafo: 20
- Tabelas acessadas: 6
- configuracoes_sistema: select
- empresa_config: select
- empresas: select
- equipamentos: delete, insert, select, update
- profiles: select
- user_roles: select

### LubrificacaoList

- Entrada: src/pages/lubrificacao/LubrificacaoList.tsx
- Arquivos no grafo: 19
- Tabelas acessadas: 6
- configuracoes_sistema: select
- empresa_config: select
- empresas: select
- equipamentos: delete, insert, select, update
- profiles: select
- user_roles: select

### ManualOperacao

- Entrada: src/pages/ManualOperacao.tsx
- Arquivos no grafo: 8
- Tabelas acessadas: 5
- configuracoes_sistema: select
- empresa_config: select
- empresas: select
- profiles: select
- user_roles: select

### MasterTI

- Entrada: src/pages/MasterTI.tsx
- Arquivos no grafo: 10
- Tabelas acessadas: 5
- configuracoes_sistema: select
- empresa_config: select
- empresas: select
- profiles: select
- user_roles: select

### Materiais

- Entrada: src/pages/Materiais.tsx
- Arquivos no grafo: 23
- Tabelas acessadas: 8
- configuracoes_sistema: select
- empresa_config: select
- empresas: select
- materiais: delete, insert, select, update
- materiais_os: delete, insert, select
- movimentacoes_materiais: insert, select
- profiles: select
- user_roles: select

### Mecanicos

- Entrada: src/pages/Mecanicos.tsx
- Arquivos no grafo: 21
- Tabelas acessadas: 6
- configuracoes_sistema: select
- empresa_config: select
- empresas: select
- mecanicos: delete, insert, select, update
- profiles: select
- user_roles: select

### Melhorias

- Entrada: src/pages/Melhorias.tsx
- Arquivos no grafo: 22
- Tabelas acessadas: 7
- configuracoes_sistema: select
- empresa_config: select
- empresas: select
- equipamentos: delete, insert, select, update
- melhorias: insert, select, update
- profiles: select
- user_roles: select

### NotFound

- Entrada: src/pages/NotFound.tsx
- Arquivos no grafo: 2
- Tabelas acessadas: 0
- Sem acesso direto a tabelas Supabase no grafo local.

### NovaOS

- Entrada: src/pages/NovaOS.tsx
- Arquivos no grafo: 27
- Tabelas acessadas: 9
- audit_logs: select
- configuracoes_sistema: select
- dados_empresa: select, update
- empresa_config: select
- empresas: select
- equipamentos: delete, insert, select, update
- ordens_servico: insert, select, update
- profiles: select
- user_roles: select

### Owner

- Entrada: src/pages/Owner.tsx
- Arquivos no grafo: 11
- Tabelas acessadas: 6
- configuracoes_sistema: select
- empresa_config: select
- empresas: select
- profiles: delete, select
- rbac_user_roles: delete
- user_roles: delete, select

### Preditiva

- Entrada: src/pages/Preditiva.tsx
- Arquivos no grafo: 24
- Tabelas acessadas: 8
- configuracoes_sistema: select
- empresa_config: select
- empresas: select
- equipamentos: delete, insert, select, update
- maintenance_schedule: delete, upsert
- medicoes_preditivas: insert, select
- profiles: select
- user_roles: select

### Preventiva

- Entrada: src/pages/Preventiva.tsx
- Arquivos no grafo: 38
- Tabelas acessadas: 14
- atividades_preventivas: delete, insert, select, update
- configuracoes_sistema: select
- dados_empresa: select, update
- empresa_config: select
- empresas: select
- equipamentos: delete, insert, select, update
- execucoes_preventivas: insert, select, update
- maintenance_schedule: delete, upsert
- mecanicos: delete, insert, select, update
- planos_preventivos: delete, insert, select, update
- profiles: select
- servicos_preventivos: delete, insert, select, update
- templates_preventivos: delete, insert, select
- user_roles: select

### Programacao

- Entrada: src/pages/Programacao.tsx
- Arquivos no grafo: 23
- Tabelas acessadas: 8
- configuracoes_sistema: select
- empresa_config: select
- empresas: select
- equipamentos: delete, insert, select, update
- maintenance_schedule: delete, select, update, upsert
- ordens_servico: insert, select, update
- profiles: select
- user_roles: select

### RCA

- Entrada: src/pages/RCA.tsx
- Arquivos no grafo: 22
- Tabelas acessadas: 8
- acoes_corretivas: insert, select, update
- analise_causa_raiz: insert, select, update
- configuracoes_sistema: select
- empresa_config: select
- empresas: select
- equipamentos: delete, insert, select, update
- profiles: select
- user_roles: select

### Relatorios

- Entrada: src/pages/Relatorios.tsx
- Arquivos no grafo: 23
- Tabelas acessadas: 8
- configuracoes_sistema: select
- dados_empresa: select, update
- empresa_config: select
- empresas: select
- execucoes_os: select
- ordens_servico: insert, select, update
- profiles: select
- user_roles: select

### Solicitacoes

- Entrada: src/pages/Solicitacoes.tsx
- Arquivos no grafo: 22
- Tabelas acessadas: 6
- configuracoes_sistema: select
- empresa_config: select
- empresas: select
- equipamentos: delete, insert, select, update
- profiles: select
- user_roles: select

### SSMA

- Entrada: src/pages/SSMA.tsx
- Arquivos no grafo: 23
- Tabelas acessadas: 8
- configuracoes_sistema: select
- empresa_config: select
- empresas: select
- equipamentos: delete, insert, select, update
- incidentes_ssma: insert, select, update
- permissoes_trabalho: insert, select, update
- profiles: select
- user_roles: select

### Suporte

- Entrada: src/pages/Suporte.tsx
- Arquivos no grafo: 16
- Tabelas acessadas: 6
- configuracoes_sistema: select
- empresa_config: select
- empresas: select
- profiles: select
- support_tickets: insert, select
- user_roles: select

### Usuarios

- Entrada: src/pages/Usuarios.tsx
- Arquivos no grafo: 18
- Tabelas acessadas: 5
- configuracoes_sistema: select
- empresa_config: select
- empresas: select
- profiles: select, update
- user_roles: select, update

