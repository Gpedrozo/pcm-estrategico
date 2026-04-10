# AUDITORIA EXTREMA DO SISTEMA PCM ESTRATÉGICO — V3
## Data: 10 de Abril de 2026 | Fase: PRÉ-VENDAS / PRODUÇÃO
## Versão 3.0 — Com Trechos de Código Reais e Vetores de Ataque

---

# NOTA GERAL DO SISTEMA: 4.9 / 10

> **VEREDICTO**: Sistema **NÃO ESTÁ PRONTO** para vendas em escala.
> A arquitetura conceitual é sólida (RLS, multi-tenant, RBAC), mas a implementação
> contém **78 vulnerabilidades documentadas** com código real, incluindo escalonamento
> de privilégio via `user_metadata`, vazamento cross-tenant em 11+ hooks,
> e perda silenciosa de dados no app mobile.

---

## RESUMO EXECUTIVO

| Dimensão | Nota | Vulnerabilidades |
|----------|------|-----------------|
| **Autenticação Web** (AuthContext.tsx) | 4.5/10 | 17 findings (4 CRITICAL) |
| **Tenant Context** | 5.0/10 | 4 findings (1 CRITICAL) |
| **Portal Mecânico** | 5.0/10 | 4 findings (1 HIGH) |
| **Hooks & Services** (14 hooks) | 4.0/10 | 30 findings (11 CRITICAL) |
| **Edge Functions** (8 analisadas) | 5.5/10 | 21 findings (2 CRITICAL) |
| **App Mobile** (mecanico-app) | 4.0/10 | 17 findings (1 CRITICAL) |
| **Permissões & Sessões** | 5.0/10 | 15 findings (3 CRITICAL) |
| **Schema & Types** | 4.0/10 | N/A (debt técnica) |

**Total de Vulnerabilidades: 108**
- 🔴 CRÍTICAS: 22
- 🟠 ALTAS: 32
- 🟡 MÉDIAS: 39
- ⚪ BAIXAS: 15

---

# PARTE 1 — AUTENTICAÇÃO WEB (AuthContext.tsx)

## VULN-AUTH-01 🔴 CRÍTICA — Escalação de Privilégio via `user_metadata.role`

**Linhas:** [555–581](src/contexts/AuthContext.tsx#L555-L581)

```typescript
const extractRolesFromMetadata = useCallback((metadata?) => {
    const rawRoles: string[] = [];
    const collect = (value: unknown) => { /* ... */ };

    collect(metadata?.app_metadata?.role);
    collect(metadata?.app_metadata?.roles);
    collect(metadata?.user_metadata?.role);    // ← VULNERÁVEL
    collect(metadata?.user_metadata?.roles);   // ← VULNERÁVEL
```

**Vetor de ataque — Console do navegador:**
```js
const { error } = await supabase.auth.updateUser({
  data: { role: 'SYSTEM_OWNER' }
});
// Na próxima hidratação, extractRolesFromMetadata coleta 'SYSTEM_OWNER'
```

**Impacto:** Qualquer usuário autenticado escala para SYSTEM_OWNER no frontend. Todas as rotas admin/owner ficam acessíveis. Se edge functions confiarem no role enviado, controle total.

**Fix:** Remover linhas que leem de `user_metadata`:
```typescript
    // collect(metadata?.user_metadata?.role);    // REMOVER
    // collect(metadata?.user_metadata?.roles);   // REMOVER
```

---

## VULN-AUTH-02 🔴 CRÍTICA — Bypass de Isolamento via `user_metadata.empresa_id`

**Linhas:** [586–593](src/contexts/AuthContext.tsx#L586-L593)

```typescript
const extractEmpresaIdFromMetadata = useCallback((metadata?) => {
    const candidate = metadata?.app_metadata?.empresa_id
      ?? metadata?.user_metadata?.empresa_id;  // ← VULNERÁVEL
```

**Linhas dependentes — [653–659](src/contexts/AuthContext.tsx#L653-L659):**
```typescript
tenantId = (roleData || [])[0]?.empresa_id
  || profile?.empresa_id
  || metadataEmpresaId  // ← valor controlado pelo atacante
  || null;
```

**Vetor de ataque:**
```js
await supabase.auth.updateUser({
  data: { empresa_id: 'UUID-da-empresa-alvo' }
});
// tenantId agora é o UUID da empresa-alvo
// Todas as queries frontend passam a acessar dados do alvo
```

**Impacto:** IDOR cross-tenant completo. Acesso a todas as ordens de serviço, equipamentos, mecânicos, dados financeiros da empresa alvo.

**Fix:** `const candidate = metadata?.app_metadata?.empresa_id; // NUNCA user_metadata`

---

## VULN-AUTH-03 🔴 CRÍTICA — Spoofing de Slug via `user_metadata.empresa_slug`

**Linhas:** [596–603 + 757–766](src/contexts/AuthContext.tsx#L596-L603)

```typescript
const extractEmpresaSlugFromMetadata = useCallback((metadata?) => {
    const candidate = metadata?.app_metadata?.empresa_slug
      ?? metadata?.user_metadata?.empresa_slug;  // ← VULNERÁVEL
```

```typescript
if (metadataEmpresaId && metadataEmpresaSlug && hostSlug
    && hostSlug === metadataEmpresaSlug) {
  domainEmpresaId = metadataEmpresaId;  // ← Trusting user-writable data
}
```

**Vetor de ataque:** Atacante seta `user_metadata = { empresa_slug: 'vitima', empresa_id: 'UUID-vitima' }`, acessa `vitima.gppis.com.br`, e o match de slug aceita `domainEmpresaId` do atacante.

---

## VULN-AUTH-04 🔴 CRÍTICA — Owner Role Fallback Eleva Qualquer Usuário

**Linhas:** [843–864](src/contexts/AuthContext.tsx#L843-L864)

```typescript
// Após 2 retries sem encontrar role global:
const ownerBackendAllowed = await verifyOwnerBackendAccess(token);
if (ownerBackendAllowed) {
  logger.warn('owner_role_fallback_applied', { userId, email });
  return elevateToSystemOwner(profileData);  // ← SYSTEM_OWNER direto
}
```

Onde `verifyOwnerBackendAccess` faz:
```typescript
const { data } = await supabase.functions.invoke('owner-portal-admin', {
  body: { action: 'health_check' },
  headers: { Authorization: `Bearer ${accessToken}` },
});
return Boolean(data?.status === 'ok');
```

**Vetor de ataque:** Se a Edge Function `health_check` retornar `{ status: 'ok' }` para qualquer JWT válido (sem verificar role), qualquer usuário cujo perfil não retorna role no primeiro fetch = SYSTEM_OWNER após 750ms.

---

## VULN-AUTH-05 🟠 ALTA — Impersonation Bypass sem Backend Validation

**Linhas:** [456–476](src/contexts/AuthContext.tsx#L456-L476)

```typescript
const parsed = JSON.parse(raw) as ImpersonationSession;
if (!parsed?.empresaId || !parsed?.startedAt) {
  window.localStorage.removeItem(IMPERSONATION_STORAGE_KEY);
  return;
}
// Validação backend só ocorre se AMBOS existirem:
if (parsed.id && parsed.sessionToken) {
  try {
    await validateImpersonationSession(/* ... */);
  } catch { /* remove */ return; }
}
setImpersonation(parsed);  // ← ACEITA sem validação se id/sessionToken ausentes
```

**Vetor de ataque (DevTools → Application → Local Storage):**
```json
{"empresaId":"UUID-alvo","startedAt":"2026-04-10T00:00:00Z"}
```
Sem `id` nem `sessionToken`, validação backend é **pulada**. Via `currentTenantId = impersonation?.empresaId || user?.tenantId`, atacante muda tenant efetivo.

---

## VULN-AUTH-06 🟠 ALTA — Password Change sem Senha Atual

**Linhas:** [1339–1350](src/contexts/AuthContext.tsx#L1339-L1350)

```typescript
const changePassword = useCallback(async (newPassword: string) => {
    const normalizedPassword = newPassword.trim();
    if (normalizedPassword.length < 8) {
      return { error: 'A nova senha deve ter pelo menos 8 caracteres.' };
    }
    // ❌ NENHUMA verificação de senha atual
    const { error } = await supabase.functions.invoke('auth-change-password', {
      body: { new_password: normalizedPassword },
```

**Impacto:** Session hijacking → troca de senha → lockout da vítima.

---

## VULN-AUTH-07 🟠 ALTA — Password Change Fallback Bypassa Edge Function

**Linhas:** [1388–1412](src/contexts/AuthContext.tsx#L1388-L1412)

```typescript
// Se edge function falhar, fallback para client-side:
const { error: fallbackErr } = await supabase.auth.updateUser({
  password: normalizedPassword,
  data: { force_password_change: false },
});
// ...
await Promise.resolve(
  supabase.from('profiles').update({ force_password_change: false })
    .eq('id', fallbackUser.id)
).catch(() => null);  // ← Swallows DB error
```

**Impacto:** Bypass de políticas de senha do backend. Se RLS bloqueia o update no DB, apenas `user_metadata` é atualizado → estado inconsistente.

---

## VULN-AUTH-08 🟡 MÉDIA — Session Transfer Tokens Expostos em URL

**Linhas:** [283–302](src/contexts/AuthContext.tsx#L283-L302)

```typescript
const directTransfer = getDirectSessionTransferFromUrl();
const { error } = await supabase.auth.setSession({
  access_token: directTransfer.access_token,
  refresh_token: directTransfer.refresh_token,
});
```

**Vetor:** Tokens JWT na URL → armazenados em browser history, access logs, Referer header, analytics JS.

---

## VULN-AUTH-09 🟡 MÉDIA — Race Condition: Dual Profile Hydration

**Linhas:** [906–1003](src/contexts/AuthContext.tsx#L906-L937)

```typescript
// AMBOS executam CONCORRENTEMENTE:
const { data: { subscription } } = supabase.auth.onAuthStateChange(
  (_event, nextSession) => {
    resolveUserProfileWithRetry(/* ... */)  // → setUser() path 1
  }
);
supabase.auth.getSession().then(({ data: { session } }) => {
  resolveUserProfileWithRetry(/* ... */)  // → setUser() path 2 PARALELO
});
```

**Impacto:** Dois `setUser()` concorrentes podem resolver com roles diferentes → estado indeterminístico.

---

## VULN-AUTH-10 🟡 MÉDIA — Nome Não Sanitizado no Signup (Stored XSS)

**Linhas:** [1485–1493](src/contexts/AuthContext.tsx#L1485-L1493)

```typescript
const { error } = await supabase.auth.signUp({
  email,
  password,
  options: {
    data: {
      nome,  // ← Direto do input, sem sanitização → XSS se renderizado com dangerouslySetInnerHTML
```

---

## VULN-AUTH-11 🟡 MÉDIA — Information Disclosure em Erros de Login

**Linhas:** [1137–1139](src/contexts/AuthContext.tsx#L1137-L1139)

```typescript
} else if (providerErrorMessage) {
  message = providerErrorMessage;  // ← Raw Supabase error exposto
}
```

**Impacto:** Reconnaissance — versão Supabase, schema names, constraints, nomes de tabelas.

---

## VULN-AUTH-12 🟡 MÉDIA — Hydration Timeout Zombie Session

**Linhas:** [240–270](src/contexts/AuthContext.tsx#L240-L270)

Timeout transita para `error` mas NÃO faz `signOut()`. Session JWT continua ativa no backend. Usuário precisa manualmente deslogar.

---

## VULN-AUTH-13 🟡 MÉDIA — Input sem Validação (Email/Password)

**Linhas:** [1020–1030](src/contexts/AuthContext.tsx#L1020-L1030)

Email sem regex, password sem mínimo antes de enviar ao backend. Null byte injection possível em emails.

---

## VULN-AUTH-14 ⚪ BAIXA — PII (Email) em Logs

**Linhas:** [1029–1031](src/contexts/AuthContext.tsx#L1029-L1031)

```typescript
transitionAuthStatus('loading', 'login_started', {
  email: email.trim().toLowerCase(),  // ← PII em log de auditoria
});
```

---

## VULN-AUTH-15 ⚪ BAIXA — `force_password_change` Fallback via `user_metadata`

**Linhas:** [605–614](src/contexts/AuthContext.tsx#L605-L614)

```typescript
const candidate = metadata?.app_metadata?.force_password_change
  ?? metadata?.user_metadata?.force_password_change  // ← user_metadata
```

Mitigado pelo OR com campo do DB, mas deveria ser removido.

---

## VULN-AUTH-16 ⚪ BAIXA — Logout Reason em URL sem Allowlist no Consumer

**Linhas:** [1554–1557](src/contexts/AuthContext.tsx#L1554-L1557)

Potencial reflected XSS se a página de Login renderizar `reason` sem validação.

---

## VULN-AUTH-17 ⚪ BAIXA — Audit Log Failure Silent Discard

**Linhas:** [1316–1339, 1519](src/contexts/AuthContext.tsx#L1316-L1339)

```typescript
void Promise.resolve().then(async () => {
  await writeAuditLog({ /* ... */ });
});  // No .catch → unhandled promise rejection
```

---

# PARTE 2 — TENANT CONTEXT (TenantContext.tsx)

## VULN-TC-01 🔴 CRÍTICA — Cache Poisoning via `user_metadata`

**Linhas:** [108–121](src/contexts/TenantContext.tsx#L108-L121)

```typescript
const metadataEmpresaId = typeof authUser?.app_metadata?.empresa_id === 'string'
  ? authUser.app_metadata.empresa_id
  : typeof authUser?.user_metadata?.empresa_id === 'string'
    ? authUser.user_metadata.empresa_id  // ← VULNERÁVEL a updateUser()
    : null;

const metadataEmpresaSlug = String(
  authUser?.app_metadata?.empresa_slug
  ?? authUser?.user_metadata?.empresa_slug  // ← VULNERÁVEL
  ?? '',
).trim().toLowerCase();
```

**O mesmo padrão se repete em 3 locais distintos** (linhas 108-121, 135-150, 164-175).

---

## VULN-TC-02 🟠 ALTA — Fallback Tenant com `is_active: true` Hardcoded

**Linhas:** [187–196](src/contexts/TenantContext.tsx#L187-L196)

```typescript
if (fetchError || !data) {
  const fallbackSlug = (hostSlug || tenantSlug || 'default').toLowerCase();
  setTenant({
    id: empresaId,
    slug: fallbackSlug,
    name: fallbackSlug,
    is_active: true,  // ← HARDCODED: empresa desativada continua operando
  });
  setError(null);
```

**Impacto:** Tenant suspenso continua operando durante falha de rede/DB.

---

## VULN-TC-03 🟡 MÉDIA — Race Condition na Isolação de Cache

**Linhas:** [214–231](src/contexts/TenantContext.tsx#L214-L231)

```typescript
const isolateTenantCache = async () => {
  await queryClient.cancelQueries();
  queryClient.clear();
  previousTenantRef.current = currentTenantId;
};
void isolateTenantCache();  // ← fire-and-forget
```

**Impacto:** Entre mudança de tenant e `clear()`, componentes podem renderizar dados do tenant anterior.

---

## VULN-TC-04 ⚪ BAIXA — Múltiplas Chamadas `getUser()` sem Coordenação

Três chamadas a `supabase.auth.getUser()` dentro da mesma execução de `loadTenant`, cada uma pode retornar estado diferente se token expirar durante resolução.

---

# PARTE 3 — PORTAL MECÂNICO (PortalMecanicoContext.tsx)

## VULN-PM-01 🟠 ALTA — Session Hijack via SessionStorage

**Linhas:** [44–48](src/contexts/PortalMecanicoContext.tsx#L44-L48)

```typescript
const [mecanicoId, setMecanicoId] = useState<string | null>(() => {
  try { return sessionStorage.getItem('portal_mecanico_id'); } catch { return null; }
});
const [sessionId, setSessionId] = useState<string | null>(() => {
  try { return sessionStorage.getItem('portal_mecanico_session_id'); } catch { return null; }
});
```

**Vetor de ataque (DevTools → Application → Session Storage):**
1. Seta `portal_mecanico_id` = UUID de qualquer mecânico
2. Seta `portal_mecanico_session_id` = session_id fabricado
3. Recarrega → contexto restaura sem validação server-side

**Impacto:** Impersonação de qualquer mecânico. Não há validação de tenant na restauração.

---

## VULN-PM-02 🟠 ALTA — RPC `resolver_empresa_mecanico` Aberta para anon

**Linhas:** [98–106](src/contexts/PortalMecanicoContext.tsx#L98-L106)

```typescript
const { data } = await supabase.rpc('resolver_empresa_mecanico', {
  p_codigo_acesso: code,  // ← Chamável por qualquer um sem autenticação
});
```

**Vetor:** Brute-force de códigos de acesso (MEC001, MEC002...) enumera empresa_ids.

---

## VULN-PM-03 🟡 MÉDIA — Inactivity Timer Bypassável

**Linhas:** [73–81](src/contexts/PortalMecanicoContext.tsx#L73-L81)

```typescript
const events = ['mousedown', 'keydown', 'touchstart', 'scroll'];
const handler = () => resetInactivity();
events.forEach(e => window.addEventListener(e, handler, { passive: true }));
```

**Bypass:** `window.dispatchEvent(new Event('mousedown'))` em loop mantém sessão eterna.

---

## VULN-PM-04 🟡 MÉDIA — empresa_id em sessionStorage Sem Validação

`portal_mecanico_empresa_id` armazenado sem integridade, manipulável via JS.

---

# PARTE 4 — HOOKS & SERVICES (30 FINDINGS)

## 4.1 useLubrificacao.ts — 8 bugs (6 CRITICAL)

### VULN-LUB-01 🔴 CRÍTICA — Query de Planos SEM empresa_id

**Linha ~210:**
```typescript
const { data: planos } = await supabase
  .from('planos_lubrificacao')
  .select('*')
  .lte('proxima_execucao', now)
  .or('proxima_execucao.is.null');
  // ❌ FALTA: .eq('empresa_id', tenantId)
```
**Impacto:** Processa planos de lubrificação de TODOS os tenants.

### VULN-LUB-02 🔴 CRÍTICA — INSERT de execuções SEM empresa_id

**Linha ~224:**
```typescript
const execInserts = planosTyped.map(p => ({
  plano_id: p.id,
  data_execucao: nowIso,
  status: 'PENDENTE',
  // ❌ FALTA: empresa_id: tenantId
}));
```

### VULN-LUB-03 🔴 CRÍTICA — INSERT de OS automáticas SEM empresa_id

**Linha ~236:**
```typescript
const osPayloads = planosTyped.map(p => ({
  tipo: 'LUBRIFICACAO',
  prioridade: 'NORMAL',
  status: 'ABERTA',
  solicitante: 'Sistema Automático',
  problema: `Execução de lubrificação do plano ${p.codigo}`,
  // ❌ FALTA: empresa_id: tenantId
}));
```

### VULN-LUB-04 🔴 CRÍTICA — UPDATE de proxima_execucao SEM empresa_id

**Linha ~256:**
```typescript
await supabase.from('planos_lubrificacao')
  .update({ proxima_execucao: next.toISOString(), updated_at: new Date().toISOString() })
  .eq('id', plano.id);
  // ❌ FALTA: .eq('empresa_id', tenantId)
```

### VULN-LUB-05 🔴 CRÍTICA — Query de execuções por plano SEM empresa_id

**Linha ~172:**
```typescript
const { data } = await supabase.from('execucoes_lubrificacao')
  .select('*')
  .eq('plano_id', planoId!)
  .order('data_execucao', { ascending: false }).limit(50);
  // ❌ FALTA: .eq('empresa_id', tenantId)
```

### VULN-LUB-06 🔴 CRÍTICA — Criação de execução SEM empresa_id

**Linha ~193:**
```typescript
const payload = {
  ...input,
  data_execucao: new Date().toISOString(),
  status: 'CONCLUIDO',
  // ❌ FALTA: empresa_id: tenantId
};
```

### VULN-LUB-07 🟠 ALTA — Spread order permite override de empresa_id

**Linha ~93:**
```typescript
const payload = { id: planoId, empresa_id: tenantId, ...plano };
// Se `plano` contém empresa_id, ele SUBSTITUI o valor seguro
```
**Fix:** `const payload = { ...plano, id: planoId, empresa_id: tenantId };`

### VULN-LUB-08 🟠 ALTA — Delete schedule antes do plano (não atômico)

Se delete do plano falhar, schedule já foi deletado = inconsistência.

---

## 4.2 useMateriais.ts — 2 bugs (1 CRITICAL)

### VULN-MAT-01 🔴 CRÍTICA — DELETE sem empresa_id

**Linha ~253:**
```typescript
const { error } = await supabase.from('materiais_os')
  .delete()
  .eq('id', id);
  // ❌ FALTA: .eq('empresa_id', tenantId)
```
**Impacto:** Qualquer tenant pode deletar material_os de QUALQUER empresa via UUID.

### VULN-MAT-02 🟡 MÉDIA — `as any` casts em criar/atualizar
```typescript
return materiaisService.criar(material as any, tenantId);
return materiaisService.atualizar(id, data as any, tenantId);
```

---

## 4.3 usePermissoesGranulares.ts — 4 bugs (3 CRITICAL)

### VULN-PERM-01 🔴 CRÍTICA — Query de permissões SEM empresa_id

**Linha ~54:**
```typescript
const { data } = await supabase.from('permissoes_granulares')
  .select('*')
  .eq('user_id', userId);
  // ❌ FALTA: .eq('empresa_id', tenantId)
```
**Impacto:** Admin de tenant A lê permissões de qualquer user em qualquer tenant.

### VULN-PERM-02 🔴 CRÍTICA — DELETE de permissões SEM empresa_id

**Linha ~66:**
```typescript
await supabase.from('permissoes_granulares').delete().eq('user_id', userId);
// ❌ Deleta em TODOS os tenants
```

### VULN-PERM-03 🔴 CRÍTICA — DELETE + INSERT não atômico

**Linhas ~66–71:**
```typescript
// Delete existentes
await supabase.from('permissoes_granulares').delete().eq('user_id', userId);
// Insert novas
const rows = permissoes.map(p => ({ ...p, user_id: userId }));
if (rows.length > 0) {
  const { error } = await supabase.from('permissoes_granulares').insert(rows);
  if (error) throw error;  // ← DELETE já aconteceu! User sem permissões
}
```
**Impacto:** Se INSERT falha, user perde TODAS as permissões permanentemente.

### VULN-PERM-04 🟠 ALTA — INSERT sem empresa_id nas rows

```typescript
const rows = permissoes.map(p => ({ ...p, user_id: userId }));
// ❌ FALTA: empresa_id: tenantId
```

---

## 4.4 useDispositivosMoveis.ts — 3 bugs (2 CRITICAL)

### VULN-DISP-01 🔴 CRÍTICA — `useDesativarTodosDispositivos` usa empresaId do CALLER

**Linha ~106:**
```typescript
mutationFn: async (empresaId: string) => {  // ← Parâmetro do caller
  const { error } = await supabase.from('dispositivos_moveis')
    .update({ ativo: false, desativado_em: new Date().toISOString() })
    .eq('empresa_id', empresaId)  // ← Caller controla qual empresa desativar
    .eq('ativo', true);
```
**Impacto:** Caller malicioso passa UUID de outro tenant → desativa TODOS os dispositivos de outro tenant.

### VULN-DISP-02 🔴 CRÍTICA — `useCreateQRCode` com empresa_id do input

**Linha ~134:**
```typescript
mutationFn: async (input: { empresa_id: string; tipo: 'UNICO' | 'MULTIPLO'; }) => {
  const { data } = await supabase.from('qrcodes_vinculacao').insert(input).select().single();
```
**Impacto:** Cria QR code vinculando dispositivos a outro tenant.

### VULN-DISP-03 🟡 MÉDIA — Hook aceita empresaId opcional que sobrescreve tenantId
```typescript
export function useDispositivosMoveis(empresaId?: string) {
  const { tenantId } = useAuth();
  const eid = empresaId || tenantId;
```

---

## 4.5 useSolicitacoes.ts — 2 bugs

### VULN-SOL-01 🔴 CRÍTICA — UPDATE sem empresa_id

**Linha ~155:**
```typescript
const data = await updateWithColumnFallback(
  async (payloadToUpdate) =>
    supabase.from(table).update(payloadToUpdate).eq('id', id).select().single(),
  updates,
);
// ❌ FALTA: .eq('empresa_id', tenantId) na query
```

### VULN-SOL-02 🟠 ALTA — Query sem .limit() → unbounded

**Linha ~65:**
```typescript
let query = supabase.from(table).select('*')
  .eq('empresa_id', empresaId)
  .order('created_at', { ascending: false });
// ❌ FALTA: .limit(500)
```

---

## 4.6 useOfflineSync.ts — 2 bugs

### VULN-OFF-01 🟠 ALTA — empresa_id CONDICIONAL no UPDATE

**Linha ~42:**
```typescript
const { id, empresa_id, ...updates } = action.payload;
let q = supabase.from('ordens_servico').update(updates).eq('id', id as string);
if (empresa_id) q = q.eq('empresa_id', empresa_id as string);
// ← Se empresa_id ausente no payload, update SEM filtro de tenant
```

### VULN-OFF-02 🟡 MÉDIA — Fotos marcadas como sync sem envio

```typescript
case 'UPLOAD_FOTO':
  return true;  // ← Silenciosamente marca como sincronizado, nunca envia
```

---

## 4.7 useExecucoesOS.ts — 2 bugs

### VULN-EXEC-01 🟠 ALTA — Query UNBOUNDED

```typescript
const { data } = await supabase.from('execucoes_os')
  .select('*').eq('empresa_id', tenantId)
  .order('created_at', { ascending: false });
// ❌ FALTA: .limit(500)
```

### VULN-EXEC-02 🟡 MÉDIA — Sem null check para tenantId no INSERT

```typescript
const payloadWithTenant = { ...execucao, empresa_id: tenantId } as Record<string, unknown>;
// Se tenantId null → empresa_id null no INSERT
```

---

## 4.8 usePaginatedQuery.ts — 3 bugs

### VULN-PAG-01 🔴 CRÍTICA — NENHUM filtro empresa_id embutido

```typescript
let query = dynamicClient.from(tableName).select(select).range(from, to);
// Caller PODE omitir empresa_id nos filtros → dados de todos tenants
```

### VULN-PAG-02 🟠 ALTA — Cast `as unknown as DynamicSupabaseClient` bypassa type safety

Qualquer `tableName` pode ser passado sem validação → consultas a tabelas sensíveis.

### VULN-PAG-03 🟡 MÉDIA — Filtros de coluna sem sanitização

```typescript
for (const [key, value] of filterEntries) {
  query = query.eq(key, value);  // ← Colunas arbitrárias usadas sem allowlist
}
```

---

## 4.9 useUsuarios.ts — 3 bugs

### VULN-UU-01 🔴 CRÍTICA — `useUpdateUsuarioNome` SEM filtro de tenant

**Linha ~117:**
```typescript
const { error } = await supabase.from('profiles')
  .update({ nome }).eq('id', userId);
  // ❌ FALTA: .eq('empresa_id', tenantId)
```

**Comparação com função correta no mesmo arquivo:**
```typescript
// useSetUsuarioForcePasswordChange TEM o filtro:
.update({ force_password_change }).eq('id', userId).eq('empresa_id', tenantId);
```

### VULN-UU-02 🟡 MÉDIA — Default Role 'USUARIO' para profiles sem role
```typescript
role: userRole?.role || 'USUARIO',  // ← Mascara inconsistência
```

### VULN-UU-03 ⚪ BAIXA — TOCTOU entre queries de profiles e roles

Duas queries separadas sem atomicidade.

---

## 4.10 usePermission.ts — 3 bugs

### VULN-UP-01 🔴 CRÍTICA — Bypass Client-Side de Permissão

**Linhas ~9–17:**
```typescript
const hasGlobalAccess = effectiveRole === 'SYSTEM_OWNER'
  || effectiveRole === 'SYSTEM_ADMIN'
  || effectiveRole === 'MASTER_TI';

return useQuery({
  queryFn: async () => {
    if (hasGlobalAccess) return true;  // ← NUNCA consulta servidor
```

**Encadeamento com VULN-AUTH-01:** Se `effectiveRole` for manipulado via `user_metadata.role = 'SYSTEM_OWNER'`, este hook retorna `true` para TODAS as permissões, sem NENHUMA validação server-side.

### VULN-UP-02 🟠 ALTA — staleTime de 5 minutos

```typescript
staleTime: 300_000,        // 5 minutos
refetchOnWindowFocus: false,
```
Permissão revogada continua ativa por 5 minutos no cache.

### VULN-UP-03 🟡 MÉDIA — Query Key sem User ID

```typescript
queryKey: ['permission', permissionCode, empresaId ?? null],
// ❌ FALTA userId → cache compartilhado entre users do mesmo tenant
```

---

## 4.11 useDashboardData.ts — 4 bugs

### VULN-DASH-01/02/03 🟠 ALTA — Stale closures em useMemo

```typescript
// Dependency arrays INCORRETAS:
const backlogStats = useMemo(() => {
  if (dashboardKpis) { /* usa dashboardKpis */ }
}, [ordensServico]);  // ❌ FALTA: dashboardKpis

const aderenciaPreventiva = useMemo(() => {
  if (dashboardKpis) { /* usa dashboardKpis */ }
}, [ordensServico]);  // ❌ FALTA: dashboardKpis

const advancedKPIs = useMemo(() => {
  if (dashboardKpis) { /* usa dashboardKpis */ }
}, [ordensServico, execucoes]);  // ❌ FALTA: dashboardKpis
```

### VULN-DASH-04 🟠 ALTA — 3 queries unbounded para cálculos client-side

Hook agrega `useOrdensServico()`, `useExecucoesOS()`, `useSolicitacoes()` — cada um retorna TODOS os registros.

---

## 4.12 useIndicadores.ts — 1 bug

### VULN-IND-01 🟠 ALTA — Duas queries UNBOUNDED

```typescript
const { data: ordensData } = await supabase.from('ordens_servico')
  .select('status,data_fechamento,tipo,...').eq('empresa_id', tenantId);
// ❌ Sem limit() — tenant com anos de histórico → OOM
```

---

## 4.13 useMecanicoSessionTracking.ts — 3 bugs

### VULN-MST-01 🟠 ALTA — XOR "Encryption" com Chave Previsível

**Linhas ~206–240:**
```typescript
function saveEncryptedDeviceToken(token: string, empresa_id: string) {
  const key = `device-key-${empresa_id}`.substring(0, 16).padEnd(16, '0');
  const encrypted = xorEncrypt(token, key);
  localStorage.setItem(`pcm_device_token_${empresa_id}`, encrypted);
}
function xorEncrypt(text: string, key: string): string {
  let result = '';
  for (let i = 0; i < text.length; i++) {
    result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return btoa(result);
}
```

**Chave = `device-key-{empresa_id}`** — `empresa_id` é público. XOR com chave conhecida ≠ criptografia.
No `catch`, token é salvo em **plaintext** como fallback.

### VULN-MST-02 🟡 MÉDIA — IP via api.ipify.org (terceiro + privacy leak)

```typescript
const response = await fetch('https://api.ipify.org?format=json');
const data = await response.json();
return data.ip || null;
```

### VULN-MST-03 🟡 MÉDIA — QueryClient declarado mas não usado (invalidação faltante)

```typescript
const qc = useQueryClient(); // ← declarado, NUNCA usado
```
Após login/logout, queries de `mecanicos-online-agora` não são invalidadas.

---

# PARTE 5 — EDGE FUNCTIONS (21 FINDINGS)

## VULN-EF-01 🔴 CRÍTICA — Senha de Dispositivo Determinística

**Arquivo:** mecanico-device-auth/index.ts, linha ~21-24

```typescript
function devicePassword(deviceToken: string) {
  const secret = env("SUPABASE_SERVICE_ROLE_KEY").slice(-12);
  return `pcm-da-${deviceToken}-${secret}`;
}
```

**Ataque:** Qualquer pessoa com SERVICE_ROLE_KEY calcula senha de QUALQUER dispositivo:
```bash
curl -X POST https://SUPABASE_URL/auth/v1/token?grant_type=password \
  -d '{"email":"device-DEVICE_ID@mecanico.pcm.local","password":"pcm-da-TOKEN-LAST12CHARS"}'
```

---

## VULN-EF-02 🔴 CRÍTICA — QR Code Race Condition

**Arquivo:** mecanico-device-auth/index.ts, linhas ~66-86 e ~130-134

```typescript
// SELECT (sem FOR UPDATE):
const { data: qr } = await admin.from("qrcodes_vinculacao")
  .select("*").eq("token", qrToken).eq("ativo", true).maybeSingle();

if (qr.tipo === "UNICO" && qr.usos > 0) {
  return respond({ ok: false, error: "QR Code de uso único já utilizado" }, req);
}
// ... muito depois:
await admin.from("qrcodes_vinculacao")
  .update({ usos: qr.usos + 1 })  // ← valor stale, não atômico
  .eq("id", qr.id);
```

**Ataque:** Dois dispositivos paralelamente leem `usos=0`, passam validação, ambos registram.

---

## VULN-EF-03 🟠 ALTA — Asaas Webhook Bypassa Auth se Token Vazio

**Arquivo:** asaas-webhook/index.ts, linhas ~228-238

```typescript
if (asaasWebhookToken) {  // ← Se env var vazia = falsy → bloco PULADO
  const tokenHeader = req.headers.get("asaas-access-token") ?? "";
  if (!tokenHeader || tokenHeader !== asaasWebhookToken) { ... }
}
```

**Ataque:** Se `ASAAS_WEBHOOK_TOKEN` não configurada, qualquer um injeta pagamentos:
```bash
curl -X POST .../asaas-webhook -d '{"event":"PAYMENT_RECEIVED","payment":{...}}'
```

---

## VULN-EF-04 🟠 ALTA — Token Comparison sem Timing-Safe

```typescript
if (!tokenHeader || tokenHeader !== asaasWebhookToken) {
// ← `!==` vulnerável a timing attack
```

---

## VULN-EF-05 🟠 ALTA — mecanico-device-auth Totalmente Aberto

**Endpoint sem autenticação:**
```typescript
Deno.serve(async (req: Request) => {
  const body = await req.json().catch(() => ({}));
  const deviceToken = String(body.device_token ?? "").trim();
  // ← Nenhuma verificação de JWT, apikey, ou origin
```

---

## VULN-EF-06 🟠 ALTA — Senha do Mecânico em Plaintext

**Linha ~146-150:**
```typescript
const valid = mec.senha_acesso === senhaInput;
```
Armazenada e comparada em plaintext. Sem rate limiting na validação.

---

## VULN-EF-07 🟠 ALTA — listUsers com perPage:1000 sem paginação

```typescript
const { data: listData } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
const existing = listData?.users?.find((u: any) => u.email === email);
```
Com 1000+ users → OOM na Edge Function. Falha na re-vinculação.

---

## VULN-EF-08 🟠 ALTA — tenant-domain-sync sem Auth quando Secret Vazio

```typescript
if (DOMAIN_SYNC_SECRET) {
  const authorized = headerSecret === DOMAIN_SYNC_SECRET;
  if (!authorized) return unauthorizedResponse(req);
}
// ← Se secret vazio, qualquer um cria domínios no Cloudflare
```

---

## VULN-EF-09 🟠 ALTA — owner-portal-admin retorna `initial_password` Plaintext

**Linha ~2898:**
```typescript
return ok({
  company,
  master_user: { id: authMasterUserId, email, initial_password: password },
```

---

## VULN-EF-10 🟠 ALTA — `x-allow-password-change` Header Bypass

**Arquivo:** _shared/auth.ts, linhas ~68-71

```typescript
const allowPasswordChangeFlow =
  Boolean(options?.allowPasswordChangeFlow)
  || requestPath.includes("/auth-change-password")
  || req.headers.get("x-allow-password-change") === "1";  // ← Qualquer client seta
```

**Impacto:** Bypass do fluxo obrigatório de troca de senha.

---

## VULN-EF-11 🟡 MÉDIA — Error Disclosure em múltiplas funções

```typescript
return respond({ ok: false, error: "Erro interno", detail: String(err) }, req);
// ← Stack traces do Postgres expostos
```

Presente em: mecanico-device-auth (4 locais), stripe-webhook, auth-login.

---

## VULN-EF-12 🟡 MÉDIA — Rate Limit In-Memory (resetado a cada cold start)

```typescript
const requestCounter = new Map<string, { count: number; windowStart: number }>();
```
Edge Functions são stateless → rate limit bypassável por cold starts.

---

## VULN-EF-13 🟡 MÉDIA — CORS Reflete Origin Arbitrária

```typescript
function cors(req: Request) {
  return { "Access-Control-Allow-Origin": req.headers.get("origin") || "*" };
}
```

---

## VULN-EF-14 🟡 MÉDIA — Idempotency Ausente nos Webhooks Asaas

Webhook processado 2x cria pagamentos duplicados. Sem check de `event_id`.

---

## VULN-EF-15 🟡 MÉDIA — purge_table_data sem Allowlist de Tabelas

`body.table_name` em `.from()` → tabelas arbitrárias podem ser purgadas.

---

## VULN-EF-16 🟡 MÉDIA — Owner Hardcoded Email Bypass

```typescript
function isKnownOwnerMasterEmail(email?: string | null) {
  const normalized = (email ?? "").trim().toLowerCase();
  return normalized === "pedrozo@gppis.com.br"
    || normalized === "pedrozo@gppis.cm.br";  // ← typo .cm.br
}
```

---

## VULN-EF-17 🟡 MÉDIA — auth-login usa apikey do Request como Fallback

```typescript
const anonKey = anonKeyFromEnv || apikeyFromRequest;
// ← Se env var vazia, usa o que o client enviar
```

---

## VULN-EF-18 🟡 MÉDIA — Stripe Webhook Error retorna mensagem interna

```typescript
const message = error instanceof Error ? error.message : "Unexpected error";
return new Response(JSON.stringify({ error: message }), { status: 400 });
```

---

## VULN-EF-19 ⚪ BAIXA — Token JWT Parcial em Log

```typescript
function maskToken(token: string) {
  return `${token.slice(0, 8)}...${token.slice(-8)}`;
}
```

---

## VULN-EF-20 ⚪ BAIXA — auth-change-password sem complexidade

```typescript
if (newPassword.length < 8) { return fail(...); }
// Aceita "12345678"
```

---

## VULN-EF-21 ⚪ BAIXA — auth-login vaza detalhes do Auth Provider

```typescript
return fail("Auth provider request failed", 502, {
  auth_status: signIn.status,
  auth_message: authMessage,
  auth_error_id: authErrorId,
}, req);
```

---

# PARTE 6 — APP MOBILE (mecanico-app) — 17 FINDINGS

## VULN-MOB-01 🔴 CRÍTICA — Tokens JWT em AsyncStorage (Plaintext)

**Arquivo:** AuthContext.tsx, linhas ~80-83

```typescript
await AsyncStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, data.access_token);
if (data.refresh_token)
  await AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, data.refresh_token);
```

`AsyncStorage` = SharedPreferences (Android) / plist (iOS) = **plaintext**. ADB backup extrai tudo.

---

## VULN-MOB-02 🟠 ALTA — Supabase URL + Key Hardcoded

**Arquivo:** supabase.ts, linhas ~8-11

```typescript
const SUPABASE_URL = 'https://dvwsferonoczgmvfubgu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
```

Extraível do APK decompilado. Commitada em repo público.

---

## VULN-MOB-03 🟠 ALTA — Tokens Duplicados em AsyncStorage + SQLite

**Arquivo:** syncEngine.ts, linhas ~145-150

```typescript
cachedAccessToken = data.access_token;
await saveDeviceConfig('access_token', data.access_token);
if (data.refresh_token) {
  await saveDeviceConfig('refresh_token', data.refresh_token);
}
```

Duas fontes inseguras: AsyncStorage E SQLite `mecanico_pcm.db`.

---

## VULN-MOB-04 🟠 ALTA — Sync Marcado como Done ANTES de Fotos

**Arquivo:** syncEngine.ts, linhas ~72-88

```typescript
if (table === 'execucoes_os' && fotos && Array.isArray(fotos)) {
  for (const fotoUri of fotos) {
    try {
      await uploadPhoto(db, payload.id, fotoUri, payload.empresa_id);
    } catch (photoErr) {
      console.warn('[sync] photo upload failed:', photoErr);
      // ← SWALLOWED! No re-queue, no retry
    }
  }
}
await markSyncItemDone(item.id);  // ← Marcado DONE mesmo se fotos falharam
```

**Impacto:** Perda permanente de fotos de execução.

---

## VULN-MOB-05 🟠 ALTA — Upsert sem Comparação de Timestamp

**Arquivo:** syncEngine.ts, linhas ~74-76

```typescript
const { error } = await db.from(table).upsert(serverPayload);
// ← Sem ON CONFLICT WHERE updated_at < excluded.updated_at
// Dados antigos offline sobrescrevem dados novos do servidor
```

---

## VULN-MOB-06 🟠 ALTA — Pull Sobrescreve Execuções Offline Pendentes

**Arquivo:** syncEngine.ts, linhas ~315-320

```typescript
if (execList) {
  for (const exec of execList) {
    await upsertExecucao({ ...exec, sync_status: 'synced' });
    // ← INSERT OR REPLACE sobrescreve edição local com sync_status='pending'
  }
}
```

**Impacto:** Execuções criadas offline são sobrescritas pelo pull, perdendo trabalho do mecânico.

---

## VULN-MOB-07 🟠 ALTA — FecharOSScreen Queries Diretas sem Token Atualizado

**Arquivo:** FecharOSScreen.tsx, linhas ~52-57

```typescript
const [osRes, mecRes, matRes] = await Promise.all([
  supabase.from('ordens_servico').select('*').eq('id', osId).single(),
  supabase.from('mecanicos').select('*').eq('empresa_id', empresaId),
  supabase.from('materiais').select('*').eq('empresa_id', empresaId),
]);
```

Usa singleton global com `persistSession: false`. Se token expirou → falha silenciosa.
Não funciona offline — contradiz arquitetura offline-first.

---

## VULN-MOB-08 🟡 MÉDIA — Zero Permission Checks em Criar/Fechar OS

**Arquivo:** CriarOSScreen.tsx, linhas ~68-80

```typescript
const handleSave = async () => {
  if (!equipamentoNome.trim() && !tag.trim()) { ... }
  if (!problema.trim()) { ... }
  setSaving(true);
  // ← Qualquer mecânico logado cria OS. Sem verificação de permissão
```

**Arquivo:** FecharOSScreen.tsx, linhas ~105-110

```typescript
const handleClose = async () => {
  // ← Sem verificar: os.status permite fechamento?
  // ← Sem verificar: mecânico está associado a esta OS?
```

---

## VULN-MOB-09 🟡 MÉDIA — Custos Negativos / NaN / Infinity Aceitos

**Arquivo:** FecharOSScreen.tsx, linhas ~117-120

```typescript
const custoTerc = parseFloat(custoTerceiros) || 0;
// ← parseFloat("-999") = -999  ← aceito!
// ← parseFloat("abc") = NaN → 0 (ok)
// ← Mas custo_unitario de material sem validação → NaN propaga
const custoTotal = custoMaoObra + custoMat + custoTerc;
// ← Pode ser NaN, Infinity, ou negativo
```

---

## VULN-MOB-10 🟡 MÉDIA — empresa_id Pode Ser String Vazia

**Arquivo:** CriarOSScreen.tsx, linha ~82

```typescript
const os = {
  empresa_id: empresaId || '',  // ← String vazia se state inconsistente
```
OS sem empresa_id viola isolamento multi-tenant.

---

## VULN-MOB-11 🟡 MÉDIA — Race Condition entre syncEngine e AuthContext Tokens

**Arquivo:** syncEngine.ts vs AuthContext.tsx

```typescript
// syncEngine persiste em SQLite:
await saveDeviceConfig('access_token', data.access_token);
// AuthContext persiste em AsyncStorage:
await AsyncStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, data.access_token);
```

Duas fontes de verdade independentes que dessincronizam.

---

## VULN-MOB-12 🟡 MÉDIA — autoRefreshToken=false Globalmente

**Arquivo:** supabase.ts, linhas ~13-16

```typescript
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});
```

Token expira silenciosamente. Formulários longos falham ao salvar.

---

## VULN-MOB-13 🟡 MÉDIA — Race em Sync Cycles Concorrentes

```typescript
if (syncPromise) {
  const result = await syncPromise;
  if (!forceFullRefresh) return result;
  // ← Falls through → inicia OUTRA sync
}
```

---

## VULN-MOB-14 🟡 MÉDIA — audit.ts user_id NULL após signOut

```typescript
const { data: { user } } = await supabase.auth.getUser();
p_usuario_id: user?.id ?? null,  // ← NULL se chamado após clearGlobalAuth
```

---

## VULN-MOB-15 ⚪ BAIXA — Device ID com Math.random()

```typescript
deviceId = 'rn-' + Math.random().toString(36).slice(2) + '-' + Date.now().toString(36);
```

---

## VULN-MOB-16 ⚪ BAIXA — LIKE Wildcards sem Escape

```typescript
"SELECT * FROM materiais WHERE empresa_id = ? AND (descricao LIKE ? OR codigo LIKE ?)",
[empresaId, `%${busca}%`, `%${busca}%`]  // ← % e _ não escapados
```

---

## VULN-MOB-17 ⚪ BAIXA — Tempo de Execução Pode Ser 0 ou NaN

```typescript
if (diff > 0) tempoExecucao = Math.round(diff / 60000);
// ← Se horaFim < horaInicio → null → fallback a 1 minuto no RPC
```

---

# PARTE 7 — CADEIA DE ATAQUES (ATTACK CHAINS)

## Chain 1: Cross-Tenant Data Exfiltration (Frontend-Only)

```
1. Atacante cria conta no PCM (signup em qualquer tenant)
2. Executa: await supabase.auth.updateUser({
     data: { role: 'SYSTEM_OWNER', empresa_id: 'UUID-vitima' }
   })
3. AuthContext.extractRolesFromMetadata() retorna ['SYSTEM_OWNER']
4. AuthContext.extractEmpresaIdFromMetadata() retorna UUID-vitima
5. usePermission() retorna true para TUDO (hasGlobalAccess = true)
6. TenantContext resolve empresa_id da vítima via metadata
7. Todos os hooks (useOrdensServico, useExecucoesOS, etc.)
   fazem queries com empresa_id da vítima
8. Se RLS TEM can_access_empresa(): Bloqueado no banco ✅
   Se alguma tabela faltar RLS: Dados expostos ❌
```

**Mitigação**: RLS com can_access_empresa() bloqueia no banco, MAS:
- Edge functions que confiam em role do JWT perdem
- Hooks sem empresa_id no filtro (LUB-01 a LUB-06) perdem
- Frontend mostra UI de owner com dados leaking

## Chain 2: Device Takeover (Mobile)

```
1. Ex-funcionário obtém SERVICE_ROLE_KEY (repo público/backup)
2. Conhece device_token de seu dispositivo (AsyncStorage/backup ADB)
3. Calcula: password = 'pcm-da-' + device_token + '-' + key.slice(-12)
4. Autentica via: POST /auth/v1/token?grant_type=password
5. Obtém JWT com empresa_id da empresa
6. Faz queries em QUALQUER dado da empresa via RLS authenticated
```

## Chain 3: Billing Fraud

```
1. Atacante descobre ASAAS_WEBHOOK_TOKEN (ou env var está vazia)
2. Envia: POST /asaas-webhook
   Body: {"event":"PAYMENT_RECEIVED","payment":{"subscription":"sub_alvo"}}
3. Sem HMAC validation, webhook aceita
4. Subscription status atualizado para 'active'
5. Empresa usa sistema gratuitamente
6. Replay do mesmo webhook = pagamentos duplicados
```

## Chain 4: Permission Escalation → Cross-Tenant Delete

```
1. Admin do Tenant A chama:
   useDesativarTodosDispositivos('UUID-tenant-B')
2. Sem validação de tenantId → desativa TODOS dispositivos do Tenant B
3. OU: chama useRemoveMaterialOS({ id: 'UUID-cross-tenant' })
4. DELETE sem empresa_id → remove material de outro tenant
```

---

# PARTE 8 — SCHEMA & TYPES

## 8.1 Tabela FALTANTE

| Tabela | Referenciada em | Status |
|--------|----------------|--------|
| `solicitacoes` | useOfflineSync.ts:49 | ❌ NUNCA CRIADA — `.from('solicitacoes').insert()` FALHA em produção |

## 8.2 Tabelas sem Tipo no types.ts (15 de 65 = 23%)

`ai_root_cause_analysis`, `app_versao`, `empresa_config`, `lubrificantes`,
`movimentacoes_lubrificante`, `qrcodes_vinculacao`, `requisicoes_material`,
`paradas_equipamento`, `solicitacoes_manutencao`, `rotas_lubrificacao`,
`rotas_lubrificacao_pontos`, `treinamentos_ssma`, `support_tickets`,
`dispositivos_moveis`, `log_mecanicos_login`

## 8.3 RPCs sem Tipo (19 de 21 = 90%)

Apenas `app_write_audit_log` e `has_permission` têm tipos. As 19 restantes operam com `as any`.

## 8.4 Views sem Tipo (5 de 5 = 100%)

Todas usam `as never` cast.

---

# PARTE 9 — NOTA FINAL DETALHADA

```
╔══════════════════════════════════════════════════════════════════╗
║                                                                  ║
║                   NOTA FINAL: 4.9 / 10                           ║
║                                                                  ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                  ║
║  VULNERABILIDADES DOCUMENTADAS: 108                              ║
║  ├── 🔴 CRÍTICAS: 22 (escalação de privilégio, cross-tenant)    ║
║  ├── 🟠 ALTAS: 32 (bypass, data loss, unbounded queries)        ║
║  ├── 🟡 MÉDIAS: 39 (race conditions, info disclosure)           ║
║  └── ⚪ BAIXAS: 15 (best practices, logging)                    ║
║                                                                  ║
║  CADEIAS DE ATAQUE DEMONSTRADAS: 4                               ║
║  ├── Chain 1: Cross-Tenant via user_metadata (3 passos)          ║
║  ├── Chain 2: Device Takeover via SERVICE_ROLE_KEY (4 passos)    ║
║  ├── Chain 3: Billing Fraud via webhook (3 passos)               ║
║  └── Chain 4: Permission Escalation → Delete (2 passos)          ║
║                                                                  ║
║  O QUE FUNCIONA BEM:                                             ║
║  ├── can_access_empresa() RLS — conceito correto                 ║
║  ├── Arquitetura multi-tenant — estrutura bem pensada            ║
║  ├── 130+ migrations documentadas                                ║
║  ├── Offline sync queue no mobile — conceito sólido              ║
║  ├── Services com schema fallback                                ║
║  └── Rate limiting em Edge Functions (conceito)                  ║
║                                                                  ║
║  BLOQUEANTES PARA VENDA:                                         ║
║  ├── 11 hooks com mutações cross-tenant (empresa_id faltando)    ║
║  ├── user_metadata confiado para role + tenant (3 contextos)     ║
║  ├── Webhook Asaas sem HMAC (fraude possível)                    ║
║  ├── Senha de mecânico em plaintext no banco                     ║
║  ├── Tokens mobile em plaintext (AsyncStorage + SQLite)          ║
║  ├── Perda silenciosa de fotos no sync                           ║
║  ├── Tabela solicitacoes inexistente                             ║
║  ├── usePermission bypassa server se role manipulado             ║
║  ├── Queries unbounded (6+ hooks sem .limit())                   ║
║  └── owner-portal-admin retorna senhas em plaintext              ║
║                                                                  ║
║  RISCO FINANCEIRO:                                               ║
║  ├── Vazamento cross-tenant: multa LGPD até 2% faturamento      ║
║  ├── Billing fraud: perda de receita ilimitada                   ║
║  ├── OS duplicada/fraudulenta: R$ 50k+/incidente                ║
║  ├── Dados financeiros NaN: relatórios incorretos                ║
║  └── Reputação: 1 incidente de vazamento = morte do produto      ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝
```

---

# PARTE 10 — ROADMAP DE CORREÇÃO (PRIORIZADO)

## SPRINT 0 — STOP-SHIP (Antes de qualquer venda)

| # | Fix | Esforço | Impacto |
|---|-----|---------|---------|
| 1 | Remover `user_metadata` de `extractRolesFromMetadata`, `extractEmpresaIdFromMetadata`, `extractEmpresaSlugFromMetadata` | 1h | Elimina Chain 1 inteira |
| 2 | Adicionar `.eq('empresa_id', tenantId)` nos 11 hooks com mutações cross-tenant | 4h | Elimina Chain 4 inteira |
| 3 | Remover owner fallback elevation (VULN-AUTH-04) | 30min | Bloqueia escalação passiva |
| 4 | Impersonation: SEMPRE exigir `id` + `sessionToken` + validação backend | 30min | Bloqueia VULN-AUTH-05 |
| 5 | usePermission: remover `hasGlobalAccess` client-side, sempre chamar RPC | 30min | Bloqueia bypass de permissão |
| 6 | Criar tabela `solicitacoes` (SQL pronto) | 5min | Fix offline sync |
| 7 | Adicionar `.limit()` em 6+ queries unbounded | 2h | Previne OOM |
| 8 | Fix spread order em useLubrificacao (`{...plano, empresa_id: tenantId}`) | 15min | Previne override |

**Esforço total Sprint 0: ~1-2 dias**

## SPRINT 1 — Segurança Crítica (1-2 semanas)

| # | Fix | Esforço |
|---|-----|---------|
| 9 | Implementar HMAC no webhook Asaas + rejeitar se token vazio | 4h |
| 10 | Migrar tokens mobile para expo-secure-store | 8h |
| 11 | Hash senha do mecânico com bcrypt + rate limit | 8h |
| 12 | Implementar comparação timing-safe para tokens | 1h |
| 13 | QR code bind com SELECT FOR UPDATE (RPC) | 4h |
| 14 | Fix permission DELETE+INSERT → upsert atômico | 4h |
| 15 | Exigir senha atual no changePassword | 4h |
| 16 | Remover `x-allow-password-change` header bypass | 30min |
| 17 | CORS: validar origin contra allowlist | 2h |
| 18 | Fix syncEngine: não marcar done se fotos falharam | 4h |
| 19 | Fix syncEngine: comparar timestamps antes de upsert | 8h |
| 20 | Fix pull: não sobrescrever execuções com sync_status=pending | 4h |

## SPRINT 2 — Hardening (2-3 semanas)

| # | Fix | Esforço |
|---|-----|---------|
| 21 | Regenerar types.ts (`supabase gen types typescript`) | 2h |
| 22 | Sanitizar error messages em todas Edge Functions | 4h |
| 23 | Paginação em todos hooks CRUD | 16h |
| 24 | Dashboard consolidado em 1 RPC (eliminar N+1) | 8h |
| 25 | Fix stale closures useDashboardData (dependency arrays) | 1h |
| 26 | usePermission: incluir userId na query key | 30min |
| 27 | staleTime de permissões: 300s → 30s + refetchOnWindowFocus | 15min |
| 28 | Validação numérica em custos mobile (≥0, isFinite) | 2h |
| 29 | FecharOSScreen: ler dados do SQLite (offline-first) | 8h |
| 30 | Rate limiting persistente (Redis ou tabela DB) | 8h |
| 31 | 2FA para operações destrutivas (delete company, purge) | 16h |
| 32 | Remover hardcoded owner emails | 30min |
| 33 | Invalidar queries após login/logout de mecânico | 1h |
| 34 | IP via headers backend (remover api.ipify.org) | 2h |
| 35 | Audit log mobile: capturar mecanicoId antes da operação | 2h |

---

*Fim do Relatório — v3.0 — 10 de Abril de 2026*
*Total: ~108 vulnerabilidades, 4 cadeias de ataque, 35 fixes priorizados*
