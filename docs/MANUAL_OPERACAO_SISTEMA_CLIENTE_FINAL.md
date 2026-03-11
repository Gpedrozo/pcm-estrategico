# MANUAL DE OPERAÇÃO DO SISTEMA (CLIENTE FINAL)

Versão: 1.0  
Público-alvo: usuários de operação, manutenção, planejamento e administração do tenant  
Base: funcionalidades existentes no sistema atual (frontend + integrações em produção)

---

## 1) Visão geral

Este sistema organiza o ciclo completo de manutenção industrial, incluindo:

- abertura de solicitações;
- emissão e fechamento de ordens de serviço (O.S);
- controle de equipamentos e materiais;
- planejamento preventiva/preditiva/lubrificação;
- inspeções de rota;
- relatórios e indicadores.

O menu lateral é separado por áreas: **Ordens de Serviço, Planejamento, Análises, Cadastros, Relatórios, Segurança e Administração**.

---

## 2) Acesso ao sistema

### 2.1 Login

1. Acesse a tela de login.
2. Informe **email** e **senha**.
3. Clique em **Entrar**.

### 2.2 Perfis de acesso

- **USUARIO**: uso operacional geral.
- **ADMIN**: acesso administrativo adicional (Usuários, Auditoria, Configurações da Empresa, Arquivos Owner).
- **MASTER_TI**: perfil técnico de alta permissão (conforme política interna).

### 2.3 Sessão e logout por inatividade

- O sistema possui logout manual pelo botão **Sair** no rodapé do menu.
- Existe também **logout automático por inatividade**, configurável por empresa no portal Owner.
- Quando o tempo limite é atingido sem atividade, a sessão é encerrada automaticamente.

### 2.4 Recuperação de senha

**Funcionalidade em desenvolvimento**  
No tenant, a tela de login atual não expõe fluxo de “esqueci minha senha” para usuário final.

---

## 3) Dashboard (visão gerencial)

A tela **Dashboard** apresenta indicadores e atalhos:

- O.S abertas, em andamento e fechadas;
- tempo médio de execução;
- KPIs (MTBF, MTTR, disponibilidade e aderência preventiva);
- evolução de custos;
- backlog e urgências;
- distribuição de O.S por tipo e por status;
- ação rápida para abrir nova O.S.

### Boas práticas do dashboard

- Use o dashboard no início do turno para priorização.
- Monitore backlog semanal para evitar acúmulo de pendências.

---

## 4) Gestão de usuários

Menu: **Administração > Usuários** (somente ADMIN).

### O que é possível fazer

- pesquisar usuários por nome;
- editar **nome**;
- alterar **perfil** (Usuário/Administrador/Master TI).

### Limitação atual na Gestão de usuários

- Não há criação direta de usuário nessa tela do tenant.
- Não há troca de senha nessa tela.

---

## 5) Equipamentos

Menu: **Cadastros > Equipamentos**.

### O que o módulo permite

- cadastrar equipamento com TAG, nome, criticidade, risco, localização, fabricante, modelo, número de série e vínculo de sistema;
- editar e excluir equipamentos;
- visualizar detalhes;
- gerenciar componentes vinculados ao equipamento;
- importar equipamentos via planilha e baixar modelo de importação.

### Campos essenciais recomendados

- TAG padronizada;
- nome claro do ativo;
- criticidade e nível de risco coerentes;
- sistema/localização para facilitar filtros e relatórios.

---

## 6) Peças e materiais (estoque)

Menu: **Cadastros > Materiais**.

### Funcionalidades

- cadastro de materiais (código, nome, unidade, custo, estoque atual/mínimo, localização);
- edição e inativação/exclusão (conforme permissão);
- movimentação de **entrada** e **saída**;
- histórico de movimentações;
- alerta visual para baixo estoque.

### Boas práticas de estoque

- mantenha estoque mínimo realista por criticidade de item;
- registre motivo em movimentações para rastreabilidade.

---

## 7) Solicitações e Ordens de Serviço

## 7.1 Solicitações

Menu: **Ordens de Serviço > Solicitações**.

Permite registrar demanda com:

- TAG do equipamento;
- solicitante e setor;
- descrição da falha;
- impacto e classificação.

A classificação já aplica SLA padrão:

- **Emergencial**: 2h
- **Urgente**: 8h
- **Programável**: 72h

## 7.2 Emissão de O.S

Menu: **Ordens de Serviço > Emitir O.S**.

Fluxo:

1. selecionar TAG;
2. informar tipo, prioridade, solicitante e problema;
3. salvar O.S;
4. opcionalmente imprimir ficha para execução.

Tipos disponíveis: **Corretiva, Preventiva, Preditiva, Inspeção e Melhoria**.

## 7.3 Fechamento de O.S

Menu: **Ordens de Serviço > Fechar O.S**.

No fechamento é possível registrar:

- mecânico responsável;
- hora início/fim e tempo de execução;
- serviço executado;
- materiais consumidos;
- custos (mão de obra, materiais e terceiros).

Para O.S corretiva, o fluxo contempla RCA no fechamento (modo de falha, causa raiz, ação corretiva e lições aprendidas).

## 7.4 Histórico de O.S

Menu: **Ordens de Serviço > Histórico**.

Inclui:

- filtros avançados (TAG, status, tipo, prioridade, período e busca textual);
- visualização detalhada de cada O.S;
- impressão;
- painéis e gráficos de acompanhamento histórico.

---

## 8) Preventiva

Menu: **Planejamento > Preventiva**.

### Recursos disponíveis na Preventiva

- cadastro de planos preventivos;
- lista por status (ativos/inativos) e busca;
- painel detalhado por plano;
- atividades e serviços por plano;
- registro de execuções;
- histórico de execução;
- templates de preventiva.

### Calendário/programação

As atividades preventivas alimentam a programação semanal no módulo de **Programação**.

---

## 9) Lubrificação

Menu: **Planejamento > Lubrificação**.

### Recursos disponíveis na Lubrificação

- cadastro de planos de lubrificação;
- filtros por equipamento e status;
- tela de detalhe e edição;
- integração com agenda de manutenção (quando estrutura de banco está disponível).

### Observação operacional

Se a tabela de lubrificação não existir no banco do ambiente, o sistema exibe orientação de migração em tela.

---

## 10) Preditiva

Menu: **Planejamento > Preditiva**.

### Recursos disponíveis na Preditiva

- registro de medições por TAG e tipo (vibração, temperatura, pressão etc.);
- definição de limites de alerta e crítico;
- classificação automática de status (Normal, Alerta, Crítico);
- aba de **Alertas Ativos** com itens fora da condição normal.

### Item incompleto

**Funcionalidade em desenvolvimento**: aba **Tendências**  
A interface existe, porém atualmente mostra placeholder (“Gráficos de tendência serão exibidos aqui”).

---

## 11) Inspeções

Menu: **Planejamento > Inspeções**.

### Fluxo

1. criar nova inspeção de rota (rota, turno, inspetor, descrição);
2. iniciar inspeção;
3. concluir inspeção em andamento;
4. acompanhar status e quantidade de anomalias.

---

## 12) Documentação técnica

Menu: **Cadastros > Documentos**.

### Funcionalidades atuais

- cadastro de documentos técnicos (POP, Manual, Desenho, Instrução, Catálogo);
- classificação por tipo, TAG, versão e status;
- filtros por aba e busca textual;
- cards com situação (rascunho, revisão, aprovado, obsoleto).

### Itens incompletos

**Funcionalidade em desenvolvimento**: anexos/arquivo final no fluxo da tela  
A interface apresenta ações de “Visualizar” e “Download”, mas o cadastro atual é principalmente metadado documental (sem fluxo completo de upload na própria tela).

---

## 13) Relatórios

Menu: **Relatórios > Relatórios**.

### Tipos disponíveis na central

- O.S por período;
- indicadores KPI;
- custos de manutenção;
- backlog;
- aderência preventivas;
- desempenho por equipamento;
- produtividade de mecânicos;
- resumo executivo.

### Exportações

- geração em **PDF**;
- exportação em **Excel**.

Também há painel de estatísticas rápidas (total de O.S, MTTR, disponibilidade e backlog).

---

## 14) Alertas e priorização

No tenant atual, alertas são tratados principalmente em:

- **Preditiva > Alertas Ativos** (medição em alerta/crítico);
- **Materiais** (baixo estoque);
- **Dashboard/Backlog** (pendências, urgências e atrasos operacionais).

---

## 15) Calendário e programação

Menu: **Planejamento > Programação**.

### O que existe hoje

- visualização semanal de agenda de manutenção;
- indicadores de programação (executadas, vencidas, próximas);
- navegação entre semanas;
- detalhe de evento;
- emissão de O.S diretamente a partir da programação;
- impressão de ficha de execução.

---

## 16) Boas práticas de operação

1. Padronize TAGs e códigos de materiais.
2. Sempre feche O.S com dados completos (tempo, serviço, materiais e custos).
3. Use classificação correta de prioridade e de solicitação.
4. Faça revisão diária de alertas (preditiva e estoque).
5. Mantenha planos preventivos ativos e atualizados.
6. Use relatórios mensais para decisões de custo e disponibilidade.

---

## 17) Suporte

### Canais dentro do tenant

**Funcionalidade em desenvolvimento** para autoatendimento do cliente final no tenant.  
Não há menu dedicado de “Suporte” para o usuário final no ambiente tenant.

### Escalonamento recomendado

- dúvidas operacionais: administrador da empresa (ADMIN);
- parametrizações estruturais (empresa/plano/sessão): equipe Owner do sistema.

---

## 18) Funcionalidades em desenvolvimento (resumo)

1. **Recuperação de senha no login tenant** (fluxo visível ao usuário final).
2. **Preditiva > Tendências** (gráficos históricos ainda em placeholder).
3. **Documentos técnicos com fluxo completo de arquivo final na própria tela** (upload/visualização/download plenamente operacional no fluxo do usuário final).
4. **Suporte self-service no tenant** (menu/canal dedicado para cliente final).

---

## 19) Checklist rápido de uso diário

1. Acessar dashboard e verificar indicadores críticos.
2. Revisar solicitações novas e backlog.
3. Executar programação do dia (preventiva/preditiva/inspeções/lubrificação).
4. Abrir/atualizar/fechar O.S com evidência completa.
5. Verificar alertas de condição e baixo estoque.
6. Registrar ajustes e gerar relatório do período quando necessário.

---

## 20) Observação final

Este manual foi estruturado com base nas funcionalidades efetivamente presentes no sistema atual, priorizando o uso do cliente final e identificando explicitamente os pontos ainda em desenvolvimento.

---

## 21) Backlog (priorização de pendências)

Menu: **Ordens de Serviço > Backlog**.

### O que o painel entrega

- visão consolidada das O.S pendentes;
- agrupamento por semana e atrasos;
- leitura rápida por prioridade;
- filtro de busca por TAG/equipamento/problema.

### Uso recomendado

1. iniciar o turno pela coluna de itens atrasados;
2. alinhar prioridade com a liderança da área;
3. direcionar para emissão/fechamento conforme status operacional.

### Limitação atual do Backlog

- fluxo focado em análise e priorização (não é tela principal de cadastro/edição).

---

## 22) FMEA/RCM (análise de criticidade)

Menu: **Análises > FMEA/RCM**.

### Objetivo

Estruturar análise de falhas potenciais por ativo, com cálculo de risco para apoiar plano preventivo.

### Campos-chave

- função do ativo;
- falha funcional e modo de falha;
- efeito e causa da falha;
- severidade, ocorrência e detecção;
- ação recomendada, responsável e prazo.

### Interpretação operacional

- o índice de risco usa a lógica $RPN = Severidade \times Ocorrência \times Detecção$;
- use RPN mais alto para priorizar ações preventivas de curto prazo.

### Limitações atuais no FMEA/RCM

- criação e consulta estão disponíveis, mas o fluxo de edição completa pode variar por permissão/perfil;
- representações avançadas (ex.: diagramas específicos) podem estar parciais conforme ambiente.

---

## 23) Causa raiz (RCA) e Inteligência IA

Menu: **Análises > Causa Raiz** e **Análises > Inteligência IA**.

### RCA (módulo estruturado)

Permite registrar análises formais com métodos como:

- 5 Porquês;
- Ishikawa;
- Árvore de Falhas.

No processo, registre problema, hipótese de causa, causa confirmada, ação corretiva e status da eficácia.

### Inteligência IA de causa raiz

Usa histórico operacional por TAG para sugerir:

- hipóteses prováveis de causa;
- ações preventivas propostas;
- criticidade e nível de confiança.

### Boas práticas de RCA e IA

1. use IA para triagem e priorização técnica;
2. formalize no RCA quando houver decisão de engenharia;
3. vincule ação resultante ao plano preventivo/melhoria.

### Limitação atual do RCA com IA

- integração automática entre resultado da IA e fechamento formal do RCA pode exigir etapa manual do usuário.

---

## 24) Melhorias contínuas

Menu: **Análises > Melhorias**.

### Aplicação prática em Melhorias

- cadastrar iniciativas (kaizen, projeto, lição aprendida, sugestão);
- descrever cenário antes/depois;
- acompanhar status de avaliação e implantação;
- registrar custo de implementação e economia esperada.

### Indicador prático

ROI estimado pode ser acompanhado pela lógica:

$$
ROI\ (meses) \approx \frac{Custo\ de\ Implementação}{Economia\ Mensal\ Estimada}
$$

### Limitações atuais em Melhorias

- anexos e aprovações podem demandar fluxo complementar, conforme configuração do ambiente.

---

## 25) Hierarquia de ativos

Menu: **Cadastros > Hierarquia**.

### Estrutura recomendada

- Planta;
- Área;
- Sistema.

### Regras operacionais

1. criar primeiro níveis superiores (Planta/Área);
2. depois cadastrar Sistemas vinculados;
3. usar códigos padronizados para facilitar buscas e relatórios.

### Atenção

- antes de excluir um item, valide impactos em estruturas filhas e vínculos com equipamentos.

---

## 26) Mecânicos e equipes executantes

Menu: **Cadastros > Mecânicos**.

### Finalidade

- manter base de executantes próprios e terceiros;
- registrar especialidade e custo-hora;
- apoiar fechamento de O.S com rastreabilidade de mão de obra.

### Recomendação

- mantenha especialidades padronizadas (ex.: elétrica, instrumentação, mecânica) para análises de produtividade.

---

## 27) Fornecedores e contratos

Menus: **Cadastros > Fornecedores** e **Cadastros > Contratos**.

### Fornecedores

- cadastro de dados cadastrais e especialidade;
- consulta por tipo (prestador, fornecedor, ambos);
- suporte a avaliação de desempenho quando aplicável.

### Contratos

- cadastro de número, vigência, tipo e status;
- vínculo com fornecedor;
- controle de SLA e valores;
- monitoramento de contratos ativos e próximos do vencimento.

### Boa prática

- revisar semanalmente contratos com vencimento próximo para evitar ruptura de atendimento.

---

## 28) Custos de manutenção

Menu: **Relatórios > Custos**.

### Visões disponíveis

- total consolidado por período;
- composição por mão de obra, materiais e terceiros;
- tendência mensal;
- ranking por equipamento.

### Uso gerencial

1. comparar custo por TAG com criticidade do ativo;
2. identificar concentração de gasto recorrente;
3. abrir RCA/melhoria para ativos com custo crônico.

### Limitação atual em Custos

- algumas opções de exportação podem aparecer no layout, mas depender de evolução/parametrização adicional por ambiente.

---

## 29) SSMA (segurança, saúde e meio ambiente)

Menu: **Segurança > SSMA**.

### Blocos funcionais

- registro de incidentes;
- gestão de Permissão de Trabalho (PT).

### Em incidentes

Registre tipo, severidade, local, envolvidos, ações imediatas e causas.

### Em PT

Registre descrição do serviço, período, riscos, medidas de controle, responsáveis e EPIs.

### Limitações atuais em SSMA

- aprovações e integrações automáticas com outros módulos podem depender do nível de maturidade do ambiente.

---

## 30) Auditoria operacional

Menu: **Administração > Auditoria** (perfil ADMIN).

### O que monitorar

- login/logout;
- criação/fechamento/impressão de O.S;
- geração de relatórios;
- alterações operacionais rastreadas no tenant.

### Aplicação prática da Auditoria

1. usar em investigação de divergências;
2. validar trilha de ações críticas;
3. apoiar compliance interno e auditorias externas.

---

## 31) Configurações da empresa

Menu: **Administração > Config. Empresa** (perfil ADMIN).

### Escopo de uso

- atualização de dados operacionais de contato e responsável;
- manutenção de informações administrativas do tenant.

### Observação

- dados legais estruturais da empresa podem ter governança específica e não ficar disponíveis para edição direta no tenant.

---

## 32) Rotina recomendada de operação

### Rotina diária (início e fim de turno)

1. abrir dashboard e backlog para priorização;
2. validar programação do dia;
3. tratar alertas de preditiva e estoque;
4. garantir fechamento correto das O.S concluídas;
5. registrar desvios críticos (SSMA/RCA quando aplicável).

### Rotina semanal

1. revisar backlog vencido;
2. revisar aderência das preventivas;
3. revisar contratos críticos e SLAs;
4. consolidar custos por ativo crítico;
5. atualizar plano de melhorias.

### Rotina mensal

1. emitir relatório executivo;
2. revisar KPIs (MTBF, MTTR, disponibilidade, custos);
3. validar plano de ação para top 10 equipamentos críticos;
4. registrar lições aprendidas do período.

---

## 33) Problemas comuns e ação imediata

### Não consigo acessar módulo administrativo

- verificar se o usuário está no perfil correto (ADMIN);
- confirmar se sessão não expirou por inatividade;
- solicitar validação ao administrador da empresa.

### Tela sem dados

- validar filtros ativos (período, status, TAG);
- confirmar existência de dados cadastrados no módulo;
- atualizar a tela e repetir consulta.

### O.S não aparece no histórico esperado

- revisar status aplicado (aberta, andamento, fechada);
- conferir período e filtros de busca;
- conferir se o fechamento foi salvo com sucesso.

### Divergência de custo

- conferir custos lançados no fechamento da O.S;
- validar materiais movimentados e custo unitário;
- revisar apontamento de mão de obra e terceiros.

---

## 34) Glossário rápido

- **TAG**: identificador único do equipamento.
- **O.S**: Ordem de Serviço.
- **RCA**: Root Cause Analysis (análise de causa raiz).
- **FMEA**: Failure Mode and Effects Analysis.
- **MTBF**: Mean Time Between Failures.
- **MTTR**: Mean Time To Repair.
- **SLA**: prazo acordado para atendimento/resolução.
- **PT**: Permissão de Trabalho.

---

## 35) Controle de revisão do manual

- versão atual: **1.2**;
- data de atualização: **11/03/2026**;
- escopo desta revisão: inclusão da versão de treinamento com trilhas por perfil, checklists por turno e matriz RACI por módulo.

---

## 36) Trilha de treinamento por perfil

### 36.1 Operador / Solicitante

Objetivo: registrar demandas corretamente e acompanhar execução.

Passo a passo:

1. acessar **Solicitações** e abrir chamado completo (TAG, impacto e descrição objetiva);
2. consultar **Backlog** para priorização e visibilidade do atendimento;
3. acompanhar a O.S emitida em **Histórico**;
4. em caso de risco, registrar evento em **SSMA**.

Critério de conclusão do treinamento:

- abrir solicitação com dados completos sem retrabalho;
- localizar status de atendimento em menos de 2 minutos;
- diferenciar corretamente urgência (Emergencial/Urgente/Programável).

### 36.2 Técnico / Mecânico

Objetivo: executar e fechar O.S com rastreabilidade técnica e de custos.

Passo a passo:

1. receber demanda em **Programação** ou **O.S**;
2. executar atividade conforme procedimento técnico;
3. fechar em **Fechar O.S** com tempos, serviço executado e materiais;
4. quando aplicável, registrar causa e ação em **RCA**;
5. validar impactos em segurança no módulo **SSMA**.

Critério de conclusão do treinamento:

- fechar O.S sem pendências de preenchimento;
- apontar materiais e custos corretamente;
- registrar causa raiz com qualidade mínima (problema, causa, ação).

### 36.3 Planejador PCM

Objetivo: organizar carteira de manutenção e reduzir backlog vencido.

Passo a passo:

1. revisar **Backlog** e definir priorização semanal;
2. estruturar agenda em **Programação**;
3. atualizar planos em **Preventiva**, **Preditiva** e **Lubrificação**;
4. revisar criticidade e ações em **FMEA/RCM**;
5. monitorar aderência via **Dashboard** e **Relatórios**.

Critério de conclusão do treinamento:

- publicar programação semanal completa;
- reduzir pendências vencidas;
- manter planos preventivos ativos e consistentes.

### 36.4 Gestor / Coordenador

Objetivo: conduzir performance, custo e conformidade operacional.

Passo a passo:

1. revisar indicadores no **Dashboard** (MTBF, MTTR, disponibilidade, backlog);
2. validar orçamento e desvios em **Custos**;
3. acompanhar contratos e SLA em **Contratos**;
4. validar trilha de conformidade em **Auditoria** e **SSMA**;
5. aprovar direcionamentos de **Melhorias**.

Critério de conclusão do treinamento:

- analisar KPI e definir plano de ação mensal;
- identificar top ativos críticos por custo/falha;
- conduzir reunião de resultados com evidências do sistema.

### 36.5 ADMIN do tenant

Objetivo: garantir governança de acesso e parâmetros operacionais.

Passo a passo:

1. manter perfis e permissões em **Usuários**;
2. atualizar dados operacionais em **Config. Empresa**;
3. validar consistência cadastral (equipamentos, materiais, fornecedores);
4. monitorar ações críticas em **Auditoria**;
5. acionar Owner quando houver necessidade estrutural.

Critério de conclusão do treinamento:

- manter perfis de acesso alinhados à função;
- resolver bloqueios operacionais de acesso;
- manter qualidade de cadastros críticos.

---

## 37) Checklists imprimíveis por turno

Instrução: imprimir ou copiar para rotina local e marcar cada item como **OK**, **N/A** ou **Pendente**.

### 37.1 Checklist de início de turno

1. [ ] dashboard revisado (indicadores críticos);
2. [ ] backlog revisado (itens vencidos e urgentes);
3. [ ] programação do dia validada com equipe;
4. [ ] materiais críticos verificados (baixo estoque);
5. [ ] alertas preditivos revisados;
6. [ ] riscos SSMA comunicados à equipe.

### 37.2 Checklist de meio de turno

1. [ ] O.S prioritárias em andamento sem bloqueios;
2. [ ] desvios de prazo reprogramados;
3. [ ] consumo de materiais apontado corretamente;
4. [ ] incidentes/anomalias registrados quando aplicável;
5. [ ] escalonamentos feitos para pendências críticas.

### 37.3 Checklist de fim de turno

1. [ ] O.S concluídas com fechamento completo;
2. [ ] pendências transferidas para próximo turno;
3. [ ] custos e horas apontados;
4. [ ] lições aprendidas registradas (quando houver);
5. [ ] relatório/resumo de turno emitido.

### 37.4 Modelo rápido para impressão

Data: DD/MM/AAAA  
Turno: ( ) A ( ) B ( ) C  
Responsável: NOME COMPLETO

- Pendência crítica 1: ______________________________________
- Pendência crítica 2: ______________________________________
- Ação imediata definida: ___________________________________
- Escalonado para: _________________________________________

---

## 38) Matriz RACI por módulo

Legenda:

- **R (Responsible)**: executa a atividade;
- **A (Accountable)**: responde pelo resultado final;
- **C (Consulted)**: consultado para decisão;
- **I (Informed)**: informado do andamento.

Perfis considerados:

- **OP**: Operador/Solicitante;
- **TEC**: Técnico/Mecânico;
- **PCM**: Planejador;
- **GEST**: Gestor;
- **ADM**: Administrador tenant.

| Módulo | OP | TEC | PCM | GEST | ADM |
| --- | --- | --- | --- | --- | --- |
| Solicitações | R | I | C | A | C |
| Backlog | I | C | R | A | I |
| Emitir O.S | I | C | R | A | I |
| Fechar O.S | I | R | C | A | I |
| Histórico O.S | C | C | R | A | I |
| Programação | I | C | R | A | I |
| Preventiva | I | C | R | A | C |
| Preditiva | I | C | R | A | C |
| Lubrificação | I | R | A | C | I |
| FMEA/RCM | I | C | R | A | I |
| RCA | I | R | C | A | I |
| Melhorias | C | C | R | A | I |
| Materiais | I | R | C | A | C |
| Fornecedores | I | I | C | A | R |
| Contratos | I | I | C | A | R |
| Custos | I | C | R | A | C |
| SSMA | R | R | C | A | I |
| Usuários | I | I | I | A | R |
| Auditoria | I | I | C | A | R |
| Config. Empresa | I | I | C | A | R |

### Uso da matriz

1. alinhar responsabilidades na implantação do tenant;
2. reduzir retrabalho por dúvida de papel;
3. usar em integração de novos colaboradores.
