# 🏗️ PROJETO: 4 CAMADAS DE EXPERIÊNCIA — PCM ESTRATÉGICO

> **Data**: 25/03/2026  
> **Versão**: 1.0  
> **Status**: PLANEJAMENTO

---

## 📐 VISÃO GERAL DA ARQUITETURA

```
                    ┌─────────────────────────────────┐
                    │     CORE (Supabase + Hooks)      │
                    │  Banco único · RLS · Edge Fns     │
                    └──────────┬──────────────────────┘
                               │
          ┌────────────────────┼────────────────────┐
          │                    │                    │
    ┌─────┴─────┐      ┌──────┴──────┐     ┌──────┴──────┐
    │  OWNER    │      │   APP PCM   │     │   MOBILE    │
    │  Portal   │      │  (Gestão)   │     │  Experience │
    │           │      │             │     │             │
    │ owner.    │      │ tenant.     │     │ tenant.     │
    │ gppis.    │      │ gppis.      │     │ gppis.      │
    │ com.br    │      │ com.br      │     │ com.br      │
    └───────────┘      └─────────────┘     ├─────┬───────┤
                                           │     │       │
                                      MECÂNICO  SOLICIT.
                                      mobile-   mobile-
                                      first     first
```

**Princípio central**: Um banco de dados, um deploy, quatro experiências. O `effectiveRole` decide qual interface carregar.

---

## 🔍 DIAGNÓSTICO DO SISTEMA ATUAL

### O que JÁ temos (✅)

| Camada | Status | Onde está | Observações |
|--------|--------|-----------|-------------|
| **Owner** | ✅ Completo | `owner.gppis.com.br` → `Owner2.tsx` | 11 abas, domínio separado, visual executivo |
| **APP PCM (Gestão)** | ✅ Completo | `tenant.gppis.com.br` → `AppLayout` + sidebar | Dashboard, O.S., Planejamento, Análises, Catálogos, Relatórios |
| **Mecânico** | 🟡 Parcial | `/painel-mecanico` → `PainelMecanico.tsx` | Existe mas usa layout desktop com sidebar pesada |
| **Solicitante** | 🟡 Parcial | `/painel-operador` → `PainelOperador.tsx` | Existe mas interface complexa demais para operador |

### O que FALTA (❌)

| Item | Problema | Impacto |
|------|----------|---------|
| **Layout mobile dedicado** | Mecânico/Solicitante usam `AppLayout` com sidebar completa | Interface confusa, lenta, não-intuitiva no celular |
| **Botões grandes / touch** | Cards e botões com tamanho desktop (12-14px) | Difícil de operar com luvas/tela suja |
| **1 ação por vez (mecânico)** | Tela mostra dashboard + lista + busca tudo junto | Mecânico precisa de foco: ver OS → executar → próxima |
| **Ultra simplicidade (solicitante)** | PainelOperador tem abas, cards, SLA, tracking | Operador quer: abrir chamado → acompanhar → pronto |
| **Roteamento por experiência** | Todos entram no mesmo layout e veem sidebar | Deveria detectar role e carregar experiência apropriada |
| **Componentes Drawer/Sheet** | Formulários em modal desktop | Mobile precisa de drawer bottom-up |
| **Offline resilience** | PWA existe mas sem queue offline | Mecânico pode perder conexão na fábrica |

---

## 🎯 PLANO DE EXECUÇÃO — 4 FASES

### RESUMO EXECUTIVO

| Fase | Nome | Escopo | Arquivos Novos | Impacto |
|------|------|--------|----------------|---------|
| **1** | Layout Mobile + Roteamento | Criar `MobileLayout` + auto-detect role | ~5 arquivos | Estrutura base |
| **2** | Mecânico Mobile-First | Reescrever experiência do mecânico | ~4 arquivos | Execução no chão |
| **3** | Solicitante Ultra-Simples | Reescrever experiência do operador | ~3 arquivos | Abertura em 10s |
| **4** | Polish + PWA Offline | Refinamentos, offline queue, notificações | ~3 arquivos | Produção real |

---

## 📋 FASE 1 — LAYOUT MOBILE + ROTEAMENTO POR EXPERIÊNCIA

### Objetivo
Criar a infraestrutura que permite experiências diferentes por perfil, sem duplicar código de negócio.

### 1.1 — Novo `MobileLayout.tsx`

**Arquivo**: `src/components/layout/MobileLayout.tsx`

```
┌──────────────────────────────┐
│  TopBar (nome + empresa)     │ ← fixo, 56px
├──────────────────────────────┤
│                              │
│                              │
│        <Outlet />            │ ← conteúdo da experiência
│                              │
│                              │
├──────────────────────────────┤
│  BottomNav (3-4 botões)      │ ← fixo, 64px, touch-friendly
└──────────────────────────────┘
```

**TopBar**: Logo da empresa (via BrandingContext) + nome do usuário + botão logout  
**BottomNav**: Ícones grandes (28px) + label curto — muda conforme role:

| Role | Botão 1 | Botão 2 | Botão 3 | Botão 4 |
|------|---------|---------|---------|---------|
| TECHNICIAN | 🏠 Início | 📋 Minhas OS | ➕ Nova | ❓ Ajuda |
| SOLICITANTE | 🏠 Início | ➕ Solicitar | 📊 Status | ❓ Ajuda |

**Diferenças do AppLayout**:
- ❌ SEM sidebar (nunca)
- ❌ SEM GlobalSearch
- ❌ SEM subscription banner
- ✅ SafeArea insets (mobile PWA)
- ✅ `pb-safe` / `pt-safe` para iOS
- ✅ Scroll natural com overscroll-behavior

### 1.2 — Roteamento Automático por Experiência

**Arquivo**: `src/components/layout/ExperienceRouter.tsx`

```typescript
// Lógica de decisão no nível do route wrapper
function ExperienceRouter() {
  const { effectiveRole } = useAuth();
  
  // Roles que usam experiência mobile
  const mobileRoles = ['TECHNICIAN', 'SOLICITANTE'];
  const isMobileExperience = mobileRoles.includes(effectiveRole);
  
  if (isMobileExperience) {
    return <MobileLayout />;    // → BottomNav + Outlet
  }
  
  return <AppLayout />;         // → Sidebar + Outlet (gestão)
}
```

**Mudança no App.tsx**:
```tsx
// Antes (atual):
<Route element={<AppLayout />}>
  <Route path="/dashboard" element={<Dashboard />} />
  ...
</Route>

// Depois (proposto):
<Route element={<ExperienceRouter />}>
  <Route path="/dashboard" element={<Dashboard />} />
  
  {/* Rotas compartilhadas (ambos layouts renderizam) */}
  <Route path="/solicitacoes" ... />
  <Route path="/os/historico" ... />
  <Route path="/suporte" ... />
  <Route path="/manuais-operacao/*" ... />
  
  {/* Rotas exclusivas gestão (guard já bloqueia mobile roles) */}
  <Route path="/backlog" ... />
  <Route path="/programacao" ... />
  ...
  
  {/* Rotas exclusivas mobile */}
  <Route path="/painel-mecanico" ... />
  <Route path="/painel-operador" ... />
  <Route path="/mecanico/*" ... />       {/* NOVAS */}
  <Route path="/operador/*" ... />       {/* NOVAS */}
</Route>
```

### 1.3 — CSS Utilities para Mobile

**Arquivo**: `src/styles/mobile.css` (importado em `main.tsx`)

```css
/* Touch targets mínimos 48px (WCAG 2.5.5) */
.touch-target { min-height: 48px; min-width: 48px; }

/* Botão grande para chão de fábrica */
.btn-factory {
  @apply h-14 text-lg font-semibold rounded-xl px-6;
  @apply active:scale-95 transition-transform;
}

/* Card touch-optimized */
.card-touch {
  @apply p-5 rounded-xl border-2 active:bg-muted/50;
  @apply transition-colors;
}

/* Safe areas iOS PWA */
.pb-safe { padding-bottom: env(safe-area-inset-bottom, 16px); }
.pt-safe { padding-top: env(safe-area-inset-top, 0px); }

/* Bottom nav fixa */
.bottom-nav {
  @apply fixed bottom-0 left-0 right-0 z-50;
  @apply bg-background/95 backdrop-blur border-t;
  @apply pb-safe;
}
```

### Entregáveis Fase 1

| # | Arquivo | Tipo | Linhas Est. |
|---|---------|------|-------------|
| 1 | `src/components/layout/MobileLayout.tsx` | Novo | ~120 |
| 2 | `src/components/layout/MobileBottomNav.tsx` | Novo | ~80 |
| 3 | `src/components/layout/MobileTopBar.tsx` | Novo | ~50 |
| 4 | `src/components/layout/ExperienceRouter.tsx` | Novo | ~40 |
| 5 | `src/styles/mobile.css` | Novo | ~50 |
| 6 | `src/App.tsx` | Modificado | +20 |
| 7 | `src/components/layout/AppLayout.tsx` | Modificado | ~5 (remover guard duplicado) |

---

## 📋 FASE 2 — MECÂNICO MOBILE-FIRST

### Objetivo
Mecânico entra no sistema → vê suas O.S. → executa → próxima. Zero burocracia.

### 2.1 — Tela Inicial do Mecânico

**Arquivo**: `src/pages/mecanico/MecanicoHome.tsx`

```
┌──────────────────────────────┐
│  Bom dia, João!              │
│  3 O.S. pendentes            │
├──────────────────────────────┤
│                              │
│  ┌────────┐  ┌────────┐     │
│  │🔴 3    │  │🟡 1    │     │   ← Cards grandes
│  │Urgentes│  │Em And. │     │      toque para filtrar
│  └────────┘  └────────┘     │
│                              │
│  ═══════════════════════     │
│                              │
│  ┌──────────────────────┐   │   ← Lista de O.S. por prioridade
│  │ 🔴 OS #1042          │   │      card grande com borda colorida
│  │ Esteira T-03 · TAG   │   │
│  │ Motor travado         │   │
│  │ [  ▶ EXECUTAR  ]     │   │   ← Botão gigante (h-14)
│  └──────────────────────┘   │
│                              │
│  ┌──────────────────────┐   │
│  │ 🟠 OS #1038          │   │
│  │ Compressor C-12      │   │
│  │ Vazamento de óleo     │   │
│  │ [  ▶ EXECUTAR  ]     │   │
│  └──────────────────────┘   │
│                              │
├──────────────────────────────┤
│  🏠    📋    ➕    ❓       │  ← BottomNav
└──────────────────────────────┘
```

**Características**:
- Sem tabs nem busca na tela principal (filtro por card de resumo)
- Cards ordenados por prioridade (URGENTE primeiro, sempre)
- Botão "EXECUTAR" ocupa largura total dentro do card
- Pull-to-refresh nativo (via react-query `refetchOnWindowFocus`)
- Swipe left no card → opção de "Pausar" ou "Ver Detalhes"

### 2.2 — Tela de Execução de O.S.

**Arquivo**: `src/pages/mecanico/MecanicoExecucao.tsx`

```
┌──────────────────────────────┐
│  ← Voltar    OS #1042        │
├──────────────────────────────┤
│                              │
│  🔴 URGENTE                  │
│  Esteira Transportadora T-03 │
│  Motor travado / sem giro    │
│                              │
│  ┌──────────────────────┐   │
│  │ ▶ INICIAR EXECUÇÃO   │   │  ← Botão verde gigante
│  └──────────────────────┘   │
│                              │
│  ── Ações ──────────────     │
│                              │
│  📷 Tirar Foto               │  ← Abre câmera nativa
│  📝 Observações              │  ← Drawer bottom-up  
│  🔧 Materiais Usados         │  ← Drawer com lista rápida
│  ✅ Checklist                 │  ← Drawer com checks
│                              │
│  ┌──────────────────────┐   │
│  │ ✔ FINALIZAR O.S.    │   │  ← Botão azul (aparece após iniciar)
│  └──────────────────────┘   │
│                              │
│  ⏱ Tempo: 00:45:23          │  ← Cronômetro ao vivo
│                              │
├──────────────────────────────┤
│  🏠    📋    ➕    ❓       │
└──────────────────────────────┘
```

**Fluxo de execução**:
```
Ver O.S. → [INICIAR] → cronômetro roda
  ↓
Inserir materiais (opcional)
Tirar fotos (opcional)
Preencher checklist (se houver)
  ↓
[FINALIZAR] → observação obrigatória → confirma → volta à lista
```

**Componentes usados**:
- `Drawer` (bottom-up) para fotos, materiais, obs → já temos `drawer.tsx`
- `Sheet` para checklist lateral → já temos `sheet.tsx`
- Câmera nativa via `<input type="file" accept="image/*" capture="environment">`

### 2.3 — Nova Solicitação (Mobile)

**Arquivo**: `src/pages/mecanico/MecanicoNovaSolicitacao.tsx`

```
┌──────────────────────────────┐
│  ← Voltar    Nova Solicitação│
├──────────────────────────────┤
│                              │
│  Equipamento *               │
│  ┌──────────────────────┐   │
│  │ 🔍 Buscar por TAG... │   │  ← Select com busca
│  └──────────────────────┘   │
│                              │
│  Problema *                  │
│  ┌──────────────────────┐   │
│  │                      │   │  ← Textarea grande
│  │                      │   │
│  └──────────────────────┘   │
│                              │
│  Impacto                     │
│  [ Parada total ]            │  ← Select simples
│  [ Reduz produção ]          │
│  [ Sem impacto ]             │
│                              │
│  📷 Anexar foto (opcional)   │
│                              │
│  ┌──────────────────────┐   │
│  │  📤 ENVIAR           │   │  ← Botão grande
│  └──────────────────────┘   │
│                              │
├──────────────────────────────┤
│  🏠    📋    ➕    ❓       │
└──────────────────────────────┘
```

### Entregáveis Fase 2

| # | Arquivo | Tipo | Linhas Est. |
|---|---------|------|-------------|
| 1 | `src/pages/mecanico/MecanicoHome.tsx` | Novo | ~200 |
| 2 | `src/pages/mecanico/MecanicoExecucao.tsx` | Novo | ~300 |
| 3 | `src/pages/mecanico/MecanicoNovaSolicitacao.tsx` | Novo | ~150 |
| 4 | `src/pages/mecanico/MecanicoHistorico.tsx` | Novo | ~120 |
| 5 | `src/App.tsx` | Modificado | +10 rotas |

**Hooks reutilizados** (zero duplicação de lógica):
- `useOrdensServico()` — já existente
- `useMecanicosAtivos()` — já existente
- `useCreateSolicitacao()` — já existente
- `useExecucoesOS()` — já existente

---

## 📋 FASE 3 — SOLICITANTE ULTRA-SIMPLES

### Objetivo
Operador abre solicitação em **10 segundos**. Acompanha status com **1 toque**.

### 3.1 — Tela Inicial do Solicitante

**Arquivo**: `src/pages/operador/OperadorHome.tsx`

```
┌──────────────────────────────┐
│  Bem-vindo, Maria!           │
│  Produção · Turno B          │
├──────────────────────────────┤
│                              │
│                              │
│  ┌──────────────────────┐   │
│  │                      │   │
│  │   🔧 ABRIR           │   │   ← BOTÃO GIGANTE (h-24)
│  │   SOLICITAÇÃO         │   │      cor primária
│  │                      │   │      domina a tela
│  └──────────────────────┘   │
│                              │
│                              │
│  ─ Minhas Solicitações ──   │
│                              │
│  ┌──────────────────────┐   │
│  │ 🟡 #SOL-1245         │   │   ← Status com cor
│  │ Esteira T-03          │   │
│  │ PENDENTE · há 2h      │   │
│  └──────────────────────┘   │
│                              │
│  ┌──────────────────────┐   │
│  │ 🔵 #SOL-1240         │   │
│  │ Compressor C-12       │   │
│  │ APROVADA · OS #1042   │   │   ← Link para OS gerada
│  └──────────────────────┘   │
│                              │
├──────────────────────────────┤
│  🏠    ➕    📊    ❓       │
└──────────────────────────────┘
```

**Características**:
- Botão "ABRIR SOLICITAÇÃO" ocupa ~40% da tela
- Lista abaixo mostra apenas as últimas 5 solicitações do usuário
- Zero filtros, zero abas — scroll natural
- Toque no card → drawer com detalhe + status da OS vinculada

### 3.2 — Fluxo de Abertura Rápida

**Arquivo**: `src/pages/operador/OperadorNovaSolicitacao.tsx`

```
┌──────────────────────────────┐
│  ← Voltar    Nova Solicitação│
├──────────────────────────────┤
│                              │
│  O que está acontecendo? *   │
│  ┌──────────────────────┐   │
│  │ 🔍 Selecione o       │   │  ← Equipamento com busca
│  │    equipamento        │   │     por TAG ou nome
│  └──────────────────────┘   │
│                              │
│  Descreva o problema *       │
│  ┌──────────────────────┐   │
│  │ Ex: motor fazendo     │   │  ← Textarea com placeholder
│  │ barulho estranho      │   │     descritivo
│  └──────────────────────┘   │
│                              │
│  Quão grave é?               │
│  ┌────┐ ┌────┐ ┌────┐       │  ← 3 botões visuais
│  │ 🔴 │ │ 🟡 │ │ 🟢 │       │     Parou · Reduzido · Normal
│  │Para│ │Lento│ │ OK │       │
│  └────┘ └────┘ └────┘       │
│                              │
│  📷 Foto (opcional)          │
│                              │
│  ┌──────────────────────┐   │
│  │  📤 ENVIAR           │   │
│  └──────────────────────┘   │
│                              │
│  ✅ Solicitação enviada!     │  ← Feedback visual imediato
│     Acompanhe pelo painel.   │
│                              │
├──────────────────────────────┤
│  🏠    ➕    📊    ❓       │
└──────────────────────────────┘
```

**Diferencial**: Campo "Quão grave é?" com 3 botões grandes (vermelho/amarelo/verde) em vez de dropdown. Operador escolhe em 1 toque.

### 3.3 — Status Detalhado (Drawer)

Ao tocar em uma solicitação da lista:

```
┌──────────────────────────────┐
│  ══════════════ (handle)     │  ← Drawer bottom-up
│                              │
│  Solicitação #SOL-1245       │
│  ───────────────────────     │
│                              │
│  🏭 Esteira T-03             │
│  📝 Motor fazendo barulho    │
│  🔴 Parada total             │
│                              │
│  ── Timeline ──────────      │
│                              │
│  ✅ Aberta · 14:30 hoje      │
│  ✅ Aprovada · 14:45          │
│  🔄 OS #1042 gerada          │
│  ⏳ Aguardando execução      │
│                              │
│  ┌──────────────────────┐   │
│  │  Fechar               │   │
│  └──────────────────────┘   │
└──────────────────────────────┘
```

### Entregáveis Fase 3

| # | Arquivo | Tipo | Linhas Est. |
|---|---------|------|-------------|
| 1 | `src/pages/operador/OperadorHome.tsx` | Novo | ~150 |
| 2 | `src/pages/operador/OperadorNovaSolicitacao.tsx` | Novo | ~180 |
| 3 | `src/pages/operador/OperadorHistorico.tsx` | Novo | ~100 |
| 4 | `src/App.tsx` | Modificado | +5 rotas |

**Hooks reutilizados**:
- `useSolicitacoes()` — já existente
- `useCreateSolicitacao()` — já existente
- `useEquipamentos()` — já existente
- `useOrdensServico()` — para vincular OS à solicitação

---

## 📋 FASE 4 — POLISH + PWA OFFLINE + NOTIFICAÇÕES

### 4.1 — Offline Queue

**Arquivo**: `src/lib/offlineQueue.ts`

```typescript
// Quando offline, salva ação no IndexedDB
// Quando online novamente, drena a queue
type OfflineAction = {
  id: string;
  type: 'create_solicitacao' | 'update_os_status' | 'add_material' | 'upload_photo';
  payload: Record<string, unknown>;
  createdAt: string;
};
```

**Cenários cobertos**:
- Mecânico inicia OS sem internet → salva localmente → sincroniza quando voltar
- Solicitante abre chamado offline → queue → envia quando reconectar
- Indicador visual: "📡 Offline — ações serão enviadas quando reconectar"

### 4.2 — Notificações Push

- Service Worker já ativo (VitePWA autoUpdate)
- Adicionar `Notification.requestPermission()` no primeiro login mobile
- Gatilhos:
  - Nova O.S. atribuída ao mecânico
  - Solicitação aprovada/rejeitada para o operador
  - O.S. finalizada (para planejador)

### 4.3 — Haptic Feedback

```typescript
// Feedback tátil em ações críticas (mobile)
function haptic(type: 'light' | 'medium' | 'heavy' = 'light') {
  if ('vibrate' in navigator) {
    const patterns = { light: [10], medium: [20], heavy: [30, 10, 30] };
    navigator.vibrate(patterns[type]);
  }
}
```

### 4.4 — Temas por Perfil

Não é necessário trocar cores, mas ajustar **densidade visual**:

| Perfil | Espaçamento | Fonte | Cards |
|--------|-------------|-------|-------|
| Gestão (desktop) | Compacto, `gap-3` | 14px | Densos, muitos dados |
| Mecânico (mobile) | Espaçoso, `gap-4` | 16-18px | Grandes, 1 ação por card |
| Solicitante (mobile) | Muito espaçoso, `gap-5` | 18-20px | Mínimos, foco em botão |
| Owner (desktop) | Compacto, executivo | 14px | Métricas + gráficos |

---

## 🗺️ MAPA DE ROTAS FINAL

### Rotas Compartilhadas (ambos layouts)

| Rota | Componente | Quem vê |
|------|-----------|---------|
| `/dashboard` | Dashboard | Todos |
| `/solicitacoes` | Solicitacoes | Todos |
| `/suporte` | Suporte | Todos |
| `/manuais-operacao/*` | ManualOperacao | Todos |

### Rotas Gestão (AppLayout — sidebar)

| Rota | Componente | Role mínimo |
|------|-----------|-------------|
| `/backlog` | Backlog | MANAGER+ |
| `/os/nova` | NovaOS | PLANNER+ |
| `/os/fechar` | FecharOS | PLANNER+ |
| `/os/historico` | HistoricoOS | Todos |
| `/programacao` | Programacao | PLANNER+ |
| `/preventiva` | Preventiva | PLANNER+ |
| `/preditiva` | Preditiva | PLANNER+ |
| `/hierarquia`, `/equipamentos`, etc. | Cadastros | ADMIN+ |
| `/custos`, `/relatorios` | Relatórios | ADMIN+ |
| `/administracao` | Administração | ADMIN |
| `/master-ti` | MasterTI | MASTER_TI |

### Rotas Mecânico (MobileLayout — bottom nav)

| Rota | Componente | Descr. |
|------|-----------|--------|
| `/mecanico` | MecanicoHome | Dashboard com O.S. pendentes |
| `/mecanico/os/:id` | MecanicoExecucao | Execução da O.S. (iniciar/finalizar/fotos/materiais) |
| `/mecanico/solicitar` | MecanicoNovaSolicitacao | Abrir solicitação rápida |
| `/mecanico/historico` | MecanicoHistorico | O.S. fechadas pelo mecânico |

### Rotas Solicitante (MobileLayout — bottom nav)

| Rota | Componente | Descr. |
|------|-----------|--------|
| `/operador` | OperadorHome | Botão grande + últimas solicitações |
| `/operador/solicitar` | OperadorNovaSolicitacao | Formulário ultra-simples (3 campos) |
| `/operador/historico` | OperadorHistorico | Todas as solicitações do usuário |

### Rota Owner (OwnerPortalLayout — separada)

| Rota | Componente |
|------|-----------|
| `/` (owner domain) | Owner2 |

---

## 🔄 REDIRECT POR ROLE NO LOGIN

```typescript
// Após login bem-sucedido, redirecionar para experiência correta
function getDefaultRoute(role: AppRole): string {
  switch (role) {
    case 'SYSTEM_OWNER':
    case 'SYSTEM_ADMIN':
      return '/';              // Owner portal (domínio owner)
    case 'TECHNICIAN':
      return '/mecanico';       // Mobile mecânico
    case 'SOLICITANTE':
      return '/operador';       // Mobile operador
    default:
      return '/dashboard';      // Gestão desktop
  }
}
```

---

## 📊 INVENTÁRIO DE REUSO

### Hooks que NÃO mudam (compartilhados por todas as camadas)

| Hook | Usado por |
|------|----------|
| `useOrdensServico()` | Gestão + Mecânico |
| `useSolicitacoes()` | Gestão + Solicitante + Mecânico |
| `useCreateSolicitacao()` | Solicitante + Mecânico |
| `useMecanicosAtivos()` | Gestão + Mecânico |
| `useExecucoesOS()` | Gestão + Mecânico |
| `useEquipamentos()` | Gestão + Solicitante + Mecânico |
| `useAuth()` | Todos |
| `useBranding()` | Todos |
| `useIsMobile()` | MobileLayout |

### Componentes UI reutilizados

| Componente | Existe? | Usado em |
|-----------|---------|----------|
| `Button` | ✅ | Todas as camadas (variants diferentes) |
| `Card` | ✅ | Todas as camadas |
| `Badge` | ✅ | Todas as camadas |
| `Drawer` | ✅ | Mobile (fotos, materiais, detalhes) |
| `Sheet` | ✅ | Mobile (checklist lateral) |
| `Input` | ✅ | Todas as camadas |
| `Tabs` | ✅ | Gestão (desktop) — NÃO usa em mobile |

---

## ⏱️ ORDEM DE IMPLEMENTAÇÃO SUGERIDA

```
FASE 1 (Infraestrutura)
  ├── 1.1 MobileLayout + TopBar + BottomNav
  ├── 1.2 ExperienceRouter
  ├── 1.3 CSS mobile utilities
  └── 1.4 Ajustar App.tsx e guards
  
FASE 2 (Mecânico)
  ├── 2.1 MecanicoHome (lista O.S. mobile-first)
  ├── 2.2 MecanicoExecucao (workflow completo)
  ├── 2.3 MecanicoNovaSolicitacao
  └── 2.4 MecanicoHistorico
  
FASE 3 (Solicitante)
  ├── 3.1 OperadorHome (botão gigante + lista)
  ├── 3.2 OperadorNovaSolicitacao (3 campos)
  └── 3.3 OperadorHistorico (drawer timeline)

FASE 4 (Polish)
  ├── 4.1 Offline queue (IndexedDB)
  ├── 4.2 Push notifications
  ├── 4.3 Haptic feedback
  └── 4.4 Testes E2E mobile
```

---

## 🚫 O QUE NÃO MUDA

| Item | Razão |
|------|-------|
| Owner portal | Já está perfeito, domínio separado, visual executivo |
| Dashboard gestão | Funciona bem para planejador/supervisor |
| Sidebar gestão | Adequada para desktop (roles MANAGER+) |
| Backend / Supabase | Zero mudança — tudo via hooks existentes |
| Edge Functions | Nenhuma nova necessária |
| RLS policies | Já isolam por tenant — funciona para mobile |
| Hooks de dados | Apenas consumidos — sem duplicação |

---

## 💡 REGRA DE OURO IMPLEMENTADA

> **"Cada usuário só vê o que precisa para fazer bem o trabalho dele."**

| Perfil | Vê | Não vê |
|--------|-----|--------|
| **Planejador** | Dashboard, O.S., Planejamento, Análises, Catálogos, Relatórios | Owner, Mecânico mobile, Operador mobile |
| **Owner** | Portal multiempresa, métricas globais, financeiro | O.S., Mecânico mobile, Operador mobile |
| **Mecânico** | Suas O.S., execução, fotos, materiais, histórico | Dashboard completo, Planejamento, Catálogos, Relatórios |
| **Solicitante** | Botão abrir solicitação, status, timeline | O.S., Dashboard completo, Catálogos, Planejamento |

---

## ✅ CHECKLIST PRÉ-IMPLEMENTAÇÃO

- [ ] Revisão e aprovação deste projeto
- [ ] Decidir se PainelMecanico.tsx/PainelOperador.tsx atuais continuam como "versão desktop" ou são substituídos
- [ ] Confirmar se mecânico terá login separado (código+senha como hoje) ou via conta Supabase
- [ ] Definir se haverá captura de foto com upload para Supabase Storage
- [ ] Priorizar: começar pela Fase 1 + Fase 2 (mecânico) ou Fase 1 + Fase 3 (solicitante)?

---

*Documento gerado em 25/03/2026 — PCM Estratégico v4 Camadas*
