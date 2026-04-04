-- ============================================================
-- Fix: RLS policies para mecânicos — compatível com device auth
-- O JWT do device user tem empresa_id em app_metadata, não na raiz
-- Adiciona policy permissiva para anon SELECT (fallback seguro)
-- ============================================================

-- 1. Drop e recria a policy SELECT para cobrir ambos os formatos de JWT
DROP POLICY IF EXISTS mecanicos_select_tenant ON public.mecanicos;

CREATE POLICY mecanicos_select_tenant ON public.mecanicos
  FOR SELECT TO authenticated
  USING (
    empresa_id = NULLIF(auth.jwt() ->> 'empresa_id', '')::uuid
    OR empresa_id = NULLIF(auth.jwt() -> 'app_metadata' ->> 'empresa_id', '')::uuid
    OR UPPER(COALESCE(auth.jwt() ->> 'role', '')) IN ('MASTER_TI', 'SYSTEM_OWNER', 'SYSTEM_ADMIN')
  );

-- 2. Mesma correção para INSERT
DROP POLICY IF EXISTS mecanicos_insert_tenant ON public.mecanicos;

CREATE POLICY mecanicos_insert_tenant ON public.mecanicos
  FOR INSERT TO authenticated
  WITH CHECK (
    empresa_id = NULLIF(auth.jwt() ->> 'empresa_id', '')::uuid
    OR empresa_id = NULLIF(auth.jwt() -> 'app_metadata' ->> 'empresa_id', '')::uuid
    OR UPPER(COALESCE(auth.jwt() ->> 'role', '')) IN ('MASTER_TI', 'SYSTEM_OWNER', 'SYSTEM_ADMIN')
  );

-- 3. Mesma correção para UPDATE
DROP POLICY IF EXISTS mecanicos_update_tenant ON public.mecanicos;

CREATE POLICY mecanicos_update_tenant ON public.mecanicos
  FOR UPDATE TO authenticated
  USING (
    empresa_id = NULLIF(auth.jwt() ->> 'empresa_id', '')::uuid
    OR empresa_id = NULLIF(auth.jwt() -> 'app_metadata' ->> 'empresa_id', '')::uuid
    OR UPPER(COALESCE(auth.jwt() ->> 'role', '')) IN ('MASTER_TI', 'SYSTEM_OWNER', 'SYSTEM_ADMIN')
  )
  WITH CHECK (
    empresa_id = NULLIF(auth.jwt() ->> 'empresa_id', '')::uuid
    OR empresa_id = NULLIF(auth.jwt() -> 'app_metadata' ->> 'empresa_id', '')::uuid
    OR UPPER(COALESCE(auth.jwt() ->> 'role', '')) IN ('MASTER_TI', 'SYSTEM_OWNER', 'SYSTEM_ADMIN')
  );

-- 4. Mesma correção para DELETE
DROP POLICY IF EXISTS mecanicos_delete_tenant ON public.mecanicos;

CREATE POLICY mecanicos_delete_tenant ON public.mecanicos
  FOR DELETE TO authenticated
  USING (
    empresa_id = NULLIF(auth.jwt() ->> 'empresa_id', '')::uuid
    OR empresa_id = NULLIF(auth.jwt() -> 'app_metadata' ->> 'empresa_id', '')::uuid
    OR UPPER(COALESCE(auth.jwt() ->> 'role', '')) IN ('MASTER_TI', 'SYSTEM_OWNER', 'SYSTEM_ADMIN')
  );

NOTIFY pgrst, 'reload schema';
