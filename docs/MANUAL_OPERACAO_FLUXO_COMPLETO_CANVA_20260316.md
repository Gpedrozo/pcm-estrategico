# MANUAL DE OPERACAO COMPLETO - FLUXO PONTA A PONTA DO SISTEMA

Versao: 1.0  
Data: 16/03/2026  
Objetivo: texto-base completo para gerar manual visual no Canva (apresentacao, apostila ou playbook operacional).

---

## 1) O QUE ESTE MANUAL COBRE

Este manual descreve o fluxo completo de uso do sistema, simulando a jornada real do usuario final desde o acesso ate o fechamento gerencial:

1. acesso e validacao de perfil
2. abertura de solicitacao
3. analise de backlog e priorizacao
4. emissao de O.S
5. execucao e fechamento de O.S
6. consulta de historico e filtros
7. planejamento (programacao, preventiva, preditiva, lubrificacao, inspecoes)
8. analises tecnicas (FMEA/RCM, RCA, IA, melhorias)
9. cadastros base (hierarquia, equipamentos, mecanicos, materiais, fornecedores, contratos, documentos)
10. relatorios e custos
11. SSMA
12. suporte, administracao e auditoria
13. governanca operacional de rotina

---

## 2) PERFIS E RESPONSABILIDADES

### SOLICITANTE
- abre solicitacoes.
- acompanha status da demanda.
- valida retorno do atendimento.

### USUARIO
- opera modulos de manutencao e planejamento.
- emite e fecha O.S conforme permissao.
- executa filtros, analises e registros tecnicos.

### ADMIN
- tudo do usuario.
- administracao do tenant (usuarios, auditoria, configuracoes da empresa).
- apoio de governanca e padronizacao operacional.

### MASTER_TI
- perfil tecnico elevado.
- suporte tecnico, auditoria avancada e controle de configuracoes sensiveis.

---

## 3) JORNADA MACRO (PONTA A PONTA)

1. Login no tenant correto e validacao do menu por perfil.
2. Registro da demanda em Solicitacoes com TAG, urgencia e impacto.
3. Triagem no Backlog para priorizar o que vira O.S.
4. Emissao da O.S com escopo tecnico e prioridade.
5. Execucao de campo e apontamentos operacionais.
6. Fechamento tecnico com horas, materiais, custos e evidencias.
7. Historico com filtros para medir desempenho e reincidencia.
8. Planejamento para reduzir reatividade (preventiva/preditiva/programacao).
9. Analises de confiabilidade e melhoria continua.
10. Consolidacao em custos e relatorios para decisao gerencial.

---

## 4) FLUXO OPERACIONAL DETALHADO POR MODULO

## 4.1 Acesso ao sistema (Login)

### Objetivo
Garantir que o usuario entre no ambiente correto, com perfil correto e sessao valida.

### Passo a passo
1. Acessar a URL do tenant.
2. Informar email e senha.
3. Clicar em Entrar.
4. Validar se Dashboard e menu lateral foram carregados.

### Checklist de sucesso
- nome do usuario visivel no sistema.
- modulos permitidos aparecem no menu.
- nao ocorre redirecionamento indevido para login.

### Erros comuns
- usar dominio incorreto (owner x tenant).
- credencial com espaco extra.
- perfil sem permissao para o modulo desejado.

---

## 4.2 Solicitacoes

### Objetivo
Registrar corretamente a necessidade de manutencao para triagem e SLA.

### Campos essenciais
- TAG do equipamento.
- urgencia (emergencial, urgente, programavel).
- descricao tecnica da falha.
- impacto operacional.

### Passo a passo
1. Abrir menu Solicitacoes.
2. Selecionar TAG correta.
3. Registrar sintoma observavel e impacto.
4. Definir urgencia.
5. Salvar.

### Resultado esperado
- solicitacao criada e visivel na fila.
- classificacao coerente com risco.

---

## 4.3 Backlog

### Objetivo
Priorizar carteira pendente com criterio tecnico e risco.

### Passo a passo
1. Abrir Backlog.
2. Filtrar por prioridade, status e periodo.
3. Destacar itens criticos e vencidos.
4. Definir acao: emitir O.S, reprogramar ou bloquear por dependencia.

### Resultado esperado
- fila do turno definida.
- dono e prazo por item critico.

---

## 4.4 Emitir O.S

### Objetivo
Transformar demanda em ordem executavel.

### Campos essenciais
- origem da demanda (solicitacao ou abertura direta).
- tipo (corretiva, preventiva, preditiva, inspecao, melhoria).
- prioridade.
- escopo tecnico.

### Passo a passo
1. Abrir Emitir O.S.
2. Selecionar TAG e tipo.
3. Definir prioridade e dados operacionais.
4. Descrever escopo claro.
5. Salvar e gerar numero da O.S.

### Resultado esperado
- O.S emitida e pronta para execucao.

---

## 4.5 Fechar O.S

### Objetivo
Encerrar O.S com rastreabilidade tecnica e financeira.

### Campos essenciais
- hora inicio/fim.
- executante.
- servico realizado.
- materiais usados.
- custo de mao de obra, material e terceiros.
- RCA (quando corretiva e aplicavel).

### Passo a passo
1. Abrir Fechar O.S.
2. Selecionar ordem em execucao.
3. Preencher apontamentos reais.
4. Registrar evidencias e custo.
5. Concluir fechamento.

### Resultado esperado
- O.S em status fechado.
- custos atualizados.
- historico completo para auditoria.

---

## 4.6 Historico O.S + Filtros

### Objetivo
Analisar desempenho de manutencao com dados historicos.

### Filtros recomendados
- periodo.
- status.
- TAG/equipamento.
- prioridade.
- tipo de manutencao.

### Passo a passo
1. Abrir Historico O.S.
2. Aplicar filtros por pergunta de negocio.
3. Avaliar lead time, reincidencia e custo por ativo.
4. Exportar/compartilhar conclusoes.

### Resultado esperado
- decisoes de backlog e planejamento baseadas em dados.

---

## 4.7 Programacao

### Objetivo
Planejar semana de manutencao com capacidade real da equipe.

### Passo a passo
1. Selecionar semana.
2. Priorizar ordens por risco e vencimento.
3. Alocar por equipe/turno.
4. Confirmar cobertura de ordens criticas.

---

## 4.8 Preventiva

### Objetivo
Manter rotinas preventivas ativas e aderentes.

### Passo a passo
1. Criar/editar plano preventivo.
2. Definir atividades e periodicidade.
3. Ativar plano e vincular ao calendario.
4. Registrar execucoes e atrasos.

---

## 4.9 Preditiva

### Objetivo
Antecipar falhas por condicao operacional.

### Passo a passo
1. Registrar medicao por TAG.
2. Monitorar classificacao de alerta.
3. Tratar alertas ativos.
4. Converter risco em acao formal (O.S/RCA).

---

## 4.10 Lubrificacao

### Objetivo
Garantir rotinas de lubrificacao e vida util dos ativos.

### Passo a passo
1. Cadastrar plano de lubrificacao.
2. Definir frequencia e pontos.
3. Executar e registrar atendimento.
4. Ajustar plano conforme historico.

---

## 4.11 Inspecoes

### Objetivo
Executar verificacoes padronizadas de campo para deteccao precoce.

### Passo a passo
1. Abrir roteiro de inspecao.
2. Registrar condicao encontrada.
3. Sinalizar anomalia.
4. Encaminhar para solicitacao/O.S quando necessario.

---

## 4.12 FMEA/RCM

### Objetivo
Mapear modos de falha e reforcar estrategia de manutencao.

### Passo a passo
1. Definir ativo/processo.
2. Identificar modo de falha.
3. Avaliar severidade, ocorrencia e deteccao.
4. Priorizar acao preventiva.

---

## 4.13 RCA

### Objetivo
Eliminar causa raiz de falhas recorrentes.

### Passo a passo
1. Definir problema.
2. Investigar causa raiz (5 porques, Ishikawa etc).
3. Definir acao corretiva.
4. Validar eficacia no periodo.

---

## 4.14 Inteligencia IA

### Objetivo
Apoiar diagnostico tecnico e priorizacao de investigacoes.

### Passo a passo
1. Selecionar contexto do problema.
2. Rodar analise assistida.
3. Revisar recomendacoes.
4. Converter em plano de acao tecnico.

---

## 4.15 Melhorias

### Objetivo
Registrar e acompanhar melhorias de confiabilidade e custo.

### Passo a passo
1. Abrir proposta de melhoria.
2. Definir ganho esperado.
3. Nomear dono e prazo.
4. Acompanhar implementacao.

---

## 4.16 Cadastros estruturais

### Modulos
- Hierarquia
- Equipamentos
- Mecanicos
- Materiais
- Fornecedores
- Contratos
- Documentos

### Objetivo
Garantir base de dados consistente para toda a operacao.

### Regra geral
todo cadastro deve ter padrao de nomenclatura, dono do dado e revisao periodica.

---

## 4.17 Custos e Relatorios

### Objetivo
Consolidar visao tecnica-financeira para decisao.

### Passo a passo
1. Selecionar periodo.
2. Avaliar custos por categoria.
3. Cruzar com MTBF, MTTR, backlog e reincidencia.
4. Definir plano de acao gerencial.

---

## 4.18 SSMA

### Objetivo
Registrar incidentes e controlar permissao de trabalho.

### Passo a passo
1. Registrar incidente/quase incidente.
2. Definir severidade e controles.
3. Abrir permissao de trabalho quando aplicavel.
4. Encerrar com tratativa documentada.

---

## 4.19 Administracao e Governanca

### Usuarios
- revisar acessos periodicamente.
- ajustar perfil por funcao.

### Auditoria
- consultar trilha por periodo, usuario e acao.
- registrar tratativa de desvios.

### Configuracoes da empresa
- manter parametros do tenant atualizados.
- revisar politicas operacionais e de sessao.

### Suporte
- abrir chamados com contexto tecnico e evidencia.

---

## 5) ROTINA OPERACIONAL RECOMENDADA (DIARIA/SEMANAL/MENSAL)

### Diario
1. login e checagem do dashboard.
2. triagem de solicitacoes.
3. priorizacao de backlog.
4. emissao e fechamento de O.S.
5. fechamento de pendencias criticas.

### Semanal
1. revisar programacao.
2. validar aderencia preventiva e alertas preditivos.
3. analisar historico da semana.
4. revisar melhorias e SSMA.

### Mensal
1. consolidar custos e relatorios.
2. revisar indicadores de confiabilidade.
3. auditoria de acessos e trilhas.
4. plano de acao para o proximo ciclo.

---

## 6) INDICADORES-CHAVE (KPIs)

- MTBF
- MTTR
- Disponibilidade
- Aderencia preventiva
- Backlog vencido
- Tempo medio de atendimento
- Custo por ativo
- Taxa de reincidencia de falhas

---

## 7) CHECKLIST DE QUALIDADE DE REGISTRO

Antes de encerrar qualquer processo, validar:

1. TAG correta.
2. descricao tecnica objetiva.
3. prioridade coerente.
4. tempo e custos apontados.
5. evidencias registradas.
6. responsavel definido.
7. proxima acao clara.

---

## 8) PROMPT PRONTO PARA COLAR NO CANVA

Use exatamente o texto abaixo no Canva AI para gerar um manual visual:

"Crie um Manual de Operacao Industrial completo, com visual corporativo moderno, em portugues do Brasil, com foco em manutencao e PCM. Estruture em secoes: Acesso/Login, Solicitacoes, Backlog, Emissao de OS, Fechamento de OS, Historico e Filtros, Programacao, Preventiva, Preditiva, Lubrificacao, Inspecoes, FMEA/RCM, RCA, IA, Melhorias, Cadastros, Custos/Relatorios, SSMA, Usuarios/Auditoria/Configuracoes. Para cada secao, apresentar: objetivo, quando usar, passo a passo operacional, checklist de validacao, erros comuns e boa pratica. Incluir pagina de rotina diaria/semanal/mensal e pagina final com KPIs. Linguagem pratica, direta e executavel para equipes de manutencao." 

---

## 9) OBSERVACAO IMPORTANTE

Este manual foi estruturado com base no fluxo real dos modulos atualmente disponiveis no sistema, para ser usado como base operacional e tambem como roteiro de producao visual no Canva.
