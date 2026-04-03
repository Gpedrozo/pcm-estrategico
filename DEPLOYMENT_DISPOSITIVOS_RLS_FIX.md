# 🔧 Dispositivos RLS Fix — Deployment Instructions

## Status
✅ **Migration arquivo criado**: `supabase/migrations/20260402_140500_fix_dispositivos_rls_owner.sql`  
✅ **Commit ao GitHub**: Enviado para main branch  
⏳ **Próximo passo**: Aplicar migration ao banco de dados Supabase

---

## Problema Corrigido

**Erro**: Owner module → Dispositivos tab: "Falha ao carregar a aplicação"  
**Raiz**: RLS policies bloqueavam SYSTEM_OWNER de acessar `dispositivos_moveis` e `qrcodes_vinculacao`  
**Solução**: Políticas unificadas com lógica OR: `(IS_OWNER/ADMIN OR IS_TENANT)`

---

## Como Aplicar a Migration

### Opção 1: Via Supabase CLI (Recomendado)

```bash
# Entrar no diretório do projeto
cd ~/projects/pcm-estrategico

# Executar script de deployment
./deploy_dispositivos_fix.sh      # macOS/Linux
.\deploy_dispositivos_fix.ps1     # Windows (PowerShell)

# Ou manualmente:
supabase db push --linked
```

### Opção 2: Via Supabase Dashboard (Manual)

1. Abrir https://app.supabase.com
2. Ir para projeto `pcm-estrategico`
3. SQL Editor → New Query
4. Copiar o conteúdo completo de: `supabase/migrations/20260402_140500_fix_dispositivos_rls_owner.sql`
5. Executar query

### Opção 3: Via psql CLI (Se tiver acesso direto)

```bash
# Conectar ao Supabase PostgreSQL
psql -h <supabase-host> -U postgres -d postgres

# Colar conteúdo da migration e executar
\i supabase/migrations/20260402_140500_fix_dispositivos_rls_owner.sql
```

---

## Conteúdo da Migration

A migration:
- **Remove** 6 políticas conflitantes antigas (tenant_read, owner_read, tenant_insert, etc)
- **Cria** 4 políticas unificadas por operação (read, write, upd, del)
- **Aplica** tanto em `dispositivos_moveis` quanto `qrcodes_vinculacao`
- **Lógica**: Owner/Admin ou tenant-scoped

### Exemplo de política unificada:

```sql
CREATE POLICY "dispositivos_moveis_read" ON public.dispositivos_moveis FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.user_roles 
          WHERE user_id = auth.uid() 
          AND role::text IN ('SYSTEM_OWNER', 'SYSTEM_ADMIN'))
  OR 
  empresa_id IN (SELECT empresa_id FROM public.profiles WHERE id = auth.uid())
);
```

---

## Verificação Pós-Deploy

1. Login como SYSTEM_OWNER no app
2. Ir ao módulo Owner → Aba "Dispositivos"
3. Deve carregar lista de dispositivos sem erros ✅
4. Testar CRUD:
   - Ver dispositivos ✓
   - Adicionar novo dispositivo ✓
   - Editar dispositivo ✓
   - Deletar dispositivo ✓

---

## Troubleshooting

| Problema | Solução |
|----------|---------|
| "Usuario no tiene permiso para acceder" | Migration não foi aplicada; execute `supabase db push` |
| "Column not found" | Verificar se tabelas `dispositivos_moveis` e `qrcodes_vinculacao` existem |
| "RLS policy not found" | Rollback automático ocorreu; reexecutar migration |

---

## Rollback (Se necessário)

Se preciso reverter, próxima migration pode recriar as políticas antigas:

```bash
# Espiar políticas atuais
SELECT * FROM pg_policies WHERE tablename LIKE 'dispositivos%';

# Ou reverter via Supabase UI → Migrations panel
```

---

## Links Relevantes

- Migration file: [supabase/migrations/20260402_140500_fix_dispositivos_rls_owner.sql](./supabase/migrations/20260402_140500_fix_dispositivos_rls_owner.sql)
- Issue: Owner module dispositivos tab blocked by RLS
- GitHub Commit: `64a5478` (main branch)

---

**Criado**: 2026-04-02  
**Por**: GitHub Copilot Agent  
**Status**: Ready for deployment ✅
