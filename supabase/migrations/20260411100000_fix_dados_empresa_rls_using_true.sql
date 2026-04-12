-- Fix dados_empresa RLS: remove USING(true) policy that exposes all companies to any authenticated user
-- Replaces with proper tenant-scoped policy using user_roles

BEGIN;

-- 1. Remove vulnerable open policy
DROP POLICY IF EXISTS "Authenticated users can view empresa" ON public.dados_empresa;

-- 2. Create tenant-scoped SELECT policy
CREATE POLICY "tenant_select_own_empresa"
  ON public.dados_empresa
  FOR SELECT
  USING (
    id IN (
      SELECT empresa_id FROM public.user_roles
      WHERE user_id = auth.uid()
    )
    OR public.is_system_owner()
  );

-- 3. Ensure FORCE RLS is active
ALTER TABLE public.dados_empresa FORCE ROW LEVEL SECURITY;

COMMIT;
