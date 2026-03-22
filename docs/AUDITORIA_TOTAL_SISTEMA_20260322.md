<!-- markdownlint-disable -->

# 🔍 AUDITORIA TOTAL DO SISTEMA — PCM ESTRATÉGICO
## Front + Back + Rotas + Banco + Arquitetura + Integrações

**Data**: 2026-03-22  
**Versão**: 1.0  
**Stack**: React 18 + TypeScript + Vite + Supabase (Auth, DB, Edge Functions, Storage, RLS)  
**Modelo**: SaaS Multi-Tenant com `empresa_id` isolation  
**Classificação**: Confidencial — Investidores / CTO / Decisão Técnica

---

## 📋 ÍNDICE

1. [Resumo Executivo](#1-resumo-executivo)
2. [Inventário do Sistema](#2-inventário-do-sistema)
3. [Auditoria por Módulo — Scoring 9 Dimensões](#3-auditoria-por-módulo)
4. [Nota Global do Sistema](#4-nota-global-do-sistema)
5. [Classificação de Maturidade](#5-classificação-de-maturidade)
6. [Falhas Sistêmicas](#6-falhas-sistêmicas)
7. [Plano de Correção Prioritária](#7-plano-de-correção-prioritária)
8. [Stress Test / Simulação de Escala](#8-stress-test)
9. [Roadmap de Evolução](#9-roadmap-de-evolução)

---

## 1. RESUMO EXECUTIVO

O PCM Estratégico é um ERP de manutenção industrial SaaS multi-tenant com ~44 páginas, ~30 hooks de dados, 6 serviços, 17 edge functions e 110+ migrações SQL. O sistema passou por uma campanha agressiva de hardening multi-tenant que corrigiu ~25 hooks com falhas de isolamento de tenant, removeu 6 fallbacks perigosos e blindou o banco com RLS + triggers.

**Resultado**: O sistema saiu de um estado **CRÍTICO** (vazamento cross-tenant catastrófico) para um estado **SÓLIDO** na camada de dados. Restam gaps pontuais em performance, cobertura de testes e padronização de validação.

### Correções Aplicadas NESTA Auditoria:
| Fix | Arquivo | Impacto |
|-----|---------|---------|
| empresa_id filter + queryKey | `useOrdensServicoPaginated.ts` | 🔴 CRÍTICO → ✅ Corrigido |
| empresa_id filter no backlog | `useOrdensServicoPaginated.ts` | 🔴 CRÍTICO → ✅ Corrigido |
| Fallback sem tenant removido | `useLubrificacao.ts` | 🔴 CRÍTICO → ✅ Corrigido |
| Import path errado | `useSSMA.ts` | 🟡 MÉDIO → ✅ Corrigido |
| Import não utilizado removido | `useLubrificacao.ts` | 🟢 Limpeza → ✅ Corrigido |

---

## 2. INVENTÁRIO DO SISTEMA

### 2.1 Frontend
| Recurso | Quantidade |
|---------|-----------|
| Páginas (src/pages/) | 44 |
| Hooks de dados (src/hooks/) | 30+ |
| Contexts (AuthContext, TenantContext, BrandingContext) | 3 |
| Services (src/services/) | 6 |
| Componentes UI (src/components/) | 60+ |
| Guard components | 4 (EnvironmentGuard, AdminOnlyRoute, MasterTIGuard, OwnerOnlyRoute) |
| React.lazy code splitting | ✅ 100% das páginas |
| Biblioteca UI | Shadcn/ui + Radix |
| Gráficos | Recharts |
| Formulários | Manual (Zod apenas em Contratos) |

### 2.2 Backend
| Recurso | Quantidade |
|---------|-----------|
| Edge Functions | 17 |
| Migrações SQL | 110+ |
| Tabelas com RLS | 100+ |
| Triggers empresa_id | Em todas tabelas NOT NULL |
| RPCs | 15+ |
| Webhooks | 3 (Asaas, Stripe, Domain Sync) |
| Session Transfer | HMAC-SHA256 stateless |

### 2.3 Rotas
| Tipo | Quantidade |
|------|-----------|
| Rotas Owner | 11 |
| Rotas Tenant Públicas | 6 |
| Rotas Tenant Protegidas | 35 |
| Rotas Admin-only | 3 |
| Rotas MasterTI | 1 |

---

## 3. AUDITORIA POR MÓDULO — Scoring 9 Dimensões

### Legenda das Dimensões
| # | Dimensão | Sigla |
|---|----------|-------|
| 1 | 🔒 Segurança | SEG |
| 2 | ⚡ Performance | PERF |
| 3 | 📐 Qualidade de Código | COD |
| 4 | 🎨 Qualidade Visual | VIS |
| 5 | 🧑‍💻 UX / Experiência | UX |
| 6 | 🚀 Velocidade de Processamento | VEL |
| 7 | 🔄 Fluxo Operacional | FLUXO |
| 8 | 🔗 Integração Front↔Back | INT |
| 9 | 🏗️ Arquitetura | ARQ |

---

### 🔐 MÓDULO 1: AUTENTICAÇÃO & CONTROLE DE ACESSO

| Dim | Nota | Justificativa |
|-----|------|---------------|
| SEG | **9.0** | Login com rate limiting (5 tentativas/5min → 15min bloqueio), JWT verification em edge functions, RLS no DB, hierarquia de roles correta (SYSTEM_OWNER > SYSTEM_ADMIN > MASTER_TI > ADMIN), session transfer com HMAC-SHA256 |
| PERF | **8.0** | Hydration do perfil com 3 queries paralelas; staleTime adequado; session caching |
| COD | **8.5** | AuthContext bem estruturado com state machine (loading/hydrating/authenticated/error); constantes centralizadas em authConstants.ts |
| VIS | **8.0** | Tela de login limpa com branding dinâmico (BrandingContext); diferenciação clara Owner vs Tenant |
| UX | **8.5** | Force password change no primeiro login; feedback de rate limiting claro; auto-redirect pós-login |
| VEL | **8.0** | Auth hydration rápida; session transfer transparente entre domínios |
| FLUXO | **8.5** | Login → Hydration → Redirect automático para dashboard; impersonação com countdown e auto-stop |
| INT | **9.0** | Frontend resolve tenant via RPC + valida com TenantDomainMiddleware; backend enforces via JWT + RLS |
| ARQ | **8.5** | Separação clara Owner/Tenant via EnvironmentGuard; multi-layer protection (6 camadas); TenantQueryIsolationGuard limpa cache em troca de tenant |

**Média: 8.4/10** ✅

---

### 📊 MÓDULO 2: DASHBOARD & KPIs

| Dim | Nota | Justificativa |
|-----|------|---------------|
| SEG | **9.0** | Todas queries filtram por empresa_id; queryKeys incluem tenantId |
| PERF | **6.5** | 4 queries separadas N+1 no useDashboardData; sem paralelização explícita; podia usar `Promise.all` ou `useQueries` |
| COD | **7.5** | Hook useDashboardData concentra lógica; 7x useMemo no HistoricoOS; código funcional mas denso |
| VIS | **8.5** | Cards industriais com Recharts (PieChart, BarChart, LineChart); Skeleton loading completo; visual profissional |
| UX | **8.0** | KPIs claros com indicadores visuais; tabela de OS recentes com badges coloridos; loading states consistentes |
| VEL | **6.0** | Dashboard carrega 4 queries sequenciais; perceptível em conexões lentas; sem cache compartilhado entre métricas |
| FLUXO | **8.0** | Dashboard como landing page pós-login; navegação direta para módulos via sidebar |
| INT | **8.0** | Hooks consomem Supabase diretamente; sem camada de serviço intermediária |
| ARQ | **7.0** | Dados espalhados em hook monolítico; sem API aggregation no backend para dashboard |

**Média: 7.6/10** ⚠️

---

### 📋 MÓDULO 3: ORDENS DE SERVIÇO (Nova, Fechar, Histórico, Portal Mecânico)

| Dim | Nota | Justificativa |
|-----|------|---------------|
| SEG | **9.0** | empresa_id em todas queries e mutations; useOrdensServico e useOrdensServicoPaginated agora filtrados (corrigido nesta auditoria) |
| PERF | **7.5** | Paginação implementada via usePaginatedQuery; Histórico com 7x useMemo para filtros; ~950 linhas na página mais complexa |
| COD | **7.0** | NovaOS (540 linhas), FecharOS (680 linhas), HistoricoOS (950 linhas) — páginas grandes; validação inline sem Zod; gerenciável mas candidates a split |
| VIS | **8.5** | Tabelas industriais com badges de status/prioridade/tipo; gráficos de distribuição; visual consistente |
| UX | **8.5** | Fluxo Nova→Fechar bem definido; portal mecânico separado; filtros avançados no histórico; DataTablePagination |
| VEL | **7.5** | Paginação server-side; count query separada (N+1); sorting dinâmico funcional |
| FLUXO | **9.0** | Ciclo completo: Solicitação → Emissão → Execução → Fechamento → Histórico; pausas/retomadas atômicas com Supabase RPC |
| INT | **8.5** | close_os_atomic RPC garante consistência; frontend valida e backend enforces |
| ARQ | **7.5** | useExecucoesOS separado do useOrdensServico; usePaginatedQuery genérico reusável; FecharOS com try/catch atômico |

**Média: 8.1/10** ✅

---

### 📝 MÓDULO 4: SOLICITAÇÕES

| Dim | Nota | Justificativa |
|-----|------|---------------|
| SEG | **9.0** | Filtro empresa_id completo; queryKeys isolados; insert com empresa_id |
| PERF | **8.0** | Query simples com select/filter; sem paginação mas com limit |
| COD | **8.0** | Hook limpo com insertWithColumnFallback; tipo SolicitacaoRow definido |
| VIS | **8.0** | Badges de status; lista funcional |
| UX | **8.0** | Formulário de criação direto; vinculação com OS |
| VEL | **8.0** | Queries leves |
| FLUXO | **8.5** | Solicitação → Vinculação OS → Acompanhamento claro |
| INT | **8.5** | Frontend + DB alinhados |
| ARQ | **8.0** | Hook auto-contido |

**Média: 8.2/10** ✅

---

### 📅 MÓDULO 5: PLANEJAMENTO (Backlog, Programação)

| Dim | Nota | Justificativa |
|-----|------|---------------|
| SEG | **9.0** | Backlog usa useBacklogPaginated com empresa_id (corrigido nesta auditoria) |
| PERF | **7.5** | Paginação server-side funcional |
| COD | **7.5** | Reutiliza usePaginatedQuery; código limpo |
| VIS | **8.0** | Priorização visual com cores |
| UX | **8.0** | Filtros de status para backlog |
| VEL | **7.5** | Count N+1 query |
| FLUXO | **8.0** | Backlog → Programação → Execução |
| INT | **8.0** | Consumo direto do DB |
| ARQ | **7.5** | Reuso do hook genérico de paginação |

**Média: 7.9/10** ✅

---

### 🔧 MÓDULO 6: PREVENTIVA

| Dim | Nota | Justificativa |
|-----|------|---------------|
| SEG | **8.5** | usePlanosPreventivos filtrado por empresa_id; atividades filtram por plano_id (child table — RLS mitiga) |
| PERF | **7.5** | Master-detail com sidebar; useMemo + useCallback; upsertMaintenanceSchedule em cascade |
| COD | **7.5** | ~230 linhas na página; lógica distribuída entre usePlanosPreventivos + useAtividadesPreventivas + PlanoFormDialog |
| VIS | **8.5** | Layout master-detail com sidebar w-80; dialog de formulário; switch ativo/inativo |
| UX | **8.5** | Navegação intuitiva plano→atividades→serviços; toggle ativo; impressão via template |
| VEL | **7.5** | Queries separadas por plano + atividades |
| FLUXO | **9.0** | Plano → Atividades → Serviços → Execução → Agenda de Manutenção — ciclo completo |
| INT | **8.5** | maintenanceSchedule sync automático no create/update; RPC close_os_atomic |
| ARQ | **8.0** | Separação clara planos/atividades/serviços; hooks especializados |

**Média: 8.2/10** ✅

---

### 📈 MÓDULO 7: PREDITIVA

| Dim | Nota | Justificativa |
|-----|------|---------------|
| SEG | **9.0** | useMedicoesPreditivas com empresa_id em todas 3 queries + insert + queryKeys (corrigido previamente) |
| PERF | **7.0** | 7x useMemo (filteredMedicoes, trendData, topCriticos, alertasAtivos); Recharts LineChart |
| COD | **7.0** | ~750 linhas na página; validação inline; muitos useMemo mas gerenciável |
| VIS | **8.5** | Gráficos de tendência com Recharts; alertas visuais de limites; cards estatísticos |
| UX | **8.0** | Filtros por equipamento/TAG; limites superior/inferior; histórico de medições |
| VEL | **7.0** | Cálculos de tendência client-side; sem aggregation no backend |
| FLUXO | **8.0** | Medição → Análise → Alerta → Ação Corretiva |
| INT | **8.5** | maintenanceSchedule sync; alertas automáticos |
| ARQ | **7.0** | Página monolítica; candidata a split em componentes |

**Média: 7.8/10** ⚠️

---

### 🔍 MÓDULO 8: INSPEÇÕES

| Dim | Nota | Justificativa |
|-----|------|---------------|
| SEG | **9.0** | empresa_id filtrado; fallback removido previamente |
| PERF | **7.5** | Queries simples |
| COD | **7.5** | Hook com insertWithColumnFallback |
| VIS | **8.0** | Formulários de inspeção |
| UX | **8.0** | Criação/encerramento de inspeções |
| VEL | **7.5** | Adequado |
| FLUXO | **8.0** | Plano → Inspeção → Resultado |
| INT | **8.5** | maintenanceSchedule sync |
| ARQ | **7.5** | Hook auto-contido |

**Média: 7.9/10** ✅

---

### 🛢️ MÓDULO 9: LUBRIFICAÇÃO

| Dim | Nota | Justificativa |
|-----|------|---------------|
| SEG | **9.0** | Fallback perigoso removido nesta auditoria; empresa_id enforced em queries e inserts |
| PERF | **7.5** | Queries com limit(200); staleTime 60s |
| COD | **7.5** | useLubrificacao + useAtividadesLubrificacao; import cleanup feito |
| VIS | **8.0** | Interface funcional |
| UX | **8.0** | Plano → Atividades → Execução |
| VEL | **7.5** | Adequado |
| FLUXO | **8.5** | Ciclo completo com sync automático de agenda |
| INT | **8.5** | maintenanceSchedule sync; createExecucao com status update |
| ARQ | **7.5** | Separação planos/atividades; child tables via plano_id |

**Média: 8.0/10** ✅

---

### ⚙️ MÓDULO 10: FMEA/RCM

| Dim | Nota | Justificativa |
|-----|------|---------------|
| SEG | **9.0** | empresa_id em todas queries e inserts; queryKeys com tenantId |
| PERF | **8.0** | Queries diretas e leves |
| COD | **8.0** | 5 funções no hook, todas corrigidas |
| VIS | **8.0** | Análise de modo de falha |
| UX | **8.0** | Criação/edição de análises |
| VEL | **8.0** | Sem preocupações |
| FLUXO | **8.0** | FMEA → Ações → Monitoramento |
| INT | **8.0** | Hook direto ao Supabase |
| ARQ | **8.0** | Hook auto-contido e limpo |

**Média: 8.1/10** ✅

---

### 🔬 MÓDULO 11: RCA (Análise Causa Raiz)

| Dim | Nota | Justificativa |
|-----|------|---------------|
| SEG | **9.0** | 7 funções com empresa_id completo |
| PERF | **8.0** | Queries diretas |
| COD | **8.0** | Hook bem estruturado |
| VIS | **8.0** | Interface de análise |
| UX | **8.0** | Fluxo de análise |
| VEL | **8.0** | Adequado |
| FLUXO | **8.0** | Análise → Causa → Ação Corretiva |
| INT | **8.0** | Direto ao Supabase |
| ARQ | **8.0** | Separação clara |

**Média: 8.1/10** ✅

---

### 🦺 MÓDULO 12: SSMA (Segurança, Saúde, Meio Ambiente)

| Dim | Nota | Justificativa |
|-----|------|---------------|
| SEG | **9.0** | empresa_id em todas 8 funções; import errado corrigido nesta auditoria |
| PERF | **7.5** | Queries simples |
| COD | **7.5** | Hook com 8 funções; tipos inline (PermissaoTrabalhoRow, IncidenteSSMARow com any em checklist) |
| VIS | **8.0** | Permissões de trabalho e incidentes |
| UX | **8.0** | Criação de PTs e registro de incidentes |
| VEL | **7.5** | Adequado |
| FLUXO | **8.0** | PT → Aprovação → Execução → Conclusão; Incidente → Ação |
| INT | **8.0** | Hook direto |
| ARQ | **7.5** | Hook monolítico com 8 funções — candidato a split |

**Média: 7.9/10** ✅

---

### 💡 MÓDULO 13: MELHORIAS

| Dim | Nota | Justificativa |
|-----|------|---------------|
| SEG | **9.0** | empresa_id completo; fallback removido previamente |
| PERF | **8.0** | Queries diretas |
| COD | **8.0** | Hook limpo |
| VIS | **8.0** | Interface funcional |
| UX | **8.0** | Registro e acompanhamento |
| VEL | **8.0** | Adequado |
| FLUXO | **8.0** | Proposta → Avaliação → Implementação |
| INT | **8.0** | Hook direto |
| ARQ | **8.0** | Estrutura adequada |

**Média: 8.1/10** ✅

---

### 🏢 MÓDULO 14: HIERARQUIA & EQUIPAMENTOS

| Dim | Nota | Justificativa |
|-----|------|---------------|
| SEG | **9.0** | useHierarquia (14 funções) e useEquipamentos todos com empresa_id |
| PERF | **7.0** | Hierarquia carrega plantas/áreas/sistemas em queries separadas; sem tree lazy-loading |
| COD | **7.5** | useHierarquia com 14 funções é grande; Equipamentos ~700 linhas na página |
| VIS | **8.5** | Cards de equipamentos com Sheet detail; import XLSX; filtros |
| UX | **8.5** | Hierarquia visual Planta→Área→Sistema→Equipamento; importação em massa |
| VEL | **7.0** | Sem virtualização para listas grandes de equipamentos |
| FLUXO | **8.5** | Cadastro hierárquico completo; vinculação com OS e planos |
| INT | **8.5** | CRUD completo com Supabase |
| ARQ | **7.5** | Hook grande mas funcional; import XLSX via xlsx lib |

**Média: 7.9/10** ✅

---

### 👷 MÓDULO 15: MECÂNICOS

| Dim | Nota | Justificativa |
|-----|------|---------------|
| SEG | **9.0** | empresa_id em todas queries; fallback removido previamente |
| PERF | **8.0** | Queries simples |
| COD | **8.0** | Hook limpo |
| VIS | **8.0** | Lista de técnicos |
| UX | **8.0** | CRUD de mecânicos |
| VEL | **8.0** | Adequado |
| FLUXO | **8.0** | Cadastro → Vinculação com OS |
| INT | **8.0** | Direto |
| ARQ | **8.0** | Adequado |

**Média: 8.1/10** ✅

---

### 📦 MÓDULO 16: MATERIAIS & ESTOQUE

| Dim | Nota | Justificativa |
|-----|------|---------------|
| SEG | **9.0** | 7 funções com empresa_id completo |
| PERF | **7.5** | Múltiplas queries (materiais, ativos, baixo estoque, movimentações) |
| COD | **7.5** | Hook com 7 funções; página ~650 linhas |
| VIS | **8.5** | 2 tabelas industriais; badges de estoque; alerta de baixo estoque |
| UX | **8.5** | Tabs materiais/movimentações; filtros; alerta visual de estoque |
| VEL | **7.5** | Sem virtualização em tabelas longas |
| FLUXO | **8.5** | Material → Movimentação → Vinculação OS → Estoque automático |
| INT | **8.5** | CRUD + movimentações + vinculação OS |
| ARQ | **7.5** | Hook concentrado mas funcional |

**Média: 8.1/10** ✅

---

### 🏭 MÓDULO 17: FORNECEDORES

| Dim | Nota | Justificativa |
|-----|------|---------------|
| SEG | **9.0** | 8 funções com empresa_id completo |
| PERF | **8.0** | Queries diretas |
| COD | **8.0** | Hook completo com CRUD + avaliação |
| VIS | **8.0** | Lista de fornecedores |
| UX | **8.0** | CRUD + avaliação de qualificação |
| VEL | **8.0** | Adequado |
| FLUXO | **8.0** | Cadastro → Avaliação → Vinculação com Contratos |
| INT | **8.0** | Direto |
| ARQ | **8.0** | Adequado |

**Média: 8.1/10** ✅

---

### 📄 MÓDULO 18: CONTRATOS

| Dim | Nota | Justificativa |
|-----|------|---------------|
| SEG | **9.5** | Único módulo com Zod validation; empresaId em todos 5 métodos do service; audit log em toda operação |
| PERF | **8.0** | Service layer com queries otimizadas |
| COD | **9.0** | Melhor padrão do sistema — Zod schema, service layer separada, audit logging; referência para outros módulos |
| VIS | **8.0** | CRUD funcional |
| UX | **8.0** | Formulário com validação |
| VEL | **8.0** | Adequado |
| FLUXO | **8.0** | CRUD com vinculação a fornecedores |
| INT | **9.0** | Service layer intermediária (contratos.service.ts) com validação Zod + audit log |
| ARQ | **9.0** | Padrão arquitetural exemplar: Hook → Service → Supabase com validação e auditoria |

**Média: 8.5/10** ✅ **REFERÊNCIA**

---

### 📚 MÓDULO 19: DOCUMENTOS TÉCNICOS

| Dim | Nota | Justificativa |
|-----|------|---------------|
| SEG | **9.0** | empresa_id filtrado |
| PERF | **8.0** | Queries diretas |
| COD | **8.0** | Hook limpo |
| VIS | **8.0** | Catálogo de documentos |
| UX | **8.0** | Upload e visualização |
| VEL | **8.0** | Adequado |
| FLUXO | **8.0** | Upload → Categorização → Consulta |
| INT | **8.0** | Supabase Storage integration |
| ARQ | **8.0** | Adequado |

**Média: 8.1/10** ✅

---

### 📊 MÓDULO 20: RELATÓRIOS & CUSTOS

| Dim | Nota | Justificativa |
|-----|------|---------------|
| SEG | **8.5** | Dados filtrados por tenant |
| PERF | **7.0** | Geração de PDF client-side com jsPDF (~300KB); sem backend rendering |
| COD | **7.5** | reportGenerator.ts com templates profissionais; XLSX templates |
| VIS | **8.5** | PDFs com formatação profissional (jsPDF-autoTable); gráficos exportáveis |
| UX | **8.0** | Geração sob demanda; download direto |
| VEL | **6.5** | Geração PDF pesada no client; pode travar em relatórios grandes |
| FLUXO | **7.5** | Dashboard → Relatório → Download/Impressão |
| INT | **7.0** | Tudo client-side; sem API de relatórios no backend |
| ARQ | **6.5** | Deveria ter geração server-side para relatórios pesados |

**Média: 7.4/10** ⚠️

---

### 🛡️ MÓDULO 21: ADMINISTRAÇÃO & CONFIGURAÇÕES

| Dim | Nota | Justificativa |
|-----|------|---------------|
| SEG | **9.0** | AdminOnlyRoute com usePermission("tenant.admin"); RPC has_permission validado no backend |
| PERF | **7.5** | useTenantAdminConfig com upsert automático |
| COD | **8.0** | 7 tabs organizados; useTenantAdminConfig hook dedicado |
| VIS | **8.0** | Tabs para Users, Roles, Processos, Indicadores, Alertas, Padronizações, Integração |
| UX | **8.5** | Central administrativa unificada; configuração por empresa |
| VEL | **7.5** | Adequado |
| FLUXO | **8.5** | Configuração centralizada afeta comportamento do sistema |
| INT | **8.5** | Config → DB → Reflete em toda aplicação |
| ARQ | **8.0** | Separação clara admin/operacional |

**Média: 8.2/10** ✅

---

### 📋 MÓDULO 22: AUDITORIA

| Dim | Nota | Justificativa |
|-----|------|---------------|
| SEG | **9.0** | Logs de auditoria tenant-isolados; enterprise_audit_logs com RLS service_role only |
| PERF | **7.5** | Consulta de logs |
| COD | **8.0** | writeAuditLog via RPC; logger estruturado JSON |
| VIS | **8.0** | Visualização de trilha de auditoria |
| UX | **7.5** | Filtros de auditoria |
| VEL | **7.5** | Adequado |
| FLUXO | **8.5** | Todo CRUD gera log → Consulta → Compliance |
| INT | **9.0** | audit.ts + RPC registrar_auditoria integrado com contratos.service |
| ARQ | **8.5** | Schema de auditoria proprietário; TODO: replicar padrão do contratos para todos os módulos |

**Média: 8.2/10** ✅

---

### 🎫 MÓDULO 23: SUPORTE

| Dim | Nota | Justificativa |
|-----|------|---------------|
| SEG | **9.0** | useSupportTickets com empresa_id; threads com contagem de não-lidos |
| PERF | **7.5** | Queries de tickets + threads |
| COD | **7.5** | Hook dedicado |
| VIS | **8.0** | Sistema de tickets com threads |
| UX | **8.0** | Abertura de ticket → Thread → Resolução |
| VEL | **7.5** | Adequado |
| FLUXO | **8.0** | Ticket → Thread → Resolução |
| INT | **8.0** | Supabase Storage para attachments |
| ARQ | **7.5** | Thread schema com unread counts |

**Média: 7.9/10** ✅

---

### 👑 MÓDULO 24: PORTAL OWNER

| Dim | Nota | Justificativa |
|-----|------|---------------|
| SEG | **9.0** | OwnerOnlyRoute + isSystemOwner check; edge function com isOwnerOperator DB validation; shadow audit para tentativas não-autorizadas |
| PERF | **7.5** | edge function owner-portal-admin (~1500 linhas) concentra toda lógica |
| COD | **7.0** | Edge function monolítica (1500+ linhas); 40+ actions em um switch; candidata a split |
| VIS | **8.5** | Owner2 com tabs: Dashboard, Monitoramento, Empresas, Usuarios, Comercial, Financeiro, Contratos, Suporte, Configurações, Feature-Flags, Auditoria, Logs, Sistema |
| UX | **8.0** | Visão panorâmica de todas empresas; impersonação |
| VEL | **7.0** | Edge function single-thread; actions pesados (cleanup_company_data) com rate limit 25/min |
| FLUXO | **8.5** | Gestão completa: Empresas → Usuários → Billing → Suporte → Audit |
| INT | **8.5** | Proxy pattern: owner-companies → owner-portal-admin; JWT verified internally |
| ARQ | **7.0** | Proxy pattern funcional mas edge function monolítica; deveria ser microserviços |

**Média: 7.9/10** ✅

---

### 🖥️ MÓDULO 25: MASTER TI

| Dim | Nota | Justificativa |
|-----|------|---------------|
| SEG | **9.0** | MasterTIGuard com isMasterTI flag; acesso restrito |
| PERF | **7.5** | Painel de infraestrutura |
| COD | **7.5** | Página dedicada |
| VIS | **8.0** | Painel técnico |
| UX | **7.5** | Ferramentas de diagnóstico |
| VEL | **7.5** | Adequado |
| FLUXO | **7.5** | Diagnóstico → Ação corretiva |
| INT | **8.0** | Acesso a funções privilegiadas |
| ARQ | **8.0** | Separação clara do tier operacional |

**Média: 7.8/10** ⚠️

---

### 🤖 MÓDULO 26: AI ROOT CAUSE

| Dim | Nota | Justificativa |
|-----|------|---------------|
| SEG | **9.0** | Edge function com JWT + requireUser + requireTenantContext; empresa_id validado |
| PERF | **7.0** | Chamada a edge function que pode demorar |
| COD | **8.0** | Módulo separado em src/modules/rootCauseAI/; hook + components isolados |
| VIS | **8.0** | Cards de resultado da análise |
| UX | **8.0** | Input de sintomas → Análise → Resultado estruturado |
| VEL | **6.5** | Depende de LLM response time; sem streaming |
| FLUXO | **8.0** | Sintoma → Análise AI → Recomendação |
| INT | **8.5** | analisar-causa-raiz edge function com validação completa |
| ARQ | **8.5** | Melhor padrão modular do sistema: src/modules/rootCauseAI/ isolado |

**Média: 7.9/10** ✅

---

### 🔌 MÓDULO 27: BACKEND (Edge Functions)

| Dim | Nota | Justificativa |
|-----|------|---------------|
| SEG | **8.0** | JWT em protected functions; rate limiting; HMAC session transfer; ⚠️ system-health-check sem auth obrigatório |
| PERF | **7.0** | Edge functions cold start; owner-portal-admin monolítico (~1500 linhas) |
| COD | **7.0** | Proxy pattern funcional; owner-portal-admin muito grande; webhook handlers adequados |
| VIS | N/A | Backend |
| UX | N/A | Backend |
| VEL | **7.0** | Cold start de edge functions; in-memory rate limiting (não distribuído) |
| FLUXO | **8.0** | auth-login → session → change/forgot/reset password pipeline completo |
| INT | **8.5** | Edge functions como API Gateway; webhooks Asaas/Stripe integrados |
| ARQ | **7.0** | Proxy pattern ok; rate limiting in-memory (não escala multi-instância); secrets via env vars |

**Média Aplicável: 7.5/10** ⚠️

---

### 🗄️ MÓDULO 28: BANCO DE DADOS (RLS, Schema, Migrações)

| Dim | Nota | Justificativa |
|-----|------|---------------|
| SEG | **9.0** | RLS em 100+ tabelas; FORCE ROW LEVEL SECURITY; triggers empresa_id prevent insert/update sem tenant; current_empresa_id() da sessão JWT |
| PERF | **6.5** | Sem auditoria de índices; ❓ índices compostos empresa_id + created_at; 110+ migrações cumulativas |
| COD | **6.0** | 110+ migrações com muitas de emergência/repair/probe (20260322 series tem ~30 migrações de diagnóstico); schema acumula dívida técnica |
| VIS | N/A | Backend |
| UX | N/A | Backend |
| VEL | **7.0** | RLS com current_empresa_id() pode ter overhead em queries pesadas; sem materialized views |
| FLUXO | **8.0** | Schema cobre todo o domínio; triggers automáticos |
| INT | **9.0** | Schema sync com frontend types (types.ts gerado); RPCs bem definidos |
| ARQ | **7.5** | RLS + triggers + RPCs bem estruturados; ⚠️ migrações precisam de consolidação (squash); enterprise_audit_logs OK |

**Média Aplicável: 7.6/10** ⚠️

---

## 4. NOTA GLOBAL DO SISTEMA

### Tabela Consolidada

| Módulo | SEG | PERF | COD | VIS | UX | VEL | FLUXO | INT | ARQ | **Média** |
|--------|-----|------|-----|-----|-----|-----|-------|-----|-----|-----------|
| Auth & Controle de Acesso | 9.0 | 8.0 | 8.5 | 8.0 | 8.5 | 8.0 | 8.5 | 9.0 | 8.5 | **8.4** |
| Dashboard & KPIs | 9.0 | 6.5 | 7.5 | 8.5 | 8.0 | 6.0 | 8.0 | 8.0 | 7.0 | **7.6** |
| Ordens de Serviço | 9.0 | 7.5 | 7.0 | 8.5 | 8.5 | 7.5 | 9.0 | 8.5 | 7.5 | **8.1** |
| Solicitações | 9.0 | 8.0 | 8.0 | 8.0 | 8.0 | 8.0 | 8.5 | 8.5 | 8.0 | **8.2** |
| Planejamento | 9.0 | 7.5 | 7.5 | 8.0 | 8.0 | 7.5 | 8.0 | 8.0 | 7.5 | **7.9** |
| Preventiva | 8.5 | 7.5 | 7.5 | 8.5 | 8.5 | 7.5 | 9.0 | 8.5 | 8.0 | **8.2** |
| Preditiva | 9.0 | 7.0 | 7.0 | 8.5 | 8.0 | 7.0 | 8.0 | 8.5 | 7.0 | **7.8** |
| Inspeções | 9.0 | 7.5 | 7.5 | 8.0 | 8.0 | 7.5 | 8.0 | 8.5 | 7.5 | **7.9** |
| Lubrificação | 9.0 | 7.5 | 7.5 | 8.0 | 8.0 | 7.5 | 8.5 | 8.5 | 7.5 | **8.0** |
| FMEA/RCM | 9.0 | 8.0 | 8.0 | 8.0 | 8.0 | 8.0 | 8.0 | 8.0 | 8.0 | **8.1** |
| RCA | 9.0 | 8.0 | 8.0 | 8.0 | 8.0 | 8.0 | 8.0 | 8.0 | 8.0 | **8.1** |
| SSMA | 9.0 | 7.5 | 7.5 | 8.0 | 8.0 | 7.5 | 8.0 | 8.0 | 7.5 | **7.9** |
| Melhorias | 9.0 | 8.0 | 8.0 | 8.0 | 8.0 | 8.0 | 8.0 | 8.0 | 8.0 | **8.1** |
| Hierarquia & Equipamentos | 9.0 | 7.0 | 7.5 | 8.5 | 8.5 | 7.0 | 8.5 | 8.5 | 7.5 | **7.9** |
| Mecânicos | 9.0 | 8.0 | 8.0 | 8.0 | 8.0 | 8.0 | 8.0 | 8.0 | 8.0 | **8.1** |
| Materiais & Estoque | 9.0 | 7.5 | 7.5 | 8.5 | 8.5 | 7.5 | 8.5 | 8.5 | 7.5 | **8.1** |
| Fornecedores | 9.0 | 8.0 | 8.0 | 8.0 | 8.0 | 8.0 | 8.0 | 8.0 | 8.0 | **8.1** |
| Contratos | 9.5 | 8.0 | 9.0 | 8.0 | 8.0 | 8.0 | 8.0 | 9.0 | 9.0 | **8.5** |
| Documentos Técnicos | 9.0 | 8.0 | 8.0 | 8.0 | 8.0 | 8.0 | 8.0 | 8.0 | 8.0 | **8.1** |
| Relatórios & Custos | 8.5 | 7.0 | 7.5 | 8.5 | 8.0 | 6.5 | 7.5 | 7.0 | 6.5 | **7.4** |
| Administração | 9.0 | 7.5 | 8.0 | 8.0 | 8.5 | 7.5 | 8.5 | 8.5 | 8.0 | **8.2** |
| Auditoria | 9.0 | 7.5 | 8.0 | 8.0 | 7.5 | 7.5 | 8.5 | 9.0 | 8.5 | **8.2** |
| Suporte | 9.0 | 7.5 | 7.5 | 8.0 | 8.0 | 7.5 | 8.0 | 8.0 | 7.5 | **7.9** |
| Portal Owner | 9.0 | 7.5 | 7.0 | 8.5 | 8.0 | 7.0 | 8.5 | 8.5 | 7.0 | **7.9** |
| Master TI | 9.0 | 7.5 | 7.5 | 8.0 | 7.5 | 7.5 | 7.5 | 8.0 | 8.0 | **7.8** |
| AI Root Cause | 9.0 | 7.0 | 8.0 | 8.0 | 8.0 | 6.5 | 8.0 | 8.5 | 8.5 | **7.9** |
| Backend (Edge Functions) | 8.0 | 7.0 | 7.0 | — | — | 7.0 | 8.0 | 8.5 | 7.0 | **7.5** |
| Banco de Dados | 9.0 | 6.5 | 6.0 | — | — | 7.0 | 8.0 | 9.0 | 7.5 | **7.6** |

### Médias por Dimensão

| Dimensão | Média Global |
|----------|-------------|
| 🔒 Segurança | **9.0** |
| ⚡ Performance | **7.4** |
| 📐 Qualidade de Código | **7.6** |
| 🎨 Qualidade Visual | **8.1** |
| 🧑‍💻 UX | **8.0** |
| 🚀 Velocidade | **7.4** |
| 🔄 Fluxo Operacional | **8.1** |
| 🔗 Integração Front↔Back | **8.3** |
| 🏗️ Arquitetura | **7.7** |

---

### 🏆 NOTA GLOBAL DO SISTEMA

# **7.96 / 10**

---

## 5. CLASSIFICAÇÃO DE MATURIDADE

| Faixa | Classificação | Status |
|-------|--------------|--------|
| 0-3 | 🔴 PROTÓTIPO | — |
| 3-5 | 🟠 ALPHA | — |
| 5-6.5 | 🟡 BETA | — |
| 6.5-7.5 | 🔵 MVP PRODUCTION | — |
| 7.5-8.5 | 🟢 **PRODUÇÃO COMERCIAL** | ✅ **AQUI** |
| 8.5-9.5 | 💎 ENTERPRISE GRADE | — |
| 9.5-10 | 🏆 WORLD-CLASS | — |

### Classificação: 🟢 PRODUÇÃO COMERCIAL (7.96/10)

O sistema está **apto para operação comercial com clientes pagantes**. A segurança multi-tenant atingiu nível enterprise após a campanha de hardening. Os gaps restantes são de performance/otimização e padronização de código, não de funcionalidade ou segurança.

---

## 6. FALHAS SISTÊMICAS

### 🔴 CRÍTICAS (Corrigidas nesta auditoria)

| # | Falha | Onde | Status |
|---|-------|------|--------|
| 1 | useOrdensServicoPaginated sem empresa_id | Hook | ✅ CORRIGIDO |
| 2 | useBacklogPaginated sem empresa_id | Hook | ✅ CORRIGIDO |
| 3 | useLubrificacao fallback sem tenant | Hook | ✅ CORRIGIDO |
| 4 | useSSMA import incorreto | Hook | ✅ CORRIGIDO |

### 🟡 MÉDIAS (Pendentes — mitigadas por RLS)

| # | Falha | Onde | Risco Real | Mitigação |
|---|-------|------|-----------|-----------|
| 1 | useAtividadesPreventivas filtra só por plano_id | Hook | Baixo | RLS enforced no DB; parent (planos_preventivos) já é tenant-filtered |
| 2 | useAtividadesLubrificacao filtra só por plano_id | Hook | Baixo | Mesmo cenário — child table com parent tenant-scoped |
| 3 | system-health-check sem auth obrigatória | Edge Function | Médio | Expõe apenas alertas, não dados sensíveis |
| 4 | Session transfer sem validação de expiração | Edge Function | Baixo | HMAC protege contra forja; tokens curtos |
| 5 | Rate limiting in-memory (não distribuído) | Webhooks | Baixo | Supabase single-instance na maioria dos casos |

### 🟢 BAIXAS (Dívida técnica)

| # | Falha | Impacto |
|---|-------|---------|
| 1 | Zod usado apenas em Contratos | Validação inconsistente entre módulos |
| 2 | 110+ migrações sem squash | Overhead de deploy; difícil auditoria |
| 3 | owner-portal-admin 1500+ linhas | Manutenibilidade |
| 4 | ~20 testes (apenas auth/security) | Zero cobertura de fluxos de negócio |
| 5 | Tipos fragmentados (types/, hooks inline, supabase/types.ts) | Risco de dessincronia |
| 6 | xlsx import não é dinâmico | Bundle size ~400KB desnecessário |
| 7 | Sem virtualização em listas longas | Performance com datasets grandes |
| 8 | Relatórios gerados client-side (jsPDF) | Performance em relatórios pesados |

---

## 7. PLANO DE CORREÇÃO PRIORITÁRIA

### P0 — IMEDIATO (Segurança)

| # | Ação | Esforço | Impacto |
|---|------|---------|---------|
| ✅ | empresa_id em useOrdensServicoPaginated | ✅ FEITO | Crítico |
| ✅ | Remover fallback em useLubrificacao | ✅ FEITO | Crítico |
| ✅ | Corrigir import useSSMA | ✅ FEITO | Médio |
| 1 | Adicionar API key enforcement em system-health-check | 15min | Médio |
| 2 | Adicionar validação de expiração em session-transfer consume | 15min | Baixo |

### P1 — CURTO PRAZO (1-2 semanas)

| # | Ação | Esforço | Impacto |
|---|------|---------|---------|
| 3 | Padronizar validação com Zod em todos os módulos CRUD | 3-4 dias | Qualidade |
| 4 | Implementar audit logging no padrão de contratos.service para OS, Equipamentos e Hierarquia | 2 dias | Compliance |
| 5 | Testes unitários para fluxos de negócio (Dashboard, NovaOS, FecharOS, Materiais) | 3-4 dias | Confiabilidade |
| 6 | Dynamic import para xlsx library | 30min | Bundle size |

### P2 — MÉDIO PRAZO (1-2 meses)

| # | Ação | Esforço | Impacto |
|---|------|---------|---------|
| 7 | Squash de migrações (110+ → ~10 consolidadas) | 1 dia | Manutenibilidade |
| 8 | Split owner-portal-admin em edge functions menores | 2-3 dias | Manutenibilidade |
| 9 | Dashboard API aggregation no backend (eliminar N+1) | 1-2 dias | Performance |
| 10 | Virtualização com @tanstack/react-virtual para tabelas longas | 1 dia | Performance |
| 11 | Rate limiting distribuído (DB-backed) para webhooks | 1 dia | Segurança |
| 12 | Geração de relatórios server-side (edge function com jsPDF) | 2-3 dias | Performance |

### P3 — LONGO PRAZO (3-6 meses)

| # | Ação | Esforço | Impacto |
|---|------|---------|---------|
| 13 | Testes E2E completos com Playwright (fluxo tenant) | 1-2 semanas | Confiabilidade |
| 14 | Centralizar tipos em src/types/ (eliminar tipos inline) | 2-3 dias | Manutenibilidade |
| 15 | Implementar service layer para todos os módulos (padrão contratos) | 1-2 semanas | Arquitetura |
| 16 | Índice composto empresa_id + created_at nas tabelas mais consultadas | 1 dia | Performance DB |
| 17 | Monitoring/APM (Sentry/DataDog/Axiom) | 1-2 dias | Observabilidade |

---

## 8. STRESS TEST — SIMULAÇÃO DE ESCALA

### Cenário 1: 10 Empresas / 50 Usuários Simultâneos
| Componente | Status | Risco |
|-----------|--------|-------|
| Auth | ✅ Suporta | Rate limiting local suficiente |
| RLS | ✅ Suporta | current_empresa_id() funciona |
| Edge Functions | ✅ Suporta | Cold start aceitável |
| React Query | ✅ Suporta | Cache isolado por tenantId |
| **Veredito** | **✅ SUPORTADO** | |

### Cenário 2: 50 Empresas / 200 Usuários Simultâneos
| Componente | Status | Risco |
|-----------|--------|-------|
| Auth | ✅ Suporta | Supabase Auth escala |
| RLS | ⚠️ Atenção | current_empresa_id() em 100+ tabelas — índices necessários |
| Edge Functions | ⚠️ Atenção | owner-portal-admin pode throttle; cold starts mais frequentes |
| Dashboard queries | ⚠️ Atenção | N+1 queries * 200 users = potencial bottleneck |
| DB Connections | ⚠️ Atenção | Supabase Free/Pro tem limite de conexões |
| **Veredito** | **⚠️ SUPORTADO COM OTIMIZAÇÕES** | Necessário: índices, dashboard aggregation |

### Cenário 3: 200 Empresas / 1000 Usuários Simultâneos
| Componente | Status | Risco |
|-----------|--------|-------|
| Auth | ✅ Suporta | Supabase Enterprise |
| RLS | 🔴 Preocupante | Overhead de current_empresa_id() em queries complexas sem índices |
| Edge Functions | 🔴 Preocupante | Owner-portal-admin monolítico; rate limiting in-memory falha |
| Dashboard | 🔴 Preocupante | N+1 queries insustentável |
| Bundle Size | ⚠️ Atenção | ~1.2MB JS bundle com recharts+xlsx+jspdf |
| DB Growth | ⚠️ Atenção | 110+ migrações acumuladas; sem partitioning |
| **Veredito** | **🔴 REQUER REFATORAÇÃO** | Backend aggregation, índices, split edge functions, rate limiting distribuído |

### Cenário 4: Operação Diária Intensa (1 empresa, 30 users, 100 OS/dia)
| Componente | Status | Risco |
|-----------|--------|-------|
| Nova OS | ✅ Suporta | Insert simples com empresa_id |
| Fechar OS | ✅ Suporta | close_os_atomic RPC é atômico |
| Dashboard refresh | ⚠️ Atenção | 4 queries a cada staleTime (30s default) * 30 users |
| Estoque | ✅ Suporta | Movimentações com empresa_id |
| Relatórios | ⚠️ Atenção | Geração PDF client-side pode travar com 100+ OS |
| **Veredito** | **✅ SUPORTADO** | Monitorar latência do Dashboard |

---

## 9. ROADMAP DE EVOLUÇÃO

### Para atingir 💎 ENTERPRISE GRADE (8.5+):

```
HOJE (7.96) ──────────────────────────────────────────────── ENTERPRISE (8.5+)

Fase 1: Segurança Final (1 semana)
├── API key enforcement system-health-check
├── Session transfer expiry validation
└── Rate limiting distribuído
    = +0.1 na nota global

Fase 2: Qualidade de Código (2 semanas)
├── Zod em todos os módulos CRUD
├── Service layer (padrão contratos) para OS, Equipamentos, Materiais
├── Audit logging uniforme
└── Eliminar tipos inline → centralizar em src/types/
    = +0.2 na nota global

Fase 3: Performance (2 semanas)
├── Dashboard backend aggregation (eliminar N+1)
├── Dynamic import xlsx
├── Server-side PDF generation
├── @tanstack/react-virtual para tabelas
└── Índices compostos empresa_id + created_at
    = +0.2 na nota global

Fase 4: Testes & Observabilidade (3 semanas)
├── Testes unitários para fluxos de negócio (mínimo 60% cobertura)
├── Testes E2E Playwright (tenant flow completo)
├── APM/Monitoring (Sentry + Axiom)
└── Alertas automáticos de performance
    = +0.15 na nota global

PROJEÇÃO: 7.96 + 0.65 = ~8.6 → 💎 ENTERPRISE GRADE
```

---

## VEREDITO FINAL

| Aspecto | Avaliação |
|---------|-----------|
| **Segurança Multi-Tenant** | 🟢 **SÓLIDA** — RLS + triggers + hooks corrigidos |
| **Funcionalidade** | 🟢 **COMPLETA** — 44 páginas cobrindo todo ciclo PCM |
| **Performance** | 🟡 **ADEQUADA** — funcional para escala atual, otimizações necessárias para crescimento |
| **Qualidade de Código** | 🟡 **BOA** — Contratos é referência; demais módulos precisam padronização |
| **Testes** | 🔴 **INSUFICIENTE** — Apenas auth/security coberto; zero testes de negócio |
| **Produção** | 🟢 **APTO** — Sistema pronto para operação comercial com clientes pagantes |

**O PCM Estratégico é um sistema SaaS funcional, seguro e pronto para comercialização. As correções de segurança multi-tenant elevaram o sistema de um estado crítico para produção comercial. O caminho para Enterprise Grade requer investimento em testes, performance e padronização de código.**

---

*Auditoria gerada em 2026-03-22 — TypeScript: 0 erros — 5 correções aplicadas nesta sessão*
