# Plano de ReconstruÃ§Ã£o Global do Backend (Todos os MÃ³dulos)

Data: 2026-03-02
Escopo: aplicar a lÃ³gica de consolidaÃ§Ã£o estrutural em todos os mÃ³dulos (preventiva, lubrificaÃ§Ã£o, inspeÃ§Ã£o, preditiva, OS, contratos, SSMA, FMEA, RCA, etc.)

## 1) Diretriz central

A ideia de concentrar dados para anÃ¡lise estÃ¡ correta, mas com uma observaÃ§Ã£o tÃ©cnica importante:

- NÃ£o usar uma Ãºnica tabela gigante para tudo (isso piora integridade e manutenÃ§Ã£o).

- Usar um Ãºnico banco (Postgres/Supabase) com modelo canÃ´nico por domÃ­nio + camada analÃ­tica para BI.

Resultado esperado:

- OLTP limpo e consistente para operaÃ§Ã£o diÃ¡ria.

- Camada analÃ­tica pronta para Power BI sem retrabalho.

- SeguranÃ§a multi-tenant preservada por empresa_id + RLS.

## 2) DiagnÃ³stico resumido do estado atual

### 2.1 Pontos fortes jÃ¡ existentes

- Base multi-tenant com empresa_id em grande parte das tabelas.

- RLS e RBAC jÃ¡ evoluÃ­dos (has_permission e perfis globais).

- Agenda central maintenance_schedule jÃ¡ criada.

- Trilha de auditoria avanÃ§ando para padrÃ£o RPC.

### 2.2 Principais problemas detectados

- CoexistÃªncia de trilhas de auditoria antigas e novas (auditoria, auditoria_logs, audit_logs, enterprise_audit_logs).

- Parte do frontend ainda depende da tabela legada auditoria.

- FunÃ§Ãµes edge com acoplamentos legados (ex.: generate-preventive-os escreve em auditoria).

- PolÃ­ticas antigas permissivas (USING true) ainda aparecem no histÃ³rico e precisam baseline Ãºnico.

- Migrations com histÃ³rico acumulado e drift corrigido, mas com legado residual.

## 3) Arquitetura alvo (padrÃ£o para todos os mÃ³dulos)

## 3.1 Camada operacional (OLTP)

PadrÃ£o por mÃ³dulo:

- Tabela de plano/configuraÃ§Ã£o (ex.: planos_preventivos).

- Tabela de itens/componentes filhos (ex.: atividades, serviÃ§os, checklist, materiais planejados).

- Tabela de execuÃ§Ã£o/histÃ³rico (ex.: execucoes).

- VinculaÃ§Ã£o clara com OS quando aplicÃ¡vel.

PadrÃ£o obrigatÃ³rio em todas as tabelas:

- id UUID PK

- empresa_id UUID NOT NULL

- created_at, updated_at

- actor fields quando fizer sentido

- FKs explÃ­citas e Ã­ndices de consulta operacional

## 3.2 Camada de agenda Ãºnica

- maintenance_schedule permanece como ponto central de programaÃ§Ã£o (todos os mÃ³dulos alimentam ela).

- Cada domÃ­nio mantÃ©m seus detalhes prÃ³prios, mas agenda e status ficam padronizados para visÃ£o Ãºnica.

## 3.3 Camada de auditoria Ãºnica

PadrÃ£o alvo:

- Escrita de auditoria apenas via RPC app_write_audit_log.

- RepositÃ³rio Ãºnico de eventos operacionais crÃ­ticos em enterprise_audit_logs (ou tabela final definida, Ãºnica).

- Encerrar escrita direta nas tabelas legadas de auditoria.

## 3.4 Camada analÃ­tica (BI-ready)

- Criar schema analytics com views materializadas/tabelas derivadas.

- Modelo estrela para Power BI:

  - fatos: fato_os, fato_execucoes, fato_paradas, fato_custos, fato_alertas

  - dimensÃµes: dim_tempo, dim_equipamento, dim_empresa, dim_tipo_manutencao, dim_status

- ETL SQL interno (jobs agendados) para alimentar mÃ©tricas sem sobrecarregar telas operacionais.

## 4) AplicaÃ§Ã£o da lÃ³gica de Preventivas para todos os mÃ³dulos

A regra que vocÃª propÃ´s vira template global:

1. Cada mÃ³dulo terÃ¡ um nÃºcleo canÃ´nico (plano + execuÃ§Ã£o + vÃ­nculos).

1. Dados correlatos dispersos serÃ£o absorvidos por estruturas consistentes do domÃ­nio.

1. Acesso para BI serÃ¡ por camada analytics, nÃ£o por tabela operacional bruta.

1. Todas as mutaÃ§Ãµes passam por polÃ­tica de permissÃ£o unificada + auditoria RPC.

## 5) EstratÃ©gia de reconstruÃ§Ã£o (sem dados reais: janela ideal)

## Fase 0 â€” Congelamento e baseline

- Congelar criaÃ§Ã£o de novas migrations antigas.

- Definir baseline final do schema alvo.

- Gerar inventÃ¡rio de dependÃªncias frontend -> tabelas/RPC.

## Fase 1 â€” Schema canÃ´nico limpo

- Criar migration baseline Ãºnica (v2) com:

  - empresas/profiles/user_roles/rbac

  - mÃ³dulos operacionais padronizados

  - maintenance_schedule

  - auditoria Ãºnica

  - analytics schema inicial

## Fase 2 â€” SeguranÃ§a e governanÃ§a

- RLS padronizada por empresa_id em 100% das tabelas operacionais.

- Policies por papel (USUARIO/ADMIN/MASTER_TI/SYSTEM_OWNER).

- RemoÃ§Ã£o de policies permissivas herdadas.

## Fase 3 â€” ServiÃ§os e edge functions

- Refatorar edge functions para o modelo canÃ´nico.

- Eliminar escrita em tabelas legadas de auditoria.

- Garantir que todos os fluxos crÃ­ticos registrem eventos em padrÃ£o Ãºnico.

## Fase 4 â€” Frontend adapter

- Ajustar hooks/serviÃ§os para apontar apenas para schema v2.

- Manter camada de compatibilidade temporÃ¡ria sÃ³ se necessÃ¡rio.

## Fase 5 â€” BI layer

- Publicar views analÃ­ticas padronizadas.

- Validar extraÃ§Ã£o no Power BI com dataset de teste.

## Fase 6 â€” Cutover e limpeza

- Drop definitivo de estruturas legadas.

- Trava para impedir reintroduÃ§Ã£o de tabelas antigas.

- DocumentaÃ§Ã£o tÃ©cnica final + runbooks.

## 6) O que eu mudaria imediatamente

1. Unificar auditoria (prioridade mÃ¡xima).

1. Criar dicionÃ¡rio de dados global por mÃ³dulo (contrato canÃ´nico).

1. Padronizar naming de colunas e status em todos os mÃ³dulos.

1. Consolidar agendamento em maintenance_schedule para todos os domÃ­nios.

1. Criar analytics schema desde o inÃ­cio da reconstruÃ§Ã£o.

## 7) Riscos e como mitigar

- Risco: reset total sem blueprint -> retrabalho.

  MitigaÃ§Ã£o: baseline v2 completo antes de recriar qualquer tabela.

- Risco: quebrar frontend por renomeaÃ§Ãµes.

  MitigaÃ§Ã£o: mapa de compatibilidade e rollout por fases.

- Risco: regressÃ£o de seguranÃ§a.

  MitigaÃ§Ã£o: suÃ­te de testes de RLS/RBAC e smoke de permissÃµes no pipeline.

## 8) ConclusÃ£o prÃ¡tica

Sim, sua estratÃ©gia funciona e este Ã© o melhor momento para fazer (antes de dados reais).

A forma correta nÃ£o Ã© â€œuma tabela para tudoâ€, e sim:

- um banco Ãºnico,

- arquitetura canÃ´nica por domÃ­nio,

- auditoria e seguranÃ§a unificadas,

- e camada analytics pronta para BI.

Esse desenho entrega operaÃ§Ã£o robusta agora e anÃ¡lise avanÃ§ada depois.
