# Plano de Refatoracao DB Modular (2026-03-22)

## Diretriz executiva

Refatoracao orientada a modulos, sem destruicao imediata de legado, com migracao gradual e rollback garantido.

## 1) Congelamento do sistema (snapshot obrigatorio)

Antes de qualquer refatoracao estrutural:

1. Backup completo de dados (dump).
2. Export de schema atual (estrutura).
3. Snapshot do codigo da branch atual.

Isso define um ponto de rollback tecnico e operacional.

## 2) Estado atual observado (baseline)

- Inventario por introspecao remota:
  - 78 tabelas
  - 861 colunas
  - 129 chaves estrangeiras
  - 51 funcoes
- Login Owner continua bloqueado por erro interno de Auth:
  - /auth/v1/token retorna "Database error querying schema"
  - endpoint Edge de auth retorna falha upstream do provedor
- Conclusao: risco alto de drift interno no schema gerido pelo servico Auth.

## 3) Arquitetura alvo por modulos

### 3.1 Modulos principais

1. Empresas (fundacao multi-tenant)
2. Usuarios e Permissoes
3. Ativos (Tags)
4. Solicitacoes de Servico (SS)
5. Ordens de Servico (OS)
6. Planos de Manutencao
7. Historico e Auditoria
8. Indicadores (KPI)
9. Estoque e Pecas (fase futura)

### 3.2 Isolamento por modulo

- Cada modulo tera tabelas canonicas proprias (_v2 no periodo de transicao).
- Contratos de API por modulo (controller/service/repository) sem vazamento de regra para frontend.
- Integracao entre modulos por eventos, IDs de referencia e contratos versionados.

## 4) Padrao de dados obrigatorio

Todas as entidades de dominio multi-tenant devem adotar:

1. id (uuid)
2. empresa_id (obrigatorio quando aplicavel)
3. created_at
4. updated_at
5. deleted_at (soft delete)

Padroes adicionais:

- status controlado por dominio (enums canonicos por modulo)
- indices por acesso real (empresa_id + status + created_at)
- sem logica de negocio em frontend
- sem tabela generica "dados_gerais"

## 5) Relacionamentos canonicos essenciais

1. SS pode originar OS
2. OS deve referenciar TAG/Ativo
3. TAG pertence a uma empresa
4. Exclusao fisica direta deve ser excecao administrativa

## 6) Regra de migracao segura

Nunca iniciar por alteracao destrutiva de legado.

Fluxo padrao:

1. Criar tabela nova canonica
2. Backfill por lote com auditoria
3. Validar contagem, integridade e checksums
4. Trocar leitura/escrita para novo contrato
5. Desativar legado apos janela de seguranca

## 7) Ciclo por modulo (segredo da execucao)

Para cada modulo:

1. Definir contrato alvo
2. Criar estruturas _v2
3. Implementar API modular
4. Ajustar frontend para nova API
5. Testar e homologar
6. Migrar dados
7. Desativar antigo

## 8) Ambiente e governanca

Obrigatorio operar com ambientes separados:

1. banco_dev
2. banco_test
3. banco_prod

Regras de governanca:

- Sem refatoracao direta em producao.
- Gate de release por smoke test e checklist de RLS/FK.
- Toda migracao com plano de rollback.

## 9) Sequencia recomendada de refatoracao

1. Empresas
2. Usuarios e Permissoes
3. Ativos (Tags)
4. Solicitacoes
5. Ordens de Servico
6. Historico/Auditoria
7. Indicadores
8. Estoque/Pecas

## 10) Exemplo canonico SS -> OS

Tabela solicitacoes_servico:

- id
- empresa_id
- descricao
- prioridade
- status (aberta, em_analise, aprovada, rejeitada)
- solicitante_id

Tabela ordens_servico:

- id
- empresa_id
- solicitacao_id
- tag_id
- status (aberta, em_execucao, finalizada)
- tecnico_id

## 11) Problema estrutural ja evidenciado (FK acoplada)

Erros de foreign key em exclusoes e migracoes indicam alto acoplamento entre tabelas legadas.

Diretriz:

- Priorizar soft delete
- Cascata controlada somente em fronteiras bem definidas
- Evitar delecao direta em cadeia como estrategia padrao

## 12) Estrutura backend alvo

Padrao por modulo:

- controller
- service
- repository
- model

Diretorio alvo:

- /modules/empresas
- /modules/usuarios
- /modules/ativos
- /modules/solicitacoes
- /modules/ordens

## 13) Acao imediata (execucao)

1. Executar congelamento com snapshot completo.
2. Fechar ADR de arquitetura modular e contratos por modulo.
3. Iniciar modulo Empresas v2 como piloto (base multi-tenant).
4. Iniciar modulo Usuarios/Permissoes v2 em seguida.
5. So depois avancar para Ativos -> SS -> OS.

## 14) Criterio de sucesso

1. Login e contexto tenant estaveis em nova fundacao.
2. Nenhum modulo novo depende de tabela legada para regra critica.
3. RLS e empresa_id obrigatorios aplicados em 100% das tabelas multi-tenant novas.
4. Cutover por modulo concluido com rollback testado.
