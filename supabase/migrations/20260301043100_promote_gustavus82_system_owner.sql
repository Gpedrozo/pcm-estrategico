-- Promote designated enterprise owner account to SYSTEM_OWNER (idempotent).
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'SYSTEM_OWNER'::public.app_role
FROM auth.users
WHERE email = 'gustavus82@gmail.com'
  AND NOT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.users.id
      AND role = 'SYSTEM_OWNER'::public.app_role
  )
ON CONFLICT (user_id, role) DO NOTHING;
