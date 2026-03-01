# ANÁLISE PROFUNDA PÁGINA A PÁGINA - PCM ESTRATÉGICO
## Sistema de Planejamento e Controle da Manutenção (CMMS)

**Data da Análise:** Fevereiro 2026  
**Versão do Sistema:** 2.0  
**Tipo de Análise:** Avaliação Profunda para Excelência Industrial

---

## SUMÁRIO EXECUTIVO

### Diagnóstico Geral
O PCM Estratégico é um sistema CMMS robusto com **21 módulos especializados** cobrindo todo o ciclo de vida da manutenção industrial. O sistema demonstra maturidade **Nível 3 (Definido)** na escala de maturidade do PCM, com potencial para atingir **Nível 4 (Quantificado)** com as melhorias propostas.

### Pontos Fortes
- ✅ Arquitetura hierárquica de ativos (ISO 14224)
- ✅ Integração RCA no fechamento de OS corretivas
- ✅ Dashboard com KPIs industriais (MTBF, MTTR, Disponibilidade)
- ✅ Gestão de custos por categoria (M.O., Materiais, Terceiros)
- ✅ Módulos especializados (FMEA, RCA, Preditiva, SSMA)

### Pontos Críticos para Melhoria
- ⚠️ Ausência de OEE (Overall Equipment Effectiveness)
- ⚠️ Falta de geração automática de OS preventivas
- ⚠️ Materiais sem vinculação direta com equipamentos
- ⚠️ Mecânicos sem matriz de competências
- ⚠️ Ausência de calendário visual de manutenção

---

## 1️⃣ ANÁLISE DO DASHBOARD DE MANUTENÇÃO

### Estado Atual
| Funcionalidade | Status | Observação |
|----------------|--------|------------|
| MTBF | ✅ Implementado | Cálculo básico |
| MTTR | ✅ Implementado | Cálculo básico |
| Disponibilidade | ✅ Implementado | MTBF/(MTBF+MTTR) |
| Backlog | ✅ Implementado | Quantidade e tempo |
| Custos mensais | ✅ Implementado | Por categoria |
| Ratio Prev/Corr | ✅ Implementado | - |
| Aderência PM | ✅ Implementado | - |

### Lacunas Identificadas

#### KPIs Faltantes
1. **OEE (Overall Equipment Effectiveness)** - Indicador padrão mundial
2. **Confiabilidade** - R(t) = e^(-λt)
3. **SLA de Atendimento** - Tempo de resposta vs meta
4. **Custo por Tipo de Manutenção** - Corretiva vs Preventiva vs Preditiva
5. **Índice de Retrabalho** - OS reabertas
6. **Taxa de Falhas** - λ = 1/MTBF

#### Funcionalidades Ausentes
1. **Filtros Avançados** - Por período, área, criticidade, tipo de ativo
2. **Alertas Automáticos** - OS urgentes, backlog alto, SLA estourado
3. **Comparativo de Períodos** - Mês atual vs mês anterior
4. **Drill-down** - Clicar no KPI para ver detalhes
5. **Exportação de Relatórios** - PDF com gráficos

### Melhorias Propostas

```
PRIORIDADE ALTA:
├── Adicionar OEE = Disponibilidade × Performance × Qualidade
├── Adicionar Confiabilidade mensal por equipamento
├── Adicionar filtros por área, período, criticidade
├── Adicionar alertas visuais para KPIs fora da meta
└── Adicionar comparativo com período anterior

PRIORIDADE MÉDIA:
├── Adicionar gráfico de tendência de MTBF/MTTR
├── Adicionar ranking de equipamentos por falhas
├── Adicionar custo acumulado por equipamento
└── Adicionar índice de retrabalho
```

---

## 2️⃣ ANÁLISE DO CADASTRO DE EQUIPAMENTOS

### Estado Atual

#### Campos Existentes
- TAG, Nome, Criticidade (A/B/C), Nível de Risco
- Localização, Fabricante, Modelo, Nº Série
- Sistema_ID (vinculação hierárquica)
- Ativo (status)

#### Hierarquia Implementada
```
Planta → Área → Sistema → Equipamento → Componente
```

### Lacunas Identificadas

#### Campos Técnicos Faltantes
| Campo | Impacto | Prioridade |
|-------|---------|------------|
| Potência (kW/CV) | Alto | Alta |
| Capacidade nominal | Alto | Alta |
| Ano de fabricação | Médio | Alta |
| Data de aquisição | Médio | Média |
| Valor patrimonial | Médio | Média |
| Vida útil estimada (h) | Alto | Alta |
| Horas operação atual | Alto | Alta |
| Manual anexo (URL) | Médio | Média |
| Foto do equipamento | Baixo | Baixa |
| Centro de custo | Alto | Alta |

#### Hierarquia Completa (Faltante)
```
Planta
  └── Área
      └── Linha
          └── Equipamento
              └── Conjunto
                  └── Subconjunto
                      └── Módulo
                          └── Parte
                              └── Componente
                                  └── Peça
```

### Melhorias Propostas

```
PRIORIDADE ALTA:
├── Adicionar campos: potencia, capacidade, ano_fabricacao
├── Adicionar campos: vida_util_estimada, horas_operacao
├── Adicionar campo: centro_custo (para contabilidade)
├── Implementar horímetro virtual com cálculo automático
└── Adicionar indicador de saúde do ativo

PRIORIDADE MÉDIA:
├── Adicionar upload de manuais técnicos
├── Adicionar fotos do equipamento
├── Implementar QR Code para identificação
├── Adicionar histórico consolidado de manutenções
└── Adicionar indicadores específicos do ativo (MTBF, MTTR)
```

---

## 3️⃣ ANÁLISE DO CADASTRO DE MATERIAIS

### Estado Atual
| Campo | Status |
|-------|--------|
| Código | ✅ |
| Nome | ✅ |
| Unidade | ✅ |
| Custo unitário | ✅ |
| Estoque atual | ✅ |
| Estoque mínimo | ✅ |
| Localização | ✅ |
| Movimentações | ✅ |

### Lacunas Identificadas

#### Campos Faltantes
1. **Aplicabilidade** - Quais equipamentos usam este material
2. **Fornecedores aprovados** - Lista de fornecedores com preços
3. **Lead time de reposição** - Tempo médio de entrega
4. **Ponto de pedido** - Cálculo automático (estoque mínimo + lead time)
5. **Lote econômico de compra** - EOQ
6. **Código NCM/Fiscal** - Para notas fiscais
7. **Classificação ABC** - Por valor de consumo
8. **Criticidade do item** - Para planejamento

#### Funcionalidades Faltantes
1. Vinculação automática com equipamentos
2. Cálculo automático de consumo médio mensal
3. Alertas de ponto de pedido atingido
4. Sugestão automática de compra
5. Histórico de preços por fornecedor

### Melhorias Propostas

```
PRIORIDADE ALTA:
├── Criar tabela materiais_equipamentos (N:N)
├── Adicionar campos: lead_time_dias, ponto_pedido
├── Adicionar cálculo automático de consumo médio
├── Implementar alertas de reposição
└── Adicionar classificação ABC automática

PRIORIDADE MÉDIA:
├── Criar tabela fornecedores_materiais
├── Implementar cotação de preços
├── Adicionar histórico de preços
└── Gerar relatório de necessidades de compra
```

---

## 4️⃣ ANÁLISE DAS ORDENS DE SERVIÇO

### Estado Atual

#### Tipos de OS
- CORRETIVA ✅
- PREVENTIVA ✅
- PREDITIVA ✅
- INSPECAO ✅
- MELHORIA ✅

#### Workflow de Status
```
ABERTA → EM_ANDAMENTO → AGUARDANDO_MATERIAL → FECHADA
                                           → CANCELADA
```

#### Campos Existentes
- Número sequencial, TAG, Equipamento
- Tipo, Prioridade, Solicitante
- Problema, Tempo/Custo estimado
- Modo de falha, Causa raiz (RCA)
- Ação corretiva, Lições aprendidas

### Lacunas Identificadas

#### Campos Faltantes
| Campo | Descrição | Prioridade |
|-------|-----------|------------|
| Checklist procedimentos | Lista de verificação | Alta |
| Permissão de trabalho | Vinculação com PT | Alta |
| SLA meta (horas) | Tempo máximo de atendimento | Alta |
| SLA real (horas) | Tempo efetivo | Alta |
| Anexos/Fotos | Evidências | Média |
| Assinatura digital | Responsável execução | Média |
| Peças substituídas | Lista detalhada | Alta |
| Parada de produção | Tempo de máquina parada | Alta |

#### Funcionalidades Faltantes
1. Cálculo automático de SLA (meta vs real)
2. Escalonamento automático por tempo aberto
3. Notificações por e-mail/push
4. Workflow de aprovação para custos altos
5. Vinculação com Permissões de Trabalho
6. Integração com checklist de segurança

### Melhorias Propostas

```
PRIORIDADE ALTA:
├── Adicionar campos: sla_meta, sla_real, tempo_parada
├── Implementar cálculo automático de SLA
├── Adicionar escalonamento por tempo aberto
├── Vincular com Permissões de Trabalho existentes
└── Adicionar campo de peças substituídas

PRIORIDADE MÉDIA:
├── Implementar upload de fotos/anexos
├── Adicionar assinatura digital do executor
├── Implementar workflow de aprovação
└── Adicionar notificações por e-mail
```

---

## 5️⃣ ANÁLISE DO PLANEJAMENTO PREVENTIVO

### Estado Atual
| Funcionalidade | Status |
|----------------|--------|
| Cadastro de planos | ✅ |
| Frequência em dias | ✅ |
| Checklist básico | ✅ |
| Tempo estimado | ✅ |
| Próxima execução | ✅ |
| Vinculação com TAG | ✅ |

### Lacunas Identificadas

#### Funcionalidades Faltantes
1. **Geração Automática de OS** - Não gera OS automaticamente
2. **Calendário Visual** - Ausente
3. **Balanceamento de Carga** - Não distribui por mecânicos
4. **Gatilho por Horas/Ciclos** - Parcial
5. **Materiais Previstos** - Estrutura JSON, sem uso real
6. **Planos Legais** - Não identificados (NR-13, NR-10)

#### Relatórios Faltantes
1. Aderência de preventivas
2. Preventivas atrasadas
3. Custo previsto vs realizado
4. Histórico de execuções por plano

### Melhorias Propostas

```
PRIORIDADE CRÍTICA:
├── Implementar geração automática de OS (Edge Function)
├── Criar calendário visual de manutenção
├── Adicionar balanceamento de carga da equipe
└── Implementar gatilho por horímetro

PRIORIDADE ALTA:
├── Criar módulo de Planos Legais (NR-13, NR-10)
├── Adicionar previsão de materiais por plano
├── Implementar clone de planos
└── Adicionar histórico de execuções
```

---

## 6️⃣ ANÁLISE DA GESTÃO DE MECÂNICOS

### Estado Atual
| Campo | Status |
|-------|--------|
| Nome | ✅ |
| Telefone | ✅ |
| Tipo (Próprio/Terceiro) | ✅ |
| Especialidade | ✅ |
| Custo/Hora | ✅ |
| Ativo | ✅ |

### Lacunas Identificadas

#### Campos Faltantes para Gestão Completa
| Campo | Descrição | Prioridade |
|-------|-----------|------------|
| CPF/CNPJ | Identificação | Média |
| Matrícula | Código interno | Alta |
| Centro de custo | Alocação financeira | Média |
| Turno de trabalho | Disponibilidade | Alta |
| Data admissão | Histórico | Baixa |
| Foto | Identificação visual | Baixa |

#### Módulos Faltantes
1. **Matriz de Competências** - Habilidades por técnico
2. **Certificações** - NR-10, NR-13, etc.
3. **Calendário de Disponibilidade** - Férias, folgas
4. **Produtividade Individual** - OS/dia, tempo médio
5. **Alocação em OS** - Quem está fazendo o quê

### Melhorias Propostas

```
PRIORIDADE ALTA:
├── Criar tabela mecanicos_competencias
├── Criar tabela mecanicos_certificacoes
├── Adicionar campo: turno, matricula
├── Implementar dashboard de produtividade
└── Adicionar calendário de disponibilidade

PRIORIDADE MÉDIA:
├── Implementar alocação visual em OS
├── Criar relatório de desempenho
├── Adicionar controle de horas trabalhadas
└── Implementar integração com ponto
```

---

## 7️⃣ ANÁLISE DA MANUTENÇÃO PREDITIVA

### Estado Atual
| Funcionalidade | Status |
|----------------|--------|
| Registro de medições | ✅ |
| Tipos (Vibração, Temperatura, etc.) | ✅ |
| Limites de alerta/crítico | ✅ |
| Status automático | ✅ |
| Alertas visuais | ✅ |

### Lacunas Identificadas

#### Funcionalidades Faltantes
1. **Gráficos de Tendência** - Histórico temporal
2. **Prognóstico de Falha** - Predição de quando falhará
3. **Integração com Coletores** - Import automático
4. **Relatórios de Condição** - Laudo técnico
5. **Planos de Monitoramento** - Rotas de coleta
6. **Técnicas Especializadas** - Termografia, análise de óleo

### Melhorias Propostas

```
PRIORIDADE ALTA:
├── Implementar gráficos de tendência (Recharts)
├── Adicionar cálculo de tendência linear
├── Criar prognóstico simples de falha
└── Implementar rotas de coleta

PRIORIDADE MÉDIA:
├── Criar relatório de condição PDF
├── Adicionar comparativo entre medições
├── Implementar alertas por e-mail
└── Adicionar fotos das medições (termografia)
```

---

## 8️⃣ ANÁLISE DE CUSTOS

### Estado Atual
| Funcionalidade | Status |
|----------------|--------|
| Custo por categoria | ✅ |
| Custo por equipamento | ✅ |
| Tendência mensal | ✅ |
| Top 5 equipamentos | ✅ |
| Filtro por período | ✅ |

### Lacunas Identificadas

#### Análises Faltantes
1. **Custo por Tipo de OS** - Corretiva vs Preventiva
2. **Custo por Área/Sistema** - Drill-down hierárquico
3. **Budget vs Realizado** - Orçamento
4. **Custo/Hora de Manutenção** - Por tipo
5. **ROI de Preventivas** - Economia gerada
6. **Pareto de Custos** - 80/20

### Melhorias Propostas

```
PRIORIDADE ALTA:
├── Adicionar custo por tipo de OS
├── Implementar drill-down por área/sistema
├── Adicionar campo de budget mensal
├── Calcular economia de preventivas
└── Implementar Pareto de custos
```

---

## 9️⃣ ANÁLISE DO FMEA

### Estado Atual
| Funcionalidade | Status |
|----------------|--------|
| Cadastro de análises | ✅ |
| S × O × D = RPN | ✅ |
| Classificação por risco | ✅ |
| Ações recomendadas | ✅ |
| Status de acompanhamento | ✅ |

### Lacunas Identificadas

1. **Vinculação com Planos Preventivos** - Estrutura existe, não usada
2. **Recálculo após Ação** - RPN novo
3. **Histórico de RPNs** - Evolução
4. **Matriz de Criticidade Visual** - Heatmap
5. **Exportação para Excel** - Relatório padrão

### Melhorias Propostas

```
PRIORIDADE MÉDIA:
├── Implementar vinculação real com planos
├── Adicionar RPN antes/depois da ação
├── Criar gráfico de evolução do RPN
├── Implementar matriz visual de riscos
└── Adicionar exportação Excel
```

---

## 🔟 ANÁLISE DO RCA (Análise de Causa Raiz)

### Estado Atual
| Funcionalidade | Status |
|----------------|--------|
| 5 Porquês | ✅ |
| Diagrama Ishikawa (estrutura) | ✅ |
| Árvore de Falhas (estrutura) | ✅ |
| Ações corretivas | ✅ |
| Verificação de eficácia | ✅ |

### Lacunas Identificadas

1. **Editor Visual Ishikawa** - Apenas JSON
2. **Vinculação Automática com OS** - Parcial
3. **Dashboard de RCAs** - Métricas
4. **Pareto de Causas** - Frequência de categorias
5. **Template Pré-definido** - Agilizar criação

### Melhorias Propostas

```
PRIORIDADE MÉDIA:
├── Criar editor visual para Ishikawa
├── Adicionar dashboard de métricas RCA
├── Implementar Pareto de causas
├── Criar templates por tipo de falha
└── Adicionar timeline de ações
```

---

## 1️⃣1️⃣ ANÁLISE DE SEGURANÇA (SSMA)

### Estado Atual
| Funcionalidade | Status |
|----------------|--------|
| Registro de incidentes | ✅ |
| Severidade | ✅ |
| Dias de afastamento | ✅ |
| Custo estimado | ✅ |
| Permissões de trabalho | ✅ |

### Lacunas Identificadas

1. **Checklist de Segurança na OS** - Integração
2. **APR (Análise Preliminar de Risco)** - Por atividade
3. **Dashboard de Segurança** - Taxa de frequência
4. **Pirâmide de Heinrich** - Visualização
5. **Campanhas de Segurança** - Registro

---

## DIAGNÓSTICO FINAL

### Grau de Maturidade PCM
| Dimensão | Nota (0-100) | Observação |
|----------|--------------|------------|
| Planejamento | 75 | Planos existem, falta automação |
| Programação | 60 | Calendário básico, sem balanceamento |
| Execução | 80 | Workflow completo |
| Controle | 70 | KPIs básicos, falta OEE |
| Indicadores | 75 | MTBF/MTTR ok, falta confiabilidade |
| Documentação | 65 | Básico, falta documentos técnicos |
| Confiabilidade | 70 | FMEA/RCA implementados |
| **MÉDIA** | **71** | **Nível 3 - Definido** |

### Classificação de Maturidade
```
[ ] Nível 1 - Inicial (reativo)
[ ] Nível 2 - Gerenciado (básico)
[X] Nível 3 - Definido (estruturado)  ← ATUAL
[ ] Nível 4 - Quantificado (otimizado) ← META
[ ] Nível 5 - Otimizado (excelência)
```

---

## PLANO DE EVOLUÇÃO

### 🔴 Curto Prazo (1-2 semanas)
1. ✅ Adicionar OEE ao Dashboard
2. ✅ Adicionar filtros por período/área no Dashboard
3. ✅ Implementar SLA automático nas OS
4. ✅ Adicionar campos técnicos em Equipamentos
5. ✅ Criar aplicabilidade de materiais

### 🟡 Médio Prazo (3-4 semanas)
1. Geração automática de OS preventivas
2. Calendário visual de manutenção
3. Matriz de competências de técnicos
4. Gráficos de tendência preditiva
5. Exportação de relatórios PDF

### 🟢 Longo Prazo (1-2 meses)
1. Aplicativo mobile para campo
2. Integração com coletores preditivos
3. BI com dashboards customizados
4. Integração com ERP
5. Machine Learning para predição de falhas

---

## DIFERENCIAIS COMPETITIVOS RECOMENDADOS

1. **OEE Automático** - Poucos CMMS calculam automaticamente
2. **RCA Integrado** - Ishikawa/5W no fechamento de OS
3. **Calendário de Manutenção** - Visualização Gantt
4. **Mobile-First** - PWA para campo
5. **Alertas Inteligentes** - Notificações contextuais

---

*Documento gerado para guiar a evolução do PCM Estratégico para nível de excelência industrial.*
---

## ADENDO 2026-03-01 — REESTRUTURAÇÃO SUPABASE, AUDITORIA E MULTI-TENANT

### Escopo técnico executado (mudanças mínimas de segurança)
- Migração criada: `supabase/migrations/20260301025500_secure_user_registration_and_enterprise_audit.sql`
- Implementações:
  - Tabela `empresas` (base de tenant) com RLS.
  - `profiles` com `empresa_id` obrigatório e `must_change_password = true`.
  - Tabela `enterprise_audit_logs` com campos mínimos:
    - `executor_id`, `target_entity`, `target_id`, `action`, `before`, `after`, `ip`, `user_agent`, `created_at`.
  - Função `log_enterprise_event(...)` para registro centralizado.
  - Trigger `handle_new_user` reforçada para:
    - validar/definir `empresa_id`,
    - validar/definir `role`,
    - criar `profiles` e `user_roles` no mesmo fluxo,
    - registrar `CREATE_USER` em `enterprise_audit_logs`.
  - Triggers de auditoria para `profiles`, `user_roles`, `empresas`, `dados_empresa`.

### Mapeamento estrutural de módulos e persistência
- Arquivos com chamadas Supabase (`supabase.from(...)`): **42**
- Tabelas utilizadas no frontend/serviços: `auditoria`, `auditoria_logs`, `dados_empresa`, `configuracoes_sistema`, `profiles`, `security_logs`, `user_roles`, `ordens_servico`, `solicitacoes_manutencao`, `materiais`, `medicoes_preditivas`, `planos_preventivos`, `atividades_lubrificacao`, `atividades_preventivas`, `servicos_preventivos`, `componentes_equipamento`, `document_layouts`, `document_sequences`, `documentos_tecnicos`, `equipamentos`, `execucoes_os`, `execucoes_preventivas`, `fmea`, `contratos`, `fornecedores`, `areas`, `plantas`, `sistemas`, `execucoes_lubrificacao`, `movimentacoes_materiais`, `mecanicos`, `melhorias`, `permissoes_granulares`, `acoes_corretivas`, `analise_causa_raiz`, `incidentes_ssma`, `permissoes_trabalho`, `templates_preventivos`, `ai_root_cause_analysis`.

### Pontos sem rastreabilidade total (identificados)
- Fluxos de autenticação de login/logout ainda registram na tabela legada `auditoria` (não em `enterprise_audit_logs`).
- Eventos de reset de senha e ações administrativas fora de tabelas auditadas ainda dependem de padronização via `log_enterprise_event(...)`.

### Verificação de armazenamento paralelo
- `localStorage`: identificado apenas em `src/integrations/supabase/client.ts` para persistência de sessão Supabase (uso esperado para auth client-side).
- Mock data: `src/data/mockData.ts` existe, porém **sem imports ativos** no código de produção atual.

### Tabelas para revisão estrutural (não destrutivo)
- `dados_empresa` vs `empresas`: potencial redundância funcional; manter ambas temporariamente e avaliar convergência com plano de migração controlada.
- `auditoria` vs `enterprise_audit_logs`: coexistência temporária para compatibilidade; planejar depreciação da tabela legada `auditoria`.

### Riscos e plano de evolução SaaS escalável
1. **Risco**: políticas RLS históricas amplas em tabelas legadas podem permitir visibilidade acima do desejado.
2. **Risco**: ausência de `empresa_id` em todas as tabelas de domínio impede isolamento tenant completo.
3. **Plano faseado**:
   - Fase 1: padronizar todas as ações críticas em `enterprise_audit_logs`.
   - Fase 2: adicionar `empresa_id` nas tabelas de domínio prioritárias e índices/fks.
   - Fase 3: reforçar RLS por tenant em todos os módulos.
   - Fase 4: descontinuar gradualmente estruturas legadas redundantes após validação.
