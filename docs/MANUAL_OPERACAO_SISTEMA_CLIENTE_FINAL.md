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

### Boas práticas

- Use o dashboard no início do turno para priorização.
- Monitore backlog semanal para evitar acúmulo de pendências.

---

## 4) Gestão de usuários

Menu: **Administração > Usuários** (somente ADMIN).

### O que é possível fazer

- pesquisar usuários por nome;
- editar **nome**;
- alterar **perfil** (Usuário/Administrador/Master TI).

### Limitação atual

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

### Boas práticas

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

### Recursos disponíveis

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

### Recursos disponíveis

- cadastro de planos de lubrificação;
- filtros por equipamento e status;
- tela de detalhe e edição;
- integração com agenda de manutenção (quando estrutura de banco está disponível).

### Observação operacional

Se a tabela de lubrificação não existir no banco do ambiente, o sistema exibe orientação de migração em tela.

---

## 10) Preditiva

Menu: **Planejamento > Preditiva**.

### Recursos disponíveis

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