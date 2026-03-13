<!-- markdownlint-disable MD032 MD029 -->

# Plano de Hardening Multi-Tenant por Modulo (SaaS)

Data: 2026-03-12
Objetivo: isolamento total por empresa, auditoria completa por empresa_id e governanca de acesso por perfil.

## 1. Decisao arquitetural principal

Nao recomendamos apagar todas as tabelas em producao e recriar do zero.

Recomendacao:
1. Fazer migracao estruturada e incremental com scripts versionados.
2. Manter o sistema operando enquanto corrigimos schema, RLS e auditoria.
3. Reservar recriacao do zero apenas para ambiente novo (greenfield) ou quando houver janela de migracao com zero clientes ativos.

Motivo:
1. Risco alto de perda de historico, contratos e rastreabilidade.
2. Risco de indisponibilidade longa e regressao funcional.
3. O ganho tecnico pode ser obtido com refatoracao segura em fases.

## 2. Regra de ouro para empresa_id

Nem toda tabela precisa empresa_id.

Modelo correto:
1. Data Plane (dados de negocio por cliente): obrigatorio ter empresa_id, RLS e auditoria.
2. Control Plane (plataforma global): pode nao ter empresa_id, mas toda acao deve registrar empresa_id alvo quando aplicavel.

Exemplos:
1. Tabelas tenant: ordens, equipamentos, historicos, configuracoes por empresa, documentos por empresa.
2. Tabelas globais: catalogo de planos, tabela de empresas, tabelas de metrica global, tabela de owners.

Regra operacional:
1. Se a linha pertence a uma empresa, empresa_id obrigatorio, NOT NULL e indexado.
2. Se a linha e global, nao usa empresa_id na propria tabela, mas eventos de mudanca devem levar empresa_id no log quando houver alvo de tenant.

## 3. Admin_TI da empresa

Padrao de provisionamento ao criar empresa:
1. Criar usuario Admin_TI da empresa.
2. Vincular esse usuario a empresa_id.
3. Conceder papel TENANT_ADMIN apenas para o proprio tenant.
4. Impedir escopo global para esse perfil.

Permissoes do Admin_TI:
1. Pode administrar usuarios, configuracoes e operacao da propria empresa.
2. Nao pode consultar ou alterar dados de outra empresa.
3. Nao pode operar funcoes owner/master da plataforma.

## 4. Auditoria obrigatoria de tudo

Toda movimentacao relevante deve gerar log com:
1. empresa_id.
2. user_id.
3. actor_role.
4. modulo.
5. acao.
6. entidade.
7. entidade_id.
8. before_data.
9. after_data.
10. ip.
11. user_agent.
12. correlation_id.
13. created_at.

Regras:
1. Write path obrigatorio por backend seguro (edge function ou RPC securizada).
2. Nao confiar em auditoria apenas no frontend.
3. Trigger de auditoria para tabelas criticas.
4. Logs imutaveis e retention definida.

## 5. Checklist tecnico de isolamento perfeito

Banco de dados:
1. empresa_id UUID NOT NULL em todas as tabelas tenant.
2. FK para empresas(id) quando aplicavel.
3. Indices compostos por tenant para consulta e unicidade.
4. FKs compostas com empresa_id para evitar referencia cruzada entre tenants.

RLS:
1. RLS habilitada em 100 por cento das tabelas tenant.
2. Policy tenant_isolation para SELECT, INSERT, UPDATE, DELETE.
3. Policy owner/master somente para funcoes globais controladas.
4. Proibir policies permissivas do tipo USING true.

Backend:
1. Todo endpoint deve receber contexto de tenant e validar permissao.
2. Nao aceitar empresa_id vindo do frontend sem validacao de autorizacao.
3. Padrao de middleware para tenant context em todas as rotas.
4. Operacoes owner com trilha de auditoria obrigatoria.

Frontend:
1. Contexto de empresa_id em toda navegacao de tenant.
2. Nunca montar consultas diretas sem filtro tenant.
3. Operacoes sensiveis com confirmacao e motivo.

Testes:
1. Testes A versus B para todos os modulos.
2. Teste de criacao, leitura, alteracao e exclusao por tenant.
3. Teste de negativa: usuario de empresa B nao pode ver nada da A.
4. Teste de auditoria: cada acao gera log com empresa_id correto.

## 6. Analise por modulo na ordem do menu Tenant

Referencia de menu atual em sidebar:
Dashboard, Solicitacoes, Backlog, Emitir O.S, Fechar O.S, Historico, Lubrificacao, Programacao, Preventiva, Preditiva, Inspecoes, FMEA/RCM, Causa Raiz, Inteligencia IA, Melhorias, Hierarquia, Equipamentos, Mecanicos, Materiais, Fornecedores, Contratos, Documentos, Custos, Relatorios, SSMA, Manuais de Operacao, Config. Empresa, Usuarios, Auditoria, Arquivos Owner.

Para cada modulo:
1. Garantir empresa_id nas tabelas de negocio.
2. Garantir RLS completa.
3. Garantir evento de auditoria por acao.
4. Garantir testes A versus B.

1) Dashboard
- Risco: metricas agregadas sem filtro tenant.
- Ajuste: todas as consultas devem filtrar por empresa_id.
- Auditoria: registrar acesso a indicadores sensiveis.

2) Solicitacoes
- Risco: abertura de solicitacao em tenant errado.
- Ajuste: empresa_id derivada da sessao, nunca apenas do payload.
- Auditoria: create, update status, atribuicao.

3) Backlog
- Risco: backlog global misturando empresas.
- Ajuste: filas e SLA por tenant.
- Auditoria: mudanca de prioridade e replanejamento.

4) Emitir O.S
- Risco: O.S associada a ativo de outro tenant.
- Ajuste: validar FK composta por empresa_id.
- Auditoria: criacao completa da O.S.

5) Fechar O.S
- Risco: fechamento cruzado.
- Ajuste: validar ownership da O.S pelo tenant.
- Auditoria: fechamento, apontamentos, anexos.

6) Historico
- Risco: busca sem tenant scope.
- Ajuste: filtros obrigatorios por empresa_id.
- Auditoria: exportacoes e visualizacao sensivel.

7) Lubrificacao
- Risco: planos compartilhados indevidamente.
- Ajuste: plano, execucao e roteiros com empresa_id.
- Auditoria: criacao de plano e execucao.

8) Programacao
- Risco: agenda global cruzada.
- Ajuste: calendarios por tenant.
- Auditoria: alteracoes de agenda.

9) Preventiva
- Risco: templates sem segregacao.
- Ajuste: plano preventivo por empresa_id.
- Auditoria: aprovacao e revisao de planos.

10) Preditiva
- Risco: sinais de sensores misturados.
- Ajuste: origem de telemetria vinculada ao tenant.
- Auditoria: alteracao de limiares e regras.

11) Inspecoes
- Risco: checklists globais sem controle.
- Ajuste: versao de checklist por tenant.
- Auditoria: execucao e nao conformidade.

12) FMEA/RCM
- Risco: biblioteca compartilhada sem escopo.
- Ajuste: estudos por tenant ou template global com copia.
- Auditoria: alteracao de severidade, ocorrencia, deteccao.

13) Causa Raiz
- Risco: casos acessiveis entre tenants.
- Ajuste: caso e evidencias com empresa_id.
- Auditoria: decisao final e acoes corretivas.

14) Inteligencia IA
- Risco: vazamento de contexto no prompt.
- Ajuste: context window apenas com dados do tenant.
- Auditoria: prompts, respostas e fontes consultadas.

15) Melhorias
- Risco: iniciativas intertenant sem controle.
- Ajuste: projeto de melhoria por tenant.
- Auditoria: aprovacao e mudanca de status.

16) Hierarquia
- Risco: plantas e areas compartilhadas.
- Ajuste: arvore de ativos por empresa_id.
- Auditoria: alteracoes estruturais.

17) Equipamentos
- Risco: ativo referenciado por outra empresa.
- Ajuste: indices unicos por empresa_id.
- Auditoria: cadastro, edicao, inativacao.

18) Mecanicos
- Risco: usuarios operacionais cruzando empresa.
- Ajuste: vinculo usuario-empresa obrigatório.
- Auditoria: atribuicoes e mudancas de funcao.

19) Materiais
- Risco: estoque consolidado entre tenants.
- Ajuste: saldo por empresa_id e deposito por tenant.
- Auditoria: entradas, saidas, ajustes.

20) Fornecedores
- Risco: fornecedor global sem consentimento.
- Ajuste: registro por tenant ou catalogo global com vinculo controlado.
- Auditoria: homologacao e bloqueio.

21) Contratos
- Risco: contrato visivel fora do tenant.
- Ajuste: contrato com empresa_id e assinatura segregada.
- Auditoria: versoes e renovacoes.

22) Documentos
- Risco: bucket/caminho sem namespace tenant.
- Ajuste: storage path por empresa_id.
- Auditoria: upload, download, exclusao.

23) Custos
- Risco: agregacao financeira global.
- Ajuste: centro de custo por tenant.
- Auditoria: alteracao de valores e aprovacoes.

24) Relatorios
- Risco: export sem filtro tenant.
- Ajuste: parametros com empresa_id obrigatorio.
- Auditoria: exportacoes e compartilhamentos.

25) SSMA
- Risco: incidentes sensiveis vazando entre tenants.
- Ajuste: ocorrencias e planos de acao por tenant.
- Auditoria: investigacoes e conclusoes.

26) Manuais de Operacao
- Risco: personalizacao visual cruzada.
- Ajuste: tema e templates por empresa_id.
- Auditoria: alteracoes de layout e conteudo.

27) Config. Empresa
- Risco: alteracao global acidental.
- Ajuste: config em tabela tenant com chave por empresa_id.
- Auditoria: before e after completo.

28) Usuarios
- Risco: convite para tenant errado.
- Ajuste: membership table com empresa_id obrigatorio.
- Auditoria: convite, mudanca de papel, bloqueio.

29) Auditoria
- Risco: trilha incompleta.
- Ajuste: centralizar eventos de todos os modulos.
- Auditoria: autoauditoria de consultas sensiveis.

30) Arquivos Owner
- Risco: owner enxergar arquivos sem trilha.
- Ajuste: acesso privilegiado com justificativa obrigatoria.
- Auditoria: who, why, what, when.

## 7. Analise por modulo do portal Owner

Menu owner atual:
Dashboard, Empresas, Usuarios, Planos, Assinaturas, Contratos, Auditoria, Sistema, Suporte, Financeiro, Feature Flags, Monitoramento, Logs, Configuracoes, Owner Master.

Foco de tenant:
1. Empresas e Sistema: operacoes de lifecycle e limpeza por empresa com transacao e auditoria.
2. Usuarios e Owner Master: segregacao forte entre papeis globais e papeis tenant.
3. Monitoramento e Logs: toda visualizacao com empresa_id alvo quando aplicavel.
4. Feature Flags e Configuracoes: escopo por empresa e fallback global explicito.

## 8. Plano de execucao recomendado

Fase 1: Inventario e classificacao
1. Listar todas as tabelas em tenant data plane versus control plane.
2. Marcar gaps de empresa_id, RLS, FK e auditoria.
3. Gerar backlog tecnico por severidade.

Fase 2: Seguranca de dados
1. Corrigir empresa_id, indices e constraints.
2. Corrigir policies RLS para todas as tabelas tenant.
3. Bloquear consultas sem contexto tenant.

Fase 3: Auditoria total
1. Padronizar schema de auditoria.
2. Criar triggers para tabelas criticas.
3. Garantir correlation_id ponta a ponta.

Fase 4: Modulos e testes A versus B
1. Executar checklist modulo a modulo na ordem do menu.
2. Criar suite automatizada de isolamento tenant.
3. Aprovar modulo somente com 100 por cento dos testes tenant.

Fase 5: Go-live seguro
1. Publicar por ondas com feature flags.
2. Monitorar vazamento intertenant com alertas.
3. Plano de rollback por migracao.

## 9. Decisao sobre recriar banco do zero

Recomendacao final:
1. Producao: nao apagar tudo.
2. Homologacao paralela: pode criar banco novo modelo ideal e validar migracao.
3. Se o objetivo for perfeicao estrutural, usar estrategia dual-track:
   - Track A: hardening incremental no banco atual.
   - Track B: schema alvo v2 em paralelo para migracao assistida.

Essa estrategia entrega seguranca imediata e prepara evolucao sem parar a operacao.
