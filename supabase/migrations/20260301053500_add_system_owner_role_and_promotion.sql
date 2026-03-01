-- Add SYSTEM_OWNER to app_role enum (idempotent for repeated db push)
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'SYSTEM_OWNER';

-- Function to check if a user is SYSTEM_OWNER
CREATE OR REPLACE FUNCTION public.is_system_owner(_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT public.has_role(_user_id, 'SYSTEM_OWNER'::public.app_role);
$$;

-- Promote specific production owner user to SYSTEM_OWNER (if account already exists)
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'SYSTEM_OWNER'::public.app_role
FROM auth.users u
WHERE lower(u.email) = 'gustavus82@gmail.com'
  AND NOT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = u.id
      AND ur.role = 'SYSTEM_OWNER'::public.app_role
  );

-- Allow SYSTEM_OWNER to manage enterprise-level control tables
CREATE POLICY "System owner can manage user roles" ON public.user_roles
  FOR ALL
  USING (public.is_system_owner(auth.uid()))
  WITH CHECK (public.is_system_owner(auth.uid()));

CREATE POLICY "System owner can manage empresa" ON public.dados_empresa
  FOR ALL
  USING (public.is_system_owner(auth.uid()))
  WITH CHECK (public.is_system_owner(auth.uid()));

CREATE POLICY "System owner can manage permissions" ON public.permissoes_granulares
  FOR ALL
  USING (public.is_system_owner(auth.uid()))
  WITH CHECK (public.is_system_owner(auth.uid()));

CREATE POLICY "System owner can manage configs" ON public.configuracoes_sistema
  FOR ALL
  USING (public.is_system_owner(auth.uid()))
  WITH CHECK (public.is_system_owner(auth.uid()));
