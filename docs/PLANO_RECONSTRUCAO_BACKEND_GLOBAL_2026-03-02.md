# Plano de Reconstrução Global do Backend (Todos os Módulos)

Data: 2026-03-02
Escopo: aplicar a lógica de consolidação estrutural em todos os módulos (preventiva, lubrificação, inspeção, preditiva, OS, contratos, SSMA, FMEA, RCA, etc.)

## 1) Diretriz central

A ideia de concentrar dados para análise está correta, mas com uma observação técnica importante:

- Não usar uma única tabela gigante para tudo (isso piora integridade e manutenção).
- Usar um único banco (Postgres/Supabase) com modelo canônico por domínio + camada analítica para BI.

Resultado esperado:

- OLTP limpo e consistente para operação diária.
- Camada analítica pronta para Power BI sem retrabalho.
- Segurança multi-tenant preservada por empresa_id + RLS.

## 2) Diagnóstico resumido do estado atual

### 2.1 Pontos fortes já existentes

- Base multi-tenant com empresa_id em grande parte das tabelas.
- RLS e RBAC já evoluídos (has_permission e perfis globais).
- Agenda central maintenance_schedule já criada.
- Trilha de auditoria avançando para padrão RPC.

### 2.2 Principais problemas detectados

- Coexistência de trilhas de auditoria antigas e novas (auditoria, auditoria_logs, audit_logs, enterprise_audit_logs).
- Parte do frontend ainda depende da tabela legada auditoria.
- Funções edge com acoplamentos legados (ex.: generate-preventive-os escreve em auditoria).
- Políticas antigas permissivas (USING true) ainda aparecem no histórico e precisam baseline único.
- Migrations com histórico acumulado e drift corrigido, mas com legado residual.

## 3) Arquitetura alvo (padrão para todos os módulos)

## 3.1 Camada operacional (OLTP)

Padrão por módulo:

- Tabela de plano/configuração (ex.: planos_preventivos).
- Tabela de itens/componentes filhos (ex.: atividades, serviços, checklist, materiais planejados).
- Tabela de execução/histórico (ex.: execucoes).
- Vinculação clara com OS quando aplicável.

Padrão obrigatório em todas as tabelas:

- id UUID PK
- empresa_id UUID NOT NULL
- created_at, updated_at
- actor fields quando fizer sentido
- FKs explícitas e índices de consulta operacional

## 3.2 Camada de agenda única

- maintenance_schedule permanece como ponto central de programação (todos os módulos alimentam ela).
- Cada domínio mantém seus detalhes próprios, mas agenda e status ficam padronizados para visão única.

## 3.3 Camada de auditoria única

Padrão alvo:

- Escrita de auditoria apenas via RPC app_write_audit_log.
- Repositório único de eventos operacionais críticos em enterprise_audit_logs (ou tabela final definida, única).
- Encerrar escrita direta nas tabelas legadas de auditoria.

## 3.4 Camada analítica (BI-ready)

- Criar schema analytics com views materializadas/tabelas derivadas.
- Modelo estrela para Power BI:

  - fatos: fato_os, fato_execucoes, fato_paradas, fato_custos, fato_alertas
  - dimensões: dim_tempo, dim_equipamento, dim_empresa, dim_tipo_manutencao, dim_status

- ETL SQL interno (jobs agendados) para alimentar métricas sem sobrecarregar telas operacionais.

## 4) Aplicação da lógica de Preventivas para todos os módulos

A regra que você propôs vira template global:

1. Cada módulo terá um núcleo canônico (plano + execução + vínculos).
2. Dados correlatos dispersos serão absorvidos por estruturas consistentes do domínio.
3. Acesso para BI será por camada analytics, não por tabela operacional bruta.
4. Todas as mutações passam por política de permissão unificada + auditoria RPC.

## 5) Estratégia de reconstrução (sem dados reais: janela ideal)

## Fase 0 — Congelamento e baseline

- Congelar criação de novas migrations antigas.
- Definir baseline final do schema alvo.
- Gerar inventário de dependências frontend -> tabelas/RPC.

## Fase 1 — Schema canônico limpo

- Criar migration baseline única (v2) com:

  - empresas/profiles/user_roles/rbac
  - módulos operacionais padronizados
  - maintenance_schedule
  - auditoria única
  - analytics schema inicial

## Fase 2 — Segurança e governança

- RLS padronizada por empresa_id em 100% das tabelas operacionais.
- Policies por papel (USUARIO/ADMIN/MASTER_TI/SYSTEM_OWNER).
- Remoção de policies permissivas herdadas.

## Fase 3 — Serviços e edge functions

- Refatorar edge functions para o modelo canônico.
- Eliminar escrita em tabelas legadas de auditoria.
- Garantir que todos os fluxos críticos registrem eventos em padrão único.

## Fase 4 — Frontend adapter

- Ajustar hooks/serviços para apontar apenas para schema v2.
- Manter camada de compatibilidade temporária só se necessário.

## Fase 5 — BI layer

- Publicar views analíticas padronizadas.
- Validar extração no Power BI com dataset de teste.

## Fase 6 — Cutover e limpeza

- Drop definitivo de estruturas legadas.
- Trava para impedir reintrodução de tabelas antigas.
- Documentação técnica final + runbooks.

## 6) O que eu mudaria imediatamente

1. Unificar auditoria (prioridade máxima).
2. Criar dicionário de dados global por módulo (contrato canônico).
3. Padronizar naming de colunas e status em todos os módulos.
4. Consolidar agendamento em maintenance_schedule para todos os domínios.
5. Criar analytics schema desde o início da reconstrução.

## 7) Riscos e como mitigar

- Risco: reset total sem blueprint -> retrabalho.
  Mitigação: baseline v2 completo antes de recriar qualquer tabela.

- Risco: quebrar frontend por renomeações.
  Mitigação: mapa de compatibilidade e rollout por fases.

- Risco: regressão de segurança.
  Mitigação: suíte de testes de RLS/RBAC e smoke de permissões no pipeline.

## 8) Conclusão prática

Sim, sua estratégia funciona e este é o melhor momento para fazer (antes de dados reais).

A forma correta não é “uma tabela para tudo”, e sim:

- um banco único,
- arquitetura canônica por domínio,
- auditoria e segurança unificadas,
- e camada analytics pronta para BI.

Esse desenho entrega operação robusta agora e análise avançada depois.
