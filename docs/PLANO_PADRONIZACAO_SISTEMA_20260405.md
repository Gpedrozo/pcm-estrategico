# PLANO DE PADRONIZAÇÃO COMPLETA — PCM Estratégico
**Data:** 05/04/2026  
**Escopo:** Web (47 páginas) + App Mecânico (17 telas ativas)  
**Objetivo:** Eliminar todas as inconsistências de UX/comportamento que dão aspecto não profissional ao sistema.

---

## DIAGNÓSTICO: O que está errado hoje

### Resumo das inconformidades encontradas

| # | Problema | Onde afeta | Gravidade |
|---|---------|------------|-----------|
| 1 | **Formulários não resetam** após submit | NovaOS (app), FecharOS (ambos), Solicitações, Parada | 🔴 Crítica |
| 2 | **Feedback inconsistente** — web usa toast/sonner, app usa Alert.alert() misturado | Todo app mobile | 🔴 Crítica |
| 3 | **Loading states diferentes** — `loading`, `saving`, `refreshing`, `isLoading`, `loadingDetail` | Todos | 🟠 Alta |
| 4 | **Sem validação padronizada** — cada form valida do seu jeito | Todos os forms | 🟠 Alta |
| 5 | **Erros genéricos** — tudo vira "Falha ao..." sem diferenciar rede/permissão/validação | Todos | 🟠 Alta |
| 6 | **Sem confirmação em ações destrutivas** — excluir, cancelar OS sem confirmar | Web parcial | 🟠 Alta |
| 7 | **Espaçamentos hardcoded** — 12, 16, 20, 24 misturados sem padrão | App mobile | 🟡 Média |
| 8 | **Sem empty states uniformes** — algumas listas mostram vazio sem explicação | Web + App | 🟡 Média |
| 9 | **Sem skeleton/placeholder** — tudo spinner, sem feedback visual rico | App mobile | 🟡 Média |
| 10 | **Pull-to-refresh inconsistente** — Home tem, detalhe de OS não | App mobile | 🟡 Média |
| 11 | **Telas v1 obsoletas** não removidas — HomeScreen, OSDetailScreen, etc. | App mobile | 🟡 Média |
| 12 | **Sem Error Boundary global** no app mobile | App mobile | 🟠 Alta |
| 13 | **Sem debounce em filtros/buscas** — cada tecla dispara query | Web + App | 🟡 Média |
| 14 | **Campos disabled durante saving** — inconsistente entre telas | Todos os forms | 🟡 Média |
| 15 | **Mensagens de sucesso/erro sem padrão** — textos diferentes para operações iguais | Todos | 🟡 Média |

---

## PLANO DE EXECUÇÃO — 6 FASES

---

### FASE 1 — INFRAESTRUTURA DE PADRÕES (Base para tudo)
**Estimativa:** Primeiro bloco de trabalho  
**Impacto:** Cria os alicerces reutilizáveis

#### 1.1 — Criar sistema de design tokens (App Mobile)

**Arquivo:** `mecanico-app/src/theme/spacing.ts`
```
SPACING = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 }
RADIUS  = { sm: 6, md: 8, lg: 12, xl: 16, full: 999 }
FONT    = { xs: 11, sm: 13, md: 15, lg: 17, xl: 20, xxl: 24, title: 28 }
```
**O que muda:** Todos os `marginBottom: 16`, `padding: 12`, `borderRadius: 8` passam a usar tokens. Garante consistência visual em toda a app.

#### 1.2 — Criar componentes UI atômicos (App Mobile)

Hoje o app usa `TouchableOpacity`, `TextInput`, `View` direto. Vamos criar:

| Componente | Função | Props padrão |
|-----------|--------|-------------|
| `<Button>` | Botão primário/secundário/destructive/ghost | `variant, size, loading, disabled, onPress` |
| `<Input>` | Campo de texto com label + erro | `label, error, placeholder, value, onChangeText` |
| `<Select>` | Lista de opções (modal picker) | `label, options, value, onChange` |
| `<FormField>` | Wrapper label + componente + mensagem erro | `label, error, required, children` |
| `<ConfirmDialog>` | Alerta de confirmação bonito | `title, message, onConfirm, onCancel, destructive` |
| `<StatusBadge>` | Badge colorido de status | `status, size` |

**Onde:** `mecanico-app/src/components/ui/`

**O que muda:** Toda tela passa a usar os mesmos componentes. Botões, inputs, seleções ficam visualmente idênticos em toda a app.

#### 1.3 — Criar hook `useFormState` (App Mobile)

```typescript
function useFormState<T>(initial: T) {
  const [data, setData] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
  
  const reset = () => { setData(initial); setErrors({}); };
  const setField = (key: keyof T, value: any) => { ... };
  const validate = (rules: ValidationRules<T>) => { ... };
  
  return { data, saving, errors, setSaving, setField, reset, validate };
}
```

**O que muda:** Todo formulário usa a mesma lógica de estado. Reset fica garantido. Validação fica uniforme.

#### 1.4 — Criar hook `useSupabaseQuery` (App Mobile)

```typescript
function useSupabaseQuery<T>(queryFn: () => Promise<T>, deps: any[]) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  
  const load = useCallback(async () => { ... }, deps);
  const refresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };
  
  return { data, loading, error, refreshing, refresh, reload: load };
}
```

**O que muda:** Todas as telas usam o mesmo padrão de loading/error/refresh. Sem mais `useState(true)` + `useEffect` repetido em cada tela.

#### 1.5 — Criar sistema de mensagens padronizado (App Mobile)

```typescript
// lib/feedback.ts
const showSuccess = (message: string, onDismiss?: () => void) => { ... };
const showError = (error: unknown) => {
  const msg = parseError(error); // Diferencia: rede, permissão, validação
  Alert.alert('Erro', msg);
};
const showConfirm = (title: string, message: string, onConfirm: () => void) => { ... };
```

**O que muda:** Mensagens de sucesso, erro e confirmação ficam padronizadas em toda a app. Erros de rede dizem "Sem conexão", erros de permissão dizem "Sem permissão", etc.

---

### FASE 2 — PADRONIZAÇÃO DE FORMULÁRIOS
**Impacto:** Resolve diretamente o bug reportado (OS não limpa após emissão)

#### 2.1 — CriarOSScreenV2 (App) — Reset completo após submit

**Problema atual:** Após criar OS, faz `nav.goBack()` mas se o stack mantém a tela montada, o estado persiste.  
**Correção:**
1. Migrar para `useFormState` com `reset()` explícito após sucesso
2. Limpar **todos** os campos: `selectedEquip`, `problema`, `solicitante`, `tipo`, `prioridade`, `mecanicoResp`
3. Mostrar feedback de sucesso ANTES do reset
4. Reset + `nav.goBack()` no callback do Alert

#### 2.2 — FecharOSScreen (App) — Reset após fechamento

**Problema atual:** 5+ estados (`dataInicio`, `horaInicio`, `pausas`, `materiais`, `custos`) nunca são resetados.  
**Correção:**
1. Consolidar em um único objeto `useFormState`
2. `reset()` no callback de sucesso antes do `goBack()`

#### 2.3 — CriarSolicitacaoScreen (App) — Garantir reset

**Status atual:** Usa `goBack()` (ok se stack desmonta). Adicionar `reset()` explícito como garantia.

#### 2.4 — RequisicaoMaterialScreen (App) — Adicionar reset

#### 2.5 — SolicitarServicoScreen (App) — Adicionar reset

#### 2.6 — ParadaScreen (App) — Adicionar reset

#### 2.7 — Padronizar todos os forms Web que usam `useFormDraft`

**Status atual web:** A maioria já usa `clearDraft()` ✅. Auditar para garantir 100% de cobertura:
- Verificar se `clearDraft()` é chamado em **todos** os caminhos de sucesso
- Verificar se dialog de form limpa ao fechar (não só no submit)
- Garantir que ao **editar** e depois **criar novo**, os dados do edit não poluem o form de criação

#### 2.8 — Regra: Disabled durante saving

**Toda tela que tem form:** enquanto `saving === true`:
- Botão submit mostra spinner + texto "Salvando..."
- Todos os inputs ficam `editable={false}` / `pointerEvents="none"`
- Botão voltar fica desabilitado

---

### FASE 3 — PADRONIZAÇÃO DE FEEDBACK E UX
**Impacto:** Sistema parece profissional e responsivo

#### 3.1 — Padronizar mensagens de sucesso

| Operação | Mensagem padrão |
|----------|----------------|
| Criar OS | "O.S. #XXXX criada com sucesso" |
| Fechar OS | "O.S. #XXXX encerrada com sucesso" |
| Criar Solicitação | "Solicitação registrada com sucesso" |
| Requisição Material | "Requisição enviada com sucesso" |
| Registrar Parada | "Parada registrada com sucesso" |
| Editar qualquer item | "Alterações salvas com sucesso" |
| Excluir qualquer item | "Item excluído com sucesso" |

#### 3.2 — Padronizar mensagens de erro

| Tipo de erro | Mensagem |
|-------------|---------|
| Rede/timeout | "Sem conexão com o servidor. Verifique sua internet." |
| Permissão (RLS) | "Você não tem permissão para esta operação." |
| Validação server | "Dados inválidos: {detalhe}" |
| Conflito | "Este registro foi alterado por outro usuário. Atualize a página." |
| Genérico | "Ocorreu um erro inesperado. Tente novamente." |

#### 3.3 — Adicionar confirmação em ações destrutivas

Toda ação que **exclui, cancela ou reverte** dados deve passar por `showConfirm()`:
- Cancelar OS
- Excluir equipamento/mecânico/material
- Descartar form com dados preenchidos (botão voltar)
- Logout

#### 3.4 — Padronizar loading states (App Mobile)

| Cenário | Componente |
|---------|-----------|
| Primeiro carregamento | `<LoadingScreen message="Carregando..." />` |
| Pull-to-refresh | `<RefreshControl>` em TODAS as listas |
| Botão submit | Spinner DENTRO do botão + disabled |
| Carregamento de detalhe | Spinner inline no card/modal |
| Busca/filtro | Debounce 300ms + spinner pequeno |

#### 3.5 — Padronizar estados vazios

Toda lista com 0 itens mostra `<EmptyState>` padronizado:
```
icon: ícone contextual
title: "Nenhuma O.S. encontrada"
subtitle: "Não há ordens de serviço com os filtros selecionados."
action?: "Criar nova O.S." (botão opcional)
```

#### 3.6 — Web: Unificar toast vs sonner

**Problema:** Web tem **dois** sistemas de notificação: `useToast` (shadcn) + `Sonner` (toast library).  
**Correção:** Escolher **um** (Sonner — mais moderno) e migrar tudo.

---

### FASE 4 — PADRONIZAÇÃO DE NAVEGAÇÃO E FLUXOS
**Impacto:** Navegação previsível e consistente

#### 4.1 — App Mobile: Fluxo pós-submit padronizado

```
Submit → Success toast → Reset form → Navigate back (ou to detail)
Submit → Error toast → Manter form preenchido → Foco no campo com erro
```

**Todas as telas seguem exatamente este fluxo**, sem exceção.

#### 4.2 — App Mobile: Pull-to-refresh em TODAS as telas com lista

Telas que precisam adicionar `RefreshControl`:
- `OSDetailScreenV2` (execuções da OS)
- `SolicitacaoDetalheScreen` (dados da solicitação)
- `EquipamentoDetalheScreen` (dados + componentes)
- `CatalogoScreen` (equipamentos)
- `AgendaScreen` (agenda)

#### 4.3 — App Mobile: Remover telas v1 obsoletas

Excluir do projeto (com confirmação):
- `HomeScreen.tsx` (substituído por `HomeScreenV2`)
- `OSDetailScreen.tsx` (substituído por `OSDetailScreenV2`)
- `CriarOSScreen.tsx` (substituído por `CriarOSScreenV2`)
- `HistoryScreen.tsx` (substituído por `HistoricoScreenV2`)
- `SolicitacoesListScreen.tsx` (substituído por `SolicitacoesListScreenV2`)

Isso elimina confusão de manutenção e reduz tamanho do bundle.

#### 4.4 — Web: Garantir navegação pós-submit consistente

Todas as páginas web após submit bem-sucedido:
1. `toast.success("mensagem")` (Sonner)
2. `clearDraft()` (limpa rascunho)
3. `queryClient.invalidateQueries()` (atualiza lista)
4. Fechar dialog/sheet se era modal
5. Se era página full: voltar para lista

#### 4.5 — Error Boundary global (App Mobile)

Criar `<ErrorBoundary>` que envolve `<RootNavigator>`:
- Captura erros fatais que crashariam o app
- Mostra tela com "Algo deu errado" + botão "Tentar novamente"
- Loga o erro para console (futuro: Sentry)

---

### FASE 5 — PADRONIZAÇÃO DE CÓDIGO E DADOS
**Impacto:** Código limpo, manutenível, sem surpresas

#### 5.1 — App Mobile: Consolidar padrão de data fetching

Todas as telas devem usar `useSupabaseQuery`:
```tsx
// ANTES (padrão caótico)
const [data, setData] = useState([]);
const [loading, setLoading] = useState(true);
useEffect(() => { load().finally(() => setLoading(false)); }, []);

// DEPOIS (padronizado)
const { data, loading, refreshing, refresh } = useSupabaseQuery(
  () => supabase.from('ordens_servico').select('*').eq('empresa_id', empresaId),
  [empresaId]
);
```

Telas afetadas: **todas as 17 telas ativas**.

#### 5.2 — App Mobile: Padronizar nomes de estado

| Antes (caótico) | Depois (padrão) |
|----------------|-----------------|
| `loading` / `isLoading` / `loadingDetail` | `loading` (do hook) |
| `saving` / `submitting` | `saving` (do useFormState) |
| `refreshing` | `refreshing` (do hook) |
| `searchLoading` | Removido (usar debounce) |

#### 5.3 — Debounce em filtros/busca

Toda busca textual com mínimo 300ms de debounce:
```tsx
const debouncedSearch = useMemo(
  () => debounce((text: string) => setFilter(text), 300),
  []
);
```

Telas afetadas: `CriarOSScreenV2` (busca equipamento), `CatalogoScreen`, `HistoricoScreenV2` (filtro texto).

#### 5.4 — Web: Auditar hooks de dados para consistência

Garantir que todos os 25+ hooks de dados seguem o mesmo padrão:
```tsx
export function useXXX() {
  return useQuery({
    queryKey: ['xxx', empresaId],
    queryFn: async () => { ... },
    enabled: !!empresaId,
  });
}
```

---

### FASE 6 — POLISH FINAL E DOCUMENTAÇÃO
**Impacto:** Acabamento profissional

#### 6.1 — Revisão visual de consistência

- Todos os ícones seguem a mesma família (Lucide ou MaterialIcons)
- Cores de status uniformes: `ABERTA=azul`, `EM_ANDAMENTO=amarelo`, `FECHADA=verde`, `CANCELADA=cinza`
- Tipografia uniforme: títulos, subtítulos, labels, body text

#### 6.2 — Animações micro-interação (App Mobile)

- Transição suave ao abrir/fechar modal
- Feedback tátil (Haptics) ao tocar botões importantes
- Skeleton loader em listas durante primeiro carregamento

#### 6.3 — Atualizar documentação técnica

- Documemntar os design tokens
- Documentar padrão de formulários
- Documentar padrão de hooks
- Documentar fluxo de submit

---

## CHECKLIST DE CONFORMIDADE POR TELA

### App Mobile (17 telas ativas)

| Tela | Reset | Loading | Empty | Refresh | Confirm | Feedback | Disabled |
|------|-------|---------|-------|---------|---------|----------|----------|
| HomeScreenV2 | N/A | ⚠️ | ⚠️ | ✅ | N/A | ⚠️ | N/A |
| OSDetailScreenV2 | N/A | ✅ | ❌ | ❌ | N/A | ⚠️ | N/A |
| CriarOSScreenV2 | ❌ | ✅ | N/A | N/A | ❌ | ⚠️ | ⚠️ |
| CriarSolicitacaoScreen | ⚠️ | ✅ | N/A | N/A | ❌ | ⚠️ | ⚠️ |
| FecharOSScreen | ❌ | ✅ | N/A | N/A | ❌ | ⚠️ | ⚠️ |
| SolicitacoesListScreenV2 | N/A | ✅ | ⚠️ | ✅ | N/A | ⚠️ | N/A |
| SolicitacaoDetalheScreen | N/A | ✅ | ❌ | ❌ | N/A | ⚠️ | N/A |
| HistoricoScreenV2 | N/A | ✅ | ✅ | ✅ | N/A | ⚠️ | N/A |
| AgendaScreen | N/A | ✅ | ❌ | ❌ | N/A | ⚠️ | N/A |
| ExecutionScreen | ⚠️ | ✅ | N/A | N/A | ❌ | ⚠️ | ⚠️ |
| ChecklistScreen | ❌ | ⚠️ | N/A | N/A | ❌ | ⚠️ | ⚠️ |
| ParadaScreen | ❌ | ⚠️ | N/A | N/A | ❌ | ⚠️ | ⚠️ |
| RequisicaoMaterialScreen | ❌ | ⚠️ | N/A | N/A | ❌ | ⚠️ | ⚠️ |
| SolicitarServicoScreen | ❌ | ⚠️ | N/A | N/A | ❌ | ⚠️ | ⚠️ |
| CatalogoScreen | N/A | ✅ | ❌ | ❌ | N/A | ⚠️ | N/A |
| EquipamentoDetalheScreen | N/A | ✅ | ❌ | ❌ | N/A | ⚠️ | N/A |
| QRScanScreen | N/A | ⚠️ | N/A | N/A | N/A | ❌ | N/A |

**Legenda:** ✅ Ok | ⚠️ Parcial/inconsistente | ❌ Ausente | N/A Não aplicável

### Web (47 páginas) — Amostra das principais

| Página | clearDraft | Toast | Loading | Empty | Confirm |
|--------|-----------|-------|---------|-------|---------|
| NovaOS | ✅ | ⚠️ | ✅ | N/A | ❌ |
| FecharOS | ✅ | ⚠️ | ✅ | N/A | ⚠️ |
| Equipamentos | ✅ | ⚠️ | ✅ | ⚠️ | ⚠️ |
| Mecanicos | ✅ | ⚠️ | ✅ | ⚠️ | ⚠️ |
| Materiais | ✅ | ⚠️ | ✅ | ⚠️ | ⚠️ |
| Fornecedores | ✅ | ⚠️ | ✅ | ⚠️ | ⚠️ |
| Solicitacoes | ✅ | ⚠️ | ✅ | ⚠️ | ⚠️ |
| Preventiva | ✅ | ⚠️ | ✅ | ⚠️ | ❌ |
| Preditiva | ✅ | ⚠️ | ✅ | ⚠️ | ❌ |

**⚠️ Toast** = usa mix de `useToast` (shadcn) e/ou `Sonner` — precisa unificar.

---

## ORDEM DE EXECUÇÃO RECOMENDADA

```
FASE 1 (Infra)        ──►  FASE 2 (Forms)      ──►  FASE 3 (Feedback/UX)
  1.1 Design tokens          2.1 CriarOS reset        3.1 Msgs sucesso
  1.2 Componentes UI          2.2 FecharOS reset       3.2 Msgs erro
  1.3 useFormState             2.3-2.6 Outros forms    3.3 Confirmações
  1.4 useSupabaseQuery         2.7 Web forms audit     3.4 Loading states
  1.5 Feedback system          2.8 Disabled rule       3.5 Empty states
                                                        3.6 Toast unificação

FASE 4 (Navegação)     ──►  FASE 5 (Código)      ──►  FASE 6 (Polish)
  4.1 Fluxo pós-submit        5.1 Data fetching        6.1 Visual review
  4.2 Pull-to-refresh         5.2 Nomes de estado      6.2 Micro-animações
  4.3 Remover v1 obso         5.3 Debounce             6.3 Documentação
  4.4 Web nav pattern         5.4 Hooks audit
  4.5 Error boundary
```

---

## RESULTADO ESPERADO

Após as 6 fases:
- **Todo formulário** reseta automaticamente após submit com sucesso
- **Toda lista** tem pull-to-refresh, empty state, e loading skeleton
- **Toda ação destrutiva** pede confirmação
- **Toda mensagem** de sucesso/erro segue o mesmo padrão textual
- **Todo botão de submit** mostra loading e desabilita inputs
- **Todo erro** é classificado (rede/permissão/validação) e mostrado adequadamente
- **Todo código** de data fetching usa os mesmos hooks (sem retrabalho)
- **Zero telas obsoletas** no codebase
- **Uma única biblioteca de notificação** (Sonner) no web
- **Componentes UI reutilizáveis** no app mobile

O sistema inteiro passa a ter comportamento **previsível e consistente** do login ao fechamento de OS.
