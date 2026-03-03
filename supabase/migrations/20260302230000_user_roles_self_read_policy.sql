BEGIN;

DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;

CREATE POLICY "Users can view own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR has_role(auth.uid(), 'ADMIN'::public.app_role)
  OR has_role(auth.uid(), 'MASTER_TI'::public.app_role)
  OR has_role(auth.uid(), 'SYSTEM_OWNER'::public.app_role)
);

COMMIT;
