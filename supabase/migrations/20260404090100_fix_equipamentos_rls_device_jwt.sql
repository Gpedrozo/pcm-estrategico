-- ============================================================
-- Fix: RLS policies para equipamentos — compatível com device auth
-- O JWT do device user tem empresa_id em app_metadata, não na raiz
-- ============================================================

-- Drop old open policies that bypass tenant isolation
DROP POLICY IF EXISTS "Authenticated users can view equipamentos" ON public.equipamentos;
DROP POLICY IF EXISTS "Admins can manage equipamentos" ON public.equipamentos;
DROP POLICY IF EXISTS "Users can insert equipamentos" ON public.equipamentos;
DROP POLICY IF EXISTS "Users can update equipamentos" ON public.equipamentos;

-- Recreate tenant-strict policies with app_metadata support
DROP POLICY IF EXISTS equipamentos_select_tenant ON public.equipamentos;
CREATE POLICY equipamentos_select_tenant ON public.equipamentos
  FOR SELECT TO authenticated
  USING (
    empresa_id = NULLIF(auth.jwt() ->> 'empresa_id', '')::uuid
    OR empresa_id = NULLIF(auth.jwt() -> 'app_metadata' ->> 'empresa_id', '')::uuid
    OR public.can_access_empresa(empresa_id)
  );

DROP POLICY IF EXISTS equipamentos_insert_tenant ON public.equipamentos;
CREATE POLICY equipamentos_insert_tenant ON public.equipamentos
  FOR INSERT TO authenticated
  WITH CHECK (
    empresa_id = NULLIF(auth.jwt() ->> 'empresa_id', '')::uuid
    OR empresa_id = NULLIF(auth.jwt() -> 'app_metadata' ->> 'empresa_id', '')::uuid
    OR public.can_access_empresa(empresa_id)
  );

DROP POLICY IF EXISTS equipamentos_update_tenant ON public.equipamentos;
CREATE POLICY equipamentos_update_tenant ON public.equipamentos
  FOR UPDATE TO authenticated
  USING (
    empresa_id = NULLIF(auth.jwt() ->> 'empresa_id', '')::uuid
    OR empresa_id = NULLIF(auth.jwt() -> 'app_metadata' ->> 'empresa_id', '')::uuid
    OR public.can_access_empresa(empresa_id)
  )
  WITH CHECK (
    empresa_id = NULLIF(auth.jwt() ->> 'empresa_id', '')::uuid
    OR empresa_id = NULLIF(auth.jwt() -> 'app_metadata' ->> 'empresa_id', '')::uuid
    OR public.can_access_empresa(empresa_id)
  );

DROP POLICY IF EXISTS equipamentos_delete_tenant ON public.equipamentos;
CREATE POLICY equipamentos_delete_tenant ON public.equipamentos
  FOR DELETE TO authenticated
  USING (
    empresa_id = NULLIF(auth.jwt() ->> 'empresa_id', '')::uuid
    OR empresa_id = NULLIF(auth.jwt() -> 'app_metadata' ->> 'empresa_id', '')::uuid
    OR public.can_access_empresa(empresa_id)
  );
