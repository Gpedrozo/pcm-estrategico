# Plano de Refatoracao DB Modular (2026-03-22)

## Estado atual confirmado por introspecao remota

- Inventario extraido automaticamente do banco:

  - 78 tabelas
  - 861 colunas
  - 129 chaves estrangeiras
  - 51 funcoes

- O bloqueio de login nao esta no frontend Owner.
- Causa estrutural observada no Auth durante diagnostico:

  - auth.instances estava vazio (0 linhas) no momento da falha.
  - Foi aplicada semeadura idempotente para restaurar 1 linha base.
  - Mesmo com instances=1, o erro de Auth ainda persiste e indica drift interno do servico Auth/schema.

## Mapa de modulos de dados (proposta)

1. modulo_auth_tenancy

- Tabelas: profiles, user_roles, tenant_users, owner_impersonation_sessions, auth_session_transfer_tokens, rbac_*
- Objetivo: isolamento total de identidade, roles e contexto de tenant.

1. modulo_owner_saas

- Tabelas: empresas, empresa_config, dados_empresa, plans, subscriptions, contracts, contract_versions, support_tickets, subscription_payments, billing_*, enterprise_*
- Objetivo: controle de ciclo comercial e operacao multiempresa.

1. modulo_manutencao_core

- Tabelas: equipamentos, ordens_servico, execucoes_os, execucoes_os_pausas, maintenance_*, solicitacoes*
- Objetivo: nucleo operacional de manutencao corretiva/preventiva.

1. modulo_engenharia_confiabilidade

- Tabelas: planos_preventivos, planos_lubrificacao, medicoes_preditivas, inspecoes, fmea, analise_causa_raiz, ai_root_cause_analysis, componentes_equipamento
- Objetivo: engenharia de confiabilidade e analise tecnica.

1. modulo_governanca_observabilidade

- Tabelas: audit_logs, enterprise_audit_logs, operational_logs, system_*, feature_flags, configuracoes_sistema
- Objetivo: auditoria, observabilidade, politicas e operacao de plataforma.

## Estrategia de refatoracao modulo a modulo

Fase A: Congelamento e baseline

- Congelar mudancas destrutivas no schema atual.
- Validar todos os contratos de API por modulo.
- Ativar relatorio diario de integridade (FK, RLS, null empresa_id).

Fase B: Contrato canonico por modulo

- Definir naming padrao (snake_case, sufixos, chaves compostas).
- Definir colunas minimas obrigatorias por entidade: id, empresa_id (quando aplicavel), created_at, updated_at, status.
- Definir FKs obrigatorias e indices canônicos por caminho de consulta.

Fase C: Refactor por compatibilidade

- Criar tabelas canônicas novas por modulo com sufixo _v2.
- Backfill incremental com trilha de auditoria por lote.
- Criar views de compatibilidade para manter frontend e edge estaveis durante migracao.

Fase D: Cutover controlado

- Migrar escrita para _v2 primeiro, leitura dual temporaria.
- Validar contagens e checksums por modulo.
- Eliminar dependencias legadas e remover _legacy apos janela de seguranca.

## Diagnostico especifico do bloqueio atual (Auth)

- O erro "Database error querying schema" persiste apos hardening de hook e seed de auth.instances.
- Isso indica forte probabilidade de drift interno no schema gerido pelo servico Auth (nao apenas tabelas public).
- Recomendacao operacional:

  - Abrir incidente com suporte Supabase com evidencias de:

    - auth schema migrations (max_version e amostra)
    - contagens de auth core tables
    - erro_id retornado em /auth/v1/token

  - Solicitar reconciliação de schema do Auth no nivel da plataforma.

## Artefatos de apoio criados

- Views de inventario estrutural e diagnostico Auth em migrations 20260322003000..20260322009000.
- Relatorios locais de inventario em reports/schema_inventory (clone local).

## Proximo passo de execucao tecnica

1. Encapsular consultas de cada modulo em RPCs canônicas (owner e tenant).
2. Introduzir camada de read models por modulo para desacoplar frontend de tabelas internas.
3. Iniciar modulo_auth_tenancy_v2 e modulo_owner_saas_v2 com migração incremental.
