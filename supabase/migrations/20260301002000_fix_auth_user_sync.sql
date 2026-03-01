-- Ensure every auth user has a corresponding profile and role.
-- Root cause fixed: handle_new_user() existed, but no trigger was created on auth.users.

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Backfill existing users that were created before the trigger.
INSERT INTO public.profiles (id, nome)
SELECT
  u.id,
  COALESCE(u.raw_user_meta_data ->> 'nome', u.email, 'Usuário')
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;

INSERT INTO public.user_roles (user_id, role)
SELECT
  u.id,
  'USUARIO'::public.app_role
FROM auth.users u
LEFT JOIN public.user_roles r ON r.user_id = u.id
WHERE r.user_id IS NULL;
